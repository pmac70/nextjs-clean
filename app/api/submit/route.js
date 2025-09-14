import { NextResponse } from "next/server";
export const runtime = "nodejs";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE = "https://rest.gohighlevel.com/v1";

/** Unified fetch helper for GHL REST */
async function ghl(path, init = {}) {
  const headers = {
    Authorization: `Bearer ${GHL_API_KEY}`,
    Accept: "application/json",
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data, raw: text };
}

/** Health check: visit /api/submit */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasKey: !!GHL_API_KEY,
    hasLocation: !!GHL_LOCATION_ID,
  });
}

/** Table + note formatter */
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
  return `${header}\n${toMarkdownTable(all)}`;
}

/** Try to find an existing contact by email/phone; return contactId or null */
async function findContactId({ email, phone }) {
  const params = new URLSearchParams();
  if (email) params.append("email", email);
  if (phone) params.append("phone", phone);
  if (!params.toString()) return null;

  const { ok, data, status, raw } = await ghl(`/contacts/lookup?${params.toString()}`, {
    method: "GET",
  });
  if (!ok) {
    console.error("Lookup failed", status, raw);
    return null;
  }
  // GHL returns { contact: { id, ... } } or sometimes { id } or array
  return data?.contact?.id || data?.id || data?.contacts?.[0]?.id || null;
}

export async function POST(request) {
  try {
    const payload = await request.json();

    // 1) Lookup existing contact by email/phone
    const existingId = await findContactId({
      email: payload.email,
      phone: payload.phone,
    });

    // 2) Build shared fields
    const common = {
      firstName: payload.firstName ?? "",
      lastName: payload.lastName ?? "",
      email: payload.email ?? "",
      phone: payload.phone ?? "",
    };

    let contactId;

    if (existingId) {
      // 3a) UPDATE existing contact
      const upd = await ghl(`/contacts/${existingId}`, {
        method: "PUT",
        body: JSON.stringify(common),
      });
      if (!upd.ok) {
        console.error("Update contact error", upd.status, upd.raw);
        return NextResponse.json(
          { success: false, step: "update", status: upd.status, error: upd.data },
          { status: 502 }
        );
      }
      contactId = existingId;
    } else {
      // 3b) CREATE new contact
      const crt = await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          ...common,
        }),
      });
      if (!crt.ok || !crt.data?.id) {
        console.error("Create contact error", crt.status, crt.raw);
        return NextResponse.json(
          { success: false, step: "create", status: crt.status, error: crt.data },
          { status: 502 }
        );
      }
      contactId = crt.data.id;
    }

    // 4) Add ONE big note with all fields
    const note = await ghl(`/contacts/${contactId}/notes/`, {
      method: "POST",
      body: JSON.stringify({ body: formatNote(payload) }),
    });

    if (!note.ok) {
      console.error("Note error", note.status, note.raw);
      // still return success for the contact but bubble the note warning
      return NextResponse.json({
        success: true,
        contactId,
        noteWarning: note.data,
        noteStatus: note.status,
      });
    }

    return NextResponse.json({ success: true, contactId });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
