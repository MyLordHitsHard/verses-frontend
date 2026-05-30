const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

// ─── Token storage ────────────────────────────────────────────────────────────
export const getToken = () => localStorage.getItem("verses_token");
export const setToken = (t) => localStorage.setItem("verses_token", t);
export const clearToken = () => localStorage.removeItem("verses_token");

function authHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader(), ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authGoogle = (idToken) =>
  request("/api/auth/google", { method: "POST", body: JSON.stringify({ idToken }) });

export const authMe = () => request("/api/auth/me");

// ─── Poems (public) ───────────────────────────────────────────────────────────
export const fetchPoems = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/api/poems${qs ? `?${qs}` : ""}`);
};

export const fetchPoem = (id) => request(`/api/poems/${id}`);
export const fetchFeatured = () => request("/api/poems/featured");
export const fetchTags = () => request("/api/poems/tags");

export const toggleLike = (id) =>
  request(`/api/poems/${id}/like`, { method: "POST" });

export const checkLiked = (id) => request(`/api/poems/${id}/liked`);

// ─── Poems (admin) ────────────────────────────────────────────────────────────
export const adminFetchAll = () => request("/api/poems/admin/all");

export const createPoem = (data) =>
  request("/api/poems", { method: "POST", body: JSON.stringify(data) });

export const updatePoem = (id, data) =>
  request(`/api/poems/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deletePoem = (id) =>
  request(`/api/poems/${id}`, { method: "DELETE" });
