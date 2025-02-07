"use client"

import type React from "react"
import { useMemo, useRef } from "react"
import { format, parseISO, differenceInMinutes, addMinutes, startOfDay, endOfDay } from "date-fns"
import { useContainerWidth } from "./useContainerWidth"

export interface Event {
  EventStart: string
  EventEnd: string
  EventName: string
  Room: string
}

interface ScheduleProps {
  events: Event[]
}

const Schedule: React.FC<ScheduleProps> = ({ events }) => {
  const containerRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const containerWidth = useContainerWidth(containerRef)

  const rooms = useMemo(() => {
    return Array.from(new Set(events.map((event) => event.Room)))
  }, [events])

  const timeSlots = useMemo(() => {
    const startTime = startOfDay(parseISO(events[0].EventStart))
    const endTime = endOfDay(parseISO(events[0].EventStart))
    const slots = []
    let currentTime = startTime

    while (currentTime < endTime) {
      slots.push(format(currentTime, "h:mm a"))
      currentTime = addMinutes(currentTime, 30)
    }

    return slots
  }, [events])

  const eventsByRoom = useMemo(() => {
    const eventMap = new Map<string, Event[]>()
    rooms.forEach((room) => eventMap.set(room, []))

    events.forEach((event) => {
      const roomEvents = eventMap.get(event.Room) || []
      roomEvents.push(event)
      eventMap.set(event.Room, roomEvents)
    })

    return eventMap
  }, [events, rooms])

  const getEventStyle = (event: Event) => {
    const startTime = parseISO(event.EventStart)
    const endTime = parseISO(event.EventEnd)
    const dayStart = startOfDay(startTime)

    const top = (differenceInMinutes(startTime, dayStart) / 30) * 40
    const height = (differenceInMinutes(endTime, startTime) / 30) * 40

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  const columnWidth = useMemo(() => {
    const timeColumnWidth = 80
    const availableWidth = containerWidth - timeColumnWidth
    return Math.max(200, availableWidth / rooms.length)
  }, [containerWidth, rooms.length])

  return (
    <div ref={containerRef} className="overflow-x-auto">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `80px repeat(${rooms.length}, ${columnWidth}px)`,
          width: `${80 + columnWidth * rooms.length}px`,
        }}
      >
        <div className="sticky left-0 bg-white z-10">
          <div className="h-10 border-b border-gray-200"></div>
          {timeSlots.map((time) => (
            <div key={time} className="h-10 border-b border-gray-200 text-xs text-gray-500 text-right pr-2">
              {time}
            </div>
          ))}
        </div>
        {rooms.map((room) => (
          <div key={room} className="border-l border-gray-200">
            <div className="h-10 border-b border-gray-200 font-semibold text-center truncate px-2">{room}</div>
            <div className="relative">
              {eventsByRoom.get(room)?.map((event, index) => (
                <div
                  key={`${event.EventName}-${index}`}
                  className="absolute w-full bg-blue-100 border border-blue-200 rounded p-1 text-xs overflow-hidden"
                  style={getEventStyle(event)}
                >
                  <div className="font-semibold truncate">{event.EventName}</div>
                  <div>
                    {format(parseISO(event.EventStart), "h:mm a")} - {format(parseISO(event.EventEnd), "h:mm a")}
                  </div>
                </div>
              ))}
              {timeSlots.map((time) => (
                <div key={time} className="h-10 border-b border-gray-100"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Schedule


// [{EventStart: '2025-02-06T05:30:00', EventEnd: '2025-02-06T10:00:00', EventName: 'Open Basketball', Room: 'BB Court #1'},
// {EventStart: '2025-02-06T05:30:00', EventEnd: '2025-02-06T17:00:00', EventName: 'Open Basketball', Room: 'BB Court #3'},
// {EventStart: '2025-02-06T05:30:00', EventEnd: '2025-02-07T00:00:00', EventName: 'Open Basketball', Room: 'BB Court #2'},
// {EventStart: '2025-02-06T07:00:00', EventEnd: '2025-02-06T08:00:00', EventName: 'Group Fitness', Room: 'Studio A - wood floor'},
// {EventStart: '2025-02-06T07:00:00', EventEnd: '2025-02-06T08:00:00', EventName: 'Group Fitness', Room: 'Studio C - Revolutionz'},
// {EventStart: '2025-02-06T08:00:00', EventEnd: '2025-02-06T09:00:00', EventName: 'Group Fitness', Room: 'Studio A - wood floor'},
// {EventStart: '2025-02-06T08:00:00', EventEnd: '2025-02-06T09:00:00', EventName: 'Group Fitness', Room: 'Studio C - Revolutionz'},
// {EventStart: '2025-02-06T09:15:00', EventEnd: '2025-02-06T10:15:00', EventName: 'Group Fitness', Room: 'Studio C - Revolutionz'},
// {EventStart: '2025-02-06T10:00:00', EventEnd: '2025-02-06T11:00:00', EventName: 'Varsity Field Hockey', Room: 'BB Court #1'},
// {EventStart: '2025-02-06T11:00:00', EventEnd: '2025-02-06T18:00:00', EventName: 'Open Basketball', Room: 'BB Court #1'}]