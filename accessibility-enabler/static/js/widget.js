(function() {
    // Inject HTML structure for the widget
    const widgetHTML = `
        <div id="accessibility-widget-container">
            <div id="accessibility-panel">
                <div class="panel-header">Accessibility Controls</div>
                <div class="panel-content">
                    
                    <div class="control-group">
                        <div class="control-title">Display Modes</div>
                        <div class="btn-grid">
                            <button class="widget-btn" id="btn-dark-mode">Dark Mode</button>
                            <button class="widget-btn" id="btn-white-mode">White Mode</button>
                            <button class="widget-btn" id="btn-contrast">High Contrast</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <div class="control-title">Text & Zoom</div>
                        <div class="btn-grid">
                            <button class="widget-btn" id="btn-zoom-in">Zoom In (+)</button>
                            <button class="widget-btn" id="btn-zoom-out">Zoom Out (-)</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <div class="control-title">Color Blindness Filters</div>
                        <div class="btn-grid" style="grid-template-columns: 1fr;">
                            <button class="widget-btn" id="btn-protanopia">Protanopia (Red-Blind)</button>
                            <button class="widget-btn" id="btn-deuteranopia">Deuteranopia (Green-Blind)</button>
                            <button class="widget-btn" id="btn-tritanopia">Tritanopia (Blue-Blind)</button>
                        </div>
                    </div>

                    <div class="control-group">
                        <div class="control-title">Reading Assistance</div>
                        <button class="widget-btn" id="btn-narrator" style="width: 100%;">Enable Narrator (Click to Read)</button>
                    </div>

                    <div class="control-group">
                        <div class="control-title">Find Text</div>
                        <div class="find-container">
                            <input type="text" id="find-input" class="find-input" placeholder="Search...">
                            <button id="btn-find" class="find-btn">Find</button>
                        </div>
                    </div>
                    
                    <div class="control-group" id="google_translate_element_container">
                        <div class="control-title">Translate</div>
                        <div id="google_translate_element"></div>
                    </div>

                    <button class="widget-btn" id="btn-reset-all" style="width: 100%; margin-top: 10px; background: #fee2e2; color: #b91c1c; border-color: #f87171; font-weight: bold;">Reset All Settings</button>

                </div>
            </div>
            <button id="accessibility-toggle-btn" title="Accessibility Menu">♿</button>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // Elements
    const toggleBtn = document.getElementById('accessibility-toggle-btn');
    const panel = document.getElementById('accessibility-panel');
    const body = document.body;
    let currentZoom = 1.0;
    let narratorEnabled = false;

    // Toggle Panel
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('open');
    });

    // Helper to clear specific classes
    function clearClasses(prefixes) {
        prefixes.forEach(prefix => {
            body.classList.remove(prefix);
        });
    }

    // Telemetry Sender
    function sendOverrideTelemetry(feature, value) {
        const config = window.ACCESSIBILITY_ENABLER_CONFIG || {};
        const payload = {
            session_id: config.sessionId,
            target_url: config.targetUrl,
            manual_override: true,
            override_feature: feature,
            override_value: value
        };
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Telemetry error", err));
    }

    // Dark / White Mode
    document.getElementById('btn-dark-mode').addEventListener('click', function() {
        this.classList.toggle('active');
        document.getElementById('btn-white-mode').classList.remove('active');
        clearClasses(['override-white-mode']);
        body.classList.toggle('override-dark-mode');
        sendOverrideTelemetry('mode', body.classList.contains('override-dark-mode') ? 'dark' : 'none');
    });

    document.getElementById('btn-white-mode').addEventListener('click', function() {
        this.classList.toggle('active');
        document.getElementById('btn-dark-mode').classList.remove('active');
        clearClasses(['override-dark-mode']);
        body.classList.toggle('override-white-mode');
        sendOverrideTelemetry('mode', body.classList.contains('override-white-mode') ? 'white' : 'none');
    });

    // High Contrast
    document.getElementById('btn-contrast').addEventListener('click', function() {
        this.classList.toggle('active');
        body.classList.toggle('override-high-contrast');
        sendOverrideTelemetry('contrast', body.classList.contains('override-high-contrast'));
    });

    // Zoom
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
        currentZoom += 0.1;
        body.style.zoom = currentZoom;
        sendOverrideTelemetry('zoom', currentZoom);
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
        currentZoom = Math.max(0.5, currentZoom - 0.1);
        body.style.zoom = currentZoom;
        sendOverrideTelemetry('zoom', currentZoom);
    });

    // Color Blindness Filters
    const cbButtons = ['protanopia', 'deuteranopia', 'tritanopia'];
    cbButtons.forEach(type => {
        document.getElementById(`btn-${type}`).addEventListener('click', function() {
            // Remove others
            cbButtons.forEach(t => {
                if (t !== type) {
                    document.getElementById(`btn-${t}`).classList.remove('active');
                    body.classList.remove(`override-${t}`);
                }
            });
            this.classList.toggle('active');
            body.classList.toggle(`override-${type}`);
            sendOverrideTelemetry('color_blindness', body.classList.contains(`override-${type}`) ? type : 'none');
        });
    });

    // Find Text
    document.getElementById('btn-find').addEventListener('click', () => {
        const text = document.getElementById('find-input').value;
        if (text) {
            window.find(text);
        }
    });

    // Narrator (Text-to-Speech)
    document.getElementById('btn-narrator').addEventListener('click', function() {
        narratorEnabled = !narratorEnabled;
        this.classList.toggle('active');
        sendOverrideTelemetry('narrator', narratorEnabled);
        
        if (narratorEnabled) {
            body.classList.add('narrator-highlight');
        } else {
            body.classList.remove('narrator-highlight');
            window.speechSynthesis.cancel();
        }
    });

    // Detect language and read aloud
    document.addEventListener('click', (e) => {
        if (!narratorEnabled) return;
        
        // Prevent click if we are clicking inside the widget
        if (e.target.closest('#accessibility-widget-container')) return;

        e.preventDefault();
        e.stopPropagation();

        const textToRead = e.target.innerText || e.target.textContent;
        if (textToRead && textToRead.trim().length > 0) {
            window.speechSynthesis.cancel(); // Stop current speech
            
            const utterance = new SpeechSynthesisUtterance(textToRead);
            
            // Detect page language (useful if Google Translate modified it)
            const pageLang = document.documentElement.lang || 'en';
            
            // Try to find a voice that matches the language
            const voices = window.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => v.lang.startsWith(pageLang));
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            utterance.lang = pageLang;
            
            window.speechSynthesis.speak(utterance);
        }
    }, true);

    // Reset All Settings
    document.getElementById('btn-reset-all').addEventListener('click', () => {
        // Reset Zoom
        currentZoom = 1.0;
        body.style.zoom = currentZoom;
        
        // Remove all override classes
        body.className = body.className.replace(/\boverride-[^\s]+/g, '').trim();
        
        // Disable narrator
        if (narratorEnabled) {
            narratorEnabled = false;
            body.classList.remove('narrator-highlight');
            window.speechSynthesis.cancel();
        }

        // Remove active states from buttons
        document.querySelectorAll('.widget-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Send telemetry
        sendOverrideTelemetry('reset_all', true);
    });

    // Ensure voices are loaded for narrator
    window.speechSynthesis.onvoiceschanged = function() {
        window.speechSynthesis.getVoices();
    };
})();

// Google Translate callback
function googleTranslateElementInit() {
    new google.translate.TranslateElement({
        pageLanguage: 'en',
        layout: google.translate.TranslateElement.InlineLayout.SIMPLE
    }, 'google_translate_element');
}
