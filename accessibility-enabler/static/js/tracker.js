// Behavior Tracker injected into proxied pages
(function() {
    let metrics = {
        mouseMovements: [],
        clicks: { total: 0, interactive: 0 },
        scrollPositions: [],
        startTime: Date.now()
    };

    let lastMousePos = { x: -1, y: -1 };
    let lastMouseTime = Date.now();

    // Track mouse speed
    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseTime > 100) { // sample every 100ms
            if (lastMousePos.x !== -1) {
                const dx = e.clientX - lastMousePos.x;
                const dy = e.clientY - lastMousePos.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const speed = dist / (now - lastMouseTime) * 1000; // pixels per second
                metrics.mouseMovements.push(speed);
            }
            lastMousePos = { x: e.clientX, y: e.clientY };
            lastMouseTime = now;
        }
    });

    // Track clicks for accuracy
    document.addEventListener('click', (e) => {
        metrics.clicks.total++;
        // Check if the clicked element is typically interactive
        const target = e.target;
        const interactiveTags = ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'];
        if (interactiveTags.includes(target.tagName) || target.closest('a') || target.closest('button')) {
            metrics.clicks.interactive++;
        }
    });

    // Track scroll
    let lastScrollPos = window.scrollY;
    let lastScrollTime = Date.now();
    window.addEventListener('scroll', () => {
        const now = Date.now();
        if (now - lastScrollTime > 200) {
            const dy = Math.abs(window.scrollY - lastScrollPos);
            const speed = dy / (now - lastScrollTime) * 1000;
            metrics.scrollPositions.push(speed);
            lastScrollPos = window.scrollY;
            lastScrollTime = now;
        }
    });

    // Send telemetry periodically (every 5 seconds)
    setInterval(() => {
        const config = window.ACCESSIBILITY_ENABLER_CONFIG || {};
        
        let avgMouseSpeed = 0;
        if (metrics.mouseMovements.length > 0) {
            avgMouseSpeed = metrics.mouseMovements.reduce((a,b)=>a+b,0) / metrics.mouseMovements.length;
        }

        let avgScrollSpeed = 0;
        if (metrics.scrollPositions.length > 0) {
            avgScrollSpeed = metrics.scrollPositions.reduce((a,b)=>a+b,0) / metrics.scrollPositions.length;
        }

        let clickAccuracy = metrics.clicks.total > 0 ? (metrics.clicks.interactive / metrics.clicks.total) : 1.0;
        let timeOnPage = (Date.now() - metrics.startTime) / 1000; // seconds

        const payload = {
            session_id: config.sessionId,
            target_url: config.targetUrl,
            mouse_speed_avg: avgMouseSpeed,
            click_accuracy: clickAccuracy,
            scroll_speed_avg: avgScrollSpeed,
            time_on_page: timeOnPage
        };

        // Send to our backend (using absolute path to hit the proxy server)
        fetch('/api/telemetry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.error("Telemetry error", err));
        
        // Reset buffers to prevent infinite growth, keeping cumulative metrics like clicks/time
        metrics.mouseMovements = [];
        metrics.scrollPositions = [];
    }, 5000);
})();
