/**
 * MECC 教学系统全局配置文件 (The Brain)
 * 作用：统一管理全站路径、语音、游戏逻辑及多语言文字
 * 建议存放路径：根目录/js/config.js
 */

window.MECC_CONFIG = {
    // ---------------------------------------------------------
    // 1. 资源路径管理 (Resource Paths)
    // 提示：路径是相对于各游戏页面（如 games/ 文件夹下的 HTML）而言的
    // ---------------------------------------------------------
    PATH: {
        SIGHT_WORDS_DATA: "../data/sight_words.json",    // 生字库 JSON
        SIGHT_WORDS_IMAGES: "../images/sight_words_phrases/", // 词组 WebP 图片
        COMMON_CSS: "../css/common_nav.css",             // 全局导航样式
        TEACHERS_PORTAL: "../teachers.html",             // 教师端主页
        PARENTS_PORTAL: "../parents.html"                // 家长端主页
    },

    // ---------------------------------------------------------
    // 2. 语音合成 (TTS) 核心参数
    // ---------------------------------------------------------
    VOICE: {
        RATE: 0.85,      // 全站统一语速 (0.1 - 2.0)
        PITCH: 1.1,      // 全站统一音调 (0.0 - 2.0)
        // 语音包优先级：晓晓(微软) > Google中文 > 微软默认
        PREFERRED_NAMES: ['Xiaoxiao', 'Google', 'Microsoft', 'Huihui', 'Kangkang']
    },

    // ---------------------------------------------------------
    // 3. 游戏与交互通用常数
    // ---------------------------------------------------------
    GAME: {
        TRAIN_LENGTH: 4,      // 魔法小火车每局生字数
        CAT_GAME_CHARS: 4,    // 小猫在哪里每局生字数
        AUTO_NEXT_DELAY: 4000 // 自动下一局的等待间隔 (4秒)
    },

    // ---------------------------------------------------------
    // 4. 多语言 UI 文字映射 (i18n)
    // ---------------------------------------------------------
    STRINGS: {
        zh: {
            back_btn: "返回工具台",
            train_instruction: "请把中文四会字放到火车上。",
            train_win: "小火车出发啦！",
            next_round: "下一组 ➔",
            loading: "正在为小朋友准备游戏中...",
            found_msg: "找到啦！是"
        },
        en: {
            back_btn: "Back to Parents Portal",
            train_instruction: "Put the characters on the train.",
            train_win: "The train is leaving!",
            next_round: "Next Group ➔",
            loading: "Preparing game for you...",
            found_msg: "Found it! It's "
        }
    },

    // ---------------------------------------------------------
    // 5. 核心辅助函数 (Helper Functions)
    // ---------------------------------------------------------

    /**
     * 自动识别身份：检查网址后缀是否有 ?role=parents
     */
    getLang: function() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('role') === 'parents' ? 'en' : 'zh';
    },

    /**
     * 获取当前语言对应的 UI 文字
     */
    getUI: function(key) {
        const lang = this.getLang();
        return this.STRINGS[lang][key] || key;
    },

    /**
     * 获取对应的返回链接路径
     */
    getBackHref: function() {
        return this.getLang() === 'en' ? this.PATH.PARENTS_PORTAL : this.PATH.TEACHERS_PORTAL;
    }
};

// 🌟 辅助：页面跳转前强制停止语音（全局保险）
window.addEventListener('beforeunload', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
});
window.addEventListener('pagehide', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
});