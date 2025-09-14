import { NextResponse } from 'next/server';

// CORS headers for GoHighLevel integration
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received assessment data:', data);

    // Validate required fields
    if (!data.email || !data.phone) {
      return NextResponse.json(
        { error: 'Email and phone are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Create/Update contact in GoHighLevel
    const ghlResult = await createGHLContact(data);
    
    if (!ghlResult.success) {
      throw new Error(`GHL API Error: ${ghlResult.error}`);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Assessment data sent to GoHighLevel successfully',
        contactId: ghlResult.contactId 
      },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment data', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

async function createGHLContact(data) {
  try {
    // Your GHL API credentials - set these in Vercel environment variables
    const GHL_API_KEY = process.env.GHL_API_KEY;
    const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

    if (!GHL_API_KEY || !GHL_LOCATION_ID) {
      throw new Error('GHL API credentials not configured');
    }

    const contactData = {
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      email: data.email,
      phone: data.phone,
      source: 'Comprehensive Menopause Assessment',
      tags: data.tags || [],
      // Store all assessment data in notes
      notes: formatDetailedNote(data)
    };

    // Add custom fields if you have any configured in GHL
    if (data.assessment_type) {
      contactData.customFields = [
        {
          key: 'assessment_type',
          value: data.assessment_type
        },
        {
          key: 'completion_date', 
          value: data.completion_date
        }
      ];
    }

    const response = await fetch(`https://services.leadconnectorhq.com/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_API_KEY}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28'
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        ...contactData
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`GHL API responded with ${response.status}: ${errorData}`);
    }

    const result = await response.json();
    console.log('GHL Contact created/updated:', result.contact?.id);

    return {
      success: true,
      contactId: result.contact?.id
    };

  } catch (error) {
    console.error('GHL API Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function formatDetailedNote(data) {
  let noteContent = `COMPREHENSIVE MENOPAUSE HEALTH ASSESSMENT - ${new Date().toLocaleDateString()}\n`;
  noteContent += `================================================================\n`;
  noteContent += `CLIENT: ${data.first_name || ''} ${data.last_name || ''}\n`;
  noteContent += `EMAIL: ${data.email || 'Not provided'}\n`;
  noteContent += `PHONE: ${data.phone || 'Not provided'}\n\n`;
  
  noteContent += `ASSESSMENT SUMMARY:\n`;
  noteContent += `• Total Symptoms Reported: ${data.total_symptoms || 0}\n`;
  noteContent += `• High Priority Symptoms (7-10): ${data.high_priority_symptoms || 0}\n\n`;
  
  if (data.experienced_symptoms) {
    noteContent += `EXPERIENCED SYMPTOMS:\n${data.experienced_symptoms}\n\n`;
  }
  
  if (data.symptom_severities) {
    noteContent += `SYMPTOM SEVERITIES:\n${data.symptom_severities}\n\n`;
  }
  
  noteContent += `PHYSICAL PROFILE:\n`;
  noteContent += `• Measurement System: ${data.measurement_system || 'Not specified'}\n`;
  noteContent += `• Weight: ${data.weight || 'Not provided'}\n`;
  noteContent += `• Height: ${data.height || 'Not provided'}\n`;
  noteContent += `• Waist: ${data.waist_circumference || 'Not provided'}\n\n`;
  
  noteContent += `LIFESTYLE FACTORS:\n`;
  noteContent += `• Stress Level: ${data.stress_level || 'Not rated'}/6\n`;
  noteContent += `• Sleep Hours: ${data.sleep_hours || 'Not provided'}\n`;
  noteContent += `• Exercise Routine: ${data.exercise_routine || 'Not provided'}\n`;
  noteContent += `• Diet Type: ${data.diet_type || 'Not specified'}\n\n`;
  
  noteContent += `MEDICAL HISTORY:\n`;
  noteContent += `• Medical Conditions: ${data.diagnosed_conditions || 'None reported'}\n`;
  noteContent += `• Hormone Therapy: ${data.taking_hrt || 'Not specified'}\n`;
  noteContent += `• Supplements: ${data.taking_supplements || 'None reported'}\n\n`;
  
  noteContent += `WELLNESS GOALS:\n`;
  noteContent += `• Health Priorities: ${data.health_priorities_all || 'Not specified'}\n`;
  noteContent += `• Top Six Priorities: ${data.top_six_priorities || 'Not specified'}\n`;
  noteContent += `• Self-Care Options Taken: ${data.self_care_options_taken || 'Not specified'}\n\n`;
  
  noteContent += `================================================================\n`;
  noteContent += `Assessment completed via online questionnaire.\n`;
  noteContent += `Data consent provided: ${data.raw_assessment_data ? 'Yes' : 'No'}\n`;
  
  // Add raw data for complete record
  if (data.raw_assessment_data) {
    noteContent += `\nRAW ASSESSMENT DATA:\n${data.raw_assessment_data}\n`;
  }
  
  return noteContent;
}
