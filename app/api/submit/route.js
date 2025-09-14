import { NextResponse } from 'next/server';

const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjNwdTFuRFdPc0sxRkR1TjFSb1NiIiwiY29tcGFueV9pZCI6IlNXREdHNGxHZjgydzVXVTUwVmFnIiwidmVyc2lvbiI6MSwiaWF0IjoxNzA1MTQwNjkyNjU2LCJzdWIiOiJ1c2VyX2lkIn0.hlmsZFdLcyt2LOYw5-8o4drrW6_kELif_1xqrttsaTc';
const GHL_LOCATION_ID = '3pu1nDWOsK1FDuN1RoSb';

export async function POST(request) {
  const origin = request.headers.get('origin');
  const allowedOrigins = ['https://app.gohighlevel.com'];
  const responseHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'https://app.gohighlevel.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  try {
    const ghlData = await request.json();

    const contactResponse = await fetch(`https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        firstName: ghlData.first_name,
        lastName: ghlData.last_name,
        email: ghlData.email,
        phone: ghlData.phone,
        source: ghlData.lead_source,
        tags: ghlData.tags
      })
    });
    if (!contactResponse.ok) {
      throw new Error(`Contact creation failed: ${contactResponse.statusText}`);
    }
    const contactData = await contactResponse.json();
    const contactId = contactData.contact ? contactData.contact.id : contactData.id;

    const noteContent = formatDetailedNote(ghlData);
    const noteResponse = await fetch(`https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/${contactId}/notes/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        body: noteContent,
        type: 'NOTE'
      })
    });
    if (!noteResponse.ok) {
      throw new Error(`Note creation failed: ${noteResponse.statusText}`);
    }

    return new NextResponse(JSON.stringify({ message: 'Data successfully sent to GoHighLevel' }), {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Server error:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to process data' }), {
      status: 500,
      headers: responseHeaders
    });
  }
}

function formatDetailedNote(data) {
  let noteContent = `COMPREHENSIVE MENOPAUSE HEALTH ASSESSMENT - ${new Date().toLocaleDateString()}\n================================================================\n`;
  noteContent += `CLIENT: ${data.first_name || ''} ${data.last
