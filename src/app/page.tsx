"use client";

import { useState, useEffect } from "react";
import Schedule from "./schedule/Schedule";

interface Event {
  EventStart: string;
  EventEnd: string;
  EventName: string;
  Room: string;
}

interface Capacity {
  LocationName: string;
  LastCount: number;
  TotalCapacity: number;
  LastUpdatedDateAndTime: string;
}

export default function HomePage() {
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [capacityResults, setCapacityResults] = useState<Capacity[]>([]);
  const [loading, setLoading] = useState(true);

  const gymCapacity = capacityResults.find(
    (cap) => cap.LocationName === "Marino Center - Gymnasium"
  )

  // Fetch schedule events.
  useEffect(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;    
    const [year, month, day] = todayStr.split("-");
    const today = `${year}-${month}-${Number(day)} 00:00:00`;

    console.log(today);
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
        Format: 1,
        Rollup: 0,
        PageSize: 50,
        DropEventsInPast: true,
      },
    };

    fetch("/api/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.status}`);
        }
        return res.json();
      })
      .then((rawData) => {
        const parsed = JSON.parse(rawData.d);
        console.log(parsed)
        const dailyResults = parsed.MonthlyBookingResults ?? [];
        const filtered = (dailyResults as Event[])
          .filter((booking: Event) => booking.EventStart.split("T")[0] === todayStr)
          .map((booking: Event) => ({
            EventStart: booking.EventStart,
            EventEnd: booking.EventEnd,
            EventName: booking.EventName,
            Room: booking.Room,
          }));
        setEventResults(filtered);
        console.log("Events:", filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching schedule data:", err);
        setLoading(false);
      });
  }, []);

  // Fetch facility counts.
  useEffect(() => {
    fetch(
      `https://goboardapi.azurewebsites.net/api/FacilityCount/GetCountsByAccount?AccountAPIKey=${process.env.NEXT_PUBLIC_ACCOUNT_API_KEY}`
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error fetching facilities: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        const targetLocations = [
          "Marino Center - Studio B",
          "Marino Center - Studio A",
          "Marino Center - Studio C",
          "Marino Center - Gymnasium",
        ];

        const filteredFacilities = data
          .filter((facility: Capacity) =>
            targetLocations.includes(facility.LocationName)
          )
          .map((facility: Capacity) => ({
            LocationName: facility.LocationName,
            LastCount: facility.LastCount,
            TotalCapacity: facility.TotalCapacity,
            LastUpdatedDateAndTime: facility.LastUpdatedDateAndTime,
          }));
        setCapacityResults(filteredFacilities);
        console.log("Capacities:", filteredFacilities);
      })
      .catch((error) => {
        console.error("Error fetching facility counts:", error);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading...
      </div>
    );
  }
  const now = new Date();
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#C41E3A] text-white py-2.5">
        <h1 className="text-3xl text-center font-bold">Marino Court Schedule
      </h1>
      </header>
  
      {/* Schedule area */}
      <main className="flex-1 relative outline">
          <Schedule
            events={eventResults}
            capacities={capacityResults}
          />
      </main>
  
      {/* Footer */}
      <footer className="bg-[#C41E3A] text-white py-1 text-center">
      {gymCapacity?.LastUpdatedDateAndTime && (
        <>{now.toLocaleDateString([], {dateStyle: 'short'})} - Last updated: {new Date(gymCapacity.LastUpdatedDateAndTime).toLocaleTimeString([], {timeStyle: 'short'})}</>
      )}
      </footer>
    </div>
  );
}
