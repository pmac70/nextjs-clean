import { NextResponse } from 'next/server';

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

export async function POST(request) {
  try {
    const ghlData = await request.json();

    // Step 1: Create contact
    const contactResponse = await fetch(
      `https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          firstName: ghlData.firstName,
          lastName: ghlData.lastName,
          email: ghlData.email,
          phone: ghlData.phone
        })
      }
    );

    const contactResult = await contactResponse.json();

    // Step 2: Create note (only if contact was created)
    if (contactResult.id) {
      await fetch(
        `https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/${contactResult.id}/notes/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({
            body: formatDetailedNote(ghlData)
          })
        }
      );
    }

    return NextResponse.json({ success: true, data: contactResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

function formatDetailedNote(data) {
  return `
📌 New Form Submission

👤 Name: ${data.firstName} ${data.lastName}
📧 Email: ${data.email}
📞 Phone: ${data.phone}

📝 Message:
${data.message || 'No message provided'}
  `;
}
