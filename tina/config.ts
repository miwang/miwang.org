import { defineConfig } from "tinacms";

export default defineConfig({
  branch: "main",
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID || "",
  token: process.env.TINA_TOKEN || "",
  build: {
    outputFolder: "admin",
    publicFolder: "", 
  },
  media: {
    tina: {
      mediaRoot: "images",
      publicFolder: "",
    },
  },
  schema: {
    collections: [
      // ======== 1. 分级绘本馆 ========
      {
        label: "📚 分级绘本馆",
        name: "library",
        path: "data",
        match: { include: "books" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "绘本书单",
            name: "book_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: `${item?.title || '新绘本'} - ${item?.level || ''}` }) },
            fields: [
              { label: "绘本名称", name: "title", type: "string" },
              { label: "阅读级别", name: "level", type: "string", options: ["Novice Low (L1)", "Novice Mid (L2)", "Novice High (L3)"] },
              { label: "话题分类", name: "topic", type: "string", options: ["动物与自然", "家庭与朋友", "节日与文化", "学校生活", "食物与购物"] },
              { label: "核心词汇", name: "vocab_tags", type: "string", description: "用逗号隔开" },
              { label: "封面图片", name: "coverImage", type: "image", description: "复用句子图: ../images/sentences/词语.webp" },
              {
                label: "绘本页面内容",
                name: "pages",
                type: "object",
                list: true,
                ui: { itemProps: (item) => ({ label: item?.text || '空白页' }) },
                fields: [
                  { label: "本页插图", name: "image", type: "image" },
                  { label: "中文句子", name: "text", type: "string" }
                ]
              }
            ]
          }
        ]
      },

      // ======== 2. 句子排排队 ========
      {
        label: "🧩 句子排排队",
        name: "sentences",
        path: "data",
        match: { include: "sentences" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "句子列表",
            name: "sentence_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.words || '新句子' }) },
            fields: [
              { label: "词语切分", name: "words", type: "string", description: "按词语切分，用逗号隔开。例如：我,喜欢,吃,苹果" },
              { label: "标点符号", name: "punctuation", type: "string" },
              { label: "配图", name: "image", type: "image", description: "复用四会字图片: ../images/sight_words_phrases/词语.webp" },
              { label: "主题标签", name: "tags", type: "string", description: "用逗号隔开" }
            ]
          }
        ]
      },

      // ======== 3. 儿歌点唱机 ========
      {
        label: "🎵 儿歌点唱机",
        name: "songs",
        path: "data",
        match: { include: "songs" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "儿歌列表",
            name: "song_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title || '新儿歌' }) },
            fields: [
              { label: "歌曲唯一ID", name: "id", type: "string" },
              { label: "歌曲名称", name: "title", type: "string" },
              { label: "封面图片", name: "cover", type: "image" },
              { label: "YouTube ID", name: "youtubeId", type: "string" },
              { label: "开始时间(秒)", name: "startTime", type: "number" },
              { label: "完整歌词", name: "lyrics", type: "string", ui: { component: "textarea" }, description: "直接粘贴整首歌词！换行就按回车。" }
            ]
          }
        ]
      },

      // ======== 4. 高频四会字 ========
      {
        label: "🔤 高频四会字",
        name: "sight_words",
        path: "data",
        match: { include: "sight_words" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "四会字列表",
            name: "sight_words_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: `${item?.char || '新字'} - ${item?.week || ''}` }) },
            fields: [
              { label: "汉字", name: "char", type: "string" },
              { label: "教学月份", name: "week", type: "string", options: ["September", "October", "November", "December", "January", "February", "March", "April", "May", "June"] },
              { label: "扩展词组/句子", name: "phrases", type: "string", description: "请用逗号隔开，例如：四月, 四岁, 四只小猫" }
            ]
          }
        ]
      },

      // ======== 5. 古诗与顺口溜 ========
      {
        label: "📜 古诗与顺口溜",
        name: "poems",
        path: "data",
        match: { include: "poems" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "诗词列表",
            name: "poem_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: item?.title || '新诗词' }) },
            fields: [
              { label: "唯一ID", name: "id", type: "string" },
              { label: "标题", name: "title", type: "string" },
              { label: "封面图片", name: "cover", type: "image" },
              { label: "YouTube ID", name: "youtubeId", type: "string" },
              { label: "开始时间(秒)", name: "startTime", type: "number" },
              { label: "诗词内容", name: "lyrics", type: "string", ui: { component: "textarea" } }
            ]
          }
        ]
      },

      // ======== 6. 全新：Focus Wall 单元主题墙 ========
      {
        label: "📌 单元主题墙",
        name: "focus_wall",
        path: "data",
        match: { include: "focus_wall" },
        format: "json",
        ui: { allowedActions: { create: false, delete: false } },
        fields: [
          {
            label: "单元列表",
            name: "unit_list",
            type: "object",
            list: true,
            ui: { itemProps: (item) => ({ label: `Unit ${item?.unit_num || ''}: ${item?.title || '新单元'} [${item?.status || ''}]` }) },
            fields: [
              { label: "单元编号", name: "unit_num", type: "number" },
              { label: "单元名称", name: "title", type: "string" },
              { label: "上线状态", name: "status", type: "string", options: ["建设中", "已上线"] },
              {
                label: "🎯 学习目标",
                name: "learning_targets",
                type: "object",
                fields: [
                  { label: "我会说...", name: "targets", type: "string", list: true },
                  { label: "引导问题", name: "questions", type: "string", list: true }
                ]
              },
              {
                label: "🧠 思维导图",
                name: "mindmap",
                type: "object",
                fields: [
                  { label: "中心词", name: "center_word", type: "string" },
                  { label: "周围分支词语", name: "nodes", type: "string", list: true }
                ]
              },
              { label: "📝 句子开头", name: "sentence_starters", type: "string", list: true, description: "留空的地方请填写三个下划线 ___" },
              {
                label: "💬 单元对话",
                name: "dialogues",
                type: "object",
                list: true,
                fields: [
                  { label: "问句", name: "q", type: "string" },
                  { label: "答句", name: "a", type: "string" }
                ]
              },
              { label: "🔤 单元字词", name: "vocab_words", type: "string", list: true },
              {
                label: "🖼️ 学生作业展示",
                name: "student_works",
                type: "object",
                list: true,
                fields: [
                  { label: "作品图片", name: "image", type: "image" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
});