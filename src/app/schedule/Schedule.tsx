"use client";

import React, { useLayoutEffect, useRef, useState, useMemo } from "react";
import {
  format,
  parseISO,
  differenceInMinutes,
  addMinutes,
} from "date-fns";

export interface Event {
  EventStart: string;
  EventEnd: string;
  EventName: string;
  Room: string;
}

export interface Capacity {
  LocationName: string;
  LastCount: number;
  TotalCapacity: number;
  LastUpdatedDateAndTime: string;
}

interface ScheduleProps {
  events: Event[];
  capacities: Capacity[];
}

const Schedule: React.FC<ScheduleProps> = ({ events, capacities }) => {
  // Ref for measuring the grid body height (excluding headers)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  // Using useLayoutEffect ensures we measure after layout is done.
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // ---------------------------------------------------------------------------
  // 1. Room Columns & Mappings (Fixed Order)
  // ---------------------------------------------------------------------------
  const columns = [
    "Court #1",
    "Court #2",
    "Court #3",
    "Studio A",
    "Studio B",
    "Studio C",
  ];

  const eventRoomToColumn: Record<string, string> = {
    "BB Court #1": "Court #1",
    "BB Court #2": "Court #2",
    "BB Court #3": "Court #3",
    "Studio A - wood floor": "Studio A",
    "Studio B - wood floor": "Studio B",
    "Studio C - Revolutionz": "Studio C",
  };

  const eventsByColumn = useMemo(() => {
    const grouping: Record<string, Event[]> = {};
    columns.forEach((col) => (grouping[col] = []));
    events.forEach((event) => {
      const col = eventRoomToColumn[event.Room];
      if (col) {
        grouping[col].push(event);
      }
    });
    return grouping;
  }, [events]);

  // ---------------------------------------------------------------------------
  // 2. Capacities Assignment
  // ---------------------------------------------------------------------------
  const capacitiesByColumn = useMemo(() => {
    const grouping: Record<string, Capacity | null> = {};
    // Initialize all columns with null.
    columns.forEach((col) => (grouping[col] = null));

    capacities.forEach((cap) => {
      if (cap.LocationName === "Marino Center - Gymnasium") {
        grouping["Court #1"] = cap;
        grouping["Court #2"] = cap;
        grouping["Court #3"] = cap;
      } else if (cap.LocationName === "Marino Center - Studio A") {
        grouping["Studio A"] = cap;
      } else if (cap.LocationName === "Marino Center - Studio B") {
        grouping["Studio B"] = cap;
      } else if (cap.LocationName === "Marino Center - Studio C") {
        grouping["Studio C"] = cap;
      }
    });
    return grouping;
  }, [capacities]);

  // ---------------------------------------------------------------------------
  // 3. Dynamic Timeline & Hourly Time Slots
  // ---------------------------------------------------------------------------
  const { scheduleStart, scheduleEnd } = useMemo(() => {
    if (events.length === 0) {
      const now = new Date();
      return {
        scheduleStart: new Date(now.setHours(5, 0, 0, 0)),
        scheduleEnd: new Date(now.setHours(24, 0, 0, 0)),
      };
    }
    const eventStarts = events.map((event) => parseISO(event.EventStart));
    const eventEnds = events.map((event) => parseISO(event.EventEnd));
    const minStart = new Date(Math.min(...eventStarts.map((d) => d.getTime())));
    const maxEnd = new Date(Math.max(...eventEnds.map((d) => d.getTime())));

    // Round down the earliest start to the nearest hour.
    minStart.setMinutes(0, 0, 0);

    // Round up the latest end to the next hour if needed.
    if (maxEnd.getMinutes() !== 0 || maxEnd.getSeconds() !== 0) {
      maxEnd.setHours(maxEnd.getHours() + 1, 0, 0, 0);
    }
    return { scheduleStart: minStart, scheduleEnd: maxEnd };
  }, [events]);

  const totalMinutes = differenceInMinutes(scheduleEnd, scheduleStart);

  const timeSlots = useMemo(() => {
    const slots = [];
    let current = scheduleStart;
    while (current <= scheduleEnd) {
      slots.push(new Date(current));
      current = addMinutes(current, 60);
    }
    return slots;
  }, [scheduleStart, scheduleEnd]);

  // Compute each event’s style (top offset and height) relative to the grid body.
  const getEventStyle = (event: Event) => {
    const start = parseISO(event.EventStart);
    const end = parseISO(event.EventEnd);
    const minutesFromStart = differenceInMinutes(start, scheduleStart);
    const durationMinutes = differenceInMinutes(end, start);
    const top = (minutesFromStart / totalMinutes) * containerHeight;
    const height = (durationMinutes / totalMinutes) * containerHeight;
    return { top: `${top}px`, height: `${height}px` };
  };

  // ---------------------------------------------------------------------------
  // 4. Render Layout with header and separate grid body
  // ---------------------------------------------------------------------------
  return (
    <main className="absolute inset-0 flex flex-col">
      {/* Header Row */}
      <div className="grid" style={{ gridTemplateColumns: "80px repeat(6, 1fr)" }}>
        {/* Time Header */}
        <div className="border-r border-gray-300">
          <div className="h-10 border-b border-gray-300 flex items-center justify-center font-semibold bg-gray-100">
            Time
          </div>
        </div>
        {/* Room Headers */}
        {columns.map((col) => (
          <div key={col} className="border-r border-gray-300">
            <div className="h-10 border-b border-gray-300 bg-gray-100 flex flex-col items-center justify-center">
              <span className="font-semibold text-sm">{col}</span>
              {capacitiesByColumn[col] && (
                <span className="text-xs">
                  {capacitiesByColumn[col]!.LastCount}/{capacitiesByColumn[col]!.TotalCapacity}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <div className="grid h-full" style={{ gridTemplateColumns: "80px repeat(6, 1fr)" }}>
          {/* Time Column */}
          <div className="border-r border-gray-300">
            <div className="relative h-full">
            {timeSlots.map((slot, index) => {
              const slotTop =
                (differenceInMinutes(slot, scheduleStart) / totalMinutes) * containerHeight;
              return (
                <div
                  key={index}
                  style={{
                    top: `${slotTop}px`,
                    position: "absolute",
                    width: "100%",
                    borderTop: "1px solid #e5e7eb", // Add border here
                  }}
                  className="text-xs text-gray-600 pl-1"
                >
                  {format(slot, "h:mm a")}
                </div>
              );
            })}
            </div>
          </div>
          
          {/* Room Columns */}
          {columns.map((col) => (
            <div key={col} className="border-r border-gray-300 relative">
              <div className="relative h-full">
                {timeSlots.map((slot, index) => {
                  const slotTop =
                    (differenceInMinutes(slot, scheduleStart) / totalMinutes) *
                    containerHeight;
                  return (
                    <div
                      key={index}
                      style={{
                        top: `${slotTop}px`,
                        position: "absolute",
                        left: 0,
                        right: 0,
                        borderTop: "1px solid #e5e7eb",
                      }}
                    ></div>
                  );
                })}
                {eventsByColumn[col].map((event, idx) => (
                  <div
                    key={idx}
                    className="absolute left-1 right-1 bg-blue-200 border border-blue-300 rounded p-1 text-xs overflow-hidden"
                    style={getEventStyle(event)}
                    title={`${event.EventName} (${format(
                      parseISO(event.EventStart),
                      "h:mm a"
                    )} - ${format(parseISO(event.EventEnd), "h:mm a")})`}
                  >
                    <div className="font-bold truncate">{event.EventName}</div>
                    <div className="text-gray-700">
                      {format(parseISO(event.EventStart), "h:mm a")} -{" "}
                      {format(parseISO(event.EventEnd), "h:mm a")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Schedule;
