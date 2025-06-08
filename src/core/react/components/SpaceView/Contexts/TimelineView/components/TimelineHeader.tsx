import React from "react";

interface TimelineHeaderProps {
  currentMonth: Date;
  months: { idx: number; month: number; year: number; date: Date }[];
  days: Date[];
  scrollLeft: number;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  currentMonth,
  months,
  days,
  scrollLeft,
}) => {
  // Format current month as "March 2025"
  const formatMonth = (date: Date) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <>
      {/* 현재 월 sticky 헤더 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          zIndex: 20,
          background: "var(--mk-ui-background-variant)",
          height: 24,
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          fontSize: 16,
          borderBottom: "1px solid var(--mk-ui-divider)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          paddingLeft: 8,
        }}
      >
        {formatMonth(currentMonth)}
      </div>
      
      {/* 날짜 헤더 (일만) + 1일 위에 월 라벨 */}
      <div style={{ position: "relative" }}>
        {/* 1일에 해당하는 곳마다 월 라벨 표시 (absolute) */}
        {months.map(({ idx, month, year, date }) =>
          idx * 40 - scrollLeft >= 2 ? (
            <div
              key={"month-label-" + idx}
              style={{
                position: "absolute",
                left: idx * 40,
                top: -25,
                minWidth: 200,
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 16,
                background: "var(--mk-ui-background-variant)",
                zIndex: 30,
                padding: "0 4px",
                display: "flex",
                alignItems: "center",
                height: 24,
                pointerEvents: "none",
              }}
            >
              {formatMonth(date)}
            </div>
          ) : null
        )}
        
        <div
          style={{
            display: "flex",
            position: "sticky",
            top: 24,
            background: "transparent",
            zIndex: 1,
          }}
        >
          <div style={{ minWidth: 0, width: 0 }}></div>
          {days.map((d, i) => (
            <div
              key={i}
              style={{
                minWidth: 40,
                textAlign: "center",
                borderRight: "1px solid #eee",
                fontSize: 12,
              }}
            >
              {d.getDate()}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}; 