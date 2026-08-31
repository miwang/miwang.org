/**
 * GET /api/siblings
 *
 * Infers sibling relationships across every academic year and returns ONLY
 * pairs of student document ids plus the KINDS of evidence that matched.
 *
 * Privacy: the roster page that consumes this is public, so no address, phone
 * or email value ever leaves the server. Evidence is reported as a label
 * ("address" / "email" / "phone"), never as data.
 *
 * Why not sibling names from the roster PDF: the school's roster export drops
 * the household Members block, so sibling names are not available. Households
 * are therefore identified by shared address / personal phone / parent email.
 *
 * Work numbers are deliberately excluded. Several families work for the same
 * school district, so Wk: numbers are shared employer switchboards and produce
 * false positives (two unrelated families both listing (302) 698-8400).
 *
 * Scoring: address 2, email 2, personal phone 1; a pair needs >= 2 to link.
 * A single shared personal phone is not enough on its own.
 */

// Read published content only. Without this, Sanity's default perspective can
// include drafts, so an unpublished edit in Studio would leak onto the site and
// existence checks could match a document that is not actually live.
const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2021-10-21'

const WEIGHT = { address: 2, email: 2, phone: 1 }
const THRESHOLD = 2

function json(data, status = 200, cacheSeconds = 0) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds ? `public, max-age=${cacheSeconds}` : 'no-store',
    },
  })
}

const normAddress = v => String(v || '')
  .toLowerCase()
  .replace(/[.,#]/g, ' ')
  .replace(/\b(street|st|road|rd|drive|dr|lane|ln|court|ct|circle|cir|avenue|ave|way|terrace|ter|trail|trl|parkway|pkwy|highway|hwy|boulevard|blvd|run|row|walk|path)\b/g, m => m[0])
  .replace(/\s+/g, ' ')
  .trim()

const digits = v => String(v || '').replace(/\D/g, '').slice(-10)
const normEmail = v => String(v || '').trim().toLowerCase()

export async function onRequestGet(context) {
  try {
    const token =
      context.env.SANITY_API_TOKEN || context.env.SANITY_READ_TOKEN ||
      context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    if (!token) return json({ ok: false, error: '服务器缺少环境变量：SANITY_API_TOKEN' }, 500)

    const groq = `{
      "contacts": *[_type=="parentContact" && defined(student)]{
        "sid": student._ref,
        "addresses": contacts[type=="address"].value,
        "phones": contacts[type=="phone" && notes != "work"].value,
        "emails": contacts[type=="email"].value
      },
      "links": *[_type=="siblingLink" && defined(a) && defined(b)]{
        _id, "a": a._ref, "b": b._ref, relation, note, rejected
      }
    }`
    const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?perspective=published&query=${encodeURIComponent(groq)}`
    const res = await fetch(url, { headers: { authorization: 'Bearer ' + token } })
    if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`)
    const payload = (await res.json()).result || {}
    const records = payload.contacts || []
    const manual = payload.links || []

    // bucket -> set of student ids sharing that value
    const buckets = { address: new Map(), phone: new Map(), email: new Map() }
    const add = (kind, key, sid) => {
      if (!key) return
      if (!buckets[kind].has(key)) buckets[kind].set(key, new Set())
      buckets[kind].get(key).add(sid)
    }
    for (const r of records) {
      if (!r.sid) continue
      for (const a of r.addresses || []) add('address', normAddress(a), r.sid)
      for (const p of r.phones || []) add('phone', digits(p), r.sid)
      for (const e of r.emails || []) add('email', normEmail(e), r.sid)
    }

    // pair -> { score, kinds }
    const pairs = new Map()
    for (const kind of Object.keys(buckets)) {
      for (const ids of buckets[kind].values()) {
        if (ids.size < 2) continue
        // A value shared by an implausible number of students is institutional
        // (a school switchboard, a shared district mailbox), not a household.
        if (ids.size > 4) continue
        const list = [...ids]
        for (let i = 0; i < list.length; i++) {
          for (let j = i + 1; j < list.length; j++) {
            const key = [list[i], list[j]].sort().join('|')
            if (!pairs.has(key)) pairs.set(key, { kinds: new Set(), score: 0 })
            const p = pairs.get(key)
            if (!p.kinds.has(kind)) { p.kinds.add(kind); p.score += WEIGHT[kind] }
          }
        }
      }
    }

    const linked = []
    for (const [key, p] of pairs) {
      if (p.score < THRESHOLD) continue
      const [a, b] = key.split('|')
      linked.push({ a, b, evidence: [...p.kinds].sort(), score: p.score, source: 'inferred' })
    }

    // Manual links come last so a teacher always overrides inference: a
    // rejected pair is removed even if the contact data says otherwise, which
    // matters for shared custody, guardianship and re-marriage cases that no
    // address rule can get right.
    const rejected = new Set()
    for (const l of manual) {
      if (!l.a || !l.b || l.a === l.b) continue
      const key = [l.a, l.b].sort().join('|')
      if (l.rejected) { rejected.add(key); continue }
      const at = linked.findIndex(x => [x.a, x.b].sort().join('|') === key)
      const entry = {
        a: l.a, b: l.b, evidence: ['manual'], score: 99,
        source: 'manual', relation: l.relation || null, note: l.note || null,
      }
      if (at >= 0) linked[at] = entry
      else linked.push(entry)
    }
    for (let i = linked.length - 1; i >= 0; i--) {
      if (rejected.has([linked[i].a, linked[i].b].sort().join('|'))) linked.splice(i, 1)
    }

    // Union-find so a household of three or more resolves to one group.
    const parent = new Map()
    const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x) } return x }
    for (const { a, b } of linked) {
      if (!parent.has(a)) parent.set(a, a)
      if (!parent.has(b)) parent.set(b, b)
      const ra = find(a), rb = find(b)
      if (ra !== rb) parent.set(ra, rb)
    }
    const groups = new Map()
    for (const id of parent.keys()) {
      const root = find(id)
      if (!groups.has(root)) groups.set(root, [])
      groups.get(root).push(id)
    }

    // sid -> the other members of its household
    const siblingsOf = {}
    for (const members of groups.values()) {
      for (const id of members) siblingsOf[id] = members.filter(m => m !== id)
    }

    return json({
      ok: true,
      generatedAt: new Date().toISOString(),
      pairs: linked,
      siblingsOf,
      stats: {
        studentsWithContacts: records.length,
        pairsLinked: linked.length,
        manualLinks: linked.filter(l => l.source === 'manual').length,
        inferredLinks: linked.filter(l => l.source === 'inferred').length,
        rejectedPairs: rejected.size,
        households: [...groups.values()].filter(g => g.length > 1).length,
      },
    }, 200, 600)
  } catch (error) {
    return json({ ok: false, error: error.message || 'siblings failed' }, 500)
  }
}
