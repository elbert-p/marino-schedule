'use client';  // This marks the entire component as client-side code

import React, { useEffect } from 'react';

export default function HomePage() {
  useEffect(() => {
    const payload = {
      date: '2025-02-6 00:00:00',
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
        console.log('Fetched data:', data);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
      });
  }, []);

  return (
    <main style={{ padding: '1rem' }}>
      <h1>My App Router Example</h1>
      <p>Open the console to see the fetched data (or errors).</p>
    </main>
  );
}
