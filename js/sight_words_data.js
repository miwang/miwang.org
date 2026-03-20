/**
 * MECC 四会字数据库 - 2026 教学大纲版
 * 顺序完全同步自：Kindergarten Chinese Sight Words 列表照片
 */

const fullWordData = [
    // --- 九月 September ---
    { char: "四", week: "September", phrases: ["四月", "四个", "四只小猫"] },
    { char: "五", week: "September", phrases: ["五月", "五个", "五点"] },
    { char: "六", week: "September", phrases: ["六月", "六岁", "六个"] },
    { char: "七", week: "September", phrases: ["七月", "七个", "七点"] },
    { char: "八", week: "September", phrases: ["八月", "八点", "八个"] },
    { char: "九", week: "September", phrases: ["九月", "九只", "九点"] },
    { char: "十", week: "September", phrases: ["十月", "十个", "十点"] },

    // --- 十月 October ---
    { char: "大", week: "October", phrases: ["大学", "大人", "大象", "大风"] },
    { char: "小", week: "October", phrases: ["小学", "小朋友", "小心", "小狗", "小老师", "小猫", "小鱼", "小兔", "小鸟", "小鸡"] },
    { char: "日", week: "October", phrases: ["奖励日", "日历", "生日", "四月一日"] },
    { char: "月", week: "October", phrases: ["蜜月", "月球", "月饼", "六月"] },
    { char: "几", week: "October", phrases: ["你几岁？", "生日是几月？", "星期几", "几个人？"] },
    { char: "多", week: "October", phrases: ["很多人", "多云", "多少", "多一个"] },
    { char: "少", week: "October", phrases: ["最少", "多少", "少一个"] },

    // --- 十一月 November ---
    { char: "我", week: "November", phrases: ["我六岁。", "我相信我会飞！", "我们", "我叫"] },
    { char: "会", week: "November", phrases: ["我会跑。", "我会游泳。", "我会说中文。", "我会数到100。"] },
    { char: "不", week: "November", phrases: ["不可以", "不喜欢", "不对", "不会", "不一样"] },
    { char: "飞", week: "November", phrases: ["飞机", "我会飞", "飞碟", "起飞"] },
    { char: "个", week: "November", phrases: ["几个人", "这个", "那个", "一个"] },
    { char: "你", week: "November", phrases: ["你几岁？", "你真棒！", "你们", "你好"] },
    { char: "有", week: "November", phrases: ["没有", "有钱", "有人吗？"] },

    // --- 十二月 December ---
    { char: "手", week: "December", phrases: ["手拉手", "手机", "洗手", "举手", "手表", "手套"] },
    { char: "口", week: "December", phrases: ["口红", "大口", "出口", "入口", "伤口"] },
    { char: "头", week: "December", phrases: ["小头", "大头", "石头", "头发"] },
    { char: "目", week: "December", phrases: ["数目", "目光", "数学题目"] },
    { char: "耳", week: "December", phrases: ["耳朵", "耳机", "耳环", "耳光"] },
    { char: "人", week: "December", phrases: ["人民", "家人", "军人", "雪人", "无人机"] },
    { char: "要", week: "December", phrases: ["我要加一分。", "要睡觉", "不要减一分", "要喝水"] },

    // --- 一月 January ---
    { char: "上", week: "January", phrases: ["上面", "上学", "上车", "上天"] },
    { char: "下", week: "January", phrases: ["下面", "坐下", "下车", "下雪"] },
    { char: "左", week: "January", phrases: ["左边", "左眼", "左耳", "左手"] },
    { char: "右", week: "January", phrases: ["右边", "右眼", "右耳", "右手"] },
    { char: "中", week: "January", phrases: ["中间", "中文", "中国", "中餐", "中学"] },
    { char: "看", week: "January", phrases: ["小看", "偷看", "好看", "看见"] },
    { char: "是", week: "January", phrases: ["那是", "不是", "是什么？", "这是"] },

    // --- 二月 February ---
    { char: "爱", week: "February", phrases: ["爱画画", "我爱妈妈。", "爱学习", "爱睡觉"] },
    { char: "天", week: "February", phrases: ["晴天", "阴天", "昨天", "白天", "今天", "明天", "星期天", "夏天", "冬天", "秋天", "春天"] },
    { char: "白", week: "February", phrases: ["白天", "白云", "白色"] },
    { char: "的", week: "February", phrases: ["谁的外套？", "小狗的家", "我的爸爸"] },
    { char: "山", week: "February", phrases: ["下山", "小山", "大山", "上山"] },
    { char: "水", week: "February", phrases: ["水果", "水杯", "水上乐园", "喝水"] },

    // --- 三月 March ---
    { char: "和", week: "March", phrases: ["我和爸爸", "和我一样", "和朋友一起", "我和妈妈"] },
    { char: "土", week: "March", phrases: ["不可以玩土", "土豆", "很多土", "泥土"] },
    { char: "木", week: "March", phrases: ["木头", "树木", "木船", "啄木鸟"] },
    { char: "叶", week: "March", phrases: ["橙色的叶子", "茶叶", "香叶", "落叶"] },
    { char: "花", week: "March", phrases: ["爆米花", "花儿", "雪花", "花瓶"] },

    // --- 四月 April ---
    { char: "长", week: "April", phrases: ["长尾巴", "长头发", "长方形", "校长", "长大"] },
    { char: "太", week: "April", phrases: ["太小了", "太热了", "太阳", "太大了", "太冷了", "太吵了"] },
    { char: "门", week: "April", phrases: ["大门", "把门", "关门", "开门"] },
    { char: "也", week: "April", phrases: ["我也困了。", "我也喜欢绿色。", "我也饿了。"] },

    // --- 五月 May ---
    { char: "了", week: "May", phrases: ["我困了。", "我渴了。", "我尽力了。", "我饿了。"] }
];