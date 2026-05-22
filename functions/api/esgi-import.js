const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2025-05-22'
const QUERY_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`
const MUTATE_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/mutate/${DATASET}`

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
  })
}

function getToken(env) {
  return env.SANITY_API_TOKEN || env.SANITY_WRITE_TOKEN || env.SANITY_TOKEN || ''
}

function clean(value, max = 2000) {
  return String(value ?? '').trim().slice(0, max)
}

function normalizeName(name) {
  return clean(name, 160).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function safeId(text) {
  return clean(text, 180)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || crypto.randomUUID()
}

function isLikelyClassLine(name) {
  const n = normalizeName(name)
  return !n || n.includes('wang class') || n.includes('mr wang') || n.includes('class') || n.includes('homeroom') || n.includes('teacher')
}

async function sanityQuery(query, params, token) {
  const url = new URL(QUERY_URL)
  url.searchParams.set('query', query)
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(`$${key}`, JSON.stringify(value)))
  const response = await fetch(url, {headers: {Authorization: `Bearer ${token}`}})
  if (!response.ok) throw new Error(`Sanity query failed: ${response.status} ${await response.text()}`)
  return (await response.json()).result
}

async function sanityMutate(mutations, token) {
  const response = await fetch(MUTATE_URL, {
    method: 'POST',
    headers: {'content-type': 'application/json', Authorization: `Bearer ${token}`},
    body: JSON.stringify({mutations}),
  })
  if (!response.ok) throw new Error(`Sanity mutation failed: ${response.status} ${await response.text()}`)
  return response.json()
}

function assessmentDoc(item, match, payload, now) {
  const assessments = Array.isArray(item.assessments) ? item.assessments : []
  const docId = `esgi-${safeId(payload.academicYear)}-${safeId(payload.markingPeriod)}-${safeId(item.studentName)}`
  const finalClassName = match?.className || payload.className
  return {
    _id: docId,
    _type: 'esgiAssessmentResult',
    studentName: clean(item.studentName, 160),
    matched: Boolean(match),
    needsReview: !match,
    academicYear: clean(payload.academicYear, 20),
    className: clean(finalClassName, 30),
    markingPeriod: clean(payload.markingPeriod, 10),
    reportDate: clean(payload.reportDate, 20),
    sourceFileName: clean(payload.sourceFileName, 240),
    assessments: assessments.map((a) => ({
      _type: 'object',
      _key: safeId(a.testName),
      testName: clean(a.testName, 180),
      baseline: Number.isFinite(a.baseline) ? a.baseline : null,
      q1: Number.isFinite(a.q1) ? a.q1 : null,
      q2: Number.isFinite(a.q2) ? a.q2 : null,
      q3: Number.isFinite(a.q3) ? a.q3 : null,
      q4: Number.isFinite(a.q4) ? a.q4 : null,
      latestScore: Number.isFinite(a.latestScore) ? a.latestScore : null,
      totalPossible: Number.isFinite(a.totalPossible) ? a.totalPossible : null,
      percent: Number.isFinite(a.percent) ? a.percent : null,
    })),
    rawTextPreview: clean(item.rawTextPreview, 1200),
    importedAt: now,
    ...(match ? {student: {_type: 'reference', _ref: match._id}} : {}),
  }
}

function reportCardPatch(match, item, payload, now) {
  const sightWords = (item.assessments || []).find((a) => normalizeName(a.testName) === 'chinese sight words')
  if (!match || !sightWords || !Number.isFinite(sightWords.latestScore)) return null
  const docId = `reportCard.${clean(payload.academicYear, 20)}.${clean(payload.markingPeriod, 10)}.${match._id.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  return {
    createIfNotExists: {
      _id: docId,
      _type: 'reportCard',
      student: {_type: 'reference', _ref: match._id},
      academicYear: clean(payload.academicYear, 20),
      className: clean(match.className || payload.className, 30),
      school: 'McIlvaine Early Childhood Center',
      grade: 'Kindergarten',
      teacher: 'Wang Laoshi',
      markingPeriod: clean(payload.markingPeriod, 10),
      ratings: [],
    },
  }
}

function reportCardSet(match, item, payload, now) {
  const sightWords = (item.assessments || []).find((a) => normalizeName(a.testName) === 'chinese sight words')
  if (!match || !sightWords || !Number.isFinite(sightWords.latestScore)) return null
  const total = Number.isFinite(sightWords.totalPossible) ? sightWords.totalPossible : 50
  const docId = `reportCard.${clean(payload.academicYear, 20)}.${clean(payload.markingPeriod, 10)}.${match._id.replace(/[^a-zA-Z0-9._-]/g, '-')}`
  return {
    patch: {
      id: docId,
      set: {
        className: clean(match.className || payload.className, 30),
        sightWordsScore: `${sightWords.latestScore}/${total}`,
        lastSavedAt: now,
      },
    },
  }
}

export async function onRequestPost(context) {
  try {
    const token = getToken(context.env)
    if (!token) return jsonResponse({ok: false, error: 'Missing SANITY_API_TOKEN.'}, 500)
    const payload = await context.request.json()
    const academicYear = clean(payload.academicYear, 20) || '25-26'
    const className = clean(payload.className, 30) || 'elephant'
    const markingPeriod = clean(payload.markingPeriod, 10) || '2'
    const results = (Array.isArray(payload.results) ? payload.results : []).filter((item) => item?.studentName && !isLikelyClassLine(item.studentName))
    if (!results.length) return jsonResponse({ok: false, error: 'No valid ESGI student results were provided.'}, 400)

    const students = await sanityQuery(
      '*[_type == "student" && academicYear == $academicYear && coalesce(status, "active") == "active"]{_id,nameEn,nameZh,name,className}',
      {academicYear},
      token,
    )
    const byName = new Map()
    ;(students || []).forEach((s) => {
      ;[s.nameEn, s.name, [s.nameEn, s.nameZh].filter(Boolean).join(' ')].filter(Boolean).forEach((n) => byName.set(normalizeName(n), s))
    })

    const now = new Date().toISOString()
    const mutations = []
    const summary = {total: results.length, matched: 0, unmatched: 0, reportCardsUpdated: 0, selectedClass: className}

    results.forEach((item) => {
      const match = byName.get(normalizeName(item.studentName))
      if (match) summary.matched += 1
      else summary.unmatched += 1
      mutations.push({createOrReplace: assessmentDoc(item, match, {academicYear, className, markingPeriod, reportDate: payload.reportDate, sourceFileName: payload.sourceFileName}, now)})
      const create = reportCardPatch(match, item, {academicYear, className, markingPeriod}, now)
      const set = reportCardSet(match, item, {academicYear, className, markingPeriod}, now)
      if (create && set) {
        mutations.push(create, set)
        summary.reportCardsUpdated += 1
      }
    })

    await sanityMutate(mutations, token)
    return jsonResponse({ok: true, summary})
  } catch (error) {
    return jsonResponse({ok: false, error: error.message || 'ESGI import failed.'}, 500)
  }
}
