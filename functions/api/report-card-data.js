const PROJECT_ID = 'sow12t1i'
const DATASET = 'production'
const API_VERSION = '2025-05-22'
const SANITY_QUERY_URL = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}`

const DEFAULT_STATEMENTS = [
  {key: 'listening_instructional_language', domain: 'Listening Ability/Skill', statement: "Understand the teacher's instructional language."},
  {key: 'listening_patterned_sentences', domain: 'Listening Ability/Skill', statement: 'Understand statements and questions in patterned sentences.'},
  {key: 'listening_story_follow_along', domain: 'Listening Ability/Skill', statement: 'Follow along with the story while listening to the teacher.'},
  {key: 'speaking_daily_conversations', domain: 'Speaking Ability/Skill', statement: 'Make daily conversations regarding personal information and likes/dislikes.'},
  {key: 'speaking_weather', domain: 'Speaking Ability/Skill', statement: 'Tell today’s weather.'},
  {key: 'speaking_feelings', domain: 'Speaking Ability/Skill', statement: 'Share feelings (happy, sorrow, tired and hungry).'},
  {key: 'speaking_count_100', domain: 'Speaking Ability/Skill', statement: 'Count up to 100 in Chinese.'},
  {key: 'speaking_pronunciation', domain: 'Speaking Ability/Skill', statement: 'Pronunciation is clear and close to standard Mandarin.'},
  {key: 'reading_sight_words', domain: 'Reading Ability/Skill', statement: 'Identify sight words and their meanings.'},
  {key: 'reading_sound_out', domain: 'Reading Ability/Skill', statement: 'Sound out words and phrases, and match them with meanings (with the support of pictures, gestures, or actions).'},
  {key: 'reading_follow_along', domain: 'Reading Ability/Skill', statement: 'Follow along with the story while reading with the teacher or classmates.'},
  {key: 'writing_stroke_order', domain: 'Writing Ability/Skill', statement: 'Write Chinese characters in the correct stroke order.'},
  {key: 'writing_simple_sentences', domain: 'Writing Ability/Skill', statement: 'Copy and write out simple sentences with given patterns and word banks.'},
]

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function sanityFetch(query, params = {}, token) {
  const url = new URL(SANITY_QUERY_URL)
  url.searchParams.set('query', query)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(`$${key}`, JSON.stringify(value)))

  const response = await fetch(url.toString(), {
    headers: token ? {Authorization: `Bearer ${token}`} : {},
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Sanity query failed: ${response.status} ${text}`)
  }

  const data = await response.json()
  return data.result
}

export async function onRequestGet(context) {
  try {
    const token = context.env.SANITY_READ_TOKEN || context.env.SANITY_WRITE_TOKEN || context.env.SANITY_TOKEN
    const url = new URL(context.request.url)
    const academicYear = url.searchParams.get('academicYear') || '25-26'
    const className = url.searchParams.get('className') || 'elephant'
    const markingPeriod = url.searchParams.get('mp') || '2'

    const query = `{
      "students": *[_type == "student" && academicYear == $academicYear && className == $className && coalesce(status, "active") == "active"] | order(nameEn asc, nameZh asc) {
        _id,
        nameZh,
        nameEn,
        name,
        birthday,
        academicYear,
        className,
        status
      },
      "reportCards": *[_type == "reportCard" && academicYear == $academicYear && markingPeriod == $markingPeriod && student->className == $className] {
        _id,
        _updatedAt,
        academicYear,
        className,
        school,
        grade,
        teacher,
        reportDate,
        markingPeriod,
        sightWordsScore,
        ratings,
        teacherComments,
        lastSavedAt,
        "studentId": student->_id
      }
    }`

    const result = await sanityFetch(query, {academicYear, className, markingPeriod}, token)
    return jsonResponse({
      ok: true,
      defaults: {
        district: 'Caesar Rodney School District',
        title: 'Dual Language Progress Report',
        school: 'McIlvaine Early Childhood Center',
        grade: 'Kindergarten',
        teacher: 'Wang Laoshi',
        reportDate: '',
        markingPeriod,
      },
      statements: DEFAULT_STATEMENTS,
      students: result.students || [],
      reportCards: result.reportCards || [],
    })
  } catch (error) {
    return jsonResponse({ok: false, error: error.message || 'Failed to load report card data.'}, 500)
  }
}
