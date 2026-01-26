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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [capacityResults, setCapacityResults] = useState<Capacity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshState, setRefreshState] = useState<"idle" | "loading" | "success">("loading");

  const gymCapacity = capacityResults.find(
    (cap) => cap.LocationName === "Marino Center - Gymnasium"
  );

  // Helper function to check if the selected date is the current day.
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Helper function to format a Date object to a 'YYYY-MM-DD' string.
  const formatDateToString = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  };

  // Function to fetch schedule events for the selected date.
  const fetchEvents = useCallback(() => {
    setLoading(true);
    const dateStr = formatDateToString(selectedDate);
    const requestDate = `${dateStr} 00:00:00`;

    // Define helper function to decode HTML entities
    const decodeHtml = (html: string) => {
      const txt = document.createElement("textarea");
      txt.innerHTML = html;
      return txt.value;
    };

    console.log("Fetching events for:", requestDate);
    const payload = {
      date: requestDate,
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
              booking.EventStart.split("T")[0] === dateStr
          )
          .map((booking: Event) => ({
            EventStart: booking.EventStart,
            EventEnd: booking.EventEnd,
            EventName: decodeHtml(booking.EventName),
            Room: decodeHtml(booking.Room),
          }));
        setEventResults(filtered);
        console.log("Filtered events:", filtered);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching schedule data:", err);
        setLoading(false);
      });
  }, [selectedDate]);

  // Fetch events whenever the selected date changes.
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Set up a timer to automatically advance to the current day at midnight,
  // only if the user is currently viewing today's schedule.
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isToday(selectedDate)) {
      // If viewing today, set a timer to advance to the next day at midnight.
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();

      timer = setTimeout(() => {
        console.log("Midnight reached! Advancing to the new day...");
        setSelectedDate(new Date());
      }, msUntilMidnight);
    }

    // Cleanup function to clear the timer if the component unmounts
    // or if the selectedDate changes, which triggers the effect again.
    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Function to fetch facility counts.
  const fetchFacilityCounts = () => {
    setRefreshState("loading");
    return fetch(
      `https://goboardapi.azurewebsites.net/api/FacilityCount/GetCountsByAccount?AccountAPIKey=${process.env.NEXT_PUBLIC_ACCOUNT_API_KEY}`
    )
      .then((res) => {
        if (!res.ok) {
          setRefreshState("idle");
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
        setRefreshState("idle");
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

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  return (
    <div className="min-h-svh flex flex-col">
      {/* Header */}
      <header className="bg-[#C41E3A] text-white py-2">
        <div className="container mx-auto flex justify-center items-center flex-wrap pl-2 sm:gap-x-4 gap-x-2 gap-y-2">
          <h1 className="sm:text-3xl text-2xl font-bold text-center">
            Marino Schedule
          </h1>
          <div className="flex items-center sm:gap-1">
            <button
              onClick={handlePrevDay}
              className="p-0.5 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Previous day"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
            <input
              type="date"
              value={formatDateToString(selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value + "T00:00:00"));
                }
              }}
              className="bg-white/20 text-white p-1 rounded-md border border-white/50 text-sm sm:w-32 w-29"
            />
            <button
              onClick={handleNextDay}
              className="p-0.5 rounded-full text-white/80 hover:bg-white/20 hover:text-white transition-colors"
              aria-label="Next day"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Schedule area */}
      <main className="flex-1 relative outline">
        <Schedule events={eventResults} capacities={capacityResults} loading={loading} isToday={isToday(selectedDate)}/>
      </main>

      {/* Footer */}
      <footer className="bg-[#C41E3A] text-white py-1 text-center h-8 flex items-center justify-center">
        {isToday(selectedDate) && (
          <>
            {gymCapacity?.LastUpdatedDateAndTime ? (
              <span>
                Capacities last updated:{" "}
                {new Date(gymCapacity.LastUpdatedDateAndTime).toLocaleTimeString([], {
                  timeStyle: "short",
                })}
              </span>
            ) : (
              <span>
                {refreshState === 'idle'
                  ? 'Refresh to load capacities'
                  : 'Capacities loading...'}
              </span>
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
          </>
        )}
      </footer>
    </div>
  );
}