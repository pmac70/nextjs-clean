import { NextResponse } from "next/server";
export const runtime = "nodejs";

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;
const BASE = "https://rest.gohighlevel.com/v1";

/** Unified GHL fetch helper */
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

/** Health check */
export async function GET() {
  return NextResponse.json({
    ok: true,
    hasKey: !!GHL_API_KEY,
    hasLocation: !!GHL_LOCATION_ID,
  });
}

/** Helpers to format a single big Note */
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
    "📌 **Questionnaire Submission**",
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

/** Only keep keys with real values (don’t send blanks on update) */
function pickNonEmpty(obj, allowedKeys) {
  const out = {};
  for (const k of allowedKeys) {
    const v = obj[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      out[k] = v;
    }
  }
  return out;
}

/** Try to find an existing contact by email/phone */
async function findContactId({ email, phone }) {
  const params = new URLSearchParams();
  if (email) params.append("email", email);
  if (phone) params.append("phone", phone);
  if (!params.toString()) return null;

  const r = await ghl(`/contacts/lookup?${params.toString()}`, { method: "GET" });
  if (!r.ok) {
    console.error("Lookup failed", r.status, r.raw);
    return null;
  }
  return r.data?.contact?.id || r.data?.id || r.data?.contacts?.[0]?.id || null;
}

export async function POST(request) {
  try {
    const payload = await request.json();

    // 1) Lookup by email/phone (can also add externalId if you capture FB lead id)
    const existingId = await findContactId({
      email: payload.email,
      phone: payload.phone,
    });

    // Allowed top-level contact fields you want to maintain
    const allowed = ["firstName", "lastName", "email", "phone"];
    const nonEmpty = pickNonEmpty(payload, allowed);

    let contactId;

    if (existingId) {
      // 2a) UPDATE only with the non-empty fields we received
      if (Object.keys(nonEmpty).length > 0) {
        const upd = await ghl(`/contacts/${existingId}`, {
          method: "PUT",
          body: JSON.stringify(nonEmpty),
        });
        if (!upd.ok) {
          console.error("Update contact error", upd.status, upd.raw);
          return NextResponse.json(
            { success: false, step: "update", status: upd.status, error: upd.data },
            { status: 502 }
          );
        }
      }
      contactId = existingId;
    } else {
      // 2b) CREATE (require locationId)
      const crt = await ghl(`/contacts/`, {
        method: "POST",
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          ...nonEmpty,
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

    // 3) Add a single big Note with ALL Q&A
    const note = await ghl(`/contacts/${contactId}/notes/`, {
      method: "POST",
      body: JSON.stringify({ body: formatNote(payload) }),
    });
    if (!note.ok) {
      console.error("Note error", note.status, note.raw);
      return NextResponse.json({
        success: true,
        contactId,
        noteWarning: note.data,
        noteStatus: note.status,
      });
    }

    // (Optional) Tag the contact so you can build automations off it:
    // await ghl(`/contacts/${contactId}/tags/`, { method: "POST", body: JSON.stringify({ tags: ["Questionnaire Submitted"] }) });

    return NextResponse.json({ success: true, contactId });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
