// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// SEO and Analytics
function trackEvent(eventName, eventData = {}) {
    // Google Analytics 4 event tracking
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Custom event tracking
    console.log('Event tracked:', eventName, eventData);
}

// Page load tracking
document.addEventListener('DOMContentLoaded', () => {
    trackEvent('page_view', {
        page_title: document.title,
        page_location: window.location.href
    });
});

// 多语言支持类
class I18n {
    constructor() {
        this.currentLang = 'en'; // 默认改为英文
        this.translations = {};
        this.isInitialized = false;
    }

    async init() {
        try {
            await this.loadTranslations();
            this.setupLanguageSwitcher();
            
            // 获取用户语言偏好或浏览器语言
            const savedLang = localStorage.getItem('preferredLanguage');
            const browserLang = this.detectBrowserLanguage();
            const initialLang = savedLang || browserLang || 'en';
            
            this.switchLanguage(initialLang);
            this.isInitialized = true;
        } catch (error) {
            console.error('多语言初始化失败:', error);
            // 确保至少显示英文
            this.currentLang = 'en';
            this.isInitialized = true;
        }
    }

    async loadTranslations() {
        try {
            const [zhResponse, enResponse] = await Promise.all([
                fetch('locales/zh.json'),
                fetch('locales/en.json')
            ]);
            
            if (!zhResponse.ok || !enResponse.ok) {
                throw new Error('翻译文件加载失败');
            }
            
            this.translations.zh = await zhResponse.json();
            this.translations.en = await enResponse.json();
        } catch (error) {
            console.error('加载翻译文件失败:', error);
            // 如果加载失败，使用默认翻译
            this.translations.zh = this.getDefaultTranslations('zh');
            this.translations.en = this.getDefaultTranslations('en');
        }
    }

    getDefaultTranslations(lang) {
        // 提供基本的默认翻译，防止加载失败时页面空白
        if (lang === 'zh') {
            return {
                title: "睡眠计算器 - 科学计算最佳睡眠时间",
                logo: "睡眠计算器",
                subtitle: "科学计算最佳睡眠时间，让您醒来时精力充沛",
                tabs: { bedtime: "计算就寝时间", wakeup: "计算起床时间" },
                bedtime: { title: "您想什么时候起床？", calculate: "计算就寝时间" },
                wakeup: { title: "如果您现在睡觉...", calculate: "计算起床时间" }
            };
        } else {
            return {
                title: "Sleep Calculator - Scientific Sleep Time Optimization",
                logo: "Sleep Calculator",
                subtitle: "Scientifically calculate optimal sleep times for refreshed mornings",
                tabs: { bedtime: "Calculate Bedtime", wakeup: "Calculate Wake-up Time" },
                bedtime: { title: "What time do you want to wake up?", calculate: "Calculate Bedtime" },
                wakeup: { title: "If you want to go to bed now...", calculate: "Calculate Wake-up Time" }
            };
        }
    }

    detectBrowserLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('zh')) {
            return 'zh';
        }
        return 'en';
    }

    setupLanguageSwitcher() {
        const langButtons = document.querySelectorAll('.lang-btn');
        langButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = button.getAttribute('data-lang');
                if (lang && (lang === 'zh' || lang === 'en')) {
                    this.switchLanguage(lang);
                }
            });
        });
    }

    switchLanguage(lang) {
        if (!this.translations[lang]) {
            console.error(`语言 ${lang} 的翻译未找到`);
            return;
        }

        this.currentLang = lang;
        
        // 更新按钮状态
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeButton = document.querySelector(`[data-lang="${lang}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
        
        // 更新页面语言属性
        document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
        
        // 更新页面内容
        this.updatePageLanguage();
        
        // 保存语言偏好
        localStorage.setItem('preferredLanguage', lang);
        
        // 跟踪语言切换事件
        trackEvent('language_switch', {
            language: lang,
            previous_language: this.currentLang
        });
        
        // 触发自定义事件，通知其他组件语言已切换
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    updatePageLanguage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                // 针对带图标的按钮，优先只替换带data-i18n的span的textContent
                if (element.tagName === 'SPAN' && element.parentElement && element.parentElement.classList.contains('return-btn')) {
                    element.textContent = translation;
                } else if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
        
        // 更新页面标题
        const titleTranslation = this.getTranslation('title');
        if (titleTranslation) {
            document.title = titleTranslation;
        }
        
        // 更新meta标签
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            const descriptionKey = this.currentLang === 'zh' ? 'description' : 'description';
            const descriptionTranslation = this.getTranslation(descriptionKey);
            if (descriptionTranslation) {
                metaDescription.setAttribute('content', descriptionTranslation);
            }
        }
    }

    getTranslation(key) {
        if (!key || !this.translations[this.currentLang]) {
            return null;
        }

        const keys = key.split('.');
        let value = this.translations[this.currentLang];
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        return value;
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    isReady() {
        return this.isInitialized;
    }
}

// 睡眠计算器核心逻辑
class SleepCalculator {
    constructor() {
        this.sleepCycleMinutes = 90; // 睡眠周期90分钟
        this.fallAsleepMinutes = 15; // 平均入睡时间15分钟
        this.optimalSleepHours = 7.5; // 最佳睡眠时长7.5小时
        this.minSleepHours = 6; // 最少睡眠时长6小时
        this.maxSleepHours = 9; // 最多睡眠时长9小时
    }

    // 计算就寝时间
    calculateBedtime(wakeupTime) {
        const wakeupDate = new Date();
        const [hours, minutes] = wakeupTime.split(':').map(Number);
        wakeupDate.setHours(hours, minutes, 0, 0);

        // 如果目标起床时间已经过了今天，设置为明天
        const now = new Date();
        if (wakeupDate <= now) {
            wakeupDate.setDate(wakeupDate.getDate() + 1);
        }

        const results = {
            primary: this.calculateOptimalBedtime(wakeupDate),
            secondary: this.calculateMinBedtime(wakeupDate),
            tertiary: this.calculateMaxBedtime(wakeupDate)
        };

        return results;
    }

    // 计算起床时间
    calculateWakeupTime(bedtime) {
        const bedtimeDate = new Date(bedtime);
        
        const results = {
            primary: this.calculateOptimalWakeup(bedtimeDate),
            secondary: this.calculateMinWakeup(bedtimeDate),
            tertiary: this.calculateMaxWakeup(bedtimeDate)
        };

        return results;
    }

    // 计算最佳就寝时间（7.5小时睡眠）
    calculateOptimalBedtime(wakeupDate) {
        const bedtime = new Date(wakeupDate);
        const totalSleepMinutes = this.optimalSleepHours * 60 + this.fallAsleepMinutes;
        bedtime.setMinutes(bedtime.getMinutes() - totalSleepMinutes);
        return bedtime;
    }

    // 计算最少睡眠就寝时间（6小时睡眠）
    calculateMinBedtime(wakeupDate) {
        const bedtime = new Date(wakeupDate);
        const totalSleepMinutes = this.minSleepHours * 60 + this.fallAsleepMinutes;
        bedtime.setMinutes(bedtime.getMinutes() - totalSleepMinutes);
        return bedtime;
    }

    // 计算最多睡眠就寝时间（9小时睡眠）
    calculateMaxBedtime(wakeupDate) {
        const bedtime = new Date(wakeupDate);
        const totalSleepMinutes = this.maxSleepHours * 60 + this.fallAsleepMinutes;
        bedtime.setMinutes(bedtime.getMinutes() - totalSleepMinutes);
        return bedtime;
    }

    // 计算最佳起床时间
    calculateOptimalWakeup(bedtimeDate) {
        const wakeup = new Date(bedtimeDate);
        const totalSleepMinutes = this.optimalSleepHours * 60 + this.fallAsleepMinutes;
        wakeup.setMinutes(wakeup.getMinutes() + totalSleepMinutes);
        return wakeup;
    }

    // 计算最少睡眠起床时间
    calculateMinWakeup(bedtimeDate) {
        const wakeup = new Date(bedtimeDate);
        const totalSleepMinutes = this.minSleepHours * 60 + this.fallAsleepMinutes;
        wakeup.setMinutes(wakeup.getMinutes() + totalSleepMinutes);
        return wakeup;
    }

    // 计算最多睡眠起床时间
    calculateMaxWakeup(bedtimeDate) {
        const wakeup = new Date(bedtimeDate);
        const totalSleepMinutes = this.maxSleepHours * 60 + this.fallAsleepMinutes;
        wakeup.setMinutes(wakeup.getMinutes() + totalSleepMinutes);
        return wakeup;
    }

    // 格式化时间为 HH:MM 格式
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // 格式化时间为更友好的显示格式
    formatTimeDisplay(date) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${displayHours}:${displayMinutes} ${ampm}`;
    }
}

