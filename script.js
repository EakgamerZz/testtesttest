// Z-Index Management
let highestZ = 10;

function bringToFront(element) {
    highestZ++;
    element.style.zIndex = highestZ;

    // Remove active class from all windows
    document.querySelectorAll('.window').forEach(win => win.classList.remove('active'));
    // Add active class to current window
    element.classList.add('active');
}

function openWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    win.style.display = 'flex';
    bringToFront(win);

    // Animation reset
    win.style.animation = 'none';
    win.offsetHeight; /* trigger reflow */
    win.style.animation = 'openWindow 0.3s forwards';
}

function closeWindow(id, event) {
    // Stop event from bubbling up
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const win = document.getElementById(id);
    if (win) {
        // Clear previous inline animation to allow CSS class animation to work
        win.style.animation = '';

        // Add closing class to trigger animation
        win.classList.add('closing');

        // Play close sound
        const closeSound = document.getElementById('ui-close-sound');
        if (closeSound) {
            closeSound.currentTime = 0;
            closeSound.play().catch(e => console.log('Close audio play failed:', e));
        }

        // Wait for animation to finish (0.4s = 400ms)
        setTimeout(() => {
            win.style.display = 'none';
            win.classList.remove('closing');
        }, 400);
    }
}

// Minimize window to dock (Yellow button)
function minimizeWindow(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const win = document.getElementById(id);
    if (win) {
        // Add minimizing animation
        win.classList.add('minimizing');

        // Play sound
        const clickSound = document.getElementById('ui-click-sound');
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => { });
        }

        // Hide after animation
        setTimeout(() => {
            win.style.display = 'none';
            win.classList.remove('minimizing');
        }, 400);
    }
}

// Maximize/Fullscreen window (Green button)
function maximizeWindow(id, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const win = document.getElementById(id);
    if (win) {
        // Play sound
        const clickSound = document.getElementById('ui-click-sound');
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(() => { });
        }

        // Disable heavy effects during transition
        win.classList.add('resizing');

        // Toggle fullscreen class
        if (win.classList.contains('fullscreen')) {
            // Restore to original size with animation
            win.classList.remove('fullscreen');
            win.classList.add('restoring');

            requestAnimationFrame(() => {
                win.style.top = win.dataset.originalTop || '10%';
                win.style.left = win.dataset.originalLeft || '10%';
                win.style.width = win.dataset.originalWidth || '600px';
                win.style.height = '';
            });

            // Remove restoring class after animation
            setTimeout(() => {
                win.classList.remove('restoring');
            }, 250);
        } else {
            // Save original position
            win.dataset.originalTop = win.style.top;
            win.dataset.originalLeft = win.style.left;
            win.dataset.originalWidth = win.style.width;

            // Go fullscreen - account for top bar (30px) and dock (80px)
            win.classList.add('fullscreen');
            requestAnimationFrame(() => {
                win.style.top = '30px';
                win.style.left = '0';
                win.style.width = '100%';
                win.style.height = 'calc(100vh - 110px)';
            });
        }

        // Re-enable effects after transition
        setTimeout(() => {
            win.classList.remove('resizing');
        }, 300);
    }
}

