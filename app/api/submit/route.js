import { NextResponse } from 'next/server';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

    // Submit to GHL form
    const ghlResult = await submitToGHLForm(data);
    
    if (!ghlResult.success) {
      throw new Error(`GHL Form Error: ${ghlResult.error}`);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Assessment data sent to GoHighLevel successfully'
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

async function submitToGHLForm(data) {
  try {
    // Your specific GHL form URL
    const GHL_FORM_URL = 'https://api.leadconnectorhq.com/widget/form/CZ3h3Go42EQ6rgs4BHS6?notrack=true';

    // Format the complete assessment as text for the form
    const completeAssessment = formatCompleteAssessment(data);

    // Create form data for GHL form submission
    const formData = new URLSearchParams({
      'first_name': data.first_name || '',
      'last_name': data.last_name || '',
      'email': data.email,
      'phone': data.phone,
      'assessment_data': completeAssessment
    });

    console.log('Submitting to GHL form:', GHL_FORM_URL);

    const response = await fetch(GHL_FORM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Form submission failed with ${response.status}: ${errorData}`);
    }

    const result = await response.text();
    console.log('GHL form submission response:', result);

    return {
      success: true,
      response: result
    };

  } catch (error) {
    console.error('GHL Form Submission Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function formatCompleteAssessment(data) {
  let assessment = `COMPREHENSIVE MENOPAUSE HEALTH ASSESSMENT - ${new Date().toLocaleDateString()}\n`;
  assessment += `================================================================\n\n`;
  
  assessment += `ASSESSMENT SUMMARY:\n`;
  assessment += `• Total Symptoms Reported: ${data.total_symptoms || 0}\n`;
  assessment += `• High Priority Symptoms (7-10): ${data.high_priority_symptoms || 0}\n\n`;
  
  if (data.experienced_symptoms) {
    assessment += `EXPERIENCED SYMPTOMS:\n${data.experienced_symptoms}\n\n`;
  }
  
  if (data.symptom_severities) {
    assessment += `DETAILED SYMPTOM SEVERITIES:\n${data.symptom_severities}\n\n`;
  }
  
  assessment += `PHYSICAL PROFILE:\n`;
  assessment += `• Measurement System: ${data.measurement_system || 'Not specified'}\n`;
  assessment += `• Weight: ${data.weight || 'Not provided'}\n`;
  assessment += `• Height: ${data.height || 'Not provided'}\n`;
  assessment += `• Waist Circumference: ${data.waist_circumference || 'Not provided'}\n\n`;
  
  assessment += `LIFESTYLE FACTORS:\n`;
  assessment += `• Stress Level: ${data.stress_level || 'Not rated'}/6\n`;
  assessment += `• Sleep Hours: ${data.sleep_hours || 'Not provided'} hours\n`;
  assessment += `• Exercise Routine: ${data.exercise_routine || 'Not provided'}\n`;
  assessment += `• Diet Type: ${data.diet_type || 'Not specified'}\n\n`;
  
  assessment += `MEDICAL HISTORY:\n`;
  assessment += `• Medical Conditions: ${data.diagnosed_conditions || 'None reported'}\n`;
  assessment += `• Hormone Therapy Status: ${data.taking_hrt || 'Not specified'}\n`;
  assessment += `• Supplements: ${data.taking_supplements || 'None reported'}\n`;
  assessment += `• Last Period: ${data.had_period_last_12_months || 'Not specified'}\n\n`;
  
  assessment += `WELLNESS GOALS & PRIORITIES:\n`;
  assessment += `• Current Health Priorities: ${data.health_priorities_all || 'Not specified'}\n`;
  assessment += `• Top Six Priorities: ${data.top_six_priorities || 'Not specified'}\n`;
  assessment += `• Self-Care Approach: ${data.prioritize_self_care || 'Not specified'}\n`;
  assessment += `• Journey Stage: ${data.menopause_journey_stage || 'Not specified'}\n`;
  assessment += `• Care Plan Structure Preference: ${data.care_plan_structure || 'Not specified'}\n`;
  assessment += `• Options Already Taken: ${data.self_care_options_taken || 'Not specified'}\n\n`;
  
  assessment += `DIETARY & NUTRITION:\n`;
  assessment += `• Diet Plan: ${data.diet_plan || 'Not specified'}\n`;
  assessment += `• Cooking Frequency: ${data.cooking_frequency || 'Not specified'}\n`;
  assessment += `• Grocery Budget: ${data.weekly_shopping_budget || 'Not specified'}\n`;
  assessment += `• Favorite Cuisines: ${data.favorite_cuisines || 'Not specified'}\n`;
  assessment += `• Dietary Restrictions: ${data.dietary_restrictions || 'None reported'}\n\n`;
  
  assessment += `EXERCISE & ACTIVITY:\n`;
  assessment += `• Exercise Days/Week: ${data.activity_days_per_week || 'Not specified'}\n`;
  assessment += `• Workout Duration: ${data.activity_minutes_per_session || 'Not specified'} minutes\n`;
  assessment += `• Sitting Hours/Day: ${data.sitting_hours_per_day || 'Not specified'}\n`;
  assessment += `• Exercise Types: ${data.exercise_routine || 'Not specified'}\n`;
  assessment += `• Wearable Device: ${data.wearable_device || 'None'}\n\n`;
  
  assessment += `SLEEP QUALITY ASSESSMENT:\n`;
  assessment += `• Sleep Hours: ${data.sleep_hours || 'Not provided'} hours\n`;
  assessment += `• Trouble Falling Asleep: ${data.trouble_falling_asleep || 'Not rated'}/6\n`;
  assessment += `• Wake Up Multiple Times: ${data.wake_up_several_times || 'Not rated'}/6\n`;
  assessment += `• Trouble Staying Asleep: ${data.trouble_staying_asleep || 'Not rated'}/6\n`;
  assessment += `• Wake Up Tired: ${data.wake_up_tired || 'Not rated'}/6\n\n`;
  
  assessment += `================================================================\n`;
  assessment += `Assessment completed via comprehensive online questionnaire.\n`;
  assessment += `Completion Date: ${data.completion_date || new Date().toISOString()}\n`;
  assessment += `Data processing consent: Given\n`;
  assessment += `Lead Source: Comprehensive Menopause Assessment Form\n`;
  
  return assessment;
}
