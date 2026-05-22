const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2025-05-22'
const SANITY_MUTATION_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`

const ALLOWED_RATINGS = new Set(['ES', 'MS', 'AS'])

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

function getSanityToken(env) {
  return env.SANITY_API_TOKEN || env.SANITY_WRITE_TOKEN || env.SANITY_TOKEN || ''
}

function cleanString(value, maxLength = 2000) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

function normalizeRatings(ratings) {
  if (!Array.isArray(ratings)) return []
  return ratings.map((item) => ({
    _type: 'object',
    _key: cleanString(item.key, 80) || crypto.randomUUID(),
    key: cleanString(item.key, 80),
    domain: cleanString(item.domain, 120),
    statement: cleanString(item.statement, 600),
    rating: ALLOWED_RATINGS.has(item.rating) ? item.rating : 'MS',
  }))
}

async function sanityMutate(mutations, token) {
  const response = await fetch(SANITY_MUTATION_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({mutations}),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Sanity mutation failed: ${response.status} ${text}`)
  }

  return response.json()
}

export async function onRequestPost(context) {
  try {
    const token = getSanityToken(context.env)
    if (!token) {
      return jsonResponse({ok: false, error: 'Missing SANITY_API_TOKEN in Cloudflare environment variables.'}, 500)
    }

    const payload = await context.request.json()
    const studentId = cleanString(payload.studentId, 120)
    const academicYear = cleanString(payload.academicYear, 20) || '25-26'
    const className = cleanString(payload.className, 30)
    const markingPeriod = cleanString(payload.markingPeriod, 20) || '2'

    if (!studentId) return jsonResponse({ok: false, error: 'Missing studentId.'}, 400)
    if (!['elephant', 'tiger'].includes(className)) return jsonResponse({ok: false, error: 'Invalid className.'}, 400)

    const now = new Date().toISOString()
    const docId = `reportCard.${academicYear}.${markingPeriod}.${studentId.replace(/[^a-zA-Z0-9._-]/g, '-')}`

    const doc = {
      _id: docId,
      _type: 'reportCard',
      student: {_type: 'reference', _ref: studentId},
      academicYear,
      className,
      school: cleanString(payload.school, 160) || 'McIlvaine Early Childhood Center',
      grade: cleanString(payload.grade, 80) || 'Kindergarten',
      teacher: cleanString(payload.teacher, 120) || 'Wang Laoshi',
      reportDate: cleanString(payload.reportDate, 20),
      markingPeriod,
      sightWordsScore: cleanString(payload.sightWordsScore, 40),
      ratings: normalizeRatings(payload.ratings),
      teacherComments: cleanString(payload.teacherComments, 5000),
      lastSavedAt: now,
    }

    const result = await sanityMutate([{createOrReplace: doc}], token)
    return jsonResponse({ok: true, id: docId, result})
  } catch (error) {
    return jsonResponse({ok: false, error: error.message || 'Failed to save report card.'}, 500)
  }
}
