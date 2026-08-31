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

// Read published content only. Without this, Sanity's default perspective can
// include drafts, so an unpublished edit in Studio would leak onto the site and
// existence checks could match a document that is not actually live.
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

/**
 * First + last token only.
 *
 * The roster prints the school's full legal name ("Lyanna Garcia Requilman")
 * while Sanity often holds a shortened form ("Lyanna Requilman"). Verified
 * unique across all 49 students in both cohorts, so it is a safe key.
 */
const firstLast = s => {
  const p = norm(s).split(' ').filter(Boolean)
  return p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : (p[0] || '')
}

const firstOnly = s => norm(s).split(' ')[0] || ''

/**
 * Lookup tiers, most specific first. Each key keeps ALL candidates so an
 * ambiguous key is rejected rather than silently resolved -- "Everleigh"
 * matches both Everleigh Dare and Everleigh Riley in 25-26.
 */
function buildTiers(students) {
  const mk = fn => {
    const m = new Map()
    for (const s of students) {
      const k = fn(s.nameEn || s.name)
      if (!k) continue
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(s)
    }
    return m
  }
  return [
    { name: 'exact', key: norm, map: mk(norm) },
    { name: 'no_middle_initial', key: dropInitials, map: mk(dropInitials) },
    { name: 'first_last', key: firstLast, map: mk(firstLast) },
    { name: 'first_name_only', key: firstOnly, map: mk(firstOnly) },
  ]
}

/** Resolve one roster name to a student, or report ambiguity. */
function resolve(rosterName, tiers) {
  for (const t of tiers) {
    const hits = t.map.get(t.key(rosterName))
    if (!hits || !hits.length) continue
    if (hits.length === 1) return { student: hits[0], method: t.name }
    return { ambiguous: hits, method: t.name }
  }
  return {}
}

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
  const data = await sanity(`/data/query/${DATASET}?perspective=published&${u}`, token)
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
    const tiers = buildTiers(existing.students)
    const pcBySid = new Map(existing.contacts.map(c => [c.sid, c]))

    const rows = []
    const claimed = new Map()
    for (const st of students) {
      const r = resolve(st.nameEn, tiers)
      if (r.ambiguous) {
        rows.push({
          nameEn: st.nameEn, status: 'ambiguous', matchMethod: r.method,
          note: `按「${r.method}」匹配到多人：${r.ambiguous.map(s => s.nameEn || s.name).join(' / ')}，请先在 Sanity 补全姓名`,
        })
        continue
      }
      const hit = r.student
      if (!hit) {
        rows.push({ nameEn: st.nameEn, status: 'no_student', note: 'Sanity 中找不到该学生' })
        continue
      }
      if (claimed.has(hit._id)) {
        rows.push({
          nameEn: st.nameEn, status: 'ambiguous', matchMethod: r.method,
          note: `与「${claimed.get(hit._id)}」匹配到同一个学生文档，请人工确认`,
        })
        continue
      }
      claimed.set(hit._id, st.nameEn)

      const pc = pcBySid.get(hit._id)
      rows.push({
        nameEn: st.nameEn,
        sanityName: hit.nameEn || hit.name || '',
        matchMethod: r.method,
        looseMatch: r.method === 'first_last' || r.method === 'first_name_only',
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
      looseMatches: rows.filter(r => r.looseMatch).length,
      ambiguous: rows.filter(r => r.status === 'ambiguous').length,
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
