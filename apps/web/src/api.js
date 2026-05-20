// Тонкий клиент к API. Все вызовы используют httpOnly cookie для auth — credentials: 'include'.
const cfg = (typeof window !== 'undefined' && window.__APP_CONFIG__) || {};
const BASE = cfg.apiBaseUrl || '/api';

class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Accept': 'application/json' }
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, opts);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.error) || `HTTP ${res.status}`;
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

export const api = {
  // ----- Auth -----
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  logout: () => request('POST', '/auth/logout'),
  me: () => request('GET', '/auth/me'),
  changePassword: (oldPassword, newPassword) =>
    request('POST', '/auth/change-password', { oldPassword, newPassword }),

  // ----- Incidents -----
  incidents: {
    list: () => request('GET', '/incidents'),
    create: (data) => request('POST', '/incidents', data),
    update: (id, data) => request('PATCH', `/incidents/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `/incidents/${encodeURIComponent(id)}`)
  },

  // ----- Risks -----
  risks: {
    list: () => request('GET', '/risks'),
    create: (data) => request('POST', '/risks', data),
    update: (id, data) => request('PATCH', `/risks/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `/risks/${encodeURIComponent(id)}`)
  },

  // ----- Risk Map -----
  riskmap: {
    list: () => request('GET', '/riskmap'),
    create: (data) => request('POST', '/riskmap', data),
    update: (id, data) => request('PATCH', `/riskmap/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `/riskmap/${encodeURIComponent(id)}`),
    import: (records, replace) => request('POST', '/riskmap/import', { records, replace })
  },

  // ----- Users -----
  users: {
    list: () => request('GET', '/users'),
    create: (data) => request('POST', '/users', data),
    update: (id, data) => request('PATCH', `/users/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `/users/${encodeURIComponent(id)}`),
    resetPassword: (id) => request('POST', `/users/${encodeURIComponent(id)}/reset-password`)
  },

  // ----- Roles -----
  roles: {
    list: () => request('GET', '/roles'),
    create: (data) => request('POST', '/roles', data),
    update: (id, data) => request('PATCH', `/roles/${encodeURIComponent(id)}`, data),
    delete: (id) => request('DELETE', `/roles/${encodeURIComponent(id)}`)
  },

  // ----- Settings (справочники) -----
  settings: {
    get: () => request('GET', '/settings'),
    save: (data) => request('PUT', '/settings', data)
  }
};

export { ApiError };
