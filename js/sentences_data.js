// ═══════════════════════════════════════════════════
//  Wang Laoshi's Sentence Builder — Data File
//  内置句子 + 颜色字典 + 标签系统 + 自定义句子管理
// ═══════════════════════════════════════════════════

// 🌟 1. 颜色字典：按词性分色
const colorDictionary = {
    // 人物/代词 (黄色)
    "我": "#ffeaa7", "你": "#ffeaa7",
    "爸爸": "#ffeaa7", "妈妈": "#ffeaa7",
    "哥哥": "#ffeaa7", "姐姐": "#ffeaa7", "妹妹": "#ffeaa7", "弟弟": "#ffeaa7",
    "家人": "#ffeaa7", "人": "#ffeaa7",
    "爷爷": "#ffeaa7", "奶奶": "#ffeaa7", "老师": "#ffeaa7",

    // 连词/助词/量词/数词 (青色)
    "和": "#81ecec", "的": "#81ecec",
    "五": "#81ecec", "个": "#81ecec", "一个": "#81ecec", "两个": "#81ecec",
    "一只": "#81ecec", "到": "#81ecec", "是": "#81ecec", "十个": "#81ecec",

    // 副词/否定词 (紫色)
    "一起": "#a29bfe", "不一样": "#a29bfe", "没有": "#a29bfe", "不喜欢": "#a29bfe",

    // 动词 (红色)
    "去": "#ff7675", "有": "#ff7675", "吃": "#ff7675",
    "叫": "#ff7675", "要": "#ff7675", "会": "#ff7675",
    "喝": "#ff7675", "说": "#ff7675", "数": "#ff7675",
    "爱": "#ff7675", "喜欢": "#ff7675", "看见": "#ff7675",
    "游泳": "#ff7675", "唱歌": "#ff7675", "走": "#ff7675",
    "相信": "#ff7675", "飞": "#ff7675",
    "上厕所": "#ff7675", "拿": "#ff7675", "洗手": "#ff7675",
    "在": "#ff7675",

    // 名词/地点/物品 (绿色)
    "月球": "#55efc4", "家": "#55efc4",
    "水上乐园": "#55efc4", "迪士尼": "#55efc4",
    "公园": "#55efc4", "中国": "#55efc4", "月饼": "#55efc4",
    "水": "#55efc4", "饭": "#55efc4", "中文": "#55efc4",
    "一百": "#55efc4", "大头": "#55efc4",
    "晴天": "#55efc4", "下雪": "#55efc4", "下雨": "#55efc4", "刮风": "#55efc4",
    "水杯": "#55efc4", "鸟": "#55efc4",
    "铅笔": "#55efc4", "小猫": "#55efc4", "小狗": "#55efc4",
    "苹果": "#55efc4", "大奖": "#55efc4", "学校": "#55efc4",

    // 身体部位 (绿色)
    "头上": "#55efc4", "大眼睛": "#55efc4", "大耳朵": "#55efc4",

    // 方位词 (薄荷绿)
    "上面": "#00cec9", "下面": "#00cec9", "左边": "#00cec9",
    "右边": "#00cec9", "中间": "#00cec9", "哪里": "#00cec9",

    // 疑问词 (橙色)
    "什么": "#fdcb6e", "名字": "#fdcb6e",
    "几岁": "#fdcb6e", "几月": "#fdcb6e", "几日": "#fdcb6e",
    "什么颜色": "#fdcb6e",

    // 数字/日期 (粉色)
    "六岁": "#fab1a0", "二月": "#fab1a0", "十四日": "#fab1a0",

    // 颜色/形容词 (浅蓝)
    "红色的": "#74b9ff", "红色": "#74b9ff",

    // 代词短语 (浅灰)
    "我的": "#dfe6e9", "你的": "#dfe6e9",
    "这是": "#dfe6e9"
};

// 🌟 2. 主题标签定义 (中英双语)
const tagDefinitions = {
    "家人":     { zh: "家人", en: "Family" },
    "自我介绍": { zh: "自我介绍", en: "About Me" },
    "食物":     { zh: "食物", en: "Food" },
    "天气":     { zh: "天气", en: "Weather" },
    "出去玩":   { zh: "出去玩", en: "Going Out" },
    "日期":     { zh: "日期", en: "Dates" },
    "颜色":     { zh: "颜色", en: "Colors" },
    "动物":     { zh: "动物", en: "Animals" },
    "问答":     { zh: "问答", en: "Q & A" },
    "能力":     { zh: "能力", en: "I Can" },
    "方位":     { zh: "方位", en: "Positions" },
    "身体":     { zh: "身体", en: "Body" },
    "学校":     { zh: "学校", en: "School" }
};

