import { NextResponse } from 'next/server';

const GHL_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IjNwdTFuRFdPc0sxRkR1TjFSb1NiIiwiY29tcGFueV9pZCI6IlNXREdHNGxHZjgydzVXVTUwVmFnIiwidmVyc2lvbiI6MSwiaWF0IjoxNzA1MTQwNjkyNjU2LCJzdWIiOiJ1c2VyX2lkIn0.hlmsZFdLcyt2LOYw5-8o4drrW6_kELif_1xqrttsaTc';
const GHL_LOCATION_ID = '3pu1nDWOsK1FDuN1RoSb';

export async function POST(request) {
  // Enable CORS for GoHighLevel origin
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

    // Step 1: Create contact
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

    // Step 2: Add detailed note
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
  noteContent += `CLIENT: ${data.first_name || ''} ${data.last_name || ''}\n`;
  noteContent += `EMAIL: ${data.email || 'Not provided'}\n`;
  noteContent += `PHONE: ${data.phone || 'Not provided'}\n`;
  noteContent += `ASSESSMENT SUMMARY:\n`;
  noteContent += `• Total Symptoms Reported: ${data.total_symptoms || 0}\n`;
  noteContent += `• High Priority Symptoms (7-10): ${data.high_priority_symptoms || 0}\n`;
  noteContent += `HIGH PRIORITY SYMPTOMS (Severity 7+):\n${data.high_priority_symptoms > 0 ? data.symptom_severities.split(', ').filter(s => parseInt(s.split(': ')[1]) >= 7).map(s => `• ${s}`).join('\n') : '• None reported'}\n`;
  noteContent += `PHYSICAL PROFILE:\n`;
  noteContent += `• Measurement System: ${data.measurement_system || 'Not specified'}\n`;
  noteContent += `• Weight: ${data.weight || 'Not provided'}\n`;
  noteContent += `• Height: ${data.height || 'Not provided'}\n`;
  noteContent += `• Waist: ${data.waist_circumference || 'Not provided'}\n`;
  noteContent += `LIFESTYLE FACTORS:\n`;
  noteContent += `• Stress Level: ${data.stress_level || 'Not rated'}/6\n`;
  noteContent += `• Sleep Hours: ${data.sleep_hours || 'Not provided'}\n`;
  noteContent += `• Exercise Days/Week: ${data.activity_days_per_week || 'Not provided'}\n`;
  noteContent += `• Diet Type: ${data.diet_type || 'Not specified'}\n`;
  noteContent += `MEDICAL HISTORY:\n`;
  noteContent += `• Medical Conditions: ${data.diagnosed_conditions || 'None reported'}\n`;
  noteContent += `• Hormone Therapy: ${data.taking_hrt || 'Not specified'}\n`;
  noteContent += `• Last Period: ${data.had_period_last_12_months || 'Not specified'}\n`;
  noteContent += `• Supplements: ${data.taking_supplements || 'None reported'}\n`;
  noteContent += `WELLNESS GOALS:\n`;
  noteContent += `• Self-Care Priority: ${data.prioritize_self_care || 'Not specified'}\n`;
  noteContent += `• Journey Stage: ${data.menopause_journey_stage || 'Not specified'}\n`;
  noteContent += `• Focus Areas: ${data.paths_to_health || 'Not specified'}\n`;
  noteContent += `• Options Taken: ${data.self_care_options_taken || 'Not specified'}\n`;
  noteContent += `ALL SYMPTOMS WITH SEVERITY:\n${data.experienced_symptoms ? data.symptom_severities.split(', ').map(s => `• ${s}`).join('\n') : '• No symptoms reported'}\n`;
  noteContent += `================================================================\n`;
  noteContent += `Assessment completed via online questionnaire.\n`;
  noteContent += `Data consent provided: ${data.raw_assessment_data && JSON.parse(data.raw_assessment_data).data_consent ? 'Yes' : 'No'}\n`;
  return noteContent;
}
