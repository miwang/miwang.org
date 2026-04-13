/**
 * MECC 教学系统全局核心引擎 (The Core Engine)
 * 包含：全局静态配置、多语言导航路由、声音引擎、存储与数据引擎、UI特效库
 */

// ==========================================
// 1. 全局静态配置区 (MECC_CONFIG)
// ==========================================
window.MECC_CONFIG = {
    // 资源路径管理
    PATH: {
        SIGHT_WORDS_DATA: "../data/sight_words.json",    
        SIGHT_WORDS_IMAGES: "../images/sight_words_phrases/", 
        COMMON_CSS: "../css/common_nav.css",             
        TEACHERS_PORTAL: "../teachers.html",             
        PARENTS_PORTAL: "../parents.html"                
    },

    // 语音合成 (TTS) 参数
    VOICE: {
        RATE: 0.85, 
        PITCH: 1.1,      
        PREFERRED_NAMES: ['Xiaoxiao', 'Google', 'Microsoft', 'Huihui', 'Kangkang'],
        
        // 🚀【神级预留：高级云端语音接口】
        // 未来如果您购买了微软或阿里云的接口，把 enabled 改为 true 即可全站生效
        CLOUD_API: {
            enabled: false,          
            provider: 'azure',       
            apiKey: '未来填入您的密钥', 
            endpoint: '未来填入您的接口地址'
        }
    },

    // 游戏通用逻辑常量
    GAME: { 
        TRAIN_LENGTH: 4, 
        CAT_GAME_CHARS: 4, 
        AUTO_NEXT_DELAY: 4000 
    },

    // 导航栏多语言文案
    STRINGS: {
        zh: { back_btn: "返回工具台" },
        en: { back_btn: "Back to Parents Portal" }
    },

    // --- 路由与导航功能 ---

    // 自动识别身份：检查网址后缀是否有 ?role=parents
    getLang: function() {
        return new URLSearchParams(window.location.search).get('role') === 'parents' ? 'en' : 'zh';
    },

    getUI: function(key) { 
        return this.STRINGS[this.getLang()][key] || key; 
    },
    
    getBackHref: function() { 
        return this.getLang() === 'en' ? this.PATH.PARENTS_PORTAL : this.PATH.TEACHERS_PORTAL; 
    },

    // 🌟 全站统一导航栏生成器
    renderGlobalNav: function(titleText, customBackHref = null, customBackText = null) {
        const lang = this.getLang();
        const nav = document.createElement('div');
        nav.className = 'mecc-global-nav';
        
        const backBtn = document.createElement('a');
        backBtn.className = `mecc-nav-back ${lang === 'en' ? 'en' : ''}`;
        backBtn.href = customBackHref || this.getBackHref();
        backBtn.innerHTML = `
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="4"/>
                <path d="M65 50 H35 M45 35 L35 50 L45 65" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>${customBackText || this.getUI('back_btn')}</span>
        `;

        const title = document.createElement('h1');
        title.className = `mecc-nav-title ${lang === 'en' ? 'en' : ''}`;
        title.innerText = titleText;

        nav.appendChild(backBtn); 
        nav.appendChild(title);
        document.body.insertBefore(nav, document.body.firstChild);
    }
};


// ==========================================
// 2. 全局声音引擎 (MECC_AUDIO)
// ==========================================
window.MECC_AUDIO = {
    unlocked: false,
    ctx: null,
    ttsVoice: null,
    
    // 初始化并突破 iOS 自动播放限制
    init: function() {
        if (this.unlocked) return;
        const dummy = new SpeechSynthesisUtterance(' ');
        window.speechSynthesis.speak(dummy);
        this.unlocked = true;
        document.removeEventListener('touchstart', this.initWrapper);
        document.removeEventListener('click', this.initWrapper);
        
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            this.ttsVoice = voices.find(v => v.name.includes('Xiaoxiao')) || voices.find(v => v.lang.startsWith('zh'));
        };
        window.speechSynthesis.onvoiceschanged = loadVoices; 
        loadVoices();
    },
    
    // 播放系统音效
    playSfx: function(type) {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator(); 
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(this.ctx.destination); 
        const now = this.ctx.currentTime;
        
        if(type === 'swoosh') { osc.type = 'sine'; osc.frequency.setValueAtTime(500, now); osc.frequency.exponentialRampToValueAtTime(50, now+0.4); gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.4); osc.start(); osc.stop(now+0.4); } 
        else if(type === 'tada') { osc.type = 'triangle'; [523, 659, 783, 1046].forEach((f, i) => osc.frequency.setValueAtTime(f, now + i*0.1)); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.6); osc.start(); osc.stop(now+0.6); }
        else if(type === 'wrong') { osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(100, now+0.2); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now+0.3); osc.start(); osc.stop(now+0.3); }
    },

    // 智能朗读文本 (云端 API 优先，本地 TTS 托底)
    readText: async function(text) {
        if (!this.unlocked) this.init();
        window.speechSynthesis.cancel();
        
        // 🚀【云端接口逻辑预留】
        if (MECC_CONFIG.VOICE.CLOUD_API && MECC_CONFIG.VOICE.CLOUD_API.enabled) {
            try {
                // 未来在此接入 Azure/OpenAI 的代码
                console.log(`[MECC_AUDIO] 准备通过云端 API 播放高品质语音: ${text}`);
                return; // 如果云端播放成功则直接返回，不再执行本地语音
            } catch (error) {
                console.warn(`[MECC_AUDIO] 云端语音播放失败，降级为浏览器自带语音`, error);
            }
        }

        // 托底方案：先尝试播放 MP3，找不到再用浏览器自带合成音
        const audio = new Audio(`../audio/sight_words_phrases/${encodeURIComponent(text)}.mp3`);
        audio.play().catch(() => { 
            const msg = new SpeechSynthesisUtterance(text);
            msg.lang = 'zh-CN';
            if (this.ttsVoice) msg.voice = this.ttsVoice;
            msg.rate = MECC_CONFIG.VOICE.RATE;
            msg.pitch = MECC_CONFIG.VOICE.PITCH;
            window.speechSynthesis.speak(msg); 
        });
    },

    // 全局切断语音
    stopAll: function() {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
};