// 🌟 3. 关键词标签 — 你指定哪些词可以被筛选
const keywordTags = [
    { zh: "一起", en: "together" },
    { zh: "去",   en: "go" },
    { zh: "有",   en: "have" },
    { zh: "喜欢", en: "like", match: ["喜欢", "不喜欢"] },
    { zh: "会",   en: "can" },
    { zh: "要",   en: "want" },
    { zh: "和",   en: "and" },
    { zh: "我",   en: "I / me" },
    { zh: "爱",   en: "love" },
    { zh: "在",   en: "at / in" },
    { zh: "这是", en: "this is" }
];

// 🌟 4. 内置句子列表
const builtInSentences = [
    // ── 出去玩 ──
    { words: ["我", "和", "爸爸", "一起", "去", "月球"], image: "../images/sentences/moon_trip.webp", tags: ["家人", "出去玩"], punctuation: "。" },
    { words: ["我", "和", "妈妈", "一起", "去", "水上乐园"], image: "../images/sentences/waterpark.webp", tags: ["家人", "出去玩"], punctuation: "。" },
    { words: ["我", "和", "姐姐", "一起", "去", "迪士尼"], image: "../images/sentences/disney.webp", tags: ["家人", "出去玩"], punctuation: "。" },
    { words: ["我", "和", "哥哥", "一起", "去", "公园"], image: "../images/sentences/park.webp", tags: ["家人", "出去玩"], punctuation: "。" },
    { words: ["我", "和", "家人", "一起", "去", "中国"], image: "../images/sentences/china.webp", tags: ["家人", "出去玩"], punctuation: "。" },
    { words: ["我", "和", "弟弟", "一起", "去", "游泳"], image: "../images/sentences/swimming.webp", tags: ["家人", "出去玩"], punctuation: "。" },

    // ── 家人 ──
    { words: ["我", "家", "有", "五", "个", "人"], image: "../images/sentences/family_5.webp", tags: ["家人", "自我介绍"], punctuation: "。" },
    { words: ["我", "和", "妹妹", "一起", "吃", "月饼"], image: "../images/sentences/mooncake.webp", tags: ["家人", "食物"], punctuation: "。" },
    { words: ["我", "爱", "我的", "家人"], image: "../images/sentences/love_family.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "有", "两个", "妈妈"], image: "../images/sentences/two_moms.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "有", "两个", "爸爸"], image: "../images/sentences/two_dads.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "有", "一个", "姐姐"], image: "../images/sentences/have_sister.webp", tags: ["家人", "自我介绍"], punctuation: "。" },
    { words: ["我", "有", "一个", "弟弟"], image: "../images/sentences/have_didi.webp", tags: ["家人", "自我介绍"], punctuation: "。" },
    { words: ["我", "有", "一个", "妹妹"], image: "../images/sentences/have_meimei.webp", tags: ["家人", "自我介绍"], punctuation: "。" },
    { words: ["我", "有", "一个", "哥哥"], image: "../images/sentences/have_gege.webp", tags: ["家人", "自我介绍"], punctuation: "。" },
    { words: ["我", "和", "姐姐", "不一样"], image: "../images/sentences/diff_jiejie.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "和", "哥哥", "不一样"], image: "../images/sentences/diff_gege.webp", tags: ["家人"], punctuation: "。" },

    // ── 我爱... ──
    { words: ["我", "爱", "我的", "爸爸"], image: "../images/sentences/love_dad.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "爱", "我的", "妈妈"], image: "../images/sentences/love_mom.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "爱", "我的", "哥哥"], image: "../images/sentences/love_gege.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "爱", "我的", "姐姐"], image: "../images/sentences/love_jiejie.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "爱", "我的", "弟弟"], image: "../images/sentences/love_didi.webp", tags: ["家人"], punctuation: "。" },
    { words: ["我", "爱", "我的", "妹妹"], image: "../images/sentences/love_meimei.webp", tags: ["家人"], punctuation: "。" },

    // ── 这是... ──
    { words: ["这是", "我的", "爸爸"], image: "../images/sentences/this_dad.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "妈妈"], image: "../images/sentences/this_mom.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "弟弟"], image: "../images/sentences/this_didi.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "妹妹"], image: "../images/sentences/this_meimei.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "哥哥"], image: "../images/sentences/this_gege.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "姐姐"], image: "../images/sentences/this_jiejie.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "爷爷"], image: "../images/sentences/this_yeye.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "奶奶"], image: "../images/sentences/this_nainai.webp", tags: ["家人"], punctuation: "。" },
    { words: ["这是", "我的", "老师"], image: "../images/sentences/this_teacher.webp", tags: ["家人", "学校"], punctuation: "。" },

    // ── 自我介绍 / 问答 ──
    { words: ["你", "叫", "什么", "名字"], image: "../images/sentences/whats_your_name.webp", tags: ["自我介绍", "问答"], punctuation: "？" },
    { words: ["你", "几岁"], image: "../images/sentences/how_old.webp", tags: ["自我介绍", "问答"], punctuation: "？" },
    { words: ["我", "六岁"], image: "../images/sentences/i_am_six.webp", tags: ["自我介绍"], punctuation: "。" },

    // ── 食物 / 需求 ──
    { words: ["我", "要", "喝", "水"], image: "../images/sentences/drink_water.webp", tags: ["食物"], punctuation: "。" },
    { words: ["我", "要", "吃", "饭"], image: "../images/sentences/eat_rice.webp", tags: ["食物"], punctuation: "。" },
    { words: ["我", "要", "上厕所"], image: "../images/sentences/bathroom.webp", tags: ["学校"], punctuation: "。" },
    { words: ["我", "要", "拿", "大奖"], image: "../images/sentences/win_prize.webp", tags: ["学校"], punctuation: "。" },
    { words: ["我", "要", "洗手"], image: "../images/sentences/wash_hands.webp", tags: ["学校"], punctuation: "。" },

    // ── 能力 ──
    { words: ["我", "会", "说", "中文"], image: "../images/sentences/speak_chinese.webp", tags: ["自我介绍", "能力"], punctuation: "。" },
    { words: ["我", "会", "数", "到", "一百"], image: "../images/sentences/count_100.webp", tags: ["自我介绍", "能力"], punctuation: "。" },
    { words: ["我", "会", "游泳"], image: "../images/sentences/can_swim.webp", tags: ["能力"], punctuation: "。" },
    { words: ["我", "会", "唱歌"], image: "../images/sentences/can_sing.webp", tags: ["能力"], punctuation: "。" },
    { words: ["我", "会", "走"], image: "../images/sentences/can_walk.webp", tags: ["能力"], punctuation: "。" },
    { words: ["我", "相信", "我", "会", "飞"], image: "../images/sentences/believe_fly.webp", tags: ["能力"], punctuation: "。" },

    // ── 身体 ──
    { words: ["我", "有", "一个", "大头"], image: "../images/sentences/big_head.webp", tags: ["自我介绍", "身体"], punctuation: "。" },
    { words: ["我", "有", "两个", "大眼睛"], image: "../images/sentences/big_eyes.webp", tags: ["身体"], punctuation: "。" },
    { words: ["我", "有", "两个", "大耳朵"], image: "../images/sentences/big_ears.webp", tags: ["身体"], punctuation: "。" },

    // ── 有 / 没有 ──
    { words: ["我", "有", "两个", "铅笔"], image: "../images/sentences/two_pencils.webp", tags: ["学校"], punctuation: "。" },
    { words: ["我", "有", "一个", "小猫"], image: "../images/sentences/have_cat.webp", tags: ["动物"], punctuation: "。" },
    { words: ["我", "没有", "小狗"], image: "../images/sentences/no_dog.webp", tags: ["动物"], punctuation: "。" },
    { words: ["头上", "有", "十个", "苹果"], image: "../images/sentences/apples_head.webp", tags: ["食物"], punctuation: "。" },

    // ── 天气 ──
    { words: ["我", "喜欢", "晴天"], image: "../images/sentences/sunny.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "喜欢", "下雪"], image: "../images/sentences/snowy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "喜欢", "下雨"], image: "../images/sentences/rainy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "喜欢", "刮风"], image: "../images/sentences/windy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "不喜欢", "晴天"], image: "../images/sentences/no_sunny.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "不喜欢", "下雪"], image: "../images/sentences/no_snowy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "不喜欢", "下雨"], image: "../images/sentences/no_rainy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "不喜欢", "刮风"], image: "../images/sentences/no_windy.webp", tags: ["天气"], punctuation: "。" },
    { words: ["我", "喜欢", "学校"], image: "../images/sentences/like_school.webp", tags: ["学校"], punctuation: "。" },

    // ── 方位 ──
    { words: ["老师", "在", "哪里"], image: "../images/sentences/where_teacher.webp", tags: ["方位", "问答", "学校"], punctuation: "？" },
    { words: ["小猫", "在", "哪里"], image: "../images/sentences/where_cat.webp", tags: ["方位", "问答", "动物"], punctuation: "？" },
    { words: ["小猫", "在", "上面"], image: "../images/sentences/cat_up.webp", tags: ["方位", "动物"], punctuation: "。" },
    { words: ["小猫", "在", "下面"], image: "../images/sentences/cat_down.webp", tags: ["方位", "动物"], punctuation: "。" },
    { words: ["小猫", "在", "左边"], image: "../images/sentences/cat_left.webp", tags: ["方位", "动物"], punctuation: "。" },
    { words: ["小猫", "在", "右边"], image: "../images/sentences/cat_right.webp", tags: ["方位", "动物"], punctuation: "。" },
    { words: ["小猫", "在", "中间"], image: "../images/sentences/cat_middle.webp", tags: ["方位", "动物"], punctuation: "。" },

    // ── 日期 / 颜色 ──
    { words: ["你的", "生日", "是", "几月", "几日"], image: "../images/sentences/when_birthday.webp", tags: ["日期", "问答"], punctuation: "？" },
    { words: ["你", "喜欢", "什么颜色"], image: "../images/sentences/fav_color.webp", tags: ["颜色", "问答"], punctuation: "？" },
    { words: ["我的", "生日", "是", "二月", "十四日"], image: "../images/sentences/my_birthday.webp", tags: ["日期", "自我介绍"], punctuation: "。" },
    { words: ["我", "有", "一个", "红色的", "水杯"], image: "../images/sentences/red_cup.webp", tags: ["颜色"], punctuation: "。" },
    { words: ["我", "看见", "一只", "红色的", "鸟"], image: "../images/sentences/red_bird.webp", tags: ["颜色", "动物"], punctuation: "。" }
];

