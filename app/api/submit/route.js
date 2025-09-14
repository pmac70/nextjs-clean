try {
  const res = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GHL_API_KEY}`,
      "Content-Type": "application/json",
      "Version": "2021-07-28"
    },
    body: JSON.stringify({
      locationId: process.env.GHL_LOCATION_ID,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      notes: formatNote(body)
    })
  });

  const text = await res.text();
  console.log("GHL API status:", res.status);
  console.log("GHL API response:", text);

  if (!res.ok) {
    return NextResponse.json({ error: text }, { status: res.status });
  }

  return NextResponse.json({ success: true, data: JSON.parse(text) });
} catch (err) {
  console.error("Fetch to GHL failed:", err);
  return NextResponse.json({ error: err.message }, { status: 500 });
}
