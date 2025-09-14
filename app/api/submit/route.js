import { NextResponse } from 'next/server';

const allowedOrigins = [
  'https://app.anima-animus.co.uk',
  'https://nextjs-clean-taupe.vercel.app',
];

function handleCors(request) {
  const origin = request.headers.get('origin');
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders });
  }
  return corsHeaders;
}

export async function POST(request) {
  try {
    const corsHeaders = handleCors(request);
    const data = await request.json();
    const formData = {
      formId: 'CZ3h3Go42EQ6rgs4BHS6',
      locationId: '3pu1nDWOsK1FDuN1RoSb',
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      email: data.email || '',
      phone: data.phone || '',
      '6ZpOtOFSHaweNW4RJeQY': data.notes || JSON.stringify(data),
      source: 'Menopause Assessment Form',
      tags: ['assessment-complete']
    };
    const ghlResponse = await fetch('https://services.leadconnectorhq.com/forms/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://app.anima-animus.co.uk',
        'Origin': 'https://app.anima-animus.co.uk'
      },
      body: JSON.stringify(formData),
    });
    const responseBody = await ghlResponse.text();
    console.log('GHL Status:', ghlResponse.status, 'Body:', responseBody);
    if (!ghlResponse.ok) {
      throw new Error(`GHL submission failed: ${responseBody}`);
    }
    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: handleCors(request) });
  }
}
