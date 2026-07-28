// ---------------------------------------------------------------------------
// Storage adapter for The Case Board.
//
// By default the board persists to localStorage — zero setup required.
//
// If you want real backend persistence (synced across devices/browsers),
// create a free Supabase project and set these two env vars in a `.env` file
// at the project root:
//
//   VITE_SUPABASE_URL=https://xxxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=xxxxx
//
// Then run the SQL in `supabase.sql` (project root) once in the Supabase
// SQL editor to create the table. The app will automatically detect the
// env vars and switch from localStorage to Supabase — no code changes
// needed in CaseBoard.jsx.
// ---------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BOARD_ROW_ID = "default-board"; // single-board demo; make this per-user/per-board for multi-tenant use

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let supabaseClientPromise = null;
async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    );
  }
  return supabaseClientPromise;
}

// ---------------------------------------------------------------------------
// localStorage backend (default — no setup required)
// ---------------------------------------------------------------------------
const localAdapter = {
  async load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// Supabase backend (opt-in via env vars)
// ---------------------------------------------------------------------------
const supabaseAdapter = {
  async load(key) {
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase.from("case_boards").select("data").eq("id", BOARD_ROW_ID).single();
      if (error || !data) return null;
      return data.data;
    } catch {
      return null;
    }
  },
  async save(key, data) {
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from("case_boards")
        .upsert({ id: BOARD_ROW_ID, data, updated_at: new Date().toISOString() });
      return !error;
    } catch {
      return false;
    }
  },
};

export const storage = hasSupabase ? supabaseAdapter : localAdapter;
export const backendMode = hasSupabase ? "supabase" : "localStorage";
