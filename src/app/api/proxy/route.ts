//src/app/api/proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

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

    return NextResponse.json(rawData);

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
