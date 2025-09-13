import { NextResponse } from "next/server";

/**
 * Optional: map your local form keys -> GHL custom field IDs.
 * Example:
 *   favoriteColor -> CF_abc123, companySize -> CF_def456
 */
const CUSTOM_FIELD_MAP = {
  // "favoriteColor": "CUSTOM_FIELD_ID_FROM_GHL",
  // "companySize": "CUSTOM_FIELD_ID_FROM_GHL",
};

const GHL_API_KEY = process.env.GHL_API_KEY;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID;

/**
 * Helper: split incoming data into:
 * - contact basics supported by GHL contact create
 * - custom fields (using CUSTOM_FIELD_MAP)
 * - everything else (goes into the note for full audit)
 */
function splitPayload(all) {
  // Basic contact fields GHL accepts directly
  const basics = {
    firstName: all.firstName ?? "",
    lastName: all.lastName ?? "",
    email: all.email ?? "",
    phone: all.phone ?? "",
  };

  // Build GHL custom fields from the map (only keys that exist in payload)
  const customFields = Object.entries(CUSTOM_FIELD_MAP)
    .filter(([key]) => all[key] !== undefined && all[key] !== null && all[key] !== "")
    .map(([key, fieldId]) => ({
      id: fieldId,
      value: String(all[key]),
    }));

  // Everything else (excluding basics + mapped custom fields) -> for the Note
  const excluded = new Set([
    "firstName",
    "lastName",
    "email",
    "phone",
    ...Object.keys(CUSTOM_FIELD_MAP),
  ]);

  const extras = {};
  for (const [k, v] of Object.entries(all)) {
    if (!excluded.has(k)) extras[k] = v;
  }

  return { basics, customFields, extras };
}

/** Format ALL answers into a tidy note (Markdown) */
function formatNote(all, extras) {
  const lines = [];

  lines.push("📌 **New Questionnaire Submission**");
  lines.push("");
  lines.push(`**Name:** ${all.firstName || ""} ${all.lastName || ""}`.trim());
  if (all.email) lines.push(`**Email:** ${all.email}`);
  if (all.phone) lines.push(`**Phone:** ${all.phone}`);
  lines.push("");
  lines.push("### Full Answers");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("|------:|:------|");

  const addRow = (k, v) =>
    lines.push(`| \`${k}\` | ${v === undefined || v === null || v === "" ? "_" : String(v).replace(/\n/g, "<br/>")} |`);

  // include EVERYTHING (basics + extras) for auditability
  for (const [k, v] of Object.entries(all)) addRow(k, v);

  return lines.join("\n");
}

export async function POST(request) {
  try {
    const payload = await request.json();

    const { basics, customFields, extras } = splitPayload(payload);

    // 1) Create/Update contact
    const contactBody = {
      ...basics,
      // If you want "upsert" behavior, include these:
      // source: "Website Form",
      // Dedupe by email if present
      ...(basics.email ? { email: basics.email } : {}),
      ...(customFields.length ? { customFields } : {}),
    };

    const contactRes = await fetch(
      `https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GHL_API_KEY}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
        },
        body: JSON.stringify(contactBody),
      }
    );

    const contactResult = await contactRes.json();
    if (!contactRes.ok) {
      return NextResponse.json(
        { success: false, step: "contact", error: contactResult },
        { status: 400 }
      );
    }

    // 2) Create Note with every answer (handles 160+ fields)
    if (contactResult.id) {
      const noteBody = {
        body: formatNote(payload, extras),
      };

      const noteRes = await fetch(
        `https://services.leadconnector.com/locations/${GHL_LOCATION_ID}/contacts/${contactResult.id}/notes/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GHL_API_KEY}`,
            "Content-Type": "application/json",
            Version: "2021-07-28",
          },
          body: JSON.stringify(noteBody),
        }
      );

      if (!noteRes.ok) {
        const noteErr = await noteRes.json().catch(() => ({}));
        // We still return success for contact creation, but surface note error
        return NextResponse.json({
          success: true,
          contact: contactResult,
          noteWarning: noteErr,
        });
      }
    }

    return NextResponse.json({ success: true, contact: contactResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
