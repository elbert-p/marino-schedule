"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "success">("idle");

  const gymCapacity = capacityResults.find(
    (cap) => cap.LocationName === "Marino Center - Gymnasium"
  );

  // Helper function to format the date string.
  const getTodayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
  };

  // Function to fetch schedule events.
  const fetchEvents = useCallback(() => {
    setLoading(true);
    const now = new Date();
    const todayStr = getTodayString();
    const [year, month, day] = todayStr.split("-");
    const today = `${year}-${month}-${Number(day)} 00:00:00`;

    console.log("Fetching events for:", today);
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
        console.log("Raw events data:", parsed);
        const dailyResults = parsed.MonthlyBookingResults ?? [];
        const filtered = (dailyResults as Event[])
          .filter(
            (booking: Event) =>
              booking.EventStart.split("T")[0] === todayStr
          )
          .map((booking: Event) => ({
            EventStart: booking.EventStart,
            EventEnd: booking.EventEnd,
            EventName: booking.EventName,
            Room: booking.Room,
          }));
        setEventResults(filtered);
        console.log("Filtered events:", filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching schedule data:", err);
        setLoading(false);
      });
  }, []);

  // Initial fetch for events.
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Set up a timer to automatically fetch events when the date changes.
  useEffect(() => {
    // Calculate milliseconds until next midnight.
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = nextMidnight.getTime() - now.getTime();

    const timer = setTimeout(() => {
      console.log("Midnight reached! Refreshing events...");
      fetchEvents();
    }, msUntilMidnight);

    // Cleanup the timer on component unmount.
    return () => clearTimeout(timer);
  }, [fetchEvents]);

  // Function to fetch facility counts.
  const fetchFacilityCounts = () => {
    return fetch(
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
  };

  // Initial fetch for facility counts.
  useEffect(() => {
    fetchFacilityCounts();
  }, []);

  // Handler for refresh button.
  const refreshCapacities = () => {
    if (refreshState !== "idle") return;
    setRefreshState("loading");
    fetchFacilityCounts().then(() => {
      setRefreshState("success");
      setTimeout(() => {
        setRefreshState("idle");
      }, 7500);
    });
  };

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
        <h1 className="sm:text-3xl text-2xl text-center font-bold">
          Marino Court Schedule
        </h1>
      </header>

      {/* Schedule area */}
      <main className="flex-1 relative outline">
        <Schedule events={eventResults} capacities={capacityResults} />
      </main>

      {/* Footer */}
      <footer className="bg-[#C41E3A] text-white py-1 text-center">
        {gymCapacity?.LastUpdatedDateAndTime && (
          <>
            {now.toLocaleDateString([], { dateStyle: "short" })} - Last updated:{" "}
            {new Date(gymCapacity.LastUpdatedDateAndTime).toLocaleTimeString([], {
              timeStyle: "short",
            })}
          </>
        )}
          <button
            onClick={refreshCapacities}
            disabled={refreshState !== "idle"}
            className={`ml-4 px-2 rounded transition-all duration-500 ${
              refreshState === "loading"
                ? "bg-gray-400 text-[#C41E3A] cursor-not-allowed"
                : refreshState === "success"
                ? "bg-green-500 text-white"
                : "bg-white text-[#C41E3A] hover:bg-gray-200 active:bg-gray-400"
            }`}
          >
            {refreshState === "loading" && "Loading"}
            {refreshState === "success" && "Success"}
            {refreshState === "idle" && "Refresh"}
          </button>
      </footer>
    </div>
  );
}