// Draggable Logic
function makeDraggable(element) {
    const titleBar = element.querySelector('.title-bar');
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;
    let rafId = null;

    titleBar.addEventListener('mousedown', startDrag);
    titleBar.addEventListener('touchstart', startDrag, { passive: false });

    function startDrag(e) {
        // Prevent drag when clicking buttons
        if (e.target.classList.contains('close') ||
            e.target.classList.contains('minimize') ||
            e.target.classList.contains('maximize')) return;

        isDragging = true;
        bringToFront(element);

        // Optimize for dragging - disable transitions
        element.style.transition = 'none';
        element.style.willChange = 'left, top';

        const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

        startX = clientX;
        startY = clientY;

        const rect = element.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();

        const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

        const dx = clientX - startX;
        const dy = clientY - startY;

        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        // Boundary checks
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Horizontal bounds (keep some part visible)
        if (newLeft < -element.offsetWidth + 100) newLeft = -element.offsetWidth + 100;
        if (newLeft > windowWidth - 100) newLeft = windowWidth - 100;

        // Vertical bounds - Keep title bar always visible
        if (newTop < 30) newTop = 30;

        // Allow dragging up higher - bottom boundary less restrictive
        if (newTop > windowHeight - 120) newTop = windowHeight - 120;

        // Use requestAnimationFrame for smooth updates
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        });
    }

    function stopDrag() {
        isDragging = false;

        // Restore transitions
        element.style.transition = '';
        element.style.willChange = '';

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
    }

    // Bring to front on click anywhere
    element.addEventListener('mousedown', () => bringToFront(element));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Make all windows draggable and optimize resize
    document.querySelectorAll('.window').forEach(win => {
        makeDraggable(win);

        // Optimize resize - disable heavy effects during resize
        let resizeTimeout;
        const resizeObserver = new ResizeObserver(() => {
            win.classList.add('resizing');
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                win.classList.remove('resizing');
            }, 150);
        });
        resizeObserver.observe(win);
    });

    // Theme Sync on Load
    const themeSwitch = document.getElementById('theme-toggle-switch');
    if (themeSwitch && themeSwitch.checked) {
        document.body.classList.add('dark-mode');
    }

    // Loading Screen Sequence
    const loadingScreen = document.getElementById('loading-screen');
    const loadingText = document.getElementById('loading-text');
    const loadingContent = document.querySelector('.loading-content');
    const welcomeText = document.getElementById('welcome-text');
    let progress = 0;

    // Sequence: Welcome -> Loading -> Done
    setTimeout(() => {
        // Welcome text animation finishes around 2.5s
        if (welcomeText) welcomeText.style.display = 'none';
        if (loadingContent) {
            loadingContent.classList.remove('hidden-initially');
            loadingContent.classList.add('visible');
        }
        // Loading Screen Logic (Persona 4 Style)
        // const loadingScreen = document.getElementById('loading-screen'); // Already declared
        // const loadingText = document.getElementById('loading-text'); // Already declared

        // let progress = 0; // Already declared
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 10) + 5;
            if (progress > 100) progress = 100;

            if (loadingText) loadingText.textContent = progress + '%';

            if (progress === 100) {
                clearInterval(interval);
                // Wait for animations to finish (approx 3-4s total)
                setTimeout(() => {
                    if (loadingScreen) {
                        loadingScreen.classList.add('fade-out');
                        document.body.classList.add('loaded'); // Trigger content fade-in

                        // Remove after fade
                        setTimeout(() => {
                            loadingScreen.style.display = 'none';
                            // Auto-play music check (if permitted)
                            if (typeof enableMusic === 'function') enableMusic();
                        }, 1000);
                    }
                }, 2000);
            }
        }, 150); // Speed of loading
    }, 2000); // Wait for welcome

    // --- Music Auto-Play Logic (Starts immediately) ---
    const bgMusic = document.getElementById('bg-music');
    const musicBtn = document.getElementById('music-btn');
    const muteSound = document.getElementById('ui-mute-sound');
    let isPlaying = false;

    // --- Audio Visualizer Setup ---
    // --- Audio Visualizer Setup ---
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let visualizerBars = document.querySelectorAll('#audio-visualizer .bar');
    let visualizerAnimationId = null;

    function setupAudioVisualizer() {
        if (audioContext) return; // Already setup

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return; // Not supported

            audioContext = new AudioContext();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 32;

            const source = audioContext.createMediaElementSource(bgMusic);
            if (source && analyser) {
                source.connect(analyser);
                analyser.connect(audioContext.destination);
            }

            dataArray = new Uint8Array(analyser.frequencyBinCount);

            // Start visualizer animation
            animateVisualizer();
        } catch (e) {
            console.log('AudioContext setup failed:', e);
        }
    }



    function animateVisualizer() {
        if (!analyser || !dataArray) return;
        analyser.getByteFrequencyData(dataArray);

        visualizerBars.forEach((bar, index) => {
            const value = dataArray[index] || 0;
            const boostedValue = Math.pow(value / 255, 0.8) * 255;
            const height = Math.max(5, (boostedValue / 255) * 60);
            bar.style.height = height + 'px';
        });
        visualizerAnimationId = requestAnimationFrame(animateVisualizer);
    }

    // Fallback for local files or errors (Simulated Visualizer)
    function animateVisualizerFallback() {
        visualizerBars.forEach(bar => {
            // Random height between 5 and 50px
            if (Math.random() > 0.5) { // Update only some frames for smoother jitter
                const height = Math.max(5, Math.random() * 50);
                bar.style.height = height + 'px';
            }
        });
        // Slower update rate for simulation
        visualizerAnimationId = setTimeout(() => {
            requestAnimationFrame(animateVisualizerFallback);
        }, 50);
    }

    function stopVisualizer() {
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
            clearTimeout(visualizerAnimationId); // Clear timeout for fallback
        }
        // Reset bars
        visualizerBars.forEach(bar => {
            bar.style.height = '5px';
        });
    }

    const enableMusic = () => {
        if (!bgMusic) return;
        bgMusic.volume = 0.5;

        // Resume AudioContext if suspended (browser policy)
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }

        bgMusic.play().then(() => {
            if (musicBtn) {
                musicBtn.classList.add('playing');
                musicBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            }
            isPlaying = true;

            // Setup visualizer on first play
            setupAudioVisualizer();
        }).catch(e => console.log('Music play failed:', e));
    };

    if (bgMusic) {
        // Try auto-play immediately during Welcome screen
        enableMusic();

        // Fallback: If browser blocked it (bgMusic.paused is true), wait for first interaction
        setTimeout(() => {
            if (bgMusic.paused) {
                console.log('Autoplay blocked. Waiting for interaction...');
                document.addEventListener('click', function onFirstClick() {
                    enableMusic();
                    document.removeEventListener('click', onFirstClick);
                }, { once: true });
            }
        }, 500);

        // Stop visualizer when music pauses
        bgMusic.addEventListener('pause', stopVisualizer);
        bgMusic.addEventListener('play', () => {
            if (analyser) animateVisualizer();
        });
    }

    // ==================== KEY UI INITIALIZATION ====================

    // Play Sound Effect on UI Interaction
    const clickSound = document.getElementById('ui-click-sound');
    function playSound() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    // Attach sound to specific interactive elements
    const interactiveSelectors = [
        'button',
        '.dock-item',
        '.traffic-lights span',
        '.folder-item',
        '.switch-label' // Add switch to click sounds
    ];

    interactiveSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(element => {
            if (element.classList.contains('close')) return;
            element.addEventListener('mousedown', playSound);
        });
    });

    // Hover Sound
    const hoverSound = document.getElementById('ui-hover-sound');
    if (hoverSound) {
        hoverSound.volume = 0.5;
        document.querySelectorAll('.dock-item').forEach(item => {
            item.addEventListener('mouseenter', () => {
                hoverSound.currentTime = 0;
                hoverSound.play().catch(() => { });
            });

            // Add bounce animation on click
            item.addEventListener('click', () => {
                item.classList.add('dock-bounce');
                setTimeout(() => {
                    item.classList.remove('dock-bounce');
                }, 500);
            });
        });
    }

    // Music Panel System
    initMusicPanel();
});