// 🌟 5. 自定义句子管理 (localStorage)
function getCustomSentences() {
    try { return JSON.parse(localStorage.getItem('mecc_custom_sentences') || '[]'); }
    catch(e) { return []; }
}
function saveCustomSentences(arr) {
    localStorage.setItem('mecc_custom_sentences', JSON.stringify(arr));
}
function addCustomSentence(sentence) {
    const arr = getCustomSentences();
    sentence._custom = true;
    sentence._id = Date.now();
    arr.push(sentence);
    saveCustomSentences(arr);
    return sentence;
}
function deleteCustomSentence(id) {
    const arr = getCustomSentences().filter(s => s._id !== id);
    saveCustomSentences(arr);
}

// 🌟 6. 合并列表：内置 + 自定义
function getAllSentences() {
    return [...builtInSentences, ...getCustomSentences()];
}

// 🌟 7. 向后兼容：保留 sentencesList 变量名
const sentencesList = getAllSentences();

// 🌟 8. 获取所有可用标签（主题 + 关键词，去重）
function getAllTags() {
    const all = getAllSentences();
    const themeTags = new Set();
    all.forEach(s => (s.tags || []).forEach(t => themeTags.add(t)));
    return { themeTags: [...themeTags], keywordTags };
}

// 🌟 9. 筛选句子
function filterSentences(activeThemeTag, activeKeyword) {
    let list = getAllSentences();
    if (activeThemeTag) {
        list = list.filter(s => (s.tags || []).includes(activeThemeTag));
    }
    if (activeKeyword) {
        // 查找关键词定义，看是否有 match 数组
        const kwDef = keywordTags.find(k => k.zh === activeKeyword);
        const matchWords = (kwDef && kwDef.match) ? kwDef.match : [activeKeyword];
        list = list.filter(s => matchWords.some(w => s.words.includes(w)));
    }
    return list;
}