/**
 * Columnar parser for J. Ralph McIlvaine "Section Rosters" PDFs.
 *
 * Why this exists
 * ---------------
 * The roster is a THREE COLUMN table:
 *
 *   x≈36 .. 190     student name + "Birthdate: MM/DD/YYYY"
 *   x≈208           gender (M / F)
 *   x≈324 .. 390    household phone + one or more addresses
 *   x≈396 ..        guardians: name / email / C:,Wk:,Oth: phones
 *
 * The previous importer flattened the page into a one-dimensional text
 * stream, so the three columns were concatenated line by line. That is how
 * "Camden Wyoming," (address column) fused with "C:(302)883-4892" (guardian
 * column) and got stored as a guardian NAMED "Camden Wyoming, C", and how a
 * whole page header ended up in a contactName field.
 *
 * pdf.js emits one text item per table cell with its own x/y, so assigning
 * items to columns by x and grouping by y reconstructs the table exactly.
 * Nothing here guesses: no LLM, no heuristics about who is mother or father
 * (the roster does not say, and guessing is what produced the bad data).
 *
 * Usage in the browser:
 *   const pages = await extractPages(pdfjsDoc)   // [[{str,x,y}, ...], ...]
 *   const students = parseRoster(pages)
 *
 * Both parseRoster() and the column constants are exported so the Node
 * validation script and the browser page run the exact same code.
 */

export const COL = { studentMax: 195, genderMin: 195, addrMin: 300, guardMin: 392 }

const RE = {
  student: /^KN\s+([A-Z][^:]*?,\s*[A-Z].*)$/,
  birth: /Birthdate:\s*(\d{2})\/(\d{2})\/(\d{4})/,
  phone: /\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})(?:\s*x(\d+))?/,
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
  labelled: /^(C|Cell|Wk|Work|Oth|Other|H|Home)\s*:\s*(.+)$/i,
  stateZip: /\b(DE|MD|PA|NJ|NY|VA)\s+\d{5}(-\d{4})?$/,
  gender: /^([MF])\b/,
}

const SKIP = [
  'Section Rosters', 'Active Students', 'Grade Levels', 'Generated on',
  'Effective Date', 'Page ', 'Course:', 'Term(s):', 'Teacher:', 'Courses:',
  'Student Gender', 'J. Ralph', 'Childhood Center', 'Homeroom',
  'Phone, Address and Guardian',
]

const isNoise = t => SKIP.some(s => t.includes(s))

/** Pull {str,x,y} triples out of a pdf.js document, one array per page. */
export async function extractPages(doc) {
  const pages = []
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent()
    pages.push(
      tc.items
        .filter(it => it.str && it.str.trim())
        .map(it => ({ str: it.str.trim(), x: it.transform[4], y: it.transform[5] })),
    )
  }
  return pages
}

export function formatPhone(raw) {
  const m = RE.phone.exec(String(raw || ''))
  if (!m) return null
  return `(${m[1]}) ${m[2]}-${m[3]}` + (m[4] ? ` x${m[4]}` : '')
}

/** Group items into rendered lines (same y, within tolerance), top to bottom. */
function toLines(items) {
  const buckets = new Map()
  for (const it of items) {
    const key = Math.round(it.y / 3)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(it)
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0] - a[0]) // pdf.js y grows upward
    .map(([, list]) => list.sort((a, b) => a.x - b.x))
}

function parsePage(items) {
  const lines = toLines(items)

  const anchors = []
  for (const line of lines) {
    const stu = line.filter(i => i.x < COL.studentMax).map(i => i.str).join(' ').trim()
    if (!stu || isNoise(stu)) continue

    const m = RE.student.exec(stu)
    if (m) {
      const gender = line.find(i => i.x >= COL.genderMin && i.x < COL.addrMin && RE.gender.test(i.str))
      anchors.push({
        y: line[0].y,
        rosterName: m[1].trim(),
        gender: gender ? RE.gender.exec(gender.str)[1] : null,
        birthday: null,
        addrLines: [],
        guardLines: [],
      })
    } else if (anchors.length) {
      const b = RE.birth.exec(stu)
      if (b) anchors[anchors.length - 1].birthday = `${b[3]}-${b[1]}-${b[2]}`
    }
  }
  if (!anchors.length) return []

  // Every line's address/guardian cells belong to the nearest anchor above it.
  for (const line of lines) {
    const y = line[0].y
    let owner = null
    for (const a of anchors) if (a.y >= y - 3) owner = a
    if (!owner) continue

    const addr = line.filter(i => i.x >= COL.addrMin && i.x < COL.guardMin)
      .map(i => i.str).join(' ').trim()
    const guard = line.filter(i => i.x >= COL.guardMin).map(i => i.str).join(' ').trim()
    if (addr && !isNoise(addr)) owner.addrLines.push(addr)
    if (guard && !isNoise(guard)) owner.guardLines.push(guard)
  }

  return anchors.map(finalise)
}

function finalise(a) {
  const [last, ...restName] = a.rosterName.split(',')
  const nameEn = `${restName.join(',').trim()} ${last.trim()}`.replace(/\s+/g, ' ').trim()

  // --- address column: a bare phone line is the household phone; every other
  // run of lines accumulates until a "City, ST ZIP" line closes the address.
  const addresses = []
  let householdPhone = null
  let buf = []
  for (const line of a.addrLines) {
    const asPhone = formatPhone(line)
    if (asPhone && !line.replace(RE.phone, '').trim()) {
      if (buf.length) { addresses.push(buf.join(' ')); buf = [] }
      if (!householdPhone) householdPhone = asPhone
      continue
    }
    buf.push(line)
    if (RE.stateZip.test(line)) { addresses.push(buf.join(' ')); buf = [] }
  }
  if (buf.length) addresses.push(buf.join(' '))

  // --- guardian column: a line without email/phone markers starts a new person.
  const guardians = []
  let person = null
  for (const line of a.guardLines) {
    const em = RE.email.exec(line)
    if (em) { if (person) person.emails.push(em[0].toLowerCase()); continue }

    const lab = RE.labelled.exec(line)
    if (lab) {
      const v = formatPhone(lab[2])
      if (person && v) {
        const k = lab[1].toLowerCase()
        person.phones.push({
          kind: k === 'c' || k === 'cell' ? 'cell' : k === 'wk' || k === 'work' ? 'work' : 'other',
          value: v,
        })
      }
      continue
    }

    const bare = formatPhone(line)
    if (bare && !line.replace(RE.phone, '').trim()) {
      if (person) person.phones.push({ kind: 'other', value: bare })
      continue
    }

    person = { name: line.replace(/\s+/g, ' ').trim(), emails: [], phones: [] }
    guardians.push(person)
  }

  return {
    nameEn,
    rosterName: a.rosterName,
    gender: a.gender,
    birthday: a.birthday,
    householdPhone,
    // Separated parents each list an address; when both list the same one the
    // roster prints it twice. Keep first occurrence only.
    addresses: [...new Set(addresses.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean))],
    guardians,
  }
}

/** Read the academic year / homeroom code printed in the page header. */
export function readHeader(items) {
  const text = items.map(i => i.str).join(' ')
  const year = /\b(\d{2}-\d{2})\s+J\.\s*Ralph/.exec(text)
  const room = /HRKN-(\d+)/.exec(text)
  return {
    academicYear: year ? year[1] : null,
    homeroomCode: room ? room[1] : null,
    className: room ? (room[1] === '15' ? 'elephant' : room[1] === '17' ? 'tiger' : null) : null,
  }
}

export function parseRoster(pages) {
  const out = []
  for (const items of pages) out.push(...parsePage(items))
  return out
}

/** Turn parsed students into the parentContact.contacts array shape. */
export function toContacts(student) {
  const cs = []
  const push = o => cs.push({ _key: `c${cs.length}`, _type: 'object', ...o })
  if (student.householdPhone) {
    push({ contactName: '', type: 'phone', value: student.householdPhone, notes: 'household', isPrimary: true })
  }
  for (const a of student.addresses) {
    push({ contactName: '', type: 'address', value: a, notes: 'household' })
  }
  for (const g of student.guardians) {
    for (const e of g.emails) push({ contactName: g.name, type: 'email', value: e })
    for (const p of g.phones) push({ contactName: g.name, type: 'phone', value: p.value, notes: p.kind })
  }
  const nameOnly = student.guardians.filter(g => !g.emails.length && !g.phones.length).map(g => g.name)
  return {
    contacts: cs,
    needsReview: nameOnly.length > 0,
    reviewNote: nameOnly.length ? `名单中有监护人但未提供联系方式：${nameOnly.join('、')}` : '',
  }
}

/** Audit a parsed roster; returns human-readable problems, empty when clean. */
export function audit(students) {
  const problems = []
  for (const s of students) {
    if (!s.birthday) problems.push(`${s.nameEn}：缺生日`)
    if (!s.addresses.length) problems.push(`${s.nameEn}：缺地址`)
    if (!s.guardians.length) problems.push(`${s.nameEn}：缺监护人`)
    for (const a of s.addresses) {
      if (!RE.stateZip.test(a)) problems.push(`${s.nameEn}：地址缺州/邮编 —— ${a}`)
    }
    for (const g of s.guardians) {
      if (!/^[A-Z][A-Za-z'’.\- ]{1,60}$/.test(g.name)) problems.push(`${s.nameEn}：监护人姓名可疑 —— ${g.name}`)
      for (const e of g.emails) {
        if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) problems.push(`${s.nameEn}：邮箱可疑 —— ${e}`)
      }
    }
  }
  return problems
}
