"use client"

import { useState, useEffect } from "react"
import Schedule from "./schedule/Schedule"

// Optionally, define the Event interface for better type safety
interface Event {
  EventStart: string
  EventEnd: string
  EventName: string
  Room: string
  // ... include any additional properties if needed
}

export default function HomePage() {
  const [dailyResults, setDailyResults] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // For filtering, create a string for today's date in "YYYY-MM-DD" format.
    const todayStr = new Date().toISOString().split("T")[0]
    // For the payload, format today's date as "YYYY-MM-D 00:00:00" (without a leading zero on the day)
    const [year, month, day] = todayStr.split("-")
    const today = `${year}-${month}-${Number(day)} 00:00:00`
    // console.log(today);  // For Feb 9, 2025, this will log: "2025-02-9 00:00:00"

    const payload = {
      date: today,
      data: {
        BuildingId: 175,
        GroupTypeId: -1,
        GroupId: -1,
        EventTypeId: -1,
        RoomId: -1,
        StatusId: -1,
        ZeroDisplayOnWeb: 1,
        HeaderUrl: "",
        Title: "Scheduled Recreational Activities",
        Format: 0,
        Rollup: 0,
        PageSize: 50,
        DropEventsInPast: true,
      },
    }

    fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.status}`)
        }
        return res.json()
      })
      .then((rawData) => {
        // Parse rawData.d, which is a JSON string containing the actual fields
        const parsed = JSON.parse(rawData.d) // => { DailyBookingResults: [...], ... }
        // Extract the DailyBookingResults array; if missing, default to an empty array
        const dailyResults = parsed.DailyBookingResults ?? []
        console.log("Parsed events:", dailyResults)

        // Filter to include only events where the date portion of EventStart matches todayStr
        const filtered = (dailyResults as Event[])
          .filter((booking: Event) => {
            // Extract the date part (YYYY-MM-DD) from the EventStart string.
            const eventDate = booking.EventStart.split("T")[0]
            return eventDate === todayStr
          })
          .map((booking: Event) => ({
            EventStart: booking.EventStart,
            EventEnd: booking.EventEnd,
            EventName: booking.EventName,
            Room: booking.Room,
          }))

        setDailyResults(filtered)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching data:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    )
  }

  console.log("Parsed and filtered events:", dailyResults)
  return <Schedule events={dailyResults} />
}
