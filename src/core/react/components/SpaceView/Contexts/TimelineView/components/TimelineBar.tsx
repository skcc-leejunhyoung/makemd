import React from "react";
import { Superstate } from "makemd-core";
import { PathPropertyName } from "shared/types/context";
import { PathStickerView } from "shared/components/PathSticker";
import { showRowContextMenu } from "core/react/components/UI/Menus/contexts/rowContextMenu";

interface TimelineBarProps {
  bar: {
    idx: number;
    start: Date;
    end: Date;
    row: any;
  };
  days: Date[];
  superstate: Superstate;
  context: any;
}

export const TimelineBar: React.FC<TimelineBarProps> = ({
  bar,
  days,
  superstate,
  context,
}) => {
  const startIdx = days.findIndex((d) => d.toDateString() === bar.start.toDateString());
  const endIdx = days.findIndex((d) => d.toDateString() === bar.end.toDateString());
  const path = bar.row[PathPropertyName];

  const handleClick = () => {
    if (path) {
      superstate.ui.openPath(path, false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (path) {
      e.preventDefault();
      showRowContextMenu(
        e,
        superstate,
        context.source,
        context.dbSchema?.id,
        parseInt(bar.row._index)
      );
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", height: 36 }}>
      {/* 왼쪽 여백 (사이드바와 맞춤) */}
      <div style={{ minWidth: 0, width: 0 }}></div>
      
      {/* 바 */}
      <div
        style={{ position: "relative", width: days.length * 40 }}
        onClick={handleClick}
      >
        {startIdx >= 0 && endIdx >= 0 && (
          <div
            style={{
              position: "absolute",
              top: -8,
              left: startIdx * 40,
              width: Math.max((endIdx - startIdx + 1) * 40, 40),
              height: 32,
              background: "var(--mk-ui-background-hover)",
              borderRadius: 8,
              opacity: 0.8,
              cursor: path ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              paddingLeft: 12,
              color: "var(--mk-ui-text-primary)",
              fontWeight: 500,
              fontSize: 14,
              whiteSpace: "nowrap",
            }}
          >
            {path && superstate.pathsIndex.get(path) && (
              <div
                style={{
                  ["--icon-size"]: "20px",
                  ["--icon-container-size"]: "24px",
                } as React.CSSProperties}
              >
                <PathStickerView
                  superstate={superstate}
                  pathState={superstate.pathsIndex.get(path)}
                />
              </div>
            )}
            <span
              style={{ marginLeft: 6, color: "var(--mk-ui-text-primary)" }}
              onContextMenu={handleContextMenu}
            >
              {path ? (path.split("/").pop()?.replace(/\.[^/.]+$/, "") ?? "") : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}; 