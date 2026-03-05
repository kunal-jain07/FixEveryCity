/**
 * FixEveryCity — Supabase Client Configuration
 * ================================================
 * This file initializes the Supabase client for use
 * across the entire frontend application.
 *
 * INSTRUCTIONS:
 * 1. Create a Supabase project at https://supabase.com
 * 2. Go to Project Settings > API
 * 3. Replace the placeholders below with your actual credentials
 *
 * TABLE SETUP (run these SQL statements in Supabase SQL Editor):
 * -------------------------------------------------
 *
 *   -- 1. MESSAGES TABLE (AI prompt/response history)
 *   CREATE TABLE messages (
 *       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *       user_prompt TEXT NOT NULL,
 *       ai_response TEXT NOT NULL,
 *       created_at TIMESTAMPTZ DEFAULT now()
 *   );
 *
 *   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Users can insert their own messages"
 *       ON messages FOR INSERT TO authenticated
 *       WITH CHECK (auth.uid() = user_id);
 *
 *   CREATE POLICY "Users can read their own messages"
 *       ON messages FOR SELECT TO authenticated
 *       USING (auth.uid() = user_id);
 *
 *   -- 2. ISSUES TABLE (geo-tagged city issue submissions)
 *   CREATE TABLE issues (
 *       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *       issue_text TEXT NOT NULL,
 *       latitude FLOAT NOT NULL,
 *       longitude FLOAT NOT NULL,
 *       created_at TIMESTAMPTZ DEFAULT now()
 *   );
 *
 *   ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
 *
 *   CREATE POLICY "Users can insert their own issues"
 *       ON issues FOR INSERT TO authenticated
 *       WITH CHECK (auth.uid() = user_id);
 *
 *   CREATE POLICY "Users can read their own issues"
 *       ON issues FOR SELECT TO authenticated
 *       USING (auth.uid() = user_id);
 *
 * -------------------------------------------------
 */

// ============================================================
// SUPABASE CREDENTIALS — Replace with your own
// ============================================================
const SUPABASE_URL = "https://hdbxsnsvonfjdztvmcer.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkYnhzbnN2b25mamR6dHZtY2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2ODE3NjcsImV4cCI6MjA4ODI1Nzc2N30.I8qXV4ODKzw5MI3Zs3XA7QTGWQMCW8mtTe7_KBR25LQ";

// ============================================================
// INITIALIZE SUPABASE CLIENT
// ============================================================
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Checks if Supabase credentials have been configured.
 * Validates that the URL looks like a real Supabase project URL
 * and the anon key is a real JWT (not a placeholder).
 *
 * This uses format validation so it works regardless of what
 * placeholder text was originally in the credential fields.
 */
function isSupabaseConfigured() {
    try {
        return (
            typeof SUPABASE_URL === "string" &&
            SUPABASE_URL.startsWith("https://") &&
            SUPABASE_URL.includes(".supabase.co") &&
            !SUPABASE_URL.includes("YOUR_") &&
            typeof SUPABASE_ANON_KEY === "string" &&
            SUPABASE_ANON_KEY.length > 30 &&
            !SUPABASE_ANON_KEY.includes("YOUR_")
        );
    } catch (e) {
        return false;
    }
}

// ============================================================
// DATABASE HELPER — Insert a message record (AI chat)
// ============================================================

/**
 * Saves a user prompt and AI response to the Supabase 'messages' table.
 *
 * @param {string} userPrompt  — The text the user submitted
 * @param {string} aiResponse  — The AI-generated analysis
 * @returns {Object} — { success: boolean, data?: Object, error?: string }
 */
async function saveMessage(userPrompt, aiResponse) {
    if (!isSupabaseConfigured()) {
        console.warn("[FixEveryCity] Supabase credentials not configured. Skipping DB save.");
        return { success: false, error: "Supabase is not configured. Please add your credentials." };
    }

    try {
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.warn("[FixEveryCity] No authenticated user found. Cannot save message.");
            return { success: false, error: "You must be logged in to save messages." };
        }

        const { data, error } = await supabaseClient
            .from("messages")
            .insert([
                {
                    user_id: user.id,
                    user_prompt: userPrompt,
                    ai_response: aiResponse
                }
            ])
            .select();

        if (error) {
            console.error("[FixEveryCity] DB insert error:", error.message);
            return { success: false, error: error.message };
        }

        console.log("[FixEveryCity] Message saved successfully:", data);
        return { success: true, data: data[0] };

    } catch (err) {
        console.error("[FixEveryCity] Unexpected error saving message:", err);
        return { success: false, error: "An unexpected error occurred while saving." };
    }
}

/**
 * Fetches all messages for the current user from the 'messages' table.
 *
 * @param {number} limit — Maximum number of messages to retrieve (default 50)
 * @returns {Object} — { success: boolean, data?: Array, error?: string }
 */
async function fetchUserMessages(limit = 50) {
    if (!isSupabaseConfigured()) {
        return { success: false, error: "Supabase is not configured." };
    }

    try {
        const { data, error } = await supabaseClient
            .from("messages")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };

    } catch (err) {
        return { success: false, error: "An unexpected error occurred while fetching messages." };
    }
}

// ============================================================
// DATABASE HELPER — Insert a geo-tagged issue
// ============================================================

/**
 * Submits a city issue with geographic coordinates to the 'issues' table.
 *
 * @param {string} issueText   — Description of the city issue
 * @param {number} latitude    — Latitude coordinate (-90 to 90)
 * @param {number} longitude   — Longitude coordinate (-180 to 180)
 * @returns {Object} — { success: boolean, data?: Object, error?: string }
 */
async function submitIssueToDb(issueText, latitude, longitude) {
    if (!isSupabaseConfigured()) {
        console.warn("[FixEveryCity] Supabase credentials not configured. Skipping issue submission.");
        return { success: false, error: "Supabase is not configured. Please add your credentials." };
    }

    try {
        // Get the currently authenticated user
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            console.warn("[FixEveryCity] No authenticated user found. Cannot submit issue.");
            return { success: false, error: "You must be logged in to submit issues." };
        }

        // Validate coordinates
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);

        if (isNaN(lat) || lat < -90 || lat > 90) {
            return { success: false, error: "Latitude must be a number between -90 and 90." };
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            return { success: false, error: "Longitude must be a number between -180 and 180." };
        }

        if (!issueText || issueText.trim().length === 0) {
            return { success: false, error: "Issue description cannot be empty." };
        }

        // Insert the record into the 'issues' table
        const { data, error } = await supabaseClient
            .from("issues")
            .insert([
                {
                    user_id: user.id,
                    issue_text: issueText.trim(),
                    latitude: lat,
                    longitude: lng
                }
            ])
            .select();

        if (error) {
            console.error("[FixEveryCity] Issue insert error:", error.message);
            return { success: false, error: error.message };
        }

        console.log("[FixEveryCity] Issue submitted successfully:", data);
        return { success: true, data: data[0] };

    } catch (err) {
        console.error("[FixEveryCity] Unexpected error submitting issue:", err);
        return { success: false, error: "An unexpected error occurred while submitting the issue." };
    }
}

/**
 * Fetches submitted issues for the current user from the 'issues' table.
 *
 * @param {number} limit — Maximum number of issues to retrieve (default 20)
 * @returns {Object} — { success: boolean, data?: Array, error?: string }
 */
async function fetchUserIssues(limit = 20) {
    if (!isSupabaseConfigured()) {
        return { success: false, error: "Supabase is not configured." };
    }

    try {
        const { data, error } = await supabaseClient
            .from("issues")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, data };

    } catch (err) {
        return { success: false, error: "An unexpected error occurred while fetching issues." };
    }
}
