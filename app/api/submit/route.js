import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Map frontend data to GHL form fields
    const formData = {
      formId: 'CZ3h3Go42EQ6rgs4BHS6',
      locationId: '3pu1nDWOsK1FDuN1RoSb',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      '6ZpOtOFSHaweNW4RJeQY': data.notes || JSON.stringify(data), // Extras in textarea
      source: 'Menopause Assessment Form',
      tags: ['assessment-complete']
    };

    const ghlResponse = await fetch('https://services.leadconnectorhq.com/forms/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://your-frontend-domain.com', // Replace with your actual domain
        'Origin': 'https://your-frontend-domain.com'  // Replace with your actual domain
      },
      body: JSON.stringify(formData),
    });

    const responseBody = await ghlResponse.text();
    console.log('GHL Status:', ghlResponse.status, 'Body:', responseBody);

    if (!ghlResponse.ok) {
      throw new Error(`GHL submission failed: ${responseBody}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