// ==================== CLOCK & DATE ====================
function updateClock() {
    const clockElement = document.getElementById('main-clock');
    const dateElement = document.getElementById('date-display');

    // Fallback for old top bar clock if exists (though we removed it)
    const oldClock = document.getElementById('clock');

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    if (clockElement) {
        clockElement.textContent = timeString;
    }

    if (oldClock) {
        oldClock.textContent = timeString;
    }

    if (dateElement) {
        const options = { day: 'numeric', month: 'long' };
        dateElement.textContent = now.toLocaleDateString('en-GB', options);
    }
}

setInterval(updateClock, 1000);
updateClock();

// ==================== THEME SYSTEM ====================
// Toggle from Switch
function toggleThemeFromSwitch(checkbox) {
    if (checkbox.checked) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// ==================== MUSIC PANEL SYSTEM ====================
let playlist = [
    { name: '記憶の片隅', src: 'bgm.mp3' }
];
let currentTrackIndex = 0;
let isPlaying = false;

function playTrack(index) {
    if (index < 0 || index >= playlist.length) return;

    const bgMusic = document.getElementById('bg-music');
    const trackNameDisplay = document.getElementById('current-track-name');
    const playlistItems = document.querySelectorAll('.playlist-item');

    currentTrackIndex = index;
    const track = playlist[index];

    // Update Audio Source
    bgMusic.src = track.src;

    // Update UI
    if (trackNameDisplay) trackNameDisplay.textContent = track.name;

    // Update Active Class
    playlistItems.forEach((item, i) => {
        if (i === index) item.classList.add('active');
        else item.classList.remove('active');
    });

    // Play
    bgMusic.play().then(() => {
        isPlaying = true;
        updatePlayButton();

        // Re-attach visualizer if needed
        // (Note: AudioContext might need reconnection if src changes, 
        // but typically MediaElementSource handles it if the element is same)
    }).catch(e => console.log('Play failed:', e));
}

function initMusicPanel() {
    const bgMusic = document.getElementById('bg-music');
    const volumeSlider = document.getElementById('volume-slider');
    const musicBtn = document.getElementById('music-btn');

    // Volume slider
    if (volumeSlider && bgMusic) {
        volumeSlider.addEventListener('input', (e) => {
            bgMusic.volume = e.target.value / 100;
        });
        bgMusic.volume = 0.5; // Default 50%
    }

    // Update button icon based on play state
    if (bgMusic) {
        bgMusic.addEventListener('play', updatePlayButton);
        bgMusic.addEventListener('pause', updatePlayButton);
    }
}

function toggleMusicPanel() {
    const panel = document.getElementById('music-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function toggleMusic() {
    const bgMusic = document.getElementById('bg-music');

    if (!bgMusic) return;

    if (bgMusic.paused) {
        bgMusic.play().catch(e => console.log('Play failed:', e));
        isPlaying = true;
    } else {
        bgMusic.pause();
        isPlaying = false;
        // Play mute sound
        const muteSound = document.getElementById('ui-mute-sound');
        if (muteSound) {
            muteSound.currentTime = 0;
            muteSound.play().catch(() => { });
        }
    }
    updatePlayButton();
}

function updatePlayButton() {
    const bgMusic = document.getElementById('bg-music');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const musicBtn = document.getElementById('music-btn');

    if (bgMusic && !bgMusic.paused) {
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        if (musicBtn) {
            musicBtn.classList.add('playing');
            musicBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    } else {
        if (playPauseBtn) playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (musicBtn) {
            musicBtn.classList.remove('playing');
            musicBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
        }
    }
}

function addMusicFromUrl() {
    const urlInput = document.getElementById('music-url');
    const url = urlInput.value.trim();

    if (!url) {
        alert('กรุณาใส่ URL เพลง');
        return;
    }

    let track = {
        name: 'New Track',
        src: url
    };

    // Direct URL: Ensure protocol
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        track.src = 'https://' + url;
    }

    // Extract filename for name
    try {
        const urlObj = new URL(track.src);
        let name = urlObj.pathname.split('/').pop();
        name = decodeURIComponent(name);
        if (name.length > 25) name = name.substring(0, 25) + '...';
        if (!name) name = 'Audio Track';
        track.name = name;
    } catch (e) {
        track.name = 'Custom Track';
    }

    playlist.push(track);
    renderPlaylist();
    urlInput.value = '';
    alert('เพิ่มเพลงสำเร็จ! 🎵');
}

function renderPlaylist() {
    const container = document.getElementById('playlist-container');
    if (!container) return;

    let html = '';
    playlist.forEach((track, index) => {
        html += `
            <div class="playlist-item ${index === currentTrackIndex ? 'active' : ''}" onclick="playTrack(${index})">
                <i class="fa-solid fa-music"></i>
                <span>${track.name}</span>
            </div>
        `;
    });
    container.innerHTML = html;
}

function playTrack(index) {
    const bgMusic = document.getElementById('bg-music');
    if (!bgMusic || !playlist[index]) return;

    currentTrackIndex = index;

    // Update source
    bgMusic.src = playlist[index].src;
    bgMusic.load();
    bgMusic.play().catch(e => console.log('Play failed:', e));

    // Update current track name
    const trackName = document.getElementById('current-track-name');
    if (trackName) trackName.textContent = playlist[index].name;

    // Update playlist UI
    renderPlaylist();
    updatePlayButton();
}

// ==================== QUIZ SYSTEM ====================
const quizQuestions = [
    // บทที่ 1: App Development
    {
        question: "1. โปรแกรม MIT App Inventor ใช้สร้างแอปพลิเคชันบนระบบปฏิบัติการใด?",
        options: ["iOS", "Android", "Windows", "macOS"],
        answer: 1,
        unit: 1
    },
    {
        question: "2. Block-based Programming หมายถึงอะไร?",
        options: [
            "การเขียนโค้ดด้วยภาษา C++",
            "การเขียนโปรแกรมแบบลากวางบล็อก",
            "การเขียนโปรแกรมแบบ Command Line",
            "การเขียนโปรแกรมด้วยภาษา Assembly"
        ],
        answer: 1,
        unit: 1
    },
    {
        question: "3. ขั้นตอนแรกของการพัฒนาแอปพลิเคชันคือข้อใด?",
        options: ["เขียนโค้ด", "ทดสอบ", "วิเคราะห์ปัญหาและออกแบบ", "เผยแพร่"],
        answer: 2,
        unit: 1
    },
    // บทที่ 2: Data Science
    {
        question: "4. ข้อใดไม่ใช่ประเภทของข้อมูล?",
        options: ["ข้อมูลเชิงปริมาณ", "ข้อมูลเชิงคุณภาพ", "ข้อมูลเชิงตรรกะ", "ข้อมูลเชิงอารมณ์"],
        answer: 3,
        unit: 2
    },
    {
        question: "5. Data Visualization หมายถึงอะไร?",
        options: [
            "การเก็บข้อมูล",
            "การนำเสนอข้อมูลในรูปแบบกราฟหรือแผนภูมิ",
            "การลบข้อมูล",
            "การเข้ารหัสข้อมูล"
        ],
        answer: 1,
        unit: 2
    },
    // บทที่ 3: IoT
    {
        question: "6. IoT ย่อมาจากอะไร?",
        options: [
            "Internet of Technology",
            "Internet of Things",
            "Input Output Terminal",
            "Integrated Online Tools"
        ],
        answer: 1,
        unit: 3
    },
    {
        question: "7. อุปกรณ์ใดที่ใช้เป็นสมองกลในระบบ IoT?",
        options: ["Monitor", "Printer", "Microcontroller", "Scanner"],
        answer: 2,
        unit: 3
    },
    {
        question: "8. Smart Home คือตัวอย่างการประยุกต์ใช้ในด้านใด?",
        options: ["การเกษตร", "การแพทย์", "ที่อยู่อาศัย", "การขนส่ง"],
        answer: 2,
        unit: 3
    },
    // บทที่ 4: Cyber Safety
    {
        question: "10. Cyberbullying คืออะไร?",
        options: [
            "การเล่นเกมออนไลน์",
            "การซื้อของออนไลน์",
            "การกลั่นแกล้งผ่านช่องทางออนไลน์",
            "การเรียนออนไลน์"
        ],
        answer: 2,
        unit: 4
    },
    // --- New Questions (Expansion) ---
    // History & Basics
    {
        question: "11. ใครถูกยกย่องว่าเป็น 'บิดาแห่ง AI'?",
        options: ["Alan Turing", "Steve Jobs", "Mark Zuckerberg", "Sam Altman"],
        answer: 0,
        unit: 2
    },
    {
        question: "12. โปรแกรม AI แรกที่สามารถเอาชนะแชมป์หมากล้อมโลก (Go) ได้คือ?",
        options: ["Deep Blue", "AlphaGo", "Watson", "ChatGPT"],
        answer: 1,
        unit: 2
    },
    {
        question: "13. การทดสอบเพื่อแยกแยะมนุษย์กับ AI เรียกว่าอะไร?",
        options: ["IQ Test", "Turing Test", "Speed Test", "Stress Test"],
        answer: 1,
        unit: 2
    },
    // AI Concepts
    {
        question: "14. Machine Learning เรียนรู้จากอะไร?",
        options: ["เวทมนตร์", "ข้อมูล (Data)", "คู่มือการใช้งาน", "การเดา"],
        answer: 1,
        unit: 2
    },
    {
        question: "15. 'Deep Learning' จำลองการทำงานมาจากส่วนใดของมนุษย์?",
        options: ["หัวใจ", "ดวงตา", "เซลล์ประสาทในสมอง (Neural Networks)", "กล้ามเนื้อ"],
        answer: 2,
        unit: 2
    },
    {
        question: "16. ข้อใดคือ Generative AI?",
        options: ["Excel", "Calculator", "ChatGPT", "Antivirus"],
        answer: 2,
        unit: 2
    },
    {
        question: "17. อาการที่ AI ตอบข้อมูลผิดๆ อย่างมั่นใจ เรียกว่าอะไร?",
        options: ["Sleeping", "Hallucination (ภาพหลอน)", "Dreaming", "Thinking"],
        answer: 1,
        unit: 4
    },
    // AI Tools for Classroom
    {
        question: "18. เครื่องมือใดใช้สร้างภาพจากข้อความ (Text-to-Image)?",
        options: ["Microsoft Word", "Midjourney", "Google Maps", "YouTube"],
        answer: 1,
        unit: 1
    },
    {
        question: "19. Canva Magic Studio ช่วยทำอะไร?",
        options: ["ซ่อมคอมพิวเตอร์", "ออกแบบกราฟิกด้วย AI", "เขียนโปรแกรม C++", "ไวรัสสแกน"],
        answer: 1,
        unit: 1
    },
    {
        question: "20. หากต้องการสรุปบทความยาวๆ ควรใช้ AI ตัวใด?",
        options: ["ChatGPT / Gemini", "Paint", "Notepad", "Calculator"],
        answer: 0,
        unit: 1
    },
    {
        question: "21. Perplexity AI มีจุดเด่นคืออะไร?",
        options: ["สร้างวิดีโอ", "ค้นหาข้อมูลพร้อมอ้างอิงแหล่งที่มา", "เล่นเกม", "แต่งเพลง"],
        answer: 1,
        unit: 2
    },
    {
        question: "22. เครื่องมือใดช่วยสร้างคำถาม Quiz อัตโนมัติ?",
        options: ["Quizizz AI", "Netflix", "Spotify", "Instagram"],
        answer: 0,
        unit: 1
    },
    {
        question: "23. Gemini เป็น AI ของบริษัทใด?",
        options: ["Apple", "Microsoft", "Google", "Facebook"],
        answer: 2,
        unit: 2
    },
    // IoT & Security Extension
    {
        question: "24. อุปกรณ์ IoT เชื่อมต่อกันผ่านอะไรเป็นหลัก?",
        options: ["Bluetooth", "สาย Cable", "Internet / WiFi", "คลื่นวิทยุ FM"],
        answer: 2,
        unit: 3
    },
    {
        question: "25. เซ็นเซอร์ใดใช้วัดอุณหภูมิ?",
        options: ["Ultrasonic", "DHT11", "Servo", "LED"],
        answer: 1,
        unit: 3
    },
    {
        question: "26. ข้อใดคือรหัสผ่านที่ปลอดภัย (Strong Password)?",
        options: ["123456", "password", "P@ssw0rd_2024!", "admin"],
        answer: 2,
        unit: 4
    },
    {
        question: "27. Phishing คือการโจมตีแบบใด?",
        options: ["ตกปลา", "สร้างเว็บไซต์ปลอมเพื่อหลอกเอาข้อมูล", "ทำลายฮาร์ดดิสก์", "ดักฟังโทรศัพท์"],
        answer: 1,
        unit: 4
    },
    {
        question: "28. 2FA (Two-Factor Authentication) คืออะไร?",
        options: ["การสมัคร 2 บัญชี", "การยืนยันตัวตน 2 ขั้นตอน", "การใช้คอม 2 เครื่อง", "การมีแฟน 2 คน"],
        answer: 1,
        unit: 4
    },
    // Ethics & Future
    {
        question: "29. Deepfake คือเทคโนโลยีเกี่ยวกับอะไร?",
        options: ["การดำน้ำลึก", "การปลอมแปลงใบหน้า/เสียงด้วย AI", "การขุดเจาะข้อมูล", "การทำอาหาร"],
        answer: 1,
        unit: 4
    },
    {
        question: "30. ข้อใดคือจริยธรรมในการใช้ AI?",
        options: ["ใช้ทำการบ้านส่งครูทั้งหมด", "ใช้สร้างข่าวปลอม", "ตรวจสอบความถูกต้องและไม่ละเมิดลิขสิทธิ์", "ใช้แกล้งเพื่อน"],
        answer: 2,
        unit: 4
    },
    {
        question: "31. Prompt Engineering คืออะไร?",
        options: ["วิศวกรรมโยธา", "ศิลปะการปั้น", "เทคนิคการเขียนคำสั่งให้ AI ทำงานได้ดีที่สุด", "การซ่อมบำรุง AI"],
        answer: 2,
        unit: 1
    },
    {
        question: "32. Large Language Model (LLM) คือโมเดลแบบใด?",
        options: ["โมเดลภาษาขนาดเล็ก", "โมเดลภาษาขนาดใหญ่ที่เข้าใจภาษามนุษย์", "โมเดลหุ่นยนต์", "โมเดลตึกสูง"],
        answer: 1,
        unit: 2
    },
    {
        question: "33. Claude เป็น AI ของบริษัทใด?",
        options: ["OpenAI", "Anthropic", "Google", "Meta"],
        answer: 1,
        unit: 2
    },
    {
        question: "34. ข้อใด *ไม่ใช่* ประโยชน์ของ AI ในการศึกษา?",
        options: ["ช่วยวางแผนการสอน", "ช่วยสร้างสื่อการสอน", "ช่วยลอกการบ้านเพื่อน", "ช่วยอธิบายบทเรียนที่ซับซ้อน"],
        answer: 2,
        unit: 4
    },
    {
        question: "35. Computer Vision เกี่ยวข้องกับสิ่งใด?",
        options: ["เสียง", "ภาพและวิดีโอ", "รสชาติ", "กลิ่น"],
        answer: 1,
        unit: 2
    },
    {
        question: "36. NLP (Natural Language Processing) คือ?",
        options: ["การประมวลผลภาษาธรรมชาติ", "การปลูกป่า", "การออกกำลังกาย", "การเขียนโปรแกรมด้วยภาษาเครื่อง"],
        answer: 0,
        unit: 2
    },
    {
        question: "37. Algorithm หมายถึงอะไร?",
        options: ["ชื่อของ AI", "ขั้นตอนวิธีการแก้ปัญหาเป็นลำดับ", "จังหวะดนตรี", "โปรแกรมไวรัส"],
        answer: 1,
        unit: 1
    },
    {
        question: "38. ข้อใดคือตัวอย่างของ Smart City?",
        options: ["เมืองที่มีแต่ตึกสูง", "เมืองที่ใช้เซ็นเซอร์บริหารจัดการจราจรและพลังงาน", "เมืองที่มีคนฉลาดอยู่เยอะ", "เมืองที่ไม่มีอินเทอร์เน็ต"],
        answer: 1,
        unit: 3
    },
    {
        question: "39. หาก AI ทำงานแทนมนุษย์ เราควรปรับตัวอย่างไร?",
        options: ["ลาออกจากงาน", "ต่อต้าน AI", "เรียนรู้ทักษะใหม่และทำงานร่วมกับ AI (Upskill/Reskill)", "หนีเข้าป่า"],
        answer: 2,
        unit: 4
    },
    {
        question: "40. พ.ร.บ. คอมพิวเตอร์ มีไว้เพื่ออะไร?",
        options: ["จับผิดคนเล่นเกม", "กำกับดูแลและป้องกันการกระทำผิดทางคอมพิวเตอร์", "ทำให้เน็ตช้าลง", "ขายยาดักจับไวรัส"],
        answer: 1,
        unit: 4
    }
];

let currentQuestion = 0;
let userAnswers = [];
let quizSubmitted = false;

function initQuiz() {
    currentQuestion = 0;
    userAnswers = new Array(quizQuestions.length).fill(null);
    quizSubmitted = false;
    renderQuestion();
    updateProgress();
    updateButtons();

    document.getElementById('quiz-result').style.display = 'none';
    document.getElementById('quiz-content').style.display = 'block';
}

function renderQuestion() {
    const q = quizQuestions[currentQuestion];
    const container = document.getElementById('quiz-content');

    let optionsHTML = '';
    q.options.forEach((opt, idx) => {
        const isSelected = userAnswers[currentQuestion] === idx;
        let optionClass = 'quiz-option';
        if (isSelected) optionClass += ' selected';

        if (quizSubmitted) {
            if (idx === q.answer) optionClass += ' correct';
            else if (isSelected && idx !== q.answer) optionClass += ' incorrect';
        }

        optionsHTML += `
            <label class="${optionClass}" onclick="selectAnswer(${idx})">
                <input type="radio" name="q${currentQuestion}" value="${idx}" ${isSelected ? 'checked' : ''} ${quizSubmitted ? 'disabled' : ''}>
                ${opt}
            </label>
        `;
    });

    container.innerHTML = `
        <div class="quiz-question">
            <h4>${q.question}</h4>
            <div class="quiz-options">
                ${optionsHTML}
            </div>
        </div>
    `;
}

function selectAnswer(idx) {
    if (quizSubmitted) return;
    userAnswers[currentQuestion] = idx;
    renderQuestion();
    updateProgress();
}

function updateProgress() {
    const dots = document.querySelectorAll('#quiz-progress .dot');
    dots.forEach((dot, idx) => {
        dot.classList.remove('active', 'answered');
        if (idx === currentQuestion) dot.classList.add('active');
        if (userAnswers[idx] !== null) dot.classList.add('answered');
    });
}

function updateButtons() {
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const submitBtn = document.getElementById('btn-submit');
    const restartBtn = document.getElementById('btn-restart');

    if (quizSubmitted) {
        prevBtn.style.display = currentQuestion > 0 ? 'inline-block' : 'none';
        nextBtn.style.display = currentQuestion < quizQuestions.length - 1 ? 'inline-block' : 'none';
        submitBtn.style.display = 'none';
        restartBtn.style.display = 'inline-block';
    } else {
        prevBtn.style.display = currentQuestion > 0 ? 'inline-block' : 'none';
        nextBtn.style.display = currentQuestion < quizQuestions.length - 1 ? 'inline-block' : 'none';
        submitBtn.style.display = currentQuestion === quizQuestions.length - 1 ? 'inline-block' : 'none';
        restartBtn.style.display = 'none';
    }
}

function nextQuestion() {
    if (currentQuestion < quizQuestions.length - 1) {
        currentQuestion++;
        renderQuestion();
        updateProgress();
        updateButtons();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
        updateProgress();
        updateButtons();
    }
}

function submitQuiz() {
    quizSubmitted = true;

    let score = 0;
    quizQuestions.forEach((q, idx) => {
        if (userAnswers[idx] === q.answer) score++;
    });

    document.getElementById('quiz-score').textContent = `${score}/${quizQuestions.length}`;

    let message = '';
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage === 100) message = '🏆 ยอดเยี่ยมมาก! คุณได้คะแนนเต็ม!';
    else if (percentage >= 80) message = '🌟 ดีมาก! คุณเข้าใจเนื้อหาได้ดี';
    else if (percentage >= 60) message = '👍 ดี! ลองทบทวนเพิ่มเติมนะ';
    else if (percentage >= 40) message = '📚 ควรทบทวนบทเรียนเพิ่มเติม';
    else message = '📖 ลองกลับไปอ่านบทเรียนใหม่นะ';

    document.getElementById('quiz-message').textContent = message;
    document.getElementById('quiz-result').style.display = 'block';

    renderQuestion();
    updateButtons();
}

function restartQuiz() {
    initQuiz();
}

// Initialize quiz when window opens
document.addEventListener('DOMContentLoaded', () => {
    // Initialize quiz on first load
    setTimeout(initQuiz, 100);

    // Initialize works list
    setTimeout(loadWorks, 100);
});

// ==================== STUDENT WORKS SYSTEM ====================
let studentWorks = [];

// Load works from localStorage
function loadWorks() {
    const saved = localStorage.getItem('studentWorks');
    if (saved) {
        studentWorks = JSON.parse(saved);
    }
    renderWorks();
}

// Save works to localStorage
function saveWorks() {
    localStorage.setItem('studentWorks', JSON.stringify(studentWorks));
}

// Add new work
function addWork() {
    const titleInput = document.getElementById('work-title');
    const unitSelect = document.getElementById('work-unit');
    const fileInput = document.getElementById('work-file');
    const linkInput = document.getElementById('work-link');

    const title = titleInput.value.trim();
    const unit = unitSelect.value;
    let link = linkInput.value.trim();
    const file = fileInput.files[0];

    if (!title) {
        alert('กรุณาใส่ชื่อผลงาน');
        return;
    }

    // Auto-fix URL
    if (link && !link.startsWith('http://') && !link.startsWith('https://')) {
        link = 'https://' + link;
    }

    const unitNames = {
        '1': 'App Development',
        '2': 'Data Science',
        '3': 'IoT',
        '4': 'Cyber Safety'
    };

    const work = {
        id: Date.now(),
        title: title,
        unit: unit,
        unitName: unitNames[unit],
        link: link || null,
        fileName: file ? file.name : null,
        date: new Date().toLocaleDateString('th-TH')
    };

    studentWorks.push(work);
    saveWorks();
    renderWorks();

    // Clear form
    titleInput.value = '';
    linkInput.value = '';
    fileInput.value = '';

    // Play sound
    const clickSound = document.getElementById('ui-click-sound');
    if (clickSound) {
        clickSound.currentTime = 0;
        clickSound.play().catch(() => { });
    }

    alert('เพิ่มผลงานสำเร็จ! ✅');
}

// Delete work
function deleteWork(id) {
    if (confirm('ต้องการลบผลงานนี้หรือไม่?')) {
        studentWorks = studentWorks.filter(w => w.id !== id);
        saveWorks();
        renderWorks();
    }
}

// View work link
function viewWork(id) {
    const work = studentWorks.find(w => w.id === id);
    if (work && work.link) {
        window.open(work.link, '_blank');
    } else {
        alert('ไม่มีลิงก์สำหรับผลงานนี้');
    }
}

// Render works list
function renderWorks() {
    const container = document.getElementById('works-container');
    if (!container) return;

    if (studentWorks.length === 0) {
        container.innerHTML = `
            <div class="empty-works">
                <i class="fa-solid fa-folder-open"></i>
                <p>ยังไม่มีผลงาน - เพิ่มผลงานแรกของคุณ!</p>
            </div>
        `;
        return;
    }

    const unitIcons = {
        '1': 'fa-mobile-screen',
        '2': 'fa-chart-line',
        '3': 'fa-microchip',
        '4': 'fa-shield-halved'
    };

    let html = '';
    studentWorks.forEach(work => {
        html += `
            <div class="work-item">
                <div class="work-info">
                    <div class="work-icon unit-${work.unit}">
                        <i class="fa-solid ${unitIcons[work.unit]}"></i>
                    </div>
                    <div class="work-details">
                        <h4>${work.title}</h4>
                        <span>บทที่ ${work.unit}: ${work.unitName} • ${work.date}</span>
                    </div>
                </div>
                <div class="work-actions">
                    ${work.link ? `<button class="btn-view" onclick="viewWork(${work.id})" title="เปิดลิงก์"><i class="fa-solid fa-external-link"></i></button>` : ''}
                    <button class="btn-delete" onclick="deleteWork(${work.id})" title="ลบ"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==================== FALLING STARS EFFECT ====================
function createStar() {
    const starContainer = document.getElementById('star-field');
    if (!starContainer) return;

    const star = document.createElement('div');
    star.classList.add('star-flake');

    // Check Theme
    const isDarkMode = document.body.classList.contains('dark-mode');

    if (isDarkMode) {
        star.classList.add('dark-theme-star');
        // Random Neon Colors for Dark Mode
        const colors = ['#FFD700', '#007AFF', '#FF5F56', '#34C759', '#AF52DE', '#FF2D55'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        star.style.backgroundColor = randomColor;
        star.style.boxShadow = `0 0 15px ${randomColor}`;
        star.style.color = randomColor; // Used by currentcolor in CSS
    } else {
        star.classList.add('light-theme');
        star.style.backgroundColor = 'white';
        star.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.8)';
    }

    // Random Position
    star.style.left = Math.random() * 100 + 'vw';

    // Random Animation Duration (2s to 5s)
    const duration = Math.random() * 3 + 2;
    star.style.animationDuration = duration + 's';

    // Random Size (10px to 25px)
    const size = Math.random() * 15 + 10;
    star.style.width = size + 'px';
    star.style.height = size + 'px';

    // Random Delay
    star.style.animationDelay = Math.random() * 2 + 's';

    starContainer.appendChild(star);

    // Remove star after animation ends
    setTimeout(() => {
        star.remove();
    }, (duration + 2) * 1000);
}

// Generate stars periodically
let starInterval = setInterval(createStar, 300);

// Performance Optimization: Pause stars when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(starInterval);
    } else {
        createStar(); // Start one immediately
        starInterval = setInterval(createStar, 300);
    }
});
