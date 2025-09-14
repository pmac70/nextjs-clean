// /app/api/submit/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received assessment data:', data);

    // Format the assessment data for the notes field
    const formatAssessmentData = (assessmentData) => {
      const timestamp = new Date().toLocaleString();
      let formattedText = `MENOPAUSE ASSESSMENT RESULTS\n`;
      formattedText += `=============================\n`;
      formattedText += `Date: ${timestamp}\n\n`;

      // If assessmentData is an object with Q&A pairs
      if (typeof assessmentData === 'object' && assessmentData !== null) {
        Object.entries(assessmentData).forEach(([question, answer], index) => {
          formattedText += `Q${index + 1}: ${question}\n`;
          formattedText += `A${index + 1}: ${answer}\n\n`;
        });
      } 
      // If assessmentData is already a formatted string
      else if (typeof assessmentData === 'string') {
        formattedText += assessmentData;
      }
      // If assessmentData is an array of Q&A objects
      else if (Array.isArray(assessmentData)) {
        assessmentData.forEach((item, index) => {
          if (item.question && item.answer) {
            formattedText += `Q${index + 1}: ${item.question}\n`;
            formattedText += `A${index + 1}: ${item.answer}\n\n`;
          }
        });
      }

      return formattedText;
    };

    // Prepare data for Zapier webhook
    const webhookData = {
      first_name: data.first_name || data.firstName || '',
      last_name: data.last_name || data.lastName || '',
      email: data.email || '',
      phone: data.phone || '',
      assessment_data: formatAssessmentData(data.assessment_data || data.completeAssessment || data.responses),
      source: 'Menopause Questionnaire'
    };

    console.log('Sending to Zapier webhook:', {
      ...webhookData,
      assessment_data: `${webhookData.assessment_data.substring(0, 200)}...` // Log first 200 chars
    });

    // Send to Zapier webhook
    const zapierResponse = await fetch('https://hooks.zapier.com/hooks/catch/24342981/utnd42s/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData)
    });

    console.log('Zapier response status:', zapierResponse.status);
    
    if (!zapierResponse.ok) {
      const errorText = await zapierResponse.text();
      console.error('Zapier webhook error:', errorText);
      throw new Error(`Zapier webhook failed: ${zapierResponse.status}`);
    }

    const zapierResult = await zapierResponse.text();
    console.log('Zapier webhook success:', zapierResult);

    return NextResponse.json({ 
      success: true, 
      message: 'Assessment submitted successfully to GoHighLevel via Zapier',
      zapierResponse: zapierResult 
    });

  } catch (error) {
    console.error('Error submitting to Zapier:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to submit assessment',
        details: error.message 
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': 'https://app.anima-animus.co.uk',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}
