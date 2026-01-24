import { useCallback, useEffect, useRef } from "react";
import { useStickyState } from "./useStickyState";
import { parseDetailWidth } from "../utils/storage";
import { useResizable } from "./useResizable";

export const useDetailPanel = () => {
  const [detailWidth, setDetailWidth] = useStickyState(
    "muro-detail-width",
    320,
    {
      parse: parseDetailWidth,
      serialize: (value) => String(value),
    }
  );
  const [detailCollapsed, setDetailCollapsed] = useStickyState(
    "muro-detail-collapsed",
    false,
    {
      parse: (raw) => raw === "true",
      serialize: (value) => String(value),
    }
  );
  const detailWidthRef = useRef(detailWidth);
  const { startResize } = useResizable();

  useEffect(() => {
    if (detailCollapsed) {
      return;
    }

    detailWidthRef.current = detailWidth;
  }, [detailCollapsed, detailWidth]);

  const toggleDetailCollapsed = useCallback(() => {
    if (!detailCollapsed) {
      detailWidthRef.current = detailWidth;
      setDetailWidth(56);
      setDetailCollapsed(true);
    } else {
      setDetailWidth(detailWidthRef.current || 320);
      setDetailCollapsed(false);
    }
  }, [detailCollapsed, detailWidth, setDetailCollapsed, setDetailWidth]);

  const startDetailResize = useCallback(
    (event: React.MouseEvent) => {
      startResize(
        event,
        detailWidth,
        (nextWidth) => {
          setDetailWidth(Math.min(420, nextWidth));
        },
        { minSize: 200, maxSize: 420, direction: -1 }
      );
    },
    [detailWidth, setDetailWidth, startResize]
  );

  return {
    detailCollapsed,
    detailWidth,
    setDetailWidth,
    startDetailResize,
    toggleDetailCollapsed,
  };
};
