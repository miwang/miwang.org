import { defineField, defineType } from 'sanity'

export const focusWall = defineType({
  name: 'focusWall',
  title: '📋 Focus Wall 单元',
  type: 'document',
  fields: [

    // ── 基本信息 ──────────────────────────────
    defineField({
      name: 'slug',
      title: '页面标识 (URL用)',
      type: 'slug',
      description: '如 school、family、colors，用于 ?unit=xxx 参数',
      options: { source: 'unitName' },
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'unitName',
      title: '单元名称',
      type: 'string',
      description: '如：我的学校',
      validation: Rule => Rule.required()
    }),
    defineField({
      name: 'themeColors',
      title: '旗子颜色（6个，填 CSS 颜色值）',
      type: 'array',
      of: [{ type: 'string' }],
      description: '如 #c3d94e、#44b88e，按顺序对应6面旗子',
      validation: Rule => Rule.length(6).error('必须填写6个颜色')
    }),

    // ── 1. 学习目标 ───────────────────────────
    defineField({
      name: 'objectives',
      title: '1️⃣ 学习目标',
      type: 'array',
      of: [{ type: 'string' }],
      description: '每条以「我可以…」开头，如：我可以说学校里有什么。'
    }),

    // ── 2. 引导问题 ───────────────────────────
    defineField({
      name: 'guideQuestions',
      title: '2️⃣ 引导问题',
      type: 'array',
      of: [{ type: 'string' }],
      description: '如：学校里有谁？你喜欢学校吗？'
    }),

    // ── 3. 思维导图 ───────────────────────────
    defineField({
      name: 'mindmapCenter',
      title: '3️⃣ 思维导图 — 中心词',
      type: 'string',
      description: '如：学校'
    }),
    defineField({
      name: 'mindmapNodes',
      title: '3️⃣ 思维导图 — 辐射节点（最多7个）',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'text', title: '词语/短语', type: 'string' },
          { name: 'image', title: '配图（选填）', type: 'image' }
        ],
        preview: { select: { title: 'text' } }
      }],
      validation: Rule => Rule.max(7).warning('超过7个节点会影响布局')
    }),

    // ── 4. 句子开头 ───────────────────────────
    defineField({
      name: 'sentenceStarters',
      title: '4️⃣ 句子开头（填空句）',
      type: 'array',
      of: [{ type: 'string' }],
      description: '用 ___ 表示填空，如：学校有___。'
    }),

    // ── 5. 单元句式 ───────────────────────────
    defineField({
      name: 'sentencePatterns',
      title: '5️⃣ 单元句式（填空句）',
      type: 'array',
      of: [{ type: 'string' }],
      description: '如：___有___。/ 我喜欢___，因为___。'
    }),

    // ── 6. 单元字词 ───────────────────────────
    defineField({
      name: 'vocabWords',
      title: '6️⃣ 单元字词',
      type: 'array',
      of: [{ type: 'string' }],
      description: '悬浮图片自动从 word / extraPhrase 里匹配，直接输入字或词即可'
    }),

    // ── 7. 单元对话 ───────────────────────────
    defineField({
      name: 'dialogues',
      title: '7️⃣ 单元对话',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          { name: 'role', title: '角色', type: 'string', description: '如：问 / 答 / 老师 / 学生' },
          { name: 'line', title: '台词（用 ___ 表示填空）', type: 'string' }
        ],
        preview: { select: { title: 'role', subtitle: 'line' } }
      }]
    }),

    // ── 8. 学生作业 ───────────────────────────
    defineField({
      name: 'studentWorks',
      title: '8️⃣ 学生作业',
      type: 'array',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'bookTitle',
            title: '书名',
            type: 'string',
            description: '如：我的学校书'
          },
          {
            name: 'pageNumber',
            title: '页码',
            type: 'number',
            description: '第几页（用于排序和展示标题）'
          },
          {
            name: 'pageLabel',
            title: '页面标题（选填）',
            type: 'string',
            description: '如：第3页 — 学校有老师。留空则自动显示页码'
          },
          {
            name: 'photos',
            title: '本页精选作品（可多张）',
            type: 'array',
            of: [{
              type: 'object',
              fields: [
                { name: 'image', title: '作品图片', type: 'image' },
                { name: 'studentName', title: '学生名字（选填）', type: 'string' }
              ],
              preview: { select: { title: 'studentName', media: 'image' } }
            }]
          }
        ],
        preview: {
          select: { title: 'bookTitle', subtitle: 'pageNumber' },
          prepare({ title, subtitle }) {
            return { title: title || '未命名', subtitle: subtitle ? `第 ${subtitle} 页` : '' }
          }
        }
      }]
    })

  ],

  preview: {
    select: { title: 'unitName', subtitle: 'slug.current' },
    prepare({ title, subtitle }) {
      return { title: `📋 ${title || '未命名单元'}`, subtitle: `?unit=${subtitle || ''}` }
    }
  }
})