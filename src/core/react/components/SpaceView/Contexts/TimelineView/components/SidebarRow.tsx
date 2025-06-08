import React from "react";
import { Superstate } from "makemd-core";
import { PathPropertyName } from "shared/types/context";
import { PathCrumb } from "core/react/components/UI/Crumbs/PathCrumb";
import { showRowContextMenu } from "core/react/components/UI/Menus/contexts/rowContextMenu";
import { triggerMultiPathMenu } from "core/react/components/UI/Menus/navigator/pathContextMenu";
import { selectRange } from "core/utils/ui/selection";

interface SidebarRowProps {
  bar: {
    idx: number;
    start: Date;
    end: Date;
    row: any;
  };
  index: number;
  bars: Array<{
    idx: number;
    start: Date;
    end: Date;
    row: any;
  }>;
  context: any;
  superstate: Superstate;
  lastSelectedIndex: string | null;
  setLastSelectedIndex: (index: string | null) => void;
}

export const SidebarRow: React.FC<SidebarRowProps> = ({
  bar,
  index,
  bars,
  context,
  superstate,
  lastSelectedIndex,
  setLastSelectedIndex,
}) => {
  const path = bar.row[PathPropertyName];
  const isActive = context?.selectedRows?.includes(bar.row._index);

  const handleClick = (e: React.MouseEvent) => {
    const modifiers = {
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
      doubleClick: e.detail === 2,
    };

    if (modifiers.ctrlKey || modifiers.metaKey) {
      context?.selectedRows?.some((f: string) => f == bar.row._index)
        ? context?.selectRows(
            null,
            context.selectedRows.filter((f: string) => f != bar.row._index)
          )
        : context?.selectRows(
            bar.row._index,
            [...(context.selectedRows ?? []), bar.row._index]
          );
    } else if (modifiers.shiftKey) {
      context?.selectRows(
        bar.row._index,
        [
          ...(context.selectedRows ?? []),
          ...selectRange(
            lastSelectedIndex ?? bar.row._index,
            bar.row._index,
            bars.map(b => b.row._index)
          ),
        ]
      );
    } else {
      context?.selectRows(bar.row._index, [bar.row._index]);
    }
    setLastSelectedIndex(bar.row._index);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // 다중 선택된 row가 2개 이상이고 모두 파일이면 triggerMultiPathMenu 사용
    const selectedRows = (context?.selectedRows ?? []).map((idx: string) => bars.find((b: any) => b.row._index === idx));
    const selectedPaths = selectedRows
      .filter((b: any) => b && b.row[PathPropertyName])
      .map((b: any) => {
        const path = b.row[PathPropertyName];
        const item = superstate.pathsIndex.get(path);
        return {
          id: path,
          parentId: item?.parent ?? "",
          depth: 0,
          index: 0,
          space: item?.spaces?.[0] ?? "",
          sortable: false,
          type: 'file' as const,
          path,
          item,
          childrenCount: 0,
          collapsed: false,
          rank: item?.rank ?? 0,
        };
      });
    
    if (selectedPaths.length > 1 && selectedPaths.length === selectedRows.length) {
      triggerMultiPathMenu(superstate, selectedPaths, e);
      return;
    }
    
    if (context && path) {
      showRowContextMenu(
        e,
        superstate,
        context.source,
        context.dbSchema?.id,
        parseInt(bar.row._index)
      );
    }
  };

  const handlePathClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.metaKey || e.ctrlKey) {
      // 다중 선택된 row가 2개 이상이고, 현재 row가 포함되어 있으면 모두 새 패널로 열기
      const selectedRows = context?.selectedRows ?? [];
      if (selectedRows.length > 1 && selectedRows.includes(bar.row._index)) {
        selectedRows.forEach((idx: string) => {
          const targetBar = bars.find((b: any) => b.row._index === idx);
          const targetPath = targetBar?.row[PathPropertyName];
          if (targetPath) {
            superstate.ui.openPath(targetPath, true);
          }
        });
        return;
      }
      // 아니면 현재 row만 새 패널로 열기
      superstate.ui.openPath(path, true);
    } else {
      superstate.ui.openPath(path, false);
    }
  };

  return (
    <div
      className={`mk-cell-link${isActive ? " mk-active" : ""}`}
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontSize: 14,
        cursor: "pointer",
        width: "100%",
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* 파일명 버튼 부분 */}
      {path ? (
        <PathCrumb
          superstate={superstate}
          path={path}
          onClick={handlePathClick}
        />
      ) : (
        <span>{bar.row.name || bar.row.title || `Event ${index + 1}`}</span>
      )}
    </div>
  );
}; 