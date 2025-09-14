import { NextResponse } from "next/server";
export const runtime = "nodejs";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

function toMarkdownTable(obj) {
  const lines = ["| Field | Value |", "|-------|-------|"];
  for (const [k, v] of Object.entries(obj || {})) {
    const val = v === undefined || v === null || v === "" ? "_" : String(v).replace(/\n/g, "<br/>");
    lines.push(`| ${k} | ${val} |`);
  }
  return lines.join("\n");
}

function formatNote(all) {
  const header = [
    "# **New Questionnaire Submission**",
    "",
    `**Name:** ${[all.firstName, all.lastName].filter(Boolean).join(" ")}`,
    all.email ? `**Email:** ${all.email}` : "",
    all.phone ? `**Phone:** ${all.phone}` : "",
    "",
    "### Full Answers",
    ""
  ]
    .filter(Boolean)
    .join("\n");
  return `${header}\n${toMarkdownTable(all)}`;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const res = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`,
        "Content-Type": "application/json",
        Version: "2021-07-28"
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        notes: formatNote(body)
      })
    });

    const text = await res.text();
    console.log("🔎 GHL API Status:", res.status);
    console.log("🔎 GHL API Response:", text);

    if (!res.ok) {
      return NextResponse.json({ error: text }, { status: res.status });
    }

    return NextResponse.json({ success: true, data: JSON.parse(text) });
  } catch (err) {
    console.error("❌ Fetch to GHL failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
