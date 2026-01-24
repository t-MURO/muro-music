use parking_lot::Mutex;
use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use serde::Serialize;
use souvlaki::{MediaControlEvent, MediaControls, PlatformConfig};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
pub struct PlaybackState {
    pub is_playing: bool,
    pub current_position: f64,
    pub duration: f64,
    pub volume: f64,
    pub current_track: Option<CurrentTrack>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CurrentTrack {
    pub id: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub source_path: String,
}

impl Default for PlaybackState {
    fn default() -> Self {
        Self {
            is_playing: false,
            current_position: 0.0,
            duration: 0.0,
            volume: 0.8,
            current_track: None,
        }
    }
}

#[derive(Debug)]
pub enum PlaybackCommand {
    PlayFile {
        track: CurrentTrack,
        duration_hint: f64,
    },
    Toggle,
    Play,
    Pause,
    Stop,
    Seek(f64),
    SetVolume(f64),
    GetState(std::sync::mpsc::Sender<PlaybackState>),
    IsFinished(std::sync::mpsc::Sender<bool>),
}

/// State shared with the audio thread
struct AudioThreadState {
    sink: Option<Sink>,
    _stream: Option<OutputStream>,
    stream_handle: Option<OutputStreamHandle>,
    state: PlaybackState,
    /// Position when playback started or was last seeked/paused
    position_base: f64,
    /// Instant when playback started from position_base
    playback_started_at: Option<Instant>,
}

impl Default for AudioThreadState {
    fn default() -> Self {
        Self {
            sink: None,
            _stream: None,
            stream_handle: None,
            state: PlaybackState::default(),
            position_base: 0.0,
            playback_started_at: None,
        }
    }
}

impl AudioThreadState {
    /// Get the current playback position
    fn current_position(&self) -> f64 {
        if self.state.is_playing {
            if let Some(started_at) = self.playback_started_at {
                let elapsed = started_at.elapsed().as_secs_f64();
                (self.position_base + elapsed).min(self.state.duration)
            } else {
                self.position_base
            }
        } else {
            self.position_base
        }
    }
}

/// The audio player that can be stored in Tauri state
pub struct AudioPlayer {
    command_tx: Mutex<Option<Sender<PlaybackCommand>>>,
    state: Arc<Mutex<PlaybackState>>,
}

impl AudioPlayer {
    pub fn new() -> Self {
        Self {
            command_tx: Mutex::new(None),
            state: Arc::new(Mutex::new(PlaybackState::default())),
        }
    }

    pub fn init(&self, app_handle: AppHandle) {
        let (tx, rx) = mpsc::channel::<PlaybackCommand>();
        let state = Arc::clone(&self.state);

        // Store the sender
        {
            let mut cmd_tx = self.command_tx.lock();
            *cmd_tx = Some(tx);
        }

        // Spawn audio thread - this thread owns the OutputStream
        let app_for_thread = app_handle.clone();
        thread::spawn(move || {
            run_audio_thread(rx, state, app_for_thread);
        });

        // Initialize media controls on main thread
        self.init_media_controls(app_handle);
    }

    fn init_media_controls(&self, app_handle: AppHandle) {
        let config = PlatformConfig {
            dbus_name: "muro_music",
            display_name: "Muro Music",
            hwnd: None,
        };

        let tx = {
            let guard = self.command_tx.lock();
            guard.clone()
        };

        match MediaControls::new(config) {
            Ok(mut controls) => {
                let app = app_handle.clone();
                let tx_for_controls = tx.clone();

                if let Err(e) = controls.attach(move |event: MediaControlEvent| {
                    if let Some(ref tx) = tx_for_controls {
                        handle_media_event(tx, &app, event);
                    }
                }) {
                    eprintln!("Failed to attach media controls: {:?}", e);
                    return;
                }

                // Store controls to keep them alive - leak it since we need it for app lifetime
                Box::leak(Box::new(controls));
            }
            Err(e) => {
                eprintln!("Failed to create media controls: {:?}", e);
            }
        }
    }

