document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // 动态高度修正：iOS PWA 的终极解法
    // window.innerHeight 是浏览器给出的真实可用高度
    // 直接用它来设定 #app 的像素高度，完全绕开 CSS 视口计算
    // =============================================
    const app = document.getElementById('app');

    function setAppHeight() {
        app.style.height = window.innerHeight + 'px';
    }

    setAppHeight();
    window.addEventListener('resize', setAppHeight);

    // =============================================
    // 底部导航逻辑
    // =============================================
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        });
    });

    // =============================================
    // 音频引擎交互
    // =============================================
    const loadBtn = document.getElementById('load-audio-btn');
    const homeLoadBtn = document.getElementById('home-load-btn');
    const homeLoadArea = document.getElementById('home-load-area');
    const statusText = document.getElementById('audio-status');

    async function handleAudioLoad() {
        // iOS 必须在点击事件中 resume
        window.audioEngine.resume();
        
        if (statusText) statusText.textContent = 'Status: Loading...';
        if (loadBtn) {
            loadBtn.style.opacity = '0.5';
            loadBtn.style.pointerEvents = 'none';
        }
        if (homeLoadBtn) {
            homeLoadBtn.style.opacity = '0.5';
            homeLoadBtn.style.pointerEvents = 'none';
            homeLoadBtn.textContent = 'LOADING...';
        }

        const success = await window.audioEngine.loadSprite('./audio/sprite.json', './audio/sprite.mp3');
        
        if (success) {
            if (statusText) {
                statusText.textContent = 'Status: Loaded (Ready)';
                statusText.style.color = 'var(--accent-color)';
            }
            if (loadBtn) loadBtn.innerHTML = '<span>Audio Ready</span>';
            
            // 加载成功后隐藏首页的加载区域
            if (homeLoadArea) {
                homeLoadArea.style.display = 'none';
            }
        } else {
            if (statusText) {
                statusText.textContent = 'Status: Load Failed';
                statusText.style.color = 'red';
            }
            if (loadBtn) {
                loadBtn.style.opacity = '1';
                loadBtn.style.pointerEvents = 'auto';
            }
            if (homeLoadBtn) {
                homeLoadBtn.style.opacity = '1';
                homeLoadBtn.style.pointerEvents = 'auto';
                homeLoadBtn.textContent = 'RETRY LOAD';
            }
        }
    }

    if (loadBtn) loadBtn.addEventListener('click', handleAudioLoad);
    if (homeLoadBtn) homeLoadBtn.addEventListener('click', handleAudioLoad);

    // =============================================
    // 核心播放逻辑 (NORMAL MODE)
    // =============================================
    const playBtn = document.getElementById('main-play-btn');
    const plapIntervalSelect = document.getElementById('plap-interval');
    
    const roleA = {
        voice: document.getElementById('role-a-voice'),
        ratio: document.getElementById('role-a-ratio'),
        counter: 0,
        nextTrigger: 2
    };

    const roleB = {
        voice: document.getElementById('role-b-voice'),
        ratio: document.getElementById('role-b-ratio'),
        counter: 0,
        nextTrigger: 3
    };

    let isPlaying = false;
    let timer = null;

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getNextTrigger(ratioValue) {
        if (ratioValue === 'random-1-3') return getRandomInt(1, 3);
        if (ratioValue === 'random-4-6') return getRandomInt(4, 6);
        return parseInt(ratioValue);
    }

    function playLoop() {
        if (!isPlaying) return;

        // 1. 播放随机 Plap (使用 'plap' 轨道)
        const plapIndex = getRandomInt(1, 23);
        window.audioEngine.playSound(`plap_${plapIndex}`, 'plap');

        // 2. 检查角色 A (使用 'roleA' 轨道)
        if (roleA.ratio.value !== 'none') {
            roleA.counter++;
            if (roleA.counter >= roleA.nextTrigger) {
                const vType = roleA.voice.value;
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                const soundIndex = getRandomInt(1, maxCounts[parseInt(vType)]);
                window.audioEngine.playSound(`${vType}_${soundIndex}`, 'roleA');
                
                roleA.counter = 0;
                roleA.nextTrigger = getNextTrigger(roleA.ratio.value);
            }
        }

        // 3. 检查角色 B (使用 'roleB' 轨道)
        if (roleB.voice.value !== 'none' && roleB.ratio.value !== 'none') {
            roleB.counter++;
            if (roleB.counter >= roleB.nextTrigger) {
                const vType = roleB.voice.value;
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                const soundIndex = getRandomInt(1, maxCounts[parseInt(vType)]);
                window.audioEngine.playSound(`${vType}_${soundIndex}`, 'roleB');
                
                roleB.counter = 0;
                roleB.nextTrigger = getNextTrigger(roleB.ratio.value);
            }
        }

        // 4. 安排下一次循环
        const interval = parseInt(plapIntervalSelect.value);
        timer = setTimeout(playLoop, interval);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (!window.audioEngine.isLoaded) {
                alert('Please load audio in SETTINGS first!');
                return;
            }

            window.audioEngine.resume();
            isPlaying = !isPlaying;

            if (isPlaying) {
                playBtn.classList.add('playing');
                playBtn.innerHTML = '<span>STOP PLAYBACK</span>';
                // 初始化触发器
                roleA.nextTrigger = getNextTrigger(roleA.ratio.value);
                roleB.nextTrigger = getNextTrigger(roleB.ratio.value);
                playLoop();
            } else {
                playBtn.classList.remove('playing');
                playBtn.innerHTML = '<span>START PLAYBACK</span>';
                clearTimeout(timer);
            }
        });
    }

    // =============================================
    // 循环播放逻辑 (LOOP MODE)
    // =============================================
    const loopSegmentCount = document.getElementById('loop-segment-count');
    const segmentsContainer = document.getElementById('loop-segments-container');
    const loopPlayBtn = document.getElementById('loop-play-btn');

    function createSegmentCards() {
        const count = parseInt(loopSegmentCount.value);
        segmentsContainer.innerHTML = '';
        
        // 默认配置数据 (仅在 3 Segments 时应用)
        const defaults = [
            { dur: 18, interval: "900", ratioA: "random-1-3", ratioB: "random-1-3" },
            { dur: 12, interval: "600", ratioA: "random-1-3", ratioB: "random-1-3" },
            { dur: 3,  interval: "200", ratioA: "random-4-6", ratioB: "random-4-6" }
        ];
        
        for (let i = 1; i <= count; i++) {
            const def = (count === 3) ? defaults[i-1] : { dur: 5, interval: "300", ratioA: "2", ratioB: "3" };
            
            const card = document.createElement('div');
            card.className = 'card segment-card';
            card.innerHTML = `
                <h2 class="card-title">[ SEGMENT ${i} ]</h2>
                <div class="control-group">
                    <label>Duration</label>
                    <div class="stepper">
                        <div class="stepper-val"><span class="dur-val">${def.dur}</span>s</div>
                        <div class="stepper-controls">
                            <button class="step-btn minus">-</button>
                            <button class="step-btn plus">+</button>
                        </div>
                    </div>
                </div>
                <div class="control-group">
                    <label>Plap Frequency</label>
                    <select class="seg-plap-interval">
                        <option value="50" ${def.interval === "50" ? "selected" : ""}>0.05s</option>
                        <option value="100" ${def.interval === "100" ? "selected" : ""}>0.1s</option>
                        <option value="150" ${def.interval === "150" ? "selected" : ""}>0.15s</option>
                        <option value="200" ${def.interval === "200" ? "selected" : ""}>0.2s</option>
                        <option value="300" ${def.interval === "300" ? "selected" : ""}>0.3s</option>
                        <option value="600" ${def.interval === "600" ? "selected" : ""}>0.6s</option>
                        <option value="900" ${def.interval === "900" ? "selected" : ""}>0.9s</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Role A Ratio</label>
                    <select class="seg-role-a-ratio">
                        <option value="none" ${def.ratioA === "none" ? "selected" : ""}>None</option>
                        <option value="1" ${def.ratioA === "1" ? "selected" : ""}>Every 1</option>
                        <option value="2" ${def.ratioA === "2" ? "selected" : ""}>Every 2</option>
                        <option value="3" ${def.ratioA === "3" ? "selected" : ""}>Every 3</option>
                        <option value="4" ${def.ratioA === "4" ? "selected" : ""}>Every 4</option>
                        <option value="5" ${def.ratioA === "5" ? "selected" : ""}>Every 5</option>
                        <option value="6" ${def.ratioA === "6" ? "selected" : ""}>Every 6</option>
                        <option value="random-1-3" ${def.ratioA === "random-1-3" ? "selected" : ""}>Random 1-3</option>
                        <option value="random-4-6" ${def.ratioA === "random-4-6" ? "selected" : ""}>Random 4-6</option>
                    </select>
                </div>
                <div class="control-group">
                    <label>Role B Ratio</label>
                    <select class="seg-role-b-ratio">
                        <option value="none" ${def.ratioB === "none" ? "selected" : ""}>None</option>
                        <option value="1" ${def.ratioB === "1" ? "selected" : ""}>Every 1</option>
                        <option value="2" ${def.ratioB === "2" ? "selected" : ""}>Every 2</option>
                        <option value="3" ${def.ratioB === "3" ? "selected" : ""}>Every 3</option>
                        <option value="4" ${def.ratioB === "4" ? "selected" : ""}>Every 4</option>
                        <option value="5" ${def.ratioB === "5" ? "selected" : ""}>Every 5</option>
                        <option value="6" ${def.ratioB === "6" ? "selected" : ""}>Every 6</option>
                        <option value="random-1-3" ${def.ratioB === "random-1-3" ? "selected" : ""}>Random 1-3</option>
                        <option value="random-4-6" ${def.ratioB === "random-4-6" ? "selected" : ""}>Random 4-6</option>
                    </select>
                </div>
            `;
            
            // 绑定步进器逻辑 (包含长按连加/减)
            const minusBtn = card.querySelector('.minus');
            const plusBtn = card.querySelector('.plus');
            const valSpan = card.querySelector('.dur-val');

            function updateVal(delta) {
                let current = parseInt(valSpan.textContent);
                let next = current + delta;
                if (next >= 2 && next <= 20) {
                    valSpan.textContent = next;
                    return true;
                }
                return false;
            }

            function setupStepperBtn(btn, delta) {
                let pressTimer = null;
                let repeatTimer = null;

                const start = (e) => {
                    e.preventDefault();
                    updateVal(delta); // 先执行一次点击

                    // 500ms 后开启快速连发
                    pressTimer = setTimeout(() => {
                        repeatTimer = setInterval(() => {
                            if (!updateVal(delta)) stop(); // 到达边界停止
                        }, 100);
                    }, 500);
                };

                const stop = () => {
                    clearTimeout(pressTimer);
                    clearInterval(repeatTimer);
                };

                btn.addEventListener('mousedown', start);
                btn.addEventListener('touchstart', start, { passive: false });
                window.addEventListener('mouseup', stop);
                window.addEventListener('touchend', stop);
                btn.addEventListener('mouseleave', stop);
            }

            setupStepperBtn(minusBtn, -1);
            setupStepperBtn(plusBtn, 1);
            
            segmentsContainer.appendChild(card);
        }
    }

    if (loopSegmentCount) {
        loopSegmentCount.addEventListener('change', createSegmentCards);
        createSegmentCards(); // 初始化
    }

    let isLoopPlaying = false;
    let loopTimer = null;
    let currentSegIndex = 0;
    let segStartTime = 0;
    let loopCounters = { a: 0, b: 0, nextA: 2, nextB: 3 };

    function runLoopStep() {
        if (!isLoopPlaying) return;

        const segments = document.querySelectorAll('.segment-card');
        const currentSeg = segments[currentSegIndex];
        if (!currentSeg) return;
        
        // 获取当前片段的配置 (从步进器的文字中读取)
        const duration = parseInt(currentSeg.querySelector('.dur-val').textContent);
        const interval = parseInt(currentSeg.querySelector('.seg-plap-interval').value);
        const ratioA = currentSeg.querySelector('.seg-role-a-ratio').value;
        const ratioB = currentSeg.querySelector('.seg-role-b-ratio').value;
        const voiceA = document.getElementById('loop-role-a-voice').value;
        const voiceB = document.getElementById('loop-role-b-voice').value;

        // 1. 检查是否需要切换片段
        if (Date.now() - segStartTime >= duration * 1000) {
            currentSegIndex = (currentSegIndex + 1) % segments.length;
            segStartTime = Date.now();
            // 切换片段时视觉反馈
            document.querySelectorAll('.segment-card').forEach(c => c.style.borderColor = 'var(--border-color)');
            segments[currentSegIndex].style.borderColor = 'var(--accent-color)';
            segments[currentSegIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            return runLoopStep(); 
        }

        // 2. 播放 Plap
        window.audioEngine.playSound(`plap_${getRandomInt(1, 23)}`, 'plap');

        // 3. 角色 A
        if (ratioA !== 'none') {
            loopCounters.a++;
            if (loopCounters.a >= loopCounters.nextA) {
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                window.audioEngine.playSound(`${voiceA}_${getRandomInt(1, maxCounts[parseInt(voiceA)])}`, 'roleA');
                loopCounters.a = 0;
                loopCounters.nextA = getNextTrigger(ratioA);
            }
        }

        // 4. 角色 B
        if (voiceB !== 'none' && ratioB !== 'none') {
            loopCounters.b++;
            if (loopCounters.b >= loopCounters.nextB) {
                const maxCounts = [0, 15, 20, 23, 20, 13, 20, 19];
                window.audioEngine.playSound(`${voiceB}_${getRandomInt(1, maxCounts[parseInt(voiceB)])}`, 'roleB');
                loopCounters.b = 0;
                loopCounters.nextB = getNextTrigger(ratioB);
            }
        }

        loopTimer = setTimeout(runLoopStep, interval);
    }

    if (loopPlayBtn) {
        loopPlayBtn.addEventListener('click', () => {
            if (!window.audioEngine.isLoaded) {
                alert('Please load audio in SETTINGS first!');
                return;
            }

            window.audioEngine.resume();
            isLoopPlaying = !isLoopPlaying;

            if (isLoopPlaying) {
                loopPlayBtn.classList.add('playing');
                loopPlayBtn.innerHTML = '<span>STOP LOOP</span>';
                currentSegIndex = 0;
                segStartTime = Date.now();
                loopCounters = { a: 0, b: 0, nextA: 1, nextB: 1 };
                
                // 停止 Normal 模式的播放
                if (isPlaying) playBtn.click();
                
                runLoopStep();
            } else {
                loopPlayBtn.classList.remove('playing');
                loopPlayBtn.innerHTML = '<span>START LOOP</span>';
                clearTimeout(loopTimer);
                document.querySelectorAll('.segment-card').forEach(c => c.style.borderColor = 'var(--border-color)');
            }
        });
    }

    // =============================================
    // 音量调节逻辑
    // =============================================
    const volPlap = document.getElementById('vol-plap');
    const volRoleA = document.getElementById('vol-role-a');
    const volRoleB = document.getElementById('vol-role-b');

    if (volPlap) {
        volPlap.addEventListener('input', (e) => {
            window.audioEngine.setVolume('plap', parseFloat(e.target.value));
        });
    }
    if (volRoleA) {
        volRoleA.addEventListener('input', (e) => {
            window.audioEngine.setVolume('roleA', parseFloat(e.target.value));
        });
    }
    if (volRoleB) {
        volRoleB.addEventListener('input', (e) => {
            window.audioEngine.setVolume('roleB', parseFloat(e.target.value));
        });
    }

    // PWA Service Worker 注册
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('SW registered:', reg.scope))
                .catch(err => console.log('SW failed:', err));
        });
    }
});

