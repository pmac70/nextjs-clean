import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();

    // Example API request to GHL (replace with your real values)
    const contactResult = await fetch(
      `https://services.leadconnector.com/locations/${process.env.GHL_LOCATION_ID}/contacts/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(data),
      }
    ).then((res) => res.json());

    // Add a note to the contact
    await fetch(
      `https://services.leadconnector.com/locations/${process.env.GHL_LOCATION_ID}/contacts/${contactResult.id}/notes/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify({
          body: formatDetailedNote(data),
        }),
      }
    );

    return NextResponse.json({ success: true, data: contactResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { succe