    fn send_command(&self, cmd: PlaybackCommand) {
        let guard = self.command_tx.lock();
        if let Some(ref tx) = *guard {
            let _ = tx.send(cmd);
        }
    }

    pub fn play_file(&self, track: CurrentTrack, duration_hint: f64) -> Result<(), String> {
        self.send_command(PlaybackCommand::PlayFile {
            track,
            duration_hint,
        });
        Ok(())
    }

    pub fn toggle_play(&self) -> bool {
        self.send_command(PlaybackCommand::Toggle);
        // Return current state approximation
        let state = self.state.lock();
        !state.is_playing
    }

    pub fn play(&self) {
        self.send_command(PlaybackCommand::Play);
    }

    pub fn pause(&self) {
        self.send_command(PlaybackCommand::Pause);
    }

    pub fn stop(&self) {
        self.send_command(PlaybackCommand::Stop);
    }

    pub fn seek(&self, position_secs: f64) -> Result<(), String> {
        self.send_command(PlaybackCommand::Seek(position_secs));
        Ok(())
    }

    pub fn set_volume(&self, volume: f64) {
        self.send_command(PlaybackCommand::SetVolume(volume));
    }

    pub fn get_state(&self) -> PlaybackState {
        let (tx, rx) = mpsc::channel();
        self.send_command(PlaybackCommand::GetState(tx));
        rx.recv_timeout(Duration::from_millis(100))
            .unwrap_or_else(|_| self.state.lock().clone())
    }

