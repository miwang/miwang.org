/**
 * POST /api/roster-parse
 *
 * Phase B of the two-phase roster parsing pipeline.
 * Accepts pre-segmented student text blocks (from the client-side Phase A
 * rule engine) and uses OpenAI to extract structured student/contact records
 * with confidence scores and issue flags.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — session validation (same cookie as contacts-*)
 *   OPENAI_API_KEY     — OpenAI API key (model: gpt-4o-mini)
 *
 * Request body:
 *   {
 *     blocks: Array<{ text: string, homeroom: string }>,
 *     academicYear: string   // e.g. "25-26"
 *   }
 *
 * Response:
 *   {
 *     rows: Array<ParsedRow>,
 *     model: string
 *   }
 *
 * ParsedRow shape (matches /api/contacts-import expectations + extra AI fields):
 *   {
 *     nameEn:       string,
 *     birthday:     string,   // "YYYY-MM-DD" or ""
 *     homeroomCode: string,   // inherited from block
 *     className:    string,   // "elephant" | "tiger" | ""
 *     contacts:     ContactItem[],
 *     confidence:   number,   // 0.0–1.0
 *     flags:        string[], // "missing_birthday" | "missing_contact" | ...
 *     rawImportText: string,
 *     needsReview:  boolean
 *   }
 */

const COOKIE_NAME = 'contacts_session'

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

async function validateSession(request, secret) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = {}
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const k = part.slice(0, eqIdx).trim()
    const v = part.slice(eqIdx + 1).trim()
    if (k) cookies[k] = v
  }
  const token = cookies[COOKIE_NAME]
  if (!token) return false
  const expected = await hmacHex(secret, 'contacts:' + todayStr())
  return token === expected
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

function homeroomToClass(code) {
  if (code === '15') return 'elephant'
  if (code === '17') return 'tiger'
  return ''
}

// ---------------------------------------------------------------------------
// System prompt sent to OpenAI
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are a school roster data extractor for a Chinese language school in the US.

Each student block starts with a grade code + name line, for example "KN Smith, John"
(KN = Kindergarten). Parse "KN Last, First" → nameEn = "First Last".

The block may also contain (in no fixed order):
- Birthday: date like "10/15/2019" → convert to "YYYY-MM-DD"
- Street address: "123 Main St"
- City/State/ZIP line: "Anytown PA 19103"
- Guardian name: a full name without a grade prefix
- US phone number in various formats → normalize to "(XXX) XXX-XXXX"
- Email address → normalize to lowercase

Return ONLY a JSON object {"students":[...]} with exactly one entry per input block,
in the same order. Each entry:
{
  "nameEn":   "First Last",
  "birthday": "YYYY-MM-DD",
  "contacts": [
    {
      "contactName":  "Guardian Name",
      "relationship": "mom|dad|parent",
      "type":         "phone|email|address",
      "value":        "normalized value",
      "isPrimary":    true,
      "notes":        ""
    }
  ],
  "confidence": 0.9,
  "flags": []
}

Flags:
- "missing_birthday"   – no birthday found
- "missing_contact"    – no phone or email found
- "name_conflict"      – guardian name same as student name
- "ambiguous_guardian" – unclear which guardian owns a contact
- "malformed_date"     – date present but couldn't be fully parsed

Confidence:
- 0.95  all fields clearly extracted
- 0.75  minor ambiguity (e.g. guardian name uncertain)
- 0.50  birthday or contact missing
- 0.25  even nameEn is uncertain

Rules:
1. Parse "KN Smith, John" → nameEn = "John Smith"; strip grade prefix before the comma.
2. Never copy the student's own name into contactName.
3. Multiple phones = multiple phone contact entries.
4. Multiple emails = multiple email contact entries.
5. Address: one entry with type="address", value = full street + city/state/zip string.
6. The homeroom code is provided in context; do not try to extract it from the text.`

// ---------------------------------------------------------------------------
// Build the user message for one batch of blocks
// ---------------------------------------------------------------------------
function buildUserMessage(blocks) {
  const parts = blocks.map((b, i) => {
    return `--- BLOCK ${i + 1} (homeroom: ${b.homeroom || 'unknown'}) ---\n${b.text}`
  })
  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Call OpenAI and parse the JSON response
// ---------------------------------------------------------------------------
async function callOpenAI(blocks, apiKey) {
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: {type: 'json_object'},
      temperature: 0.1,
      messages: [
        {role: 'system', content: SYSTEM_PROMPT},
        {role: 'user', content: buildUserMessage(blocks)},
      ],
    }),
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OpenAI API error (${resp.status}): ${txt.slice(0, 200)}`)
  }

  const data = await resp.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned empty content')

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI response was not valid JSON')
  }

  const students = parsed.students
  if (!Array.isArray(students)) throw new Error('OpenAI response missing "students" array')

  return {students, model: data.model}
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function onRequestPost(context) {
  const pw = context.env.CONTACTS_PASSWORD
  const apiKey = context.env.OPENAI_API_KEY

  if (!pw) return json({error: '服务器未配置 CONTACTS_PASSWORD'}, 500)
  if (!apiKey) return json({error: '服务器未配置 OPENAI_API_KEY'}, 500)

  const isValid = await validateSession(context.request, pw)
  if (!isValid) return json({error: 'Unauthorized'}, 401)

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({error: '请求体解析失败'}, 400)
  }

  const {blocks = [], academicYear = '25-26'} = body
  if (!blocks.length) return json({error: '没有可解析的学生块'}, 400)
  if (blocks.length > 50) return json({error: '单次最多解析 50 个学生块'}, 400)

  let students, model
  try {
    ;({students, model} = await callOpenAI(blocks, apiKey))
  } catch (err) {
    return json({error: err.message || 'OpenAI 调用失败'}, 502)
  }

  // Merge AI output with block metadata
  const rows = blocks.map((block, i) => {
    const ai = students[i] || {}
    const homeroomCode = block.homeroom || ''
    const className = homeroomToClass(homeroomCode)
    const contacts = (ai.contacts || []).map((c, ci) => ({
      _type: 'object',
      _key: `c${ci}`,
      contactName: c.contactName || '',
      relationship: c.relationship || 'parent',
      type: c.type || 'phone',
      value: c.value || '',
      isPrimary: typeof c.isPrimary === 'boolean' ? c.isPrimary : ci === 0,
      notes: c.notes || '',
    }))

    const flags = Array.isArray(ai.flags) ? ai.flags : []
    const confidence = typeof ai.confidence === 'number' ? ai.confidence : 0.5
    const needsReview = confidence < 0.8 || flags.length > 0

    return {
      nameEn: ai.nameEn || '',
      nameZh: '',
      birthday: ai.birthday || '',
      homeroomCode,
      className,
      academicYear,
      contacts,
      confidence,
      flags,
      needsReview,
      rawImportText: block.text,
    }
  })

  return json({rows, model: model || 'gpt-4o-mini'})
}
