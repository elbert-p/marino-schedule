"use client";

import React, { useLayoutEffect, useRef, useState, useMemo, useEffect } from "react";
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
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const getTextWidth = (text: string, font: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return 0;
    context.font = font;
    return context.measureText(text).width;
  };

  // Current time state for red line (updates every minute)
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // update every minute (adjust as needed)
    return () => clearInterval(intervalId);
  }, []);

  // Using useLayoutEffect ensures we measure after layout is done.
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);
  
  const timeColumnWidth = containerDimensions.width < 640 ? 42 : 70;
  const timeColumnFormat = containerDimensions.width < 640 ? "h a" : "h:mm a";


  // ---------------------------------------------------------------------------
  // 1. Room Columns & Mappings (Fixed Order)
  // ---------------------------------------------------------------------------
  const allColumns = useMemo(() => [
    "Court #1", "Court #2", "Court #3", 
    "Studio A", "Studio B", "Studio C"
  ], []);
  
  const columns = useMemo(() => {
    return (containerDimensions.width < 640 && containerDimensions.width !== 0) ? allColumns.slice(0, 3) : allColumns;
  }, [containerDimensions.width, allColumns]);

  const eventRoomToColumn: Record<string, string> = {
    "BB Court #1": "Court #1",
    "BB Court #2": "Court #2",
    "BB Court #3": "Court #3",
    "Studio A - wood floor": "Studio A",
    "Studio B - wood floor": "Studio B",
    "Studio C - Revolutionz": "Studio C",
  };

  const eventColorMap = [
    { 
      patterns: ['Open Basketball'],
      color: 'bg-blue-200',
      borderColor: 'border-blue-300' 
    },
    { 
      patterns: ['Open'],
      color: 'bg-green-200',
      borderColor: 'border-green-300'
    },
    { 
      patterns: ['Group Fitness'],
      color: 'bg-sky-200',
      borderColor: 'border-sky-300'
    },
    // { 
    //   patterns: ['Intramural'],
    //   color: 'bg-orange-200',
    //   borderColor: 'border-orange-300'
    // },
    { 
      patterns: ['Club', 'Varsity', 'Intramural'],
      color: 'bg-red-200',
      borderColor: 'border-red-300'
    },
  ];
  const defaultColor = {color: 'bg-cyan-200', borderColor: 'border-cyan-300'};

  // Helper function to find matching color
  const getEventColor = (eventName: string) => {
    const match = eventColorMap.find(({ patterns }) => 
      patterns.some(pattern => eventName.includes(pattern))
    );
    return match ? { 
      color: match.color,
      borderColor: match.borderColor
    } : defaultColor;
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
    
    // Filter out "Open Basketball" events.
    const nonOpenBBEvents = events.filter(
      (event) => event.EventName !== "Open Basketball"
    );
    let earliestEventStart: Date;
    if (nonOpenBBEvents.length > 0) {
      const eventStarts = nonOpenBBEvents.map((event) => parseISO(event.EventStart));
      earliestEventStart = new Date(Math.min(...eventStarts.map((d) => d.getTime())));
      // Buffer for earliest start time (e.g., at least 30 mins before the first event).
      earliestEventStart = addMinutes(earliestEventStart, -30);
    } else {
      // Fallback: if all events are "Open Basketball", use the earliest event start.
      const eventStarts = events.map((event) => parseISO(event.EventStart));
      earliestEventStart = new Date(Math.min(...eventStarts.map((d) => d.getTime())));
    }
    // Round down to the nearest hour.
    earliestEventStart.setMinutes(0, 0, 0);
    const scheduleStart = earliestEventStart;

    const eventEnds = events.map((event) => parseISO(event.EventEnd));
    const maxEnd = new Date(Math.max(...eventEnds.map((d) => d.getTime())));
    if (maxEnd.getMinutes() !== 0 || maxEnd.getSeconds() !== 0) {
      maxEnd.setHours(maxEnd.getHours() + 1, 0, 0, 0);
    }
    const scheduleEnd = maxEnd;
    
    return { scheduleStart, scheduleEnd };
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
    const top = (minutesFromStart / totalMinutes) * containerDimensions.height;
    const height = (durationMinutes / totalMinutes) * containerDimensions.height;
    const topBuffer = 3
    const adjustedTop = start < scheduleStart ? 0 : top + topBuffer; // If the event started before scheduleStart, top is 0.
    return { top: `${adjustedTop}px`, height: `${height - (adjustedTop - top) - (topBuffer-1)}px`, 
    };
  };

  // ---------------------------------------------------------------------------
  // 4. Compute the Red "Current Time" Line Position and Circle
  // ---------------------------------------------------------------------------
  const isCurrentTimeInSchedule = currentTime >= scheduleStart && currentTime <= scheduleEnd;
  let redLineTop = 0;
  if (isCurrentTimeInSchedule && totalMinutes > 0) {
    const minutesFromStart = differenceInMinutes(currentTime, scheduleStart);
    redLineTop = (minutesFromStart / totalMinutes) * containerDimensions.height;
  }

  // Define the circle's diameter (adjust as needed)
  const circleDiameter = 15; // in pixels

  // This is a rough measure for each room column:
  const approximateColumnWidth = containerDimensions.width
    ? (containerDimensions.width - (timeColumnWidth-1)) / columns.length - 1 // 79 = time width - 1
    : 0; 
  // ---------------------------------------------------------------------------
  // 5. Render Layout with Header and Separate Grid Body
  // ---------------------------------------------------------------------------
  return (
    <main className="absolute inset-0 flex flex-col">
      {/* Header Row */}
      <div className="grid" style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${columns.length}, 1fr)` }}>
        {/* Time Header */}
        <div className="border-r border-gray-300">
          <div className="h-11 border-b border-gray-300 flex items-center justify-center font-semibold bg-gray-100 text-sm">
            Time
          </div>
        </div>
        {/* Room Headers */}
        {columns.map((col) => (
          <div key={col} className="border-r border-gray-300">
            <div className="h-11 border-b border-gray-300 bg-gray-100 flex flex-col items-center justify-center">
              <span className="font-semibold text-base">{col}</span>
              {capacitiesByColumn[col] && (() => {
                const { LastCount, TotalCapacity } = capacitiesByColumn[col]!;
                const ratio = LastCount / TotalCapacity;
                let bgColor = "";
                if (ratio < 0.4) {
                  bgColor = "bg-green-200";
                } else if (ratio < 0.6) {
                  bgColor = "bg-blue-200";
                } else if (ratio < 0.85) {
                  bgColor = "bg-orange-200";
                } else {
                  bgColor = "bg-red-200";
                }        
                return (
                  <span
                    className={`text-xs px-1 rounded ${bgColor}`}
                  >
                    {LastCount}/{TotalCapacity}
                  </span>
                );
              })()}
            </div>
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        {isCurrentTimeInSchedule && (
          <>
            {/* Red line across the schedule starting after the time column */}
            <div
              style={{
                position: "absolute",
                top: `${redLineTop}px`,
                left: `${timeColumnWidth-2 + circleDiameter / 2}px`,
                right: 0,
                borderTop: "3px solid rgba(255, 0, 0, 0.8)",
                zIndex: 50,
              }}
            />
            {/* Circle at the border of the time column */}
            <div
              style={{
                position: "absolute",
                top: `${1.39 + redLineTop - circleDiameter / 2}px`,
                left: `${(timeColumnWidth - circleDiameter / 2) - 1}px`,
                width: `${circleDiameter}px`,
                height: `${circleDiameter}px`,
                backgroundColor: "rgba(255, 0, 0, 0.8)",
                borderRadius: "50%",
                zIndex: 50,
              }}
            />
          </>
        )}

        <div className="grid h-full" style={{ gridTemplateColumns: `${timeColumnWidth}px repeat(${columns.length}, 1fr)` }}>
          {/* Time Column */}
          <div className="border-r border-gray-300">
            <div className="relative h-full text-right">
              {timeSlots.map((slot, index) => {
                const slotTop =
                  (differenceInMinutes(slot, scheduleStart) / totalMinutes) * containerDimensions.height;
                return (
                  <div
                    key={index}
                    style={{
                      top: `${slotTop}px`,
                      position: "absolute",
                      width: "100%",
                      borderTop: "1px solid #e5e7eb",
                    }}
                    className="text-xs text-gray-600 pr-1"
                  >
                    {format(slot, timeColumnFormat)}
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
                    containerDimensions.height;
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
                {eventsByColumn[col].map((event, idx) => {
                  const eventStart = parseISO(event.EventStart);
                  const eventEnd = parseISO(event.EventEnd);
                  const eventStyle = getEventStyle(event);
                  const isTooShort = parseFloat(eventStyle.height ?? "0") < 36;
                  const timeTextWidth = 109; // Pre-calculated max width for time text
                  const shortTimeTextWidth = 54; // width for just "h:mm a"
                  const eventNameWidth = getTextWidth(event.EventName, 'bold 12px sans-serif');
                  const isNarrow = (eventNameWidth + timeTextWidth) > approximateColumnWidth - 3*2 - 2 - 4*2 - 8;
                  const canFitShortTime = (eventNameWidth + shortTimeTextWidth) <= approximateColumnWidth - 3*2 - 2 - 4*2 - 8;
                  const { color: bgColor, borderColor } = getEventColor(event.EventName);
                  const eventClassName = eventStart < scheduleStart //event started before scheduleStart, cut off look
                    ? `absolute left-[3px] right-[3px] ${bgColor} border border-t-0 ${borderColor} p-1 text-xs overflow-hidden rounded-bl rounded-br`
                    : `absolute left-[3px] right-[3px] ${bgColor} border ${borderColor} rounded p-1 text-xs overflow-hidden`;
                  return (
                    <div
                      key={idx}
                      className={eventClassName}
                      style={eventStyle}
                      title={`${event.EventName} (${format(
                        eventStart,
                        "h:mm a"
                      )} - ${format(eventEnd, "h:mm a")})`}
                    >
                    {isTooShort ? (
                      // CASE A: Event box is short (< 36px tall)
                      isNarrow ? (
                        // A1: Also narrow
                        canFitShortTime ? (
                          // A1a: We can fit only the start time inline
                          <div className="font-bold truncate">
                            {event.EventName}
                            <span className="text-gray-700 absolute font-normal right-1.5">
                              {format(eventStart, "h:mm a")}
                            </span>
                          </div>
                        ) : (
                          // A1b: Can't even fit the start time => just the event name
                          <div className="font-bold truncate">{event.EventName}</div>
                        )
                      ) : (
                        // A2: Short + wide => inline full "start - end"
                        <div className="font-bold truncate">
                          {event.EventName}
                          <span className="text-gray-700 absolute font-normal right-1.5">
                            {format(eventStart, "h:mm a")} - {format(eventEnd, "h:mm a")}
                          </span>
                        </div>
                      )
                    ) : (
                      // CASE B: Event box is not short => always two lines
                      <>
                        <div className="font-bold truncate">{event.EventName}</div>
                        <div className="text-gray-700">
                          {format(eventStart, "h:mm a")} - {format(eventEnd, "h:mm a")}
                        </div>
                      </>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Schedule;
