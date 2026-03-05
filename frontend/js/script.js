/**
 * FixEveryCity — Main JavaScript
 * Handles: Navigation, Scroll Reveal, Stat Counters,
 *          AI Dashboard logic, Mock API responses
 *
 * Dependencies:
 *   - supabaseClient.js (loaded before this file)
 *   - auth.js (loaded before this file)
 */

// ============================================================
// NAVIGATION — Mobile toggle
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });

        // Close menu when a link is clicked
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('open'));
        });
    }

    // Navbar scroll shadow enhancement
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 10
                ? '0 2px 20px rgba(79,110,247,.15)'
                : '';
        });
    }

    // Initialize all modules
    initScrollReveal();
    initStatCounters();
    initPageFade();

    // Update navbar auth UI (show login/logout based on session)
    if (typeof updateAuthUI === 'function') {
        updateAuthUI();
    }
});

// ============================================================
// SCROLL REVEAL
// ============================================================
function initScrollReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger children inside grid parents
                const delay = entry.target.closest('.features-grid, .steps-grid, .team-grid, .values-grid, .metrics-grid, .features-detail-grid')
                    ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 80
                    : 0;

                setTimeout(() => entry.target.classList.add('revealed'), delay);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealEls.forEach(el => observer.observe(el));
}

// ============================================================
// ANIMATED STAT COUNTERS (Home page)
// ============================================================
function initStatCounters() {
    const statNums = document.querySelectorAll('.stat-num[data-count]');
    if (!statNums.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCount(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statNums.forEach(el => observer.observe(el));
}

function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = target > 1000 ? '+' : (el.dataset.suffix || '');
    const duration = 2000; // ms
    const steps = 60;
    const stepVal = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        current = Math.min(Math.round(stepVal * step), target);
        el.textContent = current >= 1000
            ? (current / 1000).toFixed(1).replace('.0', '') + 'K+'
            : current + suffix;

        if (step >= steps) clearInterval(timer);
    }, duration / steps);
}

// ============================================================
// HERO QUICK ASK — links to dashboard with query prefilled
// ============================================================
function heroQuickAsk() {
    const input = document.getElementById('heroInput');
    if (!input) return;
    const query = input.value.trim();
    if (!query) {
        input.focus();
        input.style.borderColor = 'var(--primary)';
        setTimeout(() => input.style.borderColor = '', 1500);
        return;
    }
    // Store in session and redirect to dashboard
    sessionStorage.setItem('fec_prefill', query);
    window.location.href = 'dashboard.html';
}

// Allow Enter key in hero input
document.addEventListener('DOMContentLoaded', () => {
    const heroInput = document.getElementById('heroInput');
    if (heroInput) {
        heroInput.addEventListener('keydown', e => {
            if (e.key === 'Enter') heroQuickAsk();
        });
    }
});

// ============================================================
// PAGE FADE TRANSITION
// ============================================================
function initPageFade() {
    // Intercept internal link clicks for smooth transition
    document.querySelectorAll('a[href$=".html"]').forEach(link => {
        if (link.hostname !== window.location.hostname) return;
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            e.preventDefault();
            document.body.style.opacity = '0';
            document.body.style.transition = 'opacity .3s ease';
            setTimeout(() => { window.location.href = href; }, 300);
        });
    });
}

// ============================================================
// DASHBOARD — Core AI Logic
// ============================================================

/** Session state */
let queryCount = 0;
let totalTime = 0;
let historyItems = [];
let lastResponse = '';

/** Update character counter */
function updateCharCount() {
    const input = document.getElementById('promptInput');
    const counter = document.getElementById('charCount');
    if (!input || !counter) return;
    const len = input.value.length;
    counter.textContent = `${len} / 2000 characters`;
    counter.style.color = len > 1800 ? '#ef4444' : 'var(--text-muted)';

    // Update simulated token usage
    const pct = Math.min(Math.round((len / 2000) * 100), 100);
    const fill = document.getElementById('tokenFill');
    const pctEl = document.getElementById('tokenPct');
    if (fill) fill.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
}

