/**
 * GET /api/contacts-data
 *
 * Server-side proxy that validates the session cookie, then fetches
 * parentContact documents from Sanity using the private API token.
 * Parent contact data is never served without a valid session.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — used to verify the session cookie HMAC
 *   SANITY_API_TOKEN   — Sanity read token (viewer or editor role)
 *
 * Query params:
 *   year   — filter by academicYear (e.g. "25-26"), optional
 *   class  — filter by className ("elephant" | "tiger"), optional
 */

const COOKIE_NAME = 'contacts_session'
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VER = 'v2023-05-03'

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

export async function onRequestGet(context) {
  const pw = context.env.CONTACTS_PASSWORD
  const sanityToken = context.env.SANITY_API_TOKEN
  if (!pw || !sanityToken) {
    return json({error: '服务器未配置所需的环境变量（CONTACTS_PASSWORD / SANITY_API_TOKEN）'}, 500)
  }

  const isValid = await validateSession(context.request, pw)
  if (!isValid) {
    return json({error: 'Unauthorized'}, 401)
  }

  const url = new URL(context.request.url)
  const yearFilter = url.searchParams.get('year') || ''
  const classFilter = url.searchParams.get('class') || ''

  // Build GROQ filter conditions to push filtering to the database level
  const conditions = ['_type == "parentContact"']
  if (yearFilter) conditions.push(`academicYear == "${yearFilter}"`)
  if (classFilter) conditions.push(`student->className == "${classFilter}"`)

  const groq = `*[${conditions.join(' && ')}] | order(
    academicYear desc,
    student->className asc,
    student->nameEn asc,
    student->nameZh asc
  ) {
    _id,
    academicYear,
    needsReview,
    contacts,
    "student": student-> {
      _id,
      nameZh,
      nameEn,
      name,
      className,
      homeroomCode,
      "avatarUrl": avatar.asset->url
    }
  }`

  try {
    const apiUrl = `https://${PROJECT_ID}.api.sanity.io/${API_VER}/data/query/${DATASET}?query=${encodeURIComponent(groq)}`
    const resp = await fetch(apiUrl, {
      headers: {Authorization: `Bearer ${sanityToken}`},
    })
    if (!resp.ok) {
      const text = await resp.text()
      return json({error: `Sanity 查询失败: ${resp.status} - ${text.slice(0, 200)}`}, 502)
    }
    const data = await resp.json()
    let results = Array.isArray(data.result) ? data.result : []

    return json({ok: true, data: results, total: results.length})
  } catch (err) {
    return json({error: err.message || 'Unknown error'}, 500)
  }
}
