"use client"

import type React from "react"
import { useMemo, useRef } from "react"
import { format, parseISO, differenceInMinutes, addMinutes, startOfDay, endOfDay, setHours } from "date-fns"
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
    const startTime = setHours(startOfDay(parseISO(events[0].EventStart)), 4)
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
    const scheduleStart = setHours(startOfDay(startTime), 4) 
    const minutesFromScheduleStart = differenceInMinutes(startTime, scheduleStart)
    const eventDuration = differenceInMinutes(endTime, startTime)

    const top = (minutesFromScheduleStart / 30) * 40
    const height = (eventDuration / 30) * 40

    return {
      top: `${top}px`,
      height: `${height}px`,
    }
  }

  const columnWidth = useMemo(() => {
    const timeColumnWidth = 100
    const availableWidth = containerWidth - timeColumnWidth
    return Math.max(200, availableWidth / rooms.length)
  }, [containerWidth, rooms.length])

  return (
    <div className="flex flex-col w-full min-h-screen bg-black">
      <div className="bg-[#C41E3A] text-white py-8">
        <h1 className="text-4xl font-bold text-center schedule-title">TODAY'S COURTS SCHEDULES AT MARINO</h1>
      </div>
      
      <div className="flex-1 bg-white p-8">
        
        <div ref={containerRef} className="overflow-x-auto">
          <div
            className="grid"
            style={{
              gridTemplateColumns: `100px repeat(${rooms.length}, ${columnWidth}px)`,
              width: `${100 + columnWidth * rooms.length}px`,
            }}
          >
            <div className="sticky left-0 bg-white z-10">
              <div className="h-12 border-b border-gray-300"></div>
              {timeSlots.map((time) => (
                <div key={time} className="h-10 border-b border-gray-300 text-sm text-gray-600 text-right pr-4 flex items-center justify-end">
                  {time}
                </div>
              ))}
            </div>
            {rooms.map((room) => (
              <div key={room} className="border-l border-gray-300 bg-gray-100">
                <div className="h-12 border-b border-gray-300 font-semibold text-center truncate px-2 flex items-center justify-center bg-gray-200">
                  {room}
                </div>
                <div className="relative">
                  {eventsByRoom.get(room)?.map((event, index) => (
                    <div
                      key={`${event.EventName}-${index}`}
                      className="absolute w-[95%] mx-[2.5%] bg-blue-100 border border-blue-200 rounded p-2 text-sm"
                      style={getEventStyle(event)}
                    >
                      <div className="font-semibold truncate">{event.EventName}</div>
                      <div className="text-xs text-gray-600">
                        {format(parseISO(event.EventStart), "h:mm a")} - {format(parseISO(event.EventEnd), "h:mm a")}
                      </div>
                    </div>
                  ))}
                  {timeSlots.map((time) => (
                    <div key={time} className="h-10 border-b border-gray-200"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-[#C41E3A] py-8"></div>
    </div>
  )
}

export default Schedule
