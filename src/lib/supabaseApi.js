const SESSION_KEY = "bidcraft:supabase-session";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "");
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(session) {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  const withExpiry = {
    ...session,
    expires_at:
      session.expires_at ||
      Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(withExpiry));
  return withExpiry;
}

function authHeaders(session) {
  const headers = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message =
      data?.msg ||
      data?.message ||
      data?.error_description ||
      data?.hint ||
      response.statusText;
    throw new Error(message);
  }
  return data;
}

async function fetchSupabase(path, options = {}) {
  const url = `${supabaseUrl}${path}`;
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(
      `Could not reach Supabase at ${supabaseUrl}. Check VITE_SUPABASE_URL, redeploy Vercel, and confirm the Supabase project is active.`,
    );
  }
}

export async function refreshSessionIfNeeded() {
  const session = getStoredSession();
  if (!session?.refresh_token) return session;
  const expiresAt = Number(session.expires_at || 0);
  if (expiresAt > Math.floor(Date.now() / 1000) + 90) return session;

  const response = await fetchSupabase("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  return storeSession(await parseResponse(response));
}

export async function signInWithPassword(email, password) {
  const response = await fetchSupabase("/auth/v1/token?grant_type=password", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return storeSession(await parseResponse(response));
}

export async function signUpWithPassword(email, password, fullName) {
  const response = await fetchSupabase("/auth/v1/signup", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      email,
      password,
      data: { full_name: fullName || email },
    }),
  });
  const data = await parseResponse(response);
  return data.session ? storeSession(data.session) : null;
}

export async function signOut() {
  const session = getStoredSession();
  if (session?.access_token) {
    await fetchSupabase("/auth/v1/logout", {
      method: "POST",
      headers: authHeaders(session),
    }).catch(() => {});
  }
  storeSession(null);
}

export async function supabaseRequest(path, options = {}) {
  const session = await refreshSessionIfNeeded();
  const headers = {
    ...authHeaders(session),
    ...(options.headers || {}),
  };
  const response = await fetchSupabase(path, {
    ...options,
    headers,
  });
  return parseResponse(response);
}

export function restPath(table, query = "") {
  return `/rest/v1/${table}${query ? `?${query}` : ""}`;
}

export async function rpc(name, body = {}) {
  return supabaseRequest(`/rest/v1/rpc/${name}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function selectRows(table, query) {
  return supabaseRequest(restPath(table, query), {
    method: "GET",
  });
}

export async function insertRows(table, rows) {
  return supabaseRequest(restPath(table), {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

export async function upsertRows(table, rows, onConflict = "id") {
  return supabaseRequest(restPath(table, `on_conflict=${onConflict}`), {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(rows),
  });
}

export async function updateRows(table, query, patch) {
  return supabaseRequest(restPath(table, query), {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
}

export async function deleteRows(table, query) {
  return supabaseRequest(restPath(table, query), {
    method: "DELETE",
  });
}
