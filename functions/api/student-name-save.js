/**
 * POST /api/student-name-save
 *
 * Updates the Chinese name on one or more student documents. Exists because
 * Chinese names get revised in practice — simplifying strokes for a young
 * child, or aligning a surname once siblings are discovered — and the name
 * tag tool is where that gets noticed.
 *
 * `name` is kept in step with `nameZh`: the roster convention is that `name`
 * holds the Chinese name when there is one, and the English name otherwise.
 *
 * Body:
 *   { updates: [{ id, nameZh }, ...] }   nameZh: "" clears it
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — verifies the contacts_session cookie
 *   SANITY_API_TOKEN   — Sanity token with write access
 */

const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const COOKIE_NAME = 'contacts_session'
const MAX_UPDATES = 120

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

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

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

    const updates = Array.isArray(body.updates) ? body.updates : []
    if (!updates.length) return json({ ok: false, error: '没有收到要保存的改动' }, 400)
    if (updates.length > MAX_UPDATES) return json({ ok: false, error: `一次最多 ${MAX_UPDATES} 条` }, 400)

    const clean = []
    for (const u of updates) {
      const id = String(u.id || '').trim().slice(0, 200)
      const hasZh = Object.prototype.hasOwnProperty.call(u, 'nameZh')
      const hasNum = Object.prototype.hasOwnProperty.call(u, 'studentNumber')
      const zh = hasZh ? String(u.nameZh == null ? '' : u.nameZh).trim().slice(0, 30) : null
      if (!id) continue
      if (zh && !HAN.test(zh)) {
        return json({ ok: false, error: `「${zh}」不含汉字，未保存任何改动。` }, 400)
      }
      let num = null
      if (hasNum) {
        num = Number(u.studentNumber)
        if (!Number.isInteger(num) || num < 1 || num > 99) {
          return json({ ok: false, error: `座号「${u.studentNumber}」必须是 1-99 的整数。` }, 400)
        }
      }
      if (!hasZh && !hasNum) continue
      clean.push({ id, zh, num, hasZh, hasNum })
    }
    if (!clean.length) return json({ ok: false, error: '没有有效的改动' }, 400)

    // Verify every id is a real student first, so one typo cannot create a
    // stray document via createOrReplace semantics elsewhere.
    const q = '*[_type=="student" && _id in $ids]{_id, nameEn, name, nameZh, studentNumber}'
    const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}` +
      `?query=${encodeURIComponent(q)}&$ids=${encodeURIComponent(JSON.stringify(clean.map(c => c.id)))}`
    const res = await fetch(url, { headers: { authorization: 'Bearer ' + token } })
    if (!res.ok) throw new Error(`[查询学生] Sanity 返回 ${res.status}`)
    const found = (res.json ? await res.json() : {}).result || []
    const byId = new Map(found.map(s => [s._id, s]))
    const missing = clean.filter(c => !byId.has(c.id)).map(c => c.id)
    if (missing.length) {
      return json({ ok: false, error: '有学生 id 不存在，未保存任何改动。', missing }, 404)
    }

    const mutations = []
    const changed = []
    for (const c of clean) {
      const s = byId.get(c.id)
      const set = {}
      if (c.hasZh && (s.nameZh || '') !== c.zh) {
        set.nameZh = c.zh || null
        // `name` is the legacy display field: Chinese when there is one,
        // English otherwise. Keeping it in step avoids pages that read `name`
        // showing a stale value.
        set.name = c.zh || s.nameEn || s.name || ''
      }
      if (c.hasNum && (s.studentNumber ?? null) !== c.num) set.studentNumber = c.num
      if (!Object.keys(set).length) continue
      mutations.push({ patch: { id: c.id, set } })
      changed.push({
        id: c.id,
        nameZh: c.hasZh ? { from: s.nameZh || null, to: c.zh || null } : undefined,
        studentNumber: c.hasNum ? { from: s.studentNumber ?? null, to: c.num } : undefined,
      })
    }
    if (!mutations.length) return json({ ok: true, changed: [], note: '没有实际变化' })

    const mres = await fetch(
      `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`,
      {
        method: 'POST',
        headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
        body: JSON.stringify({ mutations }),
      },
    )
    if (!mres.ok) throw new Error(`[写回学生] Sanity 返回 ${mres.status}: ${(await mres.text()).slice(0, 300)}`)

    return json({ ok: true, changed })
  } catch (error) {
    return json({ ok: false, error: error.message || '保存失败' }, 500)
  }
}
