import { NextRequest, NextResponse } from 'next/server';
import { Event, ScheduleProps } from '../../schedule/Schedule'; // adjust the path as necessary

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming JSON body
    const requestBody = await req.json();

    // Forward the request to the external API
    const externalResponse = await fetch(
      'https://nuevents.neu.edu/ServerApi.aspx/CustomBrowseEvents',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      }
    );

    // If the external API returns an error, forward that back
    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error('Error from external API:', errorText);
      return NextResponse.json(
        { error: errorText || 'External API error' },
        { status: externalResponse.status }
      );
    }

    // The external API returns { "d": "JSON string" }
    const rawData = await externalResponse.json(); // => { d: "\"DailyBookingResults\":[{...}]" }

    // Now parse rawData.d, which is a JSON string containing the actual fields
    const parsed = JSON.parse(rawData.d); // => { DailyBookingResults: [...], ... }

    // Extract the DailyBookingResults array
    const dailyResults = parsed.DailyBookingResults ?? [];

    // Filter each object to return only your desired fields
    const filtered = (dailyResults as ScheduleProps).events
    .map((booking: Event) => ({
      EventStart: booking.EventStart,
      EventEnd: booking.EventEnd,
      EventName: booking.EventName,
      Room: booking.Room,
    }));

    // Return the filtered array of daily bookings
    return NextResponse.json(filtered);
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Proxy error:', err);
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      );
    } else {
      console.error('Proxy error (unexpected type):', err);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
}
