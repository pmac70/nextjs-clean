import { NextResponse } from "next/server";
export const runtime = "nodejs";

const GHL_API_KEY = process.env.GHL_API_KEY;

function toMarkdownTable(obj) {
  const lines = ["| Field | Value |", "|------:|:------|"];
  for (const [k, v] of Object.entries(obj || {})) {
    const val =
      v === undefined || v === null || v === "" ? "_" : String(v).replace(/\n/g, "<br/>");
    lines.push(`| \`${k}\` | ${val} |`);
  }
  return lines.join("\n");
}
function formatNote(all) {
  const header = [
    "📌 **New Questionnaire Submission**",
    "",
    `**Name:** ${[all.firstName, all.lastName].filter(Boolean).join(" ")}`,
    all.email ? `**Email:** ${all.email}` : "",
    all.phone ? `**Phone:** ${all.phone}` : "",
    "",
    "### Full Answers",
    "",
  ]
    .filter(Boolean)
    .join("\n");
  return `${header}${toMarkdownTable(all)}`;
}

// tiny helper to check if a host is reachable from Vercel
async function probe(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return { ok: r.ok, status: r.status, url };
  } catch (e) {
    return { ok: false, status: 0, url, error: String(e) };
  }
}

/** GET /api/submit (diagnostic) */
export async function GET() {
  const checks = {
    hasKey: !!GHL_API_KEY,
    restProbe: await probe("https://rest.gohighlevel.com/v1/contacts/"),
    leadProbe: await probe("https://services.leadconnector.com/"),
  };
  return NextResponse.json({ ok: true, ...checks });
}

/** POST /api/submit — create contact then add a note (REST API key auth) */
export async function POST(request) {
  try {
    const payload = await request.json();

    // 1) create/update contact
    const contactRes = await fetch("https://rest.gohighlevel.com/v1/contacts/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GHL_API_KEY}`, // API Key
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        firstName: payload.firstName ?? "",
        lastName: payload.lastName ?? "",
        email: payload.email ?? "",
        phone: payload.phone ?? "",
      }),
    });

    const contactText = await contactRes.text();
    let contact;
    try { contact = JSON.parse(contactText); } catch { contact = { raw: contactText }; }

    if (!contactRes.ok || !contact?.id) {
      console.error("GHL contact error:", contactText);
      return NextResponse.json(
        { success: false, step: "contact", status: contactRes.status, error: contact },
        { status: 502 }
      );
    }

    // 2) add note with ALL fields
    const noteRes = await fetch(
      `https://rest.gohighlevel.com/v1/contacts/${contact.id}/notes/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ body: formatNote(payload) }),
      }
    );

    const noteText = await noteRes.text();
    if (!noteRes.ok) {
      console.error("GHL note error:", noteText);
      return NextResponse.json({
        success: true,
        contact,
        noteWarning: noteText,
        noteStatus: noteRes.status,
      });
    }

    return NextResponse.json({ success: true, contact });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
