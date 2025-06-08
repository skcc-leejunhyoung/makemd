import React, { useMemo, useRef, useContext, useState } from "react";
import { Superstate } from "makemd-core";
import { DBRows } from "shared/types/mdb";
import { parseDate } from "core/utils/date";
import { ContextEditorContext } from "core/react/context/ContextEditorContext";
import { useContext as useReactContext } from "react";
import { SpaceContext } from "core/react/context/SpaceContext";
import { Predicate } from "shared/types/predicate";
import { sortFnTypes } from "core/utils/contexts/predicate/sort";
import { Sidebar } from "./components/Sidebar";
import { TimelineHeader } from "./components/TimelineHeader";
import { TimelineBarGroup } from "./components/TimelineBarGroup";

export const TimelineView = (props: {
  superstate: Superstate;
  data?: DBRows;
  field?: string; // Start date field name
  fieldEnd?: string; // End date field name
  header?: boolean;
}) => {
  // Sidebar width state
  const [sidebarWidth, setSidebarWidth] = useState(200);
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar open/close state
  const sidebarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Drag handler
  const onMouseDown = () => {
    setDragging(true);
    document.body.style.cursor = "col-resize";
  };
  React.useEffect(() => {
    if (!dragging) return;
    const onMouseMove = (e: MouseEvent) => {
      const min = 100, max = 400;
      const newWidth = Math.max(min, Math.min(max, e.clientX - (sidebarRef.current?.getBoundingClientRect().left ?? 0)));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      setDragging(false);
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

  // Get data/predicate from Context like TableView
  const context = useContext(ContextEditorContext);
  const data = useMemo(() => props.data ?? context?.data ?? [], [props.data, context?.data]);
  const predicate: Partial<Predicate> = context?.predicate ?? {};
  const field = props.field ?? predicate?.listViewProps?.start ?? "start";
  const fieldEnd = props.fieldEnd ?? predicate?.listViewProps?.end ?? "end";

  // Calculate timeline display period (4 months before and after today, with dynamic extension)
  const today = useMemo(() => new Date(), []);
  const [timelineRange, setTimelineRange] = useState(() => {
    const start = new Date(today);
    start.setMonth(today.getMonth() - 4);
    const end = new Date(today);
    end.setMonth(today.getMonth() + 4);
    return { start, end };
  });

  const days = useMemo(() => {
    const arr = [];
    // Adjust by actual days since month movement can cause date issues
    const startTime = timelineRange.start.getTime();
    for (let d = new Date(startTime); d <= timelineRange.end; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d));
    }
    return arr;
  }, [timelineRange]);

  // Filters only reference context.predicate.filters
  const filteredData = useMemo(() => {
    const filters = context?.predicate?.filters ?? [];
    if (!filters.length) return data;
    return data.filter(row =>
      filters.every(f => (row[f.field] ?? "").toString().includes(f.value))
    );
  }, [data, context?.predicate?.filters]);

  // Sorting is only controlled by FilterBar, so use predicate.sort directly
  const sortedData = useMemo(() => {
    if (!predicate.sort || predicate.sort.length === 0) return filteredData;
    const sortField = predicate.sort[0].field;
    const sortFn = predicate.sort[0].fn;
    const sortType = sortFnTypes[sortFn];
    if (!sortType) return filteredData;
    return [...filteredData].sort((a, b) => {
      return sortType.fn(a[sortField], b[sortField]);
    });
  }, [filteredData, predicate.sort]);

  // Grouping also only references context.predicate.groupBy
  const groupedData = useMemo(() => {
    const groupBy = context?.predicate?.groupBy?.[0];
    if (!groupBy) return { "": sortedData };
    const groups: Record<string, typeof sortedData> = {};
    sortedData.forEach(row => {
      const key = row[groupBy] ?? "(none)";
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [sortedData, context?.predicate?.groupBy]);


  // Bars calculation is also based on groupedData, operating on days array
  const barsByGroup = useMemo(() => {
    const result: Record<string, any[]> = {};
    Object.entries(groupedData).forEach(([group, rows]) => {
      result[group] = rows.map((row, idx) => {
        let start = parseDate(row[field]);
        let end = parseDate(row[fieldEnd]);
        if (!start || isNaN(start.getTime())) start = today;
        if (!end || isNaN(end.getTime())) end = start;
        return { idx, start, end, row };
      });
    });
    return result;
  }, [groupedData, field, fieldEnd, today]);

  // Calculate month header information
  const months = useMemo(() => {
    const result: { idx: number; month: number; year: number; date: Date }[] = [];
    days.forEach((d, i) => {
      if (d.getDate() === 1) {
        result.push({ idx: i, month: d.getMonth() + 1, year: d.getFullYear(), date: new Date(d) });
      }
    });
    if (days[0].getDate() !== 1) {
      result.unshift({ idx: 0, month: days[0].getMonth() + 1, year: days[0].getFullYear(), date: new Date(days[0]) });
    }
    return result;
  }, [days]);

  // Timeline scroll area ref
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  // scrollLeft state management
  const [scrollLeft, setScrollLeft] = useState(0);

  // Calculate today's date index
  const todayIdx = useMemo(() => {
    return days.findIndex((d) => d.toDateString() === today.toDateString());
  }, [days, today]);

  // Scroll to center today's date on mount
  React.useEffect(() => {
    if (timelineScrollRef.current && todayIdx >= 0) {
      const viewportWidth = timelineScrollRef.current.clientWidth;
      const targetScroll = todayIdx * 40 - viewportWidth / 2;
      timelineScrollRef.current.scrollLeft = Math.max(0, targetScroll);
    }
  }, [todayIdx]);

  // Current month state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(today));
  
  // Prevent multiple extensions in quick succession
  const extensionInProgress = useRef(false);

  // Maintain scroll position when timeline is extended
  const prevTimelineRange = useRef(timelineRange);
  const viewportDateBeforeExtension = useRef<Date | null>(null);
  
  React.useEffect(() => {
    if (timelineScrollRef.current && viewportDateBeforeExtension.current) {
      const prevStart = prevTimelineRange.current.start.getTime();
      const currentStart = timelineRange.start.getTime();
      
      // If timeline was extended backward (start date moved earlier)
      if (currentStart < prevStart) {
        // Find the index of the date that was in the viewport before extension
        const targetDateIndex = days.findIndex(d => 
          d.toDateString() === viewportDateBeforeExtension.current!.toDateString()
        );
        
        if (targetDateIndex >= 0) {
          // Set scroll position to show the same date that was visible before
          timelineScrollRef.current.scrollLeft = targetDateIndex * 40;
        }
      }
      // Reset the saved viewport date
      viewportDateBeforeExtension.current = null;
    }
    prevTimelineRange.current = timelineRange;
  }, [timelineRange, days]);

  // Calculate current month on scroll + update scrollLeft state + extend timeline when needed
  React.useEffect(() => {
    const scrollEl = timelineScrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      // Calculate date index visible at the left edge of scroll
      const scrollLeftVal = scrollEl.scrollLeft;
      setScrollLeft(scrollLeftVal);
      const dayIdx = Math.floor(scrollLeftVal / 40);
      const day = days[dayIdx] || today;
      setCurrentMonth(new Date(day));

      // Check if we need to extend the timeline
      const scrollWidth = scrollEl.scrollWidth;
      const clientWidth = scrollEl.clientWidth;
      const scrollRight = scrollLeftVal + clientWidth;
      const extensionThreshold = 30 * 40; // 30 days worth of pixels
      
      // If scrolled near the end, extend forward
      if (scrollRight > scrollWidth - extensionThreshold && !extensionInProgress.current) {
        extensionInProgress.current = true;
        // Save current viewport date before extension
        const currentViewportDayIdx = Math.floor(scrollLeftVal / 40);
        viewportDateBeforeExtension.current = days[currentViewportDayIdx] || today;
        setTimelineRange(prev => {
          const newEnd = new Date(prev.end);
          newEnd.setMonth(newEnd.getMonth() + 4);
          return { ...prev, end: newEnd };
        });
        setTimeout(() => { extensionInProgress.current = false; }, 1000);
      }
      
      // If scrolled near the beginning, extend backward
      if (scrollLeftVal < extensionThreshold && !extensionInProgress.current) {
        extensionInProgress.current = true;
        // Save current viewport date before extension
        const currentViewportDayIdx = Math.floor(scrollLeftVal / 40);
        viewportDateBeforeExtension.current = days[currentViewportDayIdx] || today;
        setTimelineRange(prev => {
          const newStart = new Date(prev.start);
          newStart.setMonth(newStart.getMonth() - 4);
          return { start: newStart, end: prev.end };
        });
        setTimeout(() => { extensionInProgress.current = false; }, 1000);
      }
    };
    scrollEl.addEventListener("scroll", onScroll);
    // Set once initially as well
    onScroll();
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [days, today]);

  const space = useReactContext(SpaceContext);
  const readMode = space?.readMode;

  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<string | null>(null);

  return (
    <div className="mk-timeline-view" style={{ display: "flex", width: "100%", height: "100%" }}>
      <Sidebar
        sidebarWidth={sidebarWidth}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarRef={sidebarRef}
        dragRef={dragRef}
        dragging={dragging}
        onMouseDown={onMouseDown}
        barsByGroup={barsByGroup}
        context={context}
        superstate={props.superstate}
        space={space}
        readMode={readMode}
        selectedColumn={selectedColumn}
        setSelectedColumn={setSelectedColumn}
        lastSelectedIndex={lastSelectedIndex}
        setLastSelectedIndex={setLastSelectedIndex}
      />
      
      {/* Right timeline scroll area */}
      <div style={{ flex: 1, overflowX: "auto", position: "relative" }} ref={timelineScrollRef}>
        <TimelineHeader
          currentMonth={currentMonth}
          months={months}
          days={days}
          scrollLeft={scrollLeft}
        />
        
        {/* Timeline bar area */}
        <div style={{ display: "flex", flexDirection: "column", marginBottom: 16 }}>
          {Object.entries(barsByGroup).map(([group, bars]) => (
            <TimelineBarGroup
              key={group}
              group={group}
              bars={bars}
              days={days}
              superstate={props.superstate}
              context={context}
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 