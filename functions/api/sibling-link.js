/**
 * POST /api/sibling-link
 *
 * Creates, updates or removes a MANUAL sibling link between two students.
 * Manual links always win over the address/phone/email inference in
 * /api/siblings, because contact data cannot represent shared custody,
 * guardianship, re-marriage, or the older cohorts that have no contact
 * records at all (23-24 rosters carry only name and birthdate).
 *
 * Body:
 *   action: "link" | "reject" | "remove"
 *   a, b:   student document ids
 *   relation?: free text, e.g. "兄妹" / "双胞胎"
 *   note?:  free text shown to the teacher only
 *
 * "reject" records a link marked rejected, which suppresses an incorrect
 * inferred pair without touching the underlying contact data.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — verifies the contacts_session cookie
 *   SANITY_API_TOKEN   — Sanity token with write access
 */

// Read published content only. Without this, Sanity's default perspective can
// include drafts, so an unpublished edit in Studio would leak onto the site and
// existence checks could match a document that is not actually live.
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const COOKIE_NAME = 'contacts_session'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

async function isValidSession(request, pw) {
  if (!pw) return false
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME]
  if (!token) return false
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  return token === (await hmacHex(pw, 'contacts:' + today)) ||
         token === (await hmacHex(pw, 'contacts:' + yesterday))
}

const clean = (v, n = 120) => String(v == null ? '' : v).trim().slice(0, n)

// Sanity rejects document ids longer than 128 chars, and the draft copy adds a
// "drafts." prefix, so the real budget is 121. Two long roster ids joined with
// "__" blow past that easily — every pairing of long names in the roster does.
const MAX_ID = 121
const ID_PREFIX = 'siblingLink-'

/** Short, stable, collision-resistant digest of a string. */
async function shortHash(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).slice(0, 8)
    .map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Stable id from the sorted pair, so linking A→B and B→A is the same document.
 *
 * Plain truncation is not an option: two different long pairs would collapse
 * onto one id and silently merge two families. When the readable form does not
 * fit, keep a readable head and append a hash of the FULL key, which stays
 * unique and still reproduces the same id next time.
 */
async function linkId(a, b) {
  const key = [a, b].sort().join('__')
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '-')
  const plain = ID_PREFIX + safe
  if (plain.length <= MAX_ID) return plain

  const digest = await shortHash(key)
  const head = safe.slice(0, MAX_ID - ID_PREFIX.length - digest.length - 2)
  return `${ID_PREFIX}${head}__${digest}`
}

async function sanity(path, token, init) {
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}${path}`, {
    ...init,
    headers: { authorization: 'Bearer ' + token, ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`Sanity ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

export async function onRequestPost(context) {
  try {
    const pw = context.env.CONTACTS_PASSWORD
    const token = context.env.SANITY_API_TOKEN || context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    if (!pw || !token) {
      const missing = []
      if (!pw) missing.push('CONTACTS_PASSWORD')
      if (!token) missing.push('SANITY_API_TOKEN')
      return json({ ok: false, error: `服务器缺少环境变量：${missing.join('、')}` }, 500)
    }
    if (!(await isValidSession(context.request, pw))) {
      return json({ ok: false, error: '未登录或登录已过期，请重新登录。' }, 401)
    }

    let body
    try { body = await context.request.json() } catch { return json({ ok: false, error: '请求体不是合法 JSON' }, 400) }

    const action = clean(body.action, 12)
    const a = clean(body.a, 160)
    const b = clean(body.b, 160)
    if (!['link', 'reject', 'remove'].includes(action)) {
      return json({ ok: false, error: 'action 必须是 link / reject / remove' }, 400)
    }
    if (!a || !b) return json({ ok: false, error: '需要两个学生 id' }, 400)
    if (a === b) return json({ ok: false, error: '不能把学生和自己关联' }, 400)

    // Both ids must be real students, so a typo cannot create a dangling link.
    const check = await sanity(
      `/data/query/${DATASET}?perspective=published&query=${encodeURIComponent('*[_id in $ids]{_id, nameEn, nameZh, academicYear}')}&$ids=${encodeURIComponent(JSON.stringify([a, b]))}`,
      token,
    )
    const found = check.result || []
    if (found.length !== 2) {
      return json({ ok: false, error: '有学生 id 不存在，未做任何改动。', found: found.map(f => f._id) }, 404)
    }

    const id = await linkId(a, b)

    if (action === 'remove') {
      await sanity(`/data/mutate/${DATASET}`, token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mutations: [{ delete: { id } }, { delete: { id: 'drafts.' + id } }] }),
      })
      return json({ ok: true, action, id, students: found })
    }

    const doc = {
      _id: id,
      _type: 'siblingLink',
      a: { _type: 'reference', _ref: a },
      b: { _type: 'reference', _ref: b },
      relation: clean(body.relation, 40) || null,
      note: clean(body.note, 300) || null,
      rejected: action === 'reject',
      updatedAt: new Date().toISOString(),
    }
    await sanity(`/data/mutate/${DATASET}`, token, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mutations: [{ createOrReplace: doc }] }),
    })

    return json({ ok: true, action, id, students: found })
  } catch (error) {
    return json({ ok: false, error: error.message || 'sibling-link failed' }, 500)
  }
}
