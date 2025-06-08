import React from "react";
import { Superstate } from "makemd-core";
import { SidebarRow } from "./SidebarRow";
import { newPathInSpace } from "core/superstate/utils/spaces";
import { defaultContextSchemaID } from "shared/schemas/context";
import { deletePath } from "core/superstate/utils/path";
import { ConfirmationModal } from "core/react/components/UI/Modals/ConfirmationModal";
import { PathPropertyName } from "shared/types/context";
import i18n from "shared/i18n";

interface SidebarProps {
  sidebarWidth: number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  sidebarRef: React.RefObject<HTMLDivElement>;
  dragRef: React.RefObject<HTMLDivElement>;
  dragging: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  barsByGroup: Record<string, Array<{
    idx: number;
    start: Date;
    end: Date;
    row: any;
  }>>;
  context: any;
  superstate: Superstate;
  space: any;
  readMode: boolean;
  selectedColumn: string | null;
  setSelectedColumn: (column: string | null) => void;
  lastSelectedIndex: string | null;
  setLastSelectedIndex: (index: string | null) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarWidth,
  sidebarOpen,
  setSidebarOpen,
  sidebarRef,
  dragRef,
  dragging,
  onMouseDown,
  barsByGroup,
  context,
  superstate,
  space,
  readMode,
  setSelectedColumn,
  lastSelectedIndex,
  setLastSelectedIndex,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 커맨드/컨트롤 + Delete(Backspace 포함) 감지
    if ((e.metaKey || e.ctrlKey) && (e.key === "Backspace" || e.key === "Delete")) {
      const selectedRows = context?.selectedRows ?? [];
      if (selectedRows.length === 0) return;
      
      // 선택된 row에서 path 추출
      const selectedPaths: string[] = [];
      Object.values(barsByGroup).forEach(bars => {
        bars.forEach(bar => {
          if (selectedRows.includes(bar.row._index)) {
            const path = bar.row[PathPropertyName];
            if (path) selectedPaths.push(path);
          }
        });
      });
      
      if (selectedPaths.length === 0) return;
      
      // 삭제 모달 표시
      superstate.ui.openModal(
        i18n.labels.deleteFiles,
        <ConfirmationModal
          confirmAction={async () => {
            for (const path of selectedPaths) {
              await deletePath(superstate, path);
            }
            if (selectedPaths.length === 1 && context?.source) {
              await superstate.reloadContextByPath(context.source, { force: true, calculate: true });
            }
          }}
          confirmLabel={i18n.buttons.delete}
          message={i18n.descriptions.deleteFiles.replace("${1}", String(selectedPaths.length))}
        />,
        window
      );
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleNewItemKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = (e.currentTarget as HTMLElement).innerText.trim();
      if (value.length > 0) {
        const primaryCol = context?.cols?.find((f: any) => f.primary === "true");
        if (context?.dbSchema?.id === defaultContextSchemaID) {
          newPathInSpace(superstate, space.spaceState, "md", value, true);
        } else if (primaryCol) {
          context?.updateRow?.({ [primaryCol.name]: value }, -1);
        } else {
          context?.updateRow?.({ name: value }, -1);
        }
        (e.currentTarget as HTMLElement).innerText = "";
      }
    }
  };

  return (
    <div
      ref={sidebarRef}
      style={{
        width: sidebarOpen ? sidebarWidth : 36,
        minWidth: 36,
        maxWidth: 400,
        borderRight: "1px solid var(--mk-ui-divider)",
        position: "sticky",
        left: 0,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        userSelect: dragging ? "none" : undefined,
        background: "var(--mk-ui-background)",
        transition: "width 0.2s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* 사이드바 토글 버튼 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 30,
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--mk-ui-background)",
          cursor: "pointer",
          transition: "right 0.2s cubic-bezier(.4,0,.2,1)",
        }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <span style={{ fontSize: 18 }}>&laquo;</span> : <span style={{ fontSize: 18 }}>&raquo;</span>}
      </div>
      
      {/* 상단 여백 (월/일 헤더 높이만큼) */}
      <div style={{ height: 48, minHeight: 48 }} />
      
      {/* 그룹별 파일명 리스트 */}
      {sidebarOpen && (
        <div
          className="mk-table"
          tabIndex={1}
          style={{ outline: "none" }}
          onKeyDown={handleKeyDown}
        >
          {Object.entries(barsByGroup).map(([group, bars]) => (
            <React.Fragment key={group}>
              {group && (
                <div style={{ fontWeight: "bold", background: "var(--mk-ui-background-variant)", padding: "2px 8px" }}>
                  {group}
                </div>
              )}
              {bars.map((bar, i) => (
                <SidebarRow
                  key={i}
                  bar={bar}
                  index={i}
                  bars={bars}
                  context={context}
                  superstate={superstate}
                  lastSelectedIndex={lastSelectedIndex}
                  setLastSelectedIndex={setLastSelectedIndex}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
      
      {/* 새 항목 추가 입력창 */}
      {!readMode && sidebarOpen && (
        <div
          className="mk-row-new"
          style={{
            minHeight: 32,
            display: "flex",
            alignItems: "center",
            padding: "0 8px",
            fontSize: 14,
            color: "var(--mk-ui-text-tertiary)",
            border: "none",
            outline: "none",
            cursor: "text",
            background: "var(--mk-ui-background)",
          }}
          contentEditable={true}
          suppressContentEditableWarning={true}
          data-placeholder={i18n.hintText.newItem}
          onFocus={() => {
            setSelectedColumn(null);
            setLastSelectedIndex(null);
          }}
          onKeyPress={handleNewItemKeyPress}
        />
      )}
      
      {/* 드래그 핸들 */}
      {sidebarOpen && (
        <div
          ref={dragRef}
          onMouseDown={onMouseDown}
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 6,
            height: "100%",
            cursor: "col-resize",
            zIndex: 20,
            background: dragging ? "#e0e0e0" : "transparent",
          }}
        />
      )}
    </div>
  );
}; 