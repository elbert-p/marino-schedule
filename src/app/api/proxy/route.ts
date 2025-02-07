import { NextRequest, NextResponse } from 'next/server';

// Handle POST requests to /api/proxy
export async function POST(req: NextRequest) {
  try {
    // Parse the incoming JSON body
    const body = await req.json();

    // Forward the request to the external API
    const response = await fetch(
      'https://nuevents.neu.edu/ServerApi.aspx/CustomBrowseEvents',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    // If the external API returns an error, forward that back
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from external API:', errorText);
      return NextResponse.json(
        { error: errorText || 'External API error' },
        { status: response.status }
      );
    }

    // Otherwise, parse and return the JSON from the external API
    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Proxy error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
