// 🌟 1. 颜色字典：以后有新词，直接在这里加颜色
const colorDictionary = {
    // 人物/代词 (黄色)
    "我": "#ffeaa7", 
    "爸爸": "#ffeaa7", 
    "妈妈": "#ffeaa7", 
    "哥哥": "#ffeaa7", 
    "姐姐": "#ffeaa7", 
    "妹妹": "#ffeaa7", 
    "家人": "#ffeaa7", 
    "人": "#ffeaa7",
    
    // 连词/数量/单位 (蓝色)
    "和": "#81ecec", 
    "五": "#81ecec", 
    "个": "#81ecec",
    
    // 副词 (紫色)
    "一起": "#a29bfe", 
    
    // 动词 (红色)
    "去": "#ff7675", 
    "有": "#ff7675", 
    "吃": "#ff7675",
    
    // 名词/地点/物品 (绿色)
    "月球": "#55efc4", 
    "家": "#55efc4", 
    "水上乐园": "#55efc4", 
    "迪士尼": "#55efc4",
    "公园": "#55efc4",
    "中国": "#55efc4",
    "月饼": "#55efc4"
};

// 🌟 2. 关卡列表：按照顺序依次出现
const sentencesList = [
    {
        words: ["我", "和", "爸爸", "一起", "去", "月球"],
        image: "../images/sentences/moon_trip.jpg"
    },
    {
        words: ["我", "家", "有", "五", "个", "人"],
        image: "../images/sentences/family_5.jpg"
    },
    {
        words: ["我", "和", "妈妈", "一起", "去", "水上乐园"],
        image: "../images/sentences/waterpark.jpg"
    },
    {
        words: ["我", "和", "姐姐", "一起", "去", "迪士尼"],
        image: "../images/sentences/disney.jpg"
    },
    // 👇 下面是新加的三个句子
    {
        words: ["我", "和", "哥哥", "一起", "去", "公园"],
        image: "../images/sentences/park.jpg" // 📸 记得放公园的图片
    },
    {
        words: ["我", "和", "妹妹", "一起", "吃", "月饼"],
        image: "../images/sentences/mooncake.jpg" // 📸 记得放月饼的图片
    },
    {
        words: ["我", "和", "家人", "一起", "去", "中国"],
        image: "../images/sentences/china.jpg" // 📸 记得放中国的图片
    }
];