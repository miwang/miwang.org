/**
 * POST /api/contacts-login
 *
 * Validates the CONTACTS_PASSWORD env var and sets an HttpOnly session cookie.
 * The session token is HMAC-SHA256(CONTACTS_PASSWORD, "contacts:" + YYYY-MM-DD)
 * so it automatically expires at midnight UTC.
 *
 * Required Cloudflare Pages env var:
 *   CONTACTS_PASSWORD  — the teacher password (set in Pages > Settings > Variables)
 */

const COOKIE_NAME = 'contacts_session'
const COOKIE_MAX_AGE = 86400 // 24 hours in seconds

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
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {'Content-Type': 'application/json'},
  })
}

export async function onRequestPost(context) {
  const pw = context.env.CONTACTS_PASSWORD
  if (!pw) {
    return json({error: '服务器未配置 CONTACTS_PASSWORD 环境变量'}, 500)
  }

  let body
  try {
    body = await context.request.json()
  } catch {
    return json({error: 'Invalid request body'}, 400)
  }

  if (!body.password || body.password !== pw) {
    return json({error: '密码错误'}, 401)
  }

  const token = await hmacHex(pw, 'contacts:' + todayStr())
  const cookieStr = [
    `${COOKIE_NAME}=${token}`,
    `Max-Age=${COOKIE_MAX_AGE}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ].join('; ')

  return new Response(JSON.stringify({ok: true}), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieStr,
    },
  })
}
