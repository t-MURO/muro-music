import type { ReactNode } from "react";

type AppLayoutProps = {
  sidebarWidth: number;
  detailWidth: number;
  onSidebarResizeStart: (event: React.MouseEvent) => void;
  onDetailResizeStart: (event: React.MouseEvent) => void;
  sidebar: ReactNode;
  main: ReactNode;
  detail: ReactNode;
};

export const AppLayout = ({
  sidebarWidth,
  detailWidth,
  onSidebarResizeStart,
  onDetailResizeStart,
  sidebar,
  main,
  detail,
}: AppLayoutProps) => {
  return (
    <div
      className="relative grid flex-1 gap-0 overflow-hidden"
      style={{
        gridTemplateColumns: `${sidebarWidth}px minmax(0, 1fr) ${detailWidth}px`,
      }}
    >
      <div
        className="absolute left-0 top-0 z-20 h-full w-2 cursor-col-resize bg-transparent transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-border)]"
        style={{ left: sidebarWidth - 1 }}
        onMouseDown={onSidebarResizeStart}
        role="presentation"
      />
      <div
        className="absolute top-0 z-20 h-full w-2 cursor-col-resize bg-transparent transition-colors duration-[var(--motion-fast)] hover:bg-[var(--panel-border)]"
        style={{ right: detailWidth - 1 }}
        onMouseDown={onDetailResizeStart}
        role="presentation"
      />
      {sidebar}
      {main}
      {detail}
    </div>
  );
};
