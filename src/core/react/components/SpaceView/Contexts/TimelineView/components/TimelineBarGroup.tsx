import React from "react";
import { Superstate } from "makemd-core";
import { TimelineBar } from "./TimelineBar";

interface TimelineBarGroupProps {
  group: string;
  bars: Array<{
    idx: number;
    start: Date;
    end: Date;
    row: any;
  }>;
  days: Date[];
  superstate: Superstate;
  context: any;
}

export const TimelineBarGroup: React.FC<TimelineBarGroupProps> = ({
  group,
  bars,
  days,
  superstate,
  context,
}) => {
  return (
    <React.Fragment>
      {group && (
        <div
          style={{
            fontWeight: "bold",
            background: "var(--mk-ui-background-variant)",
            padding: "2px 8px",
          }}
        >
          {group}
        </div>
      )}
      {bars.map((bar, i) => (
        <TimelineBar
          key={i}
          bar={bar}
          days={days}
          superstate={superstate}
          context={context}
        />
      ))}
    </React.Fragment>
  );
}; 