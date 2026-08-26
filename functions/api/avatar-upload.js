/**
 * POST /api/avatar-upload   (multipart/form-data)
 *
 * Uploads ONE image to the Sanity asset pipeline and patches the target
 * student's `avatar` field to reference it. The page calls this once per
 * photo so progress can be shown and one failure doesn't sink the batch.
 *
 * Form fields:
 *   photo      — the image file (required)
 *   studentId  — Sanity _id of the student document (required)
 *   overwrite  — "1" to allow replacing an existing avatar (default: refuse)
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — verifies the contacts_session cookie
 *   SANITY_API_TOKEN   — Sanity token with write access
 */

const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const COOKIE_NAME = 'contacts_session'

const MAX_IMAGE_SIZE = 12 * 1024 * 1024
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/* ---------- session (same scheme as contacts-data.js) ---------- */

async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    out[part.slice(0, i).trim()] = part.slice(i + 1).trim()
  }
  return out
}

async function isValidSession(request, pw) {
  if (!pw) return false
  const token = parseCookies(request.headers.get('Cookie'))[COOKIE_NAME]
  if (!token) return false
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const a = await hmacHex(pw, 'contacts:' + today)
  const b = await hmacHex(pw, 'contacts:' + yesterday)
  return token === a || token === b
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function clean(value, maxLength = 240) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

export async function onRequestPost(context) {
  try {
    const pw = context.env.CONTACTS_PASSWORD
    const token =
      context.env.SANITY_API_TOKEN || context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    if (!pw || !token) {
      return json({ ok: false, error: '服务器未配置 CONTACTS_PASSWORD / SANITY_API_TOKEN' }, 500)
    }
    if (!(await isValidSession(context.request, pw))) {
      return json({ ok: false, error: '未登录或登录已过期，请重新登录。' }, 401)
    }

    const form = await context.request.formData()
    const file = form.get('photo')
    const studentId = clean(form.get('studentId'), 140)
    const overwrite = clean(form.get('overwrite')) === '1'

    if (!(file instanceof File)) return json({ ok: false, error: '缺少图片字段 "photo"。' }, 400)
    if (!studentId) return json({ ok: false, error: '缺少 studentId。' }, 400)
    if (file.size <= 0) return json({ ok: false, error: '图片是空文件。' }, 400)
    if (file.size > MAX_IMAGE_SIZE) {
      return json({ ok: false, error: '图片太大，单张上限 12MB。' }, 413)
    }

    const type = clean(file.type).toLowerCase()
    const name = clean(file.name, 240)
    const looksLikeImage =
      ALLOWED.includes(type) || /\.(jpe?g|png|webp|heic|heif)$/i.test(name)
    if (!looksLikeImage) {
      return json({ ok: false, error: '只支持 JPG / PNG / WebP / HEIC 图片。' }, 400)
    }

    // Confirm the student exists, and don't silently clobber an existing avatar.
    const checkQuery = `*[_id == $id][0]{_id, name, nameEn, "hasAvatar": defined(avatar.asset)}`
    const checkUrl = new URL(
      `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`,
    )
    checkUrl.searchParams.set('query', checkQuery)
    checkUrl.searchParams.set('$id', JSON.stringify(studentId))
    const checkRes = await fetch(checkUrl.toString(), {
      headers: { authorization: 'Bearer ' + token },
    })
    if (!checkRes.ok) throw new Error(`Student lookup failed: ${checkRes.status}`)
    const student = (await checkRes.json()).result
    if (!student) return json({ ok: false, error: '找不到这个学生文档。', studentId }, 404)
    if (student.hasAvatar && !overwrite) {
      return json(
        {
          ok: false,
          skipped: true,
          error: '该学生已有头像，未覆盖。',
          studentId,
          studentName: student.nameEn || student.name || '',
        },
        409,
      )
    }

    const uploadUrl =
      `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/assets/images/${DATASET}` +
      `?filename=${encodeURIComponent(name || 'avatar.jpg')}`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': type || 'image/jpeg',
      },
      body: await file.arrayBuffer(),
    })
    if (!uploadRes.ok) {
      throw new Error(`Asset upload failed: ${uploadRes.status} ${await uploadRes.text()}`)
    }
    const uploadData = await uploadRes.json()
    const assetDoc = uploadData?.document || uploadData
    const assetId = clean(assetDoc?._id)
    const assetUrl = clean(assetDoc?.url, 500)
    if (!assetId) throw new Error('图片上传成功但没有返回 asset id。')

    const mutateUrl = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`
    const mutationRes = await fetch(mutateUrl, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        mutations: [
          {
            patch: {
              id: studentId,
              set: {
                avatar: {
                  _type: 'image',
                  asset: { _type: 'reference', _ref: assetId },
                },
              },
            },
          },
        ],
      }),
    })
    if (!mutationRes.ok) {
      throw new Error(`Student update failed: ${mutationRes.status} ${await mutationRes.text()}`)
    }

    return json({
      ok: true,
      studentId,
      studentName: student.nameEn || student.name || '',
      assetId,
      assetUrl,
      replaced: !!student.hasAvatar,
    })
  } catch (error) {
    return json({ ok: false, error: error.message || '头像上传失败。' }, 500)
  }
}
