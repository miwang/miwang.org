/**
 * GET /api/session
 *
 * Reports whether the caller already holds a valid `contacts_session` cookie.
 * The tools hub uses this to skip the password screen for someone who signed
 * in earlier, and the same cookie is what every tool endpoint already checks —
 * so one sign-in covers the whole tools area.
 *
 * Returns only a boolean. No password, token or user data is ever echoed.
 *
 * Required Cloudflare Pages env var:
 *   CONTACTS_PASSWORD
 */

const COOKIE_NAME = 'contacts_session'

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Must never be cached: a stale "valid" would let the gate open after
      // the daily token has already rolled over.
      'cache-control': 'no-store, must-revalidate',
    },
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

export async function onRequestGet(context) {
  const pw = context.env.CONTACTS_PASSWORD
  if (!pw) return json({ ok: false, valid: false, error: '服务器缺少环境变量：CONTACTS_PASSWORD' }, 500)

  const token = parseCookies(context.request.headers.get('Cookie'))[COOKIE_NAME]
  if (!token) return json({ ok: true, valid: false })

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const valid =
    token === (await hmacHex(pw, 'contacts:' + today)) ||
    token === (await hmacHex(pw, 'contacts:' + yesterday))

  return json({ ok: true, valid })
}
