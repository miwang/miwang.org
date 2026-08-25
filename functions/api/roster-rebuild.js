/**
 * POST /api/roster-rebuild
 *
 * Rebuilds parentContact documents (and optionally student.birthday) from a
 * roster that has ALREADY been parsed in the browser by js/roster-parser.js.
 * The PDF itself never reaches the server, and no family data is written to
 * the repository.
 *
 * Two modes:
 *   mode: "preview"  — match against Sanity, report what would change. No writes.
 *   mode: "commit"   — apply the changes listed in `apply`.
 *
 * Students are located by academicYear + normalised name, never by a computed
 * document id: 25-26 documents use random Sanity ids while 26-27 use slugs,
 * so id construction is not safe across cohorts.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — verifies the contacts_session cookie
 *   SANITY_API_TOKEN   — Sanity token with write access
 */

const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const COOKIE_NAME = 'contacts_session'
const MAX_STUDENTS = 200

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/* ---------- session (same scheme as contacts-data.js) ---------- */

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

/* ---------- helpers ---------- */

const norm = s => String(s || '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
const dropInitials = s => norm(s).split(' ').filter(w => w.length > 1).join(' ')

async function sanity(path, token, init) {
  const res = await fetch(`https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}${path}`, {
    ...init,
    headers: { authorization: 'Bearer ' + token, ...(init?.headers || {}) },
  })
  if (!res.ok) throw new Error(`Sanity ${path} -> ${res.status} ${await res.text()}`)
  return res.json()
}

async function query(token, groq, params = {}) {
  const u = new URLSearchParams({ query: groq })
  for (const [k, v] of Object.entries(params)) u.set('$' + k, JSON.stringify(v))
  const data = await sanity(`/data/query/${DATASET}?${u}`, token)
  return data.result
}

export async function onRequestPost(context) {
  try {
    const pw = context.env.CONTACTS_PASSWORD
    const token = context.env.SANITY_API_TOKEN || context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    if (!pw || !token) {
      // Name the missing variable(s) only — never echo a value. Pages keeps
      // Production and Preview variables separate, so a preview deployment can
      // be missing them while the live site works fine.
      const missing = []
      if (!pw) missing.push('CONTACTS_PASSWORD')
      if (!token) missing.push('SANITY_API_TOKEN')
      return json({
        ok: false,
        error: `服务器缺少环境变量：${missing.join('、')}。` +
          `若这是 Cloudflare 预览部署，请确认 Preview 环境也配置了这些变量，并重新部署后再试。`,
      }, 500)
    }
    if (!(await isValidSession(context.request, pw))) {
      return json({ ok: false, error: '未登录或登录已过期，请重新登录。' }, 401)
    }

    let body
    try { body = await context.request.json() } catch { return json({ ok: false, error: '请求体不是合法 JSON' }, 400) }

    const mode = body.mode === 'commit' ? 'commit' : 'preview'
    const academicYear = String(body.academicYear || '').trim()
    const students = Array.isArray(body.students) ? body.students : []
    const writeBirthday = body.writeBirthday !== false
    if (!academicYear) return json({ ok: false, error: '缺少 academicYear' }, 400)
    if (!students.length) return json({ ok: false, error: '没有收到解析结果' }, 400)
    if (students.length > MAX_STUDENTS) return json({ ok: false, error: '一次最多 200 人' }, 400)

    // --- existing Sanity state for this cohort
    const existing = await query(
      token,
      `{"students": *[_type=="student" && academicYear==$y]{_id, nameEn, name, nameZh, className, birthday},
        "contacts": *[_type=="parentContact" && academicYear==$y]{_id, "sid": student._ref, "count": count(contacts)}}`,
      { y: academicYear },
    )
    const byName = new Map()
    for (const s of existing.students) {
      for (const key of [norm(s.nameEn || s.name), dropInitials(s.nameEn || s.name)]) {
        if (key && !byName.has(key)) byName.set(key, s)
      }
    }
    const pcBySid = new Map(existing.contacts.map(c => [c.sid, c]))

    const rows = []
    for (const st of students) {
      const hit = byName.get(norm(st.nameEn)) || byName.get(dropInitials(st.nameEn))
      if (!hit) {
        rows.push({ nameEn: st.nameEn, status: 'no_student', note: 'Sanity 中找不到该学生' })
        continue
      }
      const pc = pcBySid.get(hit._id)
      rows.push({
        nameEn: st.nameEn,
        studentId: hit._id,
        nameZh: hit.nameZh || null,
        className: hit.className || null,
        pcId: pc ? pc._id : null,
        oldContactCount: pc ? pc.count : 0,
        newContactCount: (st.contacts || []).length,
        oldBirthday: hit.birthday || null,
        newBirthday: st.birthday || null,
        birthdayChanges: !!(st.birthday && st.birthday !== hit.birthday),
        needsReview: !!st.needsReview,
        reviewNote: st.reviewNote || '',
        status: pc ? 'ready' : 'no_parentcontact',
      })
    }

    const summary = {
      submitted: students.length,
      ready: rows.filter(r => r.status === 'ready').length,
      missingStudent: rows.filter(r => r.status === 'no_student').length,
      missingParentContact: rows.filter(r => r.status === 'no_parentcontact').length,
      birthdaysToFix: rows.filter(r => r.birthdayChanges).length,
      needsReview: rows.filter(r => r.needsReview).length,
      cohortSizeInSanity: existing.students.length,
    }

    if (mode === 'preview') return json({ ok: true, mode, summary, rows })

    // --- commit
    const allow = new Set(Array.isArray(body.apply) ? body.apply : rows.map(r => r.nameEn))
    const byNameIn = new Map(students.map(s => [s.nameEn, s]))
    const mutations = []
    const applied = []

    for (const r of rows) {
      if (r.status !== 'ready' || !allow.has(r.nameEn)) continue
      const src = byNameIn.get(r.nameEn)
      mutations.push({
        patch: {
          id: r.pcId,
          set: {
            contacts: src.contacts || [],
            needsReview: !!src.needsReview,
            reviewNote: src.reviewNote || '',
            importSource: 'roster-pdf-columnar',
            importedAt: new Date().toISOString(),
          },
        },
      })
      if (writeBirthday && r.birthdayChanges) {
        mutations.push({ patch: { id: r.studentId, set: { birthday: r.newBirthday } } })
      }
      applied.push(r.nameEn)
    }

    if (!mutations.length) return json({ ok: false, error: '没有可写入的记录' }, 400)

    // Chunked so one oversized transaction can't fail the whole run.
    let written = 0
    for (let i = 0; i < mutations.length; i += 40) {
      const chunk = mutations.slice(i, i + 40)
      await sanity(`/data/mutate/${DATASET}`, token, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mutations: chunk }),
      })
      written += chunk.length
    }

    return json({ ok: true, mode, summary, applied, mutationsWritten: written })
  } catch (error) {
    return json({ ok: false, error: error.message || 'rebuild failed' }, 500)
  }
}