// 全局变量
let sleepCalculator;
let i18n;

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
async function initializeApp() {
    try {
        // 初始化多语言支持
        i18n = new I18n();
        await i18n.init();
        
        // 初始化睡眠计算器
        sleepCalculator = new SleepCalculator();
        
        // 设置其他功能
        setupTabSwitching();
        setupQuickButtons();
        updateCurrentTime();
        setInterval(updateCurrentTime, 1000);
        
        console.log('应用初始化完成，当前语言:', i18n.getCurrentLanguage());
    } catch (error) {
        console.error('应用初始化失败:', error);
        // 显示错误信息给用户
        showErrorMessage('应用加载失败，请刷新页面重试');
    }
}

// 显示错误信息
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Arial, sans-serif;
    `;
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// 设置标签切换功能
function setupTabSwitching() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.calculator-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            panels.forEach(panel => panel.classList.remove('active'));
            
            // 添加活动状态到目标标签和面板
            button.classList.add('active');
            document.getElementById(`${targetTab}-panel`).classList.add('active');
            
            // 隐藏结果区域
            document.getElementById('bedtime-results').style.display = 'none';
            document.getElementById('wakeup-results').style.display = 'none';
        });
    });
}

// 设置快速按钮功能
function setupQuickButtons() {
    const quickButtons = document.querySelectorAll('.quick-btn');
    const timeInput = document.getElementById('wakeup-time');

    quickButtons.forEach(button => {
        button.addEventListener('click', () => {
            const time = button.getAttribute('data-time');
            timeInput.value = time;
        });
    });
}

// 更新当前时间显示
function updateCurrentTime() {
    if (!sleepCalculator) return;
    
    const now = new Date();
    const timeString = sleepCalculator.formatTimeDisplay(now);
    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) {
        currentTimeElement.textContent = timeString;
    }
}

// 计算就寝时间
function calculateBedtime() {
    if (!i18n || !i18n.isReady()) {
        showErrorMessage('语言系统未准备好，请稍后重试');
        return;
    }
    
    const wakeupTime = document.getElementById('wakeup-time').value;
    
    if (!wakeupTime) {
        const alertMessage = i18n.getTranslation('alerts.selectTime') || 'Please select a wake-up time';
        alert(alertMessage);
        return;
    }

    const results = sleepCalculator.calculateBedtime(wakeupTime);
    
    // 显示结果
    document.getElementById('primary-bedtime').textContent = sleepCalculator.formatTimeDisplay(results.primary);
    document.getElementById('secondary-bedtime').textContent = sleepCalculator.formatTimeDisplay(results.secondary);
    document.getElementById('tertiary-bedtime').textContent = sleepCalculator.formatTimeDisplay(results.tertiary);
    
    document.getElementById('bedtime-results').style.display = 'block';
    
    // 滚动到结果区域
    document.getElementById('bedtime-results').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
    
    // 跟踪计算事件
    trackEvent('calculate_bedtime', {
        wakeup_time: wakeupTime,
        primary_bedtime: sleepCalculator.formatTimeDisplay(results.primary),
        language: i18n.getCurrentLanguage()
    });
}

// 计算起床时间
function calculateWakeup() {
    if (!i18n || !i18n.isReady()) {
        showErrorMessage('语言系统未准备好，请稍后重试');
        return;
    }
    
    const now = new Date();
    const results = sleepCalculator.calculateWakeupTime(now);
    
    // 显示结果
    document.getElementById('primary-wakeup').textContent = sleepCalculator.formatTimeDisplay(results.primary);
    document.getElementById('secondary-wakeup').textContent = sleepCalculator.formatTimeDisplay(results.secondary);
    document.getElementById('tertiary-wakeup').textContent = sleepCalculator.formatTimeDisplay(results.tertiary);
    
    document.getElementById('wakeup-results').style.display = 'block';
    
    // 滚动到结果区域
    document.getElementById('wakeup-results').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
    });
    
    // 跟踪计算事件
    trackEvent('calculate_wakeup', {
        current_time: sleepCalculator.formatTimeDisplay(now),
        primary_wakeup: sleepCalculator.formatTimeDisplay(results.primary),
        language: i18n.getCurrentLanguage()
    });
}

// 添加键盘快捷键支持
document.addEventListener('keydown', function(event) {
    // Enter 键触发计算
    if (event.key === 'Enter') {
        const activePanel = document.querySelector('.calculator-panel.active');
        if (activePanel.id === 'bedtime-panel') {
            calculateBedtime();
        } else if (activePanel.id === 'wakeup-panel') {
            calculateWakeup();
        }
    }
    
    // Tab 键切换标签
    if (event.key === 'Tab' && event.ctrlKey) {
        event.preventDefault();
        const activeTab = document.querySelector('.tab-btn.active');
        const nextTab = activeTab.nextElementSibling || document.querySelector('.tab-btn');
        nextTab.click();
    }
    
    // L 键切换语言
    if (event.key === 'l' && event.ctrlKey) {
        event.preventDefault();
        if (i18n && i18n.isReady()) {
            const currentLang = i18n.getCurrentLanguage();
            const newLang = currentLang === 'zh' ? 'en' : 'zh';
            i18n.switchLanguage(newLang);
        }
    }
});

// 添加触摸支持（移动设备）
document.addEventListener('touchstart', function() {}, {passive: true});

// 添加平滑滚动
document.documentElement.style.scrollBehavior = 'smooth';

// 添加加载动画
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
});

// 错误处理
window.addEventListener('error', function(event) {
    console.error('应用错误:', event.error);
    showErrorMessage('应用发生错误，请刷新页面');
});

// 性能监控
if ('performance' in window) {
    window.addEventListener('load', function() {
        setTimeout(function() {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('页面加载时间:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
        }, 0);
    });
}

// 星空动画：随机星星分布、大小、闪烁
function createStars(numStars = 60) {
  const starfield = document.getElementById('starfield');
  if (!starfield) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  starfield.innerHTML = '';
  for (let i = 0; i < numStars; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    // 随机大小（2~5px）
    const size = Math.random() * 3 + 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    // 随机位置
    star.style.left = `${Math.random() * width}px`;
    star.style.top = `${Math.random() * height}px`;
    // 随机动画时长（1.5~4s）
    star.style.animationDuration = `${Math.random() * 2.5 + 1.5}s`;
    // 随机延迟
    star.style.animationDelay = `${Math.random() * 4}s`;
    starfield.appendChild(star);
  }
}
window.addEventListener('DOMContentLoaded', () => createStars(60));
window.addEventListener('resize', () => createStars(60));

function returnToInput(type) {
    if (type === 'bedtime') {
        document.getElementById('bedtime-results').style.display = 'none';
    } else if (type === 'wakeup') {
        document.getElementById('wakeup-results').style.display = 'none';
    }
    // 滚动到顶部输入区
    window.scrollTo({ top: 0, behavior: 'smooth' });
} 