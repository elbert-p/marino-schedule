'use client';

import React, { useState, useEffect } from 'react';
import Schedule from './schedule/Schedule';

export default function HomePage() {
  const [dailyResults, setDailyResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const payload = {
      date: '2025-02-06 00:00:00',
      data: {
        BuildingId: 175,
        GroupTypeId: -1,
        GroupId: -1,
        EventTypeId: -1,
        RoomId: -1,
        StatusId: -1,
        ZeroDisplayOnWeb: 1,
        HeaderUrl: '',
        Title: 'Scheduled Recreational Activities',
        Format: 0,
        Rollup: 0,
        PageSize: 50,
        DropEventsInPast: true,
      },
    };

    fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Network response was not ok: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setDailyResults(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Event Schedule</h1>
      <Schedule events={dailyResults} />
    </main>
  );
}