/** Fill prompt from chip */
function fillChip(text) {
    const input = document.getElementById('promptInput');
    if (!input) return;
    input.value = text;
    updateCharCount();
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/** Clear prompt */
function clearPrompt() {
    const input = document.getElementById('promptInput');
    const box = document.getElementById('responseBox');
    const ph = document.getElementById('responsePlaceholder');
    const acts = document.getElementById('responseActions');
    if (!input) return;

    input.value = '';
    updateCharCount();
    lastResponse = '';

    if (box) {
        box.innerHTML = '';
        box.classList.remove('has-response');
        if (ph) { ph.style.display = 'flex'; box.appendChild(ph); }
    }
    if (acts) acts.style.display = 'none';

    // Clear DB save status
    const dbStatus = document.getElementById('dbSaveStatus');
    if (dbStatus) dbStatus.innerHTML = '';

    input.focus();
}

/** Main: generate AI response (default — can be overridden by dashboard page) */
async function generateResponse() {
    const input = document.getElementById('promptInput');
    const btn = document.getElementById('generateBtn');
    const loader = document.getElementById('aiLoader');
    const box = document.getElementById('responseBox');
    const ph = document.getElementById('responsePlaceholder');
    const acts = document.getElementById('responseActions');
    const statusBadge = document.getElementById('responseStatus');

    if (!input) return;
    const prompt = input.value.trim();
    if (!prompt) {
        input.focus();
        shakeElement(input);
        return;
    }

    // --- UI: Loading state ---
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyzing…'; }
    if (loader) { loader.classList.add('active'); }
    if (box) { box.innerHTML = ''; box.classList.remove('has-response'); }
    if (ph) { ph.style.display = 'none'; }
    if (acts) { acts.style.display = 'none'; }
    if (statusBadge) statusBadge.style.display = 'inline-flex';

    const startTime = Date.now();

    try {
        // --- Mock response (remove when real API is connected) ---
        await simulateDelay(1800 + Math.random() * 1200);
        const aiText = generateMockResponse(prompt);

        // --- Display response ---
        lastResponse = aiText;
        if (box) {
            box.classList.add('has-response');
            const pre = document.createElement('div');
            pre.className = 'response-text';
            pre.textContent = aiText;
            box.appendChild(pre);
        }

        // Update stats
        queryCount++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        totalTime += parseFloat(elapsed);

        const qc = document.getElementById('queryCount');
        const avg = document.getElementById('avgTime');
        if (qc) qc.textContent = queryCount;
        if (avg) avg.textContent = (totalTime / queryCount).toFixed(1) + 's';

        // Add to history
        addToHistory(prompt);

        if (acts) acts.style.display = 'flex';

    } catch (_err) {
        if (box) {
            box.classList.add('has-response');
            const err = document.createElement('div');
            err.className = 'response-text';
            err.style.color = '#ef4444';
            err.textContent = '⚠️ Unable to connect to the AI service. Please check your connection or try again.';
            box.appendChild(err);
        }
    }

    // --- Reset UI ---
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Analyze with AI'; }
    if (loader) { loader.classList.remove('active'); }
    if (statusBadge) statusBadge.style.display = 'none';
}

/** Generate mock AI response based on prompt keywords */
function generateMockResponse(prompt) {
    const p = prompt.toLowerCase();

    let category = 'General Infrastructure';
    let dept = 'Municipal Works Department';
    let priority = 'Medium';
    let eta = '5–7 business days';
    let tips = [];

    // Classify
    if (p.includes('pothole') || p.includes('road') || p.includes('street')) {
        category = 'Road & Pavement Damage';
        dept = 'Roads & Infrastructure Department';
        priority = 'High';
        eta = '3–5 business days';
        tips = [
            'Photograph the pothole with a scale reference (e.g., a coin).',
            'Note if the damage is worsening after rain.',
        ];
    } else if (p.includes('light') || p.includes('streetlight') || p.includes('lamp')) {
        category = 'Public Lighting Failure';
        dept = 'Electrical & Utilities Department';
        priority = 'Medium';
        eta = '2–4 business days';
        tips = [
            'Record the pole ID number if visible.',
            'Note whether the light flickers or is completely off.',
        ];
    } else if (p.includes('garbage') || p.includes('waste') || p.includes('trash') || p.includes('dump')) {
        category = 'Waste Management Issue';
        dept = 'Sanitation & Waste Department';
        priority = p.includes('illegal') ? 'High' : 'Medium';
        eta = '1–3 business days';
        tips = [
            'Record the exact address or GPS coordinates.',
            'Estimate the volume of waste (bags, bins, truckload).',
        ];
    } else if (p.includes('water') || p.includes('sewage') || p.includes('drain') || p.includes('flood')) {
        category = 'Water & Drainage Issue';
        dept = 'Water & Sewerage Board';
        priority = 'High';
        eta = '24–48 hours (emergency response)';
        tips = [
            'Do not attempt to unblock drains yourself.',
            'Keep children and pets away from the affected area.',
        ];
    } else if (p.includes('park') || p.includes('bench') || p.includes('swing') || p.includes('playground')) {
        category = 'Parks & Recreation Damage';
        dept = 'Parks & Leisure Department';
        priority = 'Low';
        eta = '7–10 business days';
        tips = [
            'Mark hazardous equipment with temporary barriers if possible.',
            'Check if the park has a dedicated maintenance contact.',
        ];
    }

    const severityScore = priority === 'High' ? '8/10' : priority === 'Medium' ? '5/10' : '3/10';
    const ticketId = 'FEC-' + Date.now().toString().slice(-6);

    return `📋 ISSUE ANALYSIS REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆔 Ticket ID:       ${ticketId}
📁 Category:        ${category}
⚡ Priority:        ${priority}
📊 Severity Score:  ${severityScore}
🏢 Assigned Dept:   ${dept}
⏱️ Estimated ETA:   ${eta}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your report has been analyzed and classified as a ${category.toLowerCase()} issue. Based on similar past cases in our database, this type of issue typically requires ${eta} to resolve and has been routed to the ${dept}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ RECOMMENDED NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Submit this report officially to generate a tracking number.
2. Take clear photographs of the issue from multiple angles.
3. Note the exact location using GPS or a nearby address.
${tips.map((t, i) => `${i + 4}. ${t}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 AI INSIGHT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Our AI has matched this issue with 23 similar past reports in this category. The ${dept} has a 94% resolution rate for ${category.toLowerCase()} within the estimated timeframe.

You will receive a status update via notification once the issue is assigned to a field team.`;
}

/** Add query to history list */
function addToHistory(prompt) {
    const section = document.getElementById('historySection');
    const list = document.getElementById('historyList');
    if (!section || !list) return;

    historyItems.unshift(prompt);
    if (historyItems.length > 5) historyItems.pop();

    list.innerHTML = '';
    historyItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.innerHTML = `<span class="hist-icon">💬</span><span>${item.length > 55 ? item.slice(0, 55) + '…' : item}</span>`;
        el.onclick = () => fillChip(item);
        list.appendChild(el);
    });

    section.style.display = 'block';
}

/** Copy response to clipboard */
async function copyResponse() {
    if (!lastResponse) return;
    try {
        await navigator.clipboard.writeText(lastResponse);
        const btn = document.querySelector('.action-btn');
        if (btn) {
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = '📋 Copy'; }, 2000);
        }
    } catch (_) {
        alert('Copy failed. Please select and copy manually.');
    }
}

/** Simulate issue submission */
function submitIssue() {
    const input = document.getElementById('promptInput');
    if (!input || !input.value.trim()) return;

    const ticketId = 'FEC-' + Date.now().toString().slice(-6);
    const confirmed = confirm(`✅ Submit this issue to the city portal?\n\nTicket ID: ${ticketId}\n\nClick OK to confirm submission.`);

    if (confirmed) {
        alert(`🎉 Issue Submitted Successfully!\n\nTicket: ${ticketId}\nYou'll receive updates at your registered contact.\n\nThank you for making your city better!`);
    }
}

/** Shake animation for empty input */
function shakeElement(el) {
    el.style.animation = 'none';
    el.style.borderColor = '#ef4444';
    el.style.boxShadow = '0 0 0 4px rgba(239,68,68,.15)';

    let pos = 0;
    const shakeTimer = setInterval(() => {
        el.style.transform = `translateX(${Math.sin(pos) * 8}px)`;
        pos += 1;
        if (pos >= 10) {
            clearInterval(shakeTimer);
            el.style.transform = '';
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }
    }, 30);

    el.placeholder = '⚠️ Please describe the city issue first…';
    setTimeout(() => { el.placeholder = 'e.g. Broken streetlight on Oak Avenue near the school…'; }, 3000);
}

/** Simulate async delay */
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// PREFILL DASHBOARD FROM HERO INPUT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    const prefill = sessionStorage.getItem('fec_prefill');
    if (prefill) {
        const input = document.getElementById('promptInput');
        if (input) {
            input.value = prefill;
            updateCharCount();
            sessionStorage.removeItem('fec_prefill');
            // Auto-generate after a small delay for UX
            setTimeout(() => generateResponse(), 600);
        }
    }
});
