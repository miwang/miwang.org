const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'
const MAX_VIDEO_SIZE = 80 * 1024 * 1024

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization, x-upload-password',
  }
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function cleanString(value, maxLength = 180) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

function getSanityToken(env) {
  return env.SANITY_API_TOKEN || env.SANITY_WRITE_TOKEN || env.SANITY_TOKEN || ''
}

function isAuthorized(request, env) {
  const expected = cleanString(env.SENTENCE_UPLOAD_PASSWORD || env.CONTACTS_PASSWORD)
  if (!expected) return false
  const headerPassword = cleanString(request.headers.get('x-upload-password'))
  const auth = cleanString(request.headers.get('authorization'))
  const bearer = auth.startsWith('Bearer ') ? cleanString(auth.slice(7)) : ''
  return headerPassword === expected || bearer === expected
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function onRequestPost(context) {
  try {
    if (!isAuthorized(context.request, context.env)) {
      return jsonResponse({ ok: false, error: 'Unauthorized.' }, 401)
    }

    const token = getSanityToken(context.env)
    if (!token) {
      return jsonResponse({ ok: false, error: 'Missing SANITY_API_TOKEN in Cloudflare environment variables.' }, 500)
    }

    const formData = await context.request.formData()
    const file = formData.get('video')
    if (!(file instanceof File)) {
      return jsonResponse({ ok: false, error: 'Missing video file field "video".' }, 400)
    }

    if (file.size <= 0) return jsonResponse({ ok: false, error: 'Video file is empty.' }, 400)
    if (file.size > MAX_VIDEO_SIZE) {
      return jsonResponse({ ok: false, error: 'Video file is too large. Max 80MB.' }, 413)
    }

    const type = cleanString(file.type).toLowerCase()
    const name = cleanString(file.name, 240)
    const isMp4 = type === 'video/mp4' || name.toLowerCase().endsWith('.mp4')
    if (!isMp4) {
      return jsonResponse({ ok: false, error: 'Only MP4 videos are supported.' }, 400)
    }

    const uploadUrl = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/assets/files/${DATASET}?filename=${encodeURIComponent(name || 'sentence-video.mp4')}`
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        authorization: 'Bearer ' + token,
        'content-type': type || 'video/mp4',
      },
      body: await file.arrayBuffer(),
    })
    if (!uploadRes.ok) {
      const text = await uploadRes.text()
      throw new Error(`Asset upload failed: ${uploadRes.status} ${text}`)
    }
    const uploadData = await uploadRes.json()
    const assetDoc = uploadData?.document || uploadData
    const assetId = cleanString(assetDoc?._id)
    const assetUrl = cleanString(assetDoc?.url, 500)
    if (!assetId) throw new Error('Asset upload succeeded but no asset id was returned.')

    const sentenceId = cleanString(formData.get('sentenceId'), 140)
    if (sentenceId) {
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
                id: sentenceId,
                set: {
                  video: {
                    _type: 'file',
                    asset: { _type: 'reference', _ref: assetId },
                  },
                },
              },
            },
          ],
        }),
      })
      if (!mutationRes.ok) {
        const text = await mutationRes.text()
        throw new Error(`Sentence update failed: ${mutationRes.status} ${text}`)
      }
    }

    return jsonResponse({
      ok: true,
      assetId,
      assetUrl,
      attachedSentenceId: sentenceId || null,
    })
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || 'Failed to upload sentence video.' }, 500)
  }
}
