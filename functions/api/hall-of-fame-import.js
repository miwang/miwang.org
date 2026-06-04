/**
 * POST /api/hall-of-fame-import
 *
 * Creates or deletes hallOfFame records in Sanity.
 * Protected by the same contacts_session cookie auth used by contacts endpoints.
 *
 * Required Cloudflare Pages env vars:
 *   CONTACTS_PASSWORD  — teacher password (for session validation)
 *   SANITY_API_TOKEN   — Sanity write token (editor role)
 *
 * Request body (action = 'create'):
 *   { action: 'create', month: 'YYYY-MM', awards: [{ studentName, awardType, sightWordScore }] }
 *
 * Request body (action = 'delete'):
 *   { action: 'delete', docId: 'hof-...' }
 */

const COOKIE_NAME = 'contacts_session'
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VER = '2025-05-22'
const MUTATE_URL = 'https://' + PROJECT_ID + '.api.sanity.io/v' + API_VER + '/data/mutate/' + DATASET
const QUERY_URL  = 'https://' + PROJECT_ID + '.api.sanity.io/v' + API_VER + '/data/query/' + DATASET

const AWARD_TITLES = {
  chinese_words: '四会字大师奖',
  mathematics:   '数学大师奖',
  progression:   '最佳进步奖',
}

// ── Auth helpers (same pattern as contacts-* functions) ──────────────────────

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
  return new Date().toISOString().slice(0, 10)
}

async function validateSession(request, secret) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = {}
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) continue
    const k = part.slice(0, eqIdx).trim()
    const v = part.slice(eqIdx + 1).trim()
    if (k) cookies[k] = v
  }
  const token = cookies[COOKIE_NAME]
  if (!token) return false
  const expected = await hmacHex(secret, 'contacts:' + todayStr())
  return token === expected
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'},
  })
}

function clean(value, max) {
  return String(value != null ? value : '').trim().slice(0, max || 200)
}