// 绑定解锁事件与生命周期事件
window.MECC_AUDIO.initWrapper = () => MECC_AUDIO.init();
document.addEventListener('touchstart', window.MECC_AUDIO.initWrapper, { passive: true });
document.addEventListener('click', window.MECC_AUDIO.initWrapper);
window.addEventListener('beforeunload', () => MECC_AUDIO.stopAll());
window.addEventListener('pagehide', () => MECC_AUDIO.stopAll());


// ==========================================
// 3. 全局数据与进度引擎 (MECC_DATA)
// ==========================================
window.MECC_DATA = {
    // 获取生字库 (带有防浏览器缓存机制的时间戳)
    getSightWords: async function() {
        try {
            const res = await fetch(`${MECC_CONFIG.PATH.SIGHT_WORDS_DATA}?v=${new Date().getTime()}`);
            const data = await res.json();
            return data.sight_words_list || [];
        } catch (e) {
            console.error("加载字库失败:", e);
            if (window.MECC_UI) MECC_UI.showToast("网络似乎有点问题，字库加载失败了", "error");
            return [];
        }
    },

    // 记录掌握的汉字
    saveWordMastery: function(char) {
        const progress = JSON.parse(localStorage.getItem('mecc_progress') || '{}');
        progress[char] = 'completed';
        localStorage.setItem('mecc_progress', JSON.stringify(progress));
        
        // 🚀【未来预留：数据埋点上传】
        this.trackAnalytics('word_mastered', { character: char, timestamp: new Date().toISOString() });
    },

    // 获取所有进度
    getAllProgress: function() {
        return JSON.parse(localStorage.getItem('mecc_progress') || '{}');
    },

    // 🚀【未来预留：学习行为分析遥测接口】
    trackAnalytics: function(eventName, dataPayload) {
        console.log(`[MECC_ANALYTICS] Event: ${eventName}`, dataPayload);
        // 未来可在此处执行 fetch(...) 推送至您的后台数据库
    }
};


// ==========================================
// 4. 全局 UI 交互引擎 (MECC_UI)
// ==========================================
window.MECC_UI = {
    // 优雅的顶部横幅提示框 (用来淘汰原生 alert)
    showToast: function(message, type = 'info') {
        let toast = document.getElementById('mecc-global-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'mecc-global-toast';
            toast.style.cssText = `
                position: fixed; top: 70px; left: 50%; transform: translateX(-50%);
                background: ${type === 'error' ? '#e74c3c' : '#598586'};
                color: white; padding: 12px 24px; border-radius: 30px; font-weight: bold;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10000;
                transition: opacity 0.3s, top 0.3s; font-family: "STKaiti", "LXGW WenKai Lite", serif;
                pointer-events: none;
            `;
            document.body.appendChild(toast);
        }
        toast.innerText = message;
        toast.style.backgroundColor = type === 'error' ? '#e74c3c' : '#598586';
        toast.style.opacity = '1';
        toast.style.top = '70px';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.top = '50px';
        }, 3000);
    },

    // 全局通用的撒花特效
    fireConfetti: function(amount = 'normal') {
        if (typeof confetti === 'undefined') return;
        if (amount === 'small') {
            confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        } else {
            confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        }
    }
};