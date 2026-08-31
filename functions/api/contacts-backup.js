/**
 * GET /api/contacts-backup
 *
 * Exports student + parentContact data for backup before merge/import.
 * Requires valid contacts session and SANITY_API_TOKEN.
 */

const COOKIE_NAME = 'contacts_session'
// Read published content only. Without this, Sanity's default perspective can
// include drafts, so an unpublished edit in Studio would leak onto the site and
// existence checks could match a document that is not actually live.
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

async function sanityQuery(groq, token) {
  const url = `https://${PROJECT_ID}.api.sanity.io/${API_VER}/data/query/${DATASET}?perspective=published&query=${encodeURIComponent(groq)}`
  const resp = await fetch(url, {
    headers: {Authorization: `Bearer ${token}`},
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Sanity query failed (${resp.status}): ${text.slice(0, 300)}`)
  }
  const data = await resp.json()
  return Array.isArray(data.result) ? data.result : []
}

function quoteGroqString(s) {
  return JSON.stringify(String(s || ''))
}

export async function onRequestGet(context) {
  const pw = context.env.CONTACTS_PASSWORD
  const sanityToken = context.env.SANITY_API_TOKEN
  if (!pw || !sanityToken) {
    return json({error: '服务器未配置所需的环境变量（CONTACTS_PASSWORD / SANITY_API_TOKEN）'}, 500)
  }

  const isValid = await validateSession(context.request, pw)
  if (!isValid) return json({error: 'Unauthorized'}, 401)

  const reqUrl = new URL(context.request.url)
  const year = (reqUrl.searchParams.get('year') || '').trim()
  const yearFilter = year ? ` && academicYear == ${quoteGroqString(year)}` : ''

  const studentGroq = `*[_type == "student"${yearFilter}] {
    _id,
    _type,
    nameZh,
    nameEn,
    name,
    birthday,
    academicYear,
    className,
    homeroomCode,
    status,
    notes,
    importSource,
    lastImportedAt,
    avatar
  } | order(academicYear desc, className asc, nameZh asc, nameEn asc)`

  const contactGroq = `*[_type == "parentContact"${yearFilter}] {
    _id,
    _type,
    academicYear,
    contacts,
    needsReview,
    rawImportText,
    importSource,
    importedAt,
    student
  } | order(academicYear desc, _id asc)`

  try {
    const [students, parentContacts] = await Promise.all([
      sanityQuery(studentGroq, sanityToken),
      sanityQuery(contactGroq, sanityToken),
    ])

    return json({
      ok: true,
      exportedAt: new Date().toISOString(),
      year: year || null,
      students,
      parentContacts,
      counts: {
        students: students.length,
        parentContacts: parentContacts.length,
      },
    })
  } catch (err) {
    return json({error: err.message || 'Backup export failed'}, 500)
  }
}