function normalizeName(name) {
  return clean(name, 160)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function safeDocId(month, studentId) {
  var safeMo = month.replace(/[^a-z0-9-]/gi, '-')
  var safeId = studentId.replace(/[^a-z0-9-]/gi, '-')
  return 'hof-' + safeMo + '-' + safeId
}

async function sanityQuery(query, token) {
  var url = new URL(QUERY_URL)
  url.searchParams.set('query', query)
  var headers = {'Authorization': 'Bearer ' + token}
  var res = await fetch(url.toString(), {headers: headers})
  if (!res.ok) throw new Error('Sanity query failed: ' + res.status)
  return (await res.json()).result
}

async function sanityMutate(mutations, token) {
  var res = await fetch(MUTATE_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'Authorization': 'Bearer ' + token,
    },
    body: JSON.stringify({mutations: mutations}),
  })
  if (!res.ok) {
    var text = await res.text()
    throw new Error('Sanity mutate failed: ' + res.status + ' ' + text)
  }
  return res.json()
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function onRequestPost(context) {
  var pw = context.env.CONTACTS_PASSWORD
  if (!pw) return json({error: '服务器未配置 CONTACTS_PASSWORD'}, 500)

  var isValid = await validateSession(context.request, pw)
  if (!isValid) return json({error: 'Unauthorized'}, 401)

  var sanityToken = context.env.SANITY_API_TOKEN
  if (!sanityToken) return json({error: '服务器未配置 SANITY_API_TOKEN'}, 500)

  var body
  try {
    body = await context.request.json()
  } catch (e) {
    return json({error: 'Invalid JSON body'}, 400)
  }

  // ── DELETE action ──────────────────────────────────────────────────────────
  if (body.action === 'delete') {
    var docId = clean(body.docId, 200)
    if (!docId || docId.indexOf('hof-') !== 0) {
      return json({error: '无效的 docId'}, 400)
    }
    await sanityMutate([{delete: {id: docId}}], sanityToken)
    return json({ok: true})
  }

  // ── CREATE action ──────────────────────────────────────────────────────────
  if (body.action !== 'create') {
    return json({error: 'Unknown action'}, 400)
  }

  var month = clean(body.month, 10) // 'YYYY-MM'
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return json({error: '月份格式无效，应为 YYYY-MM'}, 400)
  }

  var awards = Array.isArray(body.awards) ? body.awards : []
  if (awards.length === 0) {
    return json({error: '没有选择任何学生'}, 400)
  }

  // Compute academic year from month (e.g. "2025-10" → "25-26", "2026-03" → "25-26")
  // month is guaranteed to match /^\d{4}-\d{2}$/ by the validation above
  var monthParts = month.split('-')
  var monthYear = parseInt(monthParts[0], 10)
  var monthNum = parseInt(monthParts[1], 10)
  var startYear = monthNum >= 9 ? monthYear : monthYear - 1
  var academicYear = String(startYear).slice(-2) + '-' + String(startYear + 1).slice(-2)

  // Fetch students from Sanity filtered to the current academic year, including nameEn and nameZh
  var students = await sanityQuery(
    '*[_type=="student" && academicYear==' + JSON.stringify(academicYear) + ']{_id, name, nameEn, nameZh}',
    sanityToken,
  )

  // Build normalized-name → student maps covering name, nameEn fields
  var studentMap = new Map()
  var wordSetMap = new Map()
  for (var i = 0; i < students.length; i++) {
    var s = students[i]
    if (!s._id) continue
    var nameCandidates = [s.nameEn, s.name].filter(Boolean)
    for (var k = 0; k < nameCandidates.length; k++) {
      var norm = normalizeName(nameCandidates[k])
      if (!norm) continue
      if (!studentMap.has(norm)) studentMap.set(norm, s)
      var ws = norm.split(' ').sort().join(' ')
      if (!wordSetMap.has(ws)) wordSetMap.set(ws, s)
    }
  }

  var mutations = []
  var unmatched = []
  var matched = []

  for (var j = 0; j < awards.length; j++) {
    var award = awards[j]
    var awardType = ['chinese_words', 'mathematics', 'progression'].indexOf(award.awardType) >= 0
      ? award.awardType
      : 'chinese_words'

    var normalizedName = normalizeName(award.studentName || '')
    if (!normalizedName) {
      unmatched.push(award.studentName || '(empty)')
      continue
    }
    var student = studentMap.get(normalizedName)

    // Partial match fallback: substring containment
    if (!student) {
      studentMap.forEach(function(val, key) {
        if (!student && (key.indexOf(normalizedName) >= 0 || normalizedName.indexOf(key) >= 0)) {
          student = val
        }
      })
    }

    // Word-set fallback: match regardless of word order (e.g. "Chen Benjamin" vs "Benjamin Chen")
    if (!student) {
      var queryWords = normalizedName.split(' ').sort().join(' ')
      student = wordSetMap.get(queryWords) || null
    }

    if (!student) {
      unmatched.push(award.studentName)
      continue
    }

    var newDocId = safeDocId(month, student._id)
    var awardTitle = AWARD_TITLES[awardType] || '四会字大师奖'
    var score = (typeof award.sightWordScore === 'number' && isFinite(award.sightWordScore))
      ? award.sightWordScore
      : null

    var doc = {
      _id: newDocId,
      _type: 'hallOfFame',
      studentRef: {_type: 'reference', _ref: student._id},
      awardType: awardType,
      awardTitle: awardTitle,
      awardMonth: month + '-01',
    }
    if (score !== null) doc.sightWordScore = score

    mutations.push({createOrReplace: doc})
    matched.push({studentName: student.nameZh || student.nameEn || student.name, docId: newDocId})
  }

  if (mutations.length > 0) {
    await sanityMutate(mutations, sanityToken)
  }

  return json({
    ok: true,
    summary: {
      created: mutations.length,
      unmatched: unmatched.length,
      unmatchedNames: unmatched,
      matched: matched,
    },
  })
}
