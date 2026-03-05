/**
 * FixEveryCity — Authentication Module
 * =====================================
 * Handles user signup, login, logout,
 * session checking, and route protection.
 *
 * Uses Supabase Auth via the client defined
 * in supabaseClient.js (must be loaded first).
 */

// ============================================================
// SIGNUP — Create a new user account
// ============================================================

/**
 * Signs up a new user with email and password.
 *
 * @param {string} email    — User email address
 * @param {string} password — User password (min 6 characters)
 * @returns {Object} — { success: boolean, data?: Object, error?: string }
 */
async function signUpUser(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };

    } catch (err) {
        console.error("[FixEveryCity] Signup error:", err);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}

// ============================================================
// LOGIN — Authenticate existing user
// ============================================================

/**
 * Signs in a user with email and password.
 *
 * @param {string} email    — User email address
 * @param {string} password — User password
 * @returns {Object} — { success: boolean, data?: Object, error?: string }
 */
async function signInUser(email, password) {
    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };

    } catch (err) {
        console.error("[FixEveryCity] Login error:", err);
        return { success: false, error: "An unexpected error occurred. Please try again." };
    }
}

// ============================================================
// LOGOUT — End the current session
// ============================================================

/**
 * Signs out the current user and redirects to login page.
 */
async function signOutUser() {
    try {
        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("[FixEveryCity] Logout error:", error.message);
            showAuthToast("Logout failed. Please try again.", "error");
            return;
        }

        // Redirect to login page after successful logout
        window.location.href = "login.html";

    } catch (err) {
        console.error("[FixEveryCity] Logout error:", err);
        showAuthToast("An unexpected error occurred during logout.", "error");
    }
}

// ============================================================
// SESSION CHECK — Get current user
// ============================================================

/**
 * Retrieves the currently authenticated user.
 *
 * @returns {Object|null} — User object if authenticated, null otherwise
 */
async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();

        if (error || !user) {
            return null;
        }

        return user;

    } catch (err) {
        console.error("[FixEveryCity] Session check error:", err);
        return null;
    }
}

// ============================================================
// ROUTE PROTECTION — Redirect unauthenticated users
// ============================================================

/**
 * Protects a page by checking if a user is authenticated.
 * If not logged in, redirects to login.html.
 *
 * Call this at the top of any protected page's script.
 */
async function requireAuth() {
    // Skip auth check if Supabase is not configured
    if (!isSupabaseConfigured()) {
        console.warn("[FixEveryCity] Supabase not configured — auth check skipped.");
        return;
    }

    const user = await getCurrentUser();

    if (!user) {
        // Store the intended destination so we can redirect after login
        sessionStorage.setItem("fec_redirect", window.location.href);
        window.location.href = "login.html";
    }
}

/**
 * Redirects already logged-in users away from auth pages
 * (login/signup) to the dashboard.
 */
async function redirectIfLoggedIn() {
    // Skip if Supabase is not configured
    if (!isSupabaseConfigured()) {
        return;
    }

    const user = await getCurrentUser();

    if (user) {
        const redirect = sessionStorage.getItem("fec_redirect");
        sessionStorage.removeItem("fec_redirect");
        window.location.href = redirect || "dashboard.html";
    }
}

// ============================================================
// UI HELPERS — Toast notifications for auth feedback
// ============================================================

/**
 * Shows a toast notification with auth feedback.
 *
 * @param {string} message — The message to display
 * @param {string} type    — "success", "error", or "info"
 */
function showAuthToast(message, type = "info") {
    // Remove existing toast if any
    const existing = document.getElementById("authToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "authToast";
    toast.className = `auth-toast auth-toast-${type}`;

    // Choose icon based on type
    const icons = {
        success: "✅",
        error: "⚠️",
        info: "ℹ️"
    };

    toast.innerHTML = `
        <span class="auth-toast-icon">${icons[type] || icons.info}</span>
        <span class="auth-toast-msg">${message}</span>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add("auth-toast-visible");
    });

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
        toast.classList.remove("auth-toast-visible");
        setTimeout(() => toast.remove(), 350);
    }, 4000);
}

// ============================================================
// AUTH UI — Update navbar based on auth state
// ============================================================

/**
 * Updates the navbar CTA button to show login/logout
 * based on the current authentication state.
 */
async function updateAuthUI() {
    // Skip if Supabase is not configured
    if (!isSupabaseConfigured()) {
        return;
    }

    const user = await getCurrentUser();
    const navCta = document.querySelector(".nav-cta");

    if (!navCta) return;

    if (user) {
        // User is logged in — show user email + logout
        const email = user.email || "User";
        const shortEmail = email.split("@")[0];

        navCta.innerHTML = `
            <span class="nav-user-badge" title="${email}">
                <span class="nav-user-avatar">${shortEmail.charAt(0).toUpperCase()}</span>
                <span class="nav-user-name">${shortEmail}</span>
            </span>
            <button class="btn btn-outline btn-sm" id="navLogoutBtn" onclick="signOutUser()">Logout</button>
        `;
    } else {
        // User is not logged in — show login button
        navCta.innerHTML = `
            <a href="login.html" class="btn btn-primary" id="nav-login-btn">Login</a>
        `;
    }
}

// ============================================================
// FORM VALIDATION HELPER
// ============================================================

/**
 * Validates email format.
 *
 * @param {string} email — Email to validate
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates password strength.
 *
 * @param {string} password — Password to validate
 * @returns {Object} — { valid: boolean, message?: string }
 */
function validatePassword(password) {
    if (password.length < 6) {
        return { valid: false, message: "Password must be at least 6 characters long." };
    }
    return { valid: true };
}