    pub fn is_finished(&self) -> bool {
        let (tx, rx) = mpsc::channel();
        self.send_command(PlaybackCommand::IsFinished(tx));
        rx.recv_timeout(Duration::from_millis(100)).unwrap_or(true)
    }
}

fn run_audio_thread(
    rx: Receiver<PlaybackCommand>,
    shared_state: Arc<Mutex<PlaybackState>>,
    app_handle: AppHandle,
) {
    let mut audio_state = AudioThreadState::default();
    let mut last_position_emit = Instant::now();

    // Initialize audio output
    if let Ok((stream, stream_handle)) = OutputStream::try_default() {
        audio_state._stream = Some(stream);
        audio_state.stream_handle = Some(stream_handle);
    } else {
        eprintln!("Failed to initialize audio output");
        return;
    }

    loop {
        match rx.recv_timeout(Duration::from_millis(16)) {
            // ~60fps for smooth updates
            Ok(cmd) => {
                process_command(&mut audio_state, &shared_state, &app_handle, cmd);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => {
                // Check if track finished
                if let Some(ref sink) = audio_state.sink {
                    if sink.empty() && audio_state.state.is_playing {
                        audio_state.state.is_playing = false;
                        audio_state.position_base = audio_state.state.duration;
                        audio_state.playback_started_at = None;
                        audio_state.state.current_position = audio_state.state.duration;
                        update_shared_state(&shared_state, &audio_state.state);
                        let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
                        let _ = app_handle.emit("muro://track-ended", ());
                    }
                }

                // Emit position updates periodically while playing (every 100ms)
                if audio_state.state.is_playing
                    && last_position_emit.elapsed() >= Duration::from_millis(100)
                {
                    let pos = audio_state.current_position();
                    audio_state.state.current_position = pos;
                    update_shared_state(&shared_state, &audio_state.state);
                    let _ = app_handle.emit("muro://playback-position", pos);
                    last_position_emit = Instant::now();
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                break;
            }
        }
    }
}

fn open_decoder(path: &Path) -> Result<Decoder<BufReader<File>>, String> {
    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let reader = BufReader::new(file);
    Decoder::new(reader).map_err(|e| format!("Failed to decode file: {}", e))
}

fn process_command(
    audio_state: &mut AudioThreadState,
    shared_state: &Arc<Mutex<PlaybackState>>,
    app_handle: &AppHandle,
    cmd: PlaybackCommand,
) {
    match cmd {
        PlaybackCommand::PlayFile {
            track,
            duration_hint,
        } => {
            let path = Path::new(&track.source_path);
            if !path.exists() {
                eprintln!("File not found: {}", track.source_path);
                return;
            }

            let source = match open_decoder(path) {
                Ok(source) => source,
                Err(error) => {
                    eprintln!("{}", error);
                    return;
                }
            };

            let duration_secs = source
                .total_duration()
                .map(|d| d.as_secs_f64())
                .unwrap_or(duration_hint);

            let stream_handle = match audio_state.stream_handle.as_ref() {
                Some(h) => h,
                None => {
                    eprintln!("Audio output not initialized");
                    return;
                }
            };

            let sink = match Sink::try_new(stream_handle) {
                Ok(s) => s,
                Err(e) => {
                    eprintln!("Failed to create sink: {}", e);
                    return;
                }
            };

            sink.set_volume(audio_state.state.volume as f32);
            sink.append(source);

            audio_state.sink = Some(sink);
            audio_state.position_base = 0.0;
            audio_state.playback_started_at = Some(Instant::now());
            audio_state.state.is_playing = true;
            audio_state.state.duration = duration_secs;
            audio_state.state.current_position = 0.0;
            audio_state.state.current_track = Some(track);

            update_shared_state(shared_state, &audio_state.state);
            let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
        }

        PlaybackCommand::Toggle => {
            // Calculate current position first
            let current_pos = audio_state.current_position();

            if let Some(ref sink) = audio_state.sink {
                if sink.is_paused() {
                    sink.play();
                    audio_state.state.is_playing = true;
                    audio_state.position_base = current_pos;
                    audio_state.playback_started_at = Some(Instant::now());
                } else {
                    sink.pause();
                    audio_state.state.is_playing = false;
                    audio_state.position_base = current_pos;
                    audio_state.playback_started_at = None;
                }
                audio_state.state.current_position = current_pos;
                update_shared_state(shared_state, &audio_state.state);
                let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
            }
        }

        PlaybackCommand::Play => {
            if let Some(ref sink) = audio_state.sink {
                sink.play();
                audio_state.state.is_playing = true;
                audio_state.playback_started_at = Some(Instant::now());
                update_shared_state(shared_state, &audio_state.state);
                let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
            }
        }

        PlaybackCommand::Pause => {
            // Calculate current position first
            let current_pos = audio_state.current_position();

            if let Some(ref sink) = audio_state.sink {
                sink.pause();
                audio_state.state.is_playing = false;
                audio_state.position_base = current_pos;
                audio_state.playback_started_at = None;
                audio_state.state.current_position = current_pos;
                update_shared_state(shared_state, &audio_state.state);
                let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
            }
        }

        PlaybackCommand::Stop => {
            if let Some(ref sink) = audio_state.sink {
                sink.stop();
            }
            audio_state.sink = None;
            audio_state.state.is_playing = false;
            audio_state.state.current_position = 0.0;
            audio_state.state.current_track = None;
            audio_state.position_base = 0.0;
            audio_state.playback_started_at = None;

            update_shared_state(shared_state, &audio_state.state);
            let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
        }

        PlaybackCommand::Seek(position_secs) => {
            if audio_state.state.current_track.is_none() {
                return;
            }

            if let Some(ref sink) = audio_state.sink {
                let mut target_position = position_secs.max(0.0);
                if audio_state.state.duration > 0.0 {
                    target_position = target_position.min(audio_state.state.duration);
                }
                let seek_duration = Duration::from_secs_f64(target_position);
                // try_seek is fast for formats that support seeking (mp3, flac, etc.)
                if sink.try_seek(seek_duration).is_ok() {
                    audio_state.position_base = target_position;
                    audio_state.playback_started_at = if audio_state.state.is_playing {
                        Some(Instant::now())
                    } else {
                        None
                    };
                    audio_state.state.current_position = target_position;
                    update_shared_state(shared_state, &audio_state.state);
                    let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
                } else if let Some(track) = audio_state.state.current_track.clone() {
                    let path = Path::new(&track.source_path);
                    if !path.exists() {
                        eprintln!("File not found: {}", track.source_path);
                        return;
                    }

                    let mut source = match open_decoder(path) {
                        Ok(source) => source,
                        Err(error) => {
                            eprintln!("{}", error);
                            return;
                        }
                    };

                    let source: Box<dyn Source<Item = i16> + Send> =
                        if source.try_seek(seek_duration).is_ok() {
                            Box::new(source)
                        } else {
                            Box::new(source.skip_duration(seek_duration))
                        };

                    let stream_handle = match audio_state.stream_handle.as_ref() {
                        Some(h) => h,
                        None => {
                            eprintln!("Audio output not initialized");
                            return;
                        }
                    };

                    let new_sink = match Sink::try_new(stream_handle) {
                        Ok(s) => s,
                        Err(e) => {
                            eprintln!("Failed to create sink: {}", e);
                            return;
                        }
                    };

                    if let Some(ref existing_sink) = audio_state.sink {
                        existing_sink.stop();
                    }

                    new_sink.set_volume(audio_state.state.volume as f32);
                    new_sink.append(source);
                    if !audio_state.state.is_playing {
                        new_sink.pause();
                    }

                    audio_state.sink = Some(new_sink);
                    audio_state.position_base = target_position;
                    audio_state.playback_started_at = if audio_state.state.is_playing {
                        Some(Instant::now())
                    } else {
                        None
                    };
                    audio_state.state.current_position = target_position;
                    update_shared_state(shared_state, &audio_state.state);
                    let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
                }
            }
        }

        PlaybackCommand::SetVolume(volume) => {
            let clamped = volume.clamp(0.0, 1.0);
            audio_state.state.volume = clamped;

            if let Some(ref sink) = audio_state.sink {
                sink.set_volume(clamped as f32);
            }

            update_shared_state(shared_state, &audio_state.state);
            let _ = app_handle.emit("muro://playback-state", audio_state.state.clone());
        }

        PlaybackCommand::GetState(reply_tx) => {
            // Return state with accurate current position
            let mut state = audio_state.state.clone();
            state.current_position = audio_state.current_position();
            let _ = reply_tx.send(state);
        }

        PlaybackCommand::IsFinished(reply_tx) => {
            let finished = audio_state.sink.as_ref().map(|s| s.empty()).unwrap_or(true);
            let _ = reply_tx.send(finished);
        }
    }
}

fn update_shared_state(shared: &Arc<Mutex<PlaybackState>>, state: &PlaybackState) {
    let mut guard = shared.lock();
    *guard = state.clone();
}

fn handle_media_event(tx: &Sender<PlaybackCommand>, app: &AppHandle, event: MediaControlEvent) {
    match event {
        MediaControlEvent::Play => {
            let _ = tx.send(PlaybackCommand::Play);
            let _ = app.emit("muro://media-control", "play");
        }
        MediaControlEvent::Pause => {
            let _ = tx.send(PlaybackCommand::Pause);
            let _ = app.emit("muro://media-control", "pause");
        }
        MediaControlEvent::Toggle => {
            let _ = tx.send(PlaybackCommand::Toggle);
            let _ = app.emit("muro://media-control", "toggle");
        }
        MediaControlEvent::Next => {
            let _ = app.emit("muro://media-control", "next");
        }
        MediaControlEvent::Previous => {
            let _ = app.emit("muro://media-control", "previous");
        }
        MediaControlEvent::Stop => {
            let _ = tx.send(PlaybackCommand::Stop);
            let _ = app.emit("muro://media-control", "stop");
        }
        _ => {}
    }
}

// Update media controls metadata (to be called from lib.rs commands)
pub fn update_media_metadata(title: &str, artist: &str, album: &str) {
    // Media controls are leaked/global, so we can't easily update them here
    // This would require storing a reference to the controls
    // For now, we skip this - metadata is set once when attaching
    let _ = (title, artist, album);
}
