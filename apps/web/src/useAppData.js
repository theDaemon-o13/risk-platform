// Слой данных платформы: всё через API.
// Заменяет старый useStorage (localStorage), но сохраняет привычный shape return.
import { useState, useCallback, useEffect } from 'react';
import { api, ApiError } from './api.js';

const DEFAULT_SETTINGS = {
  incidentTypes: [], incidentCategories: [], severities: [], sessionTimeoutMinutes: 30
};

export function useAppData() {
  const [loaded, setLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);

  const [incidents, setIncidents] = useState([]);
  const [risks, setRisks] = useState([]);
  const [riskmap, setRiskmap] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // ===== первичная загрузка =====
  const bootstrapSession = useCallback(async () => {
    try {
      const { user, role } = await api.me();
      setCurrentUser(user);
      setCurrentRole(role);
      return user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setCurrentUser(null);
        setCurrentRole(null);
        return null;
      }
      throw e;
    }
  }, []);

  const loadEverything = useCallback(async (user) => {
    if (!user) return;
    // Тянем всё, что нужно для App. Параллельно.
    const safe = async (fn, fallback) => {
      try { return await fn(); } catch { return fallback; }
    };
    const [s, inc, rsk, rmp, usr, rls] = await Promise.all([
      safe(() => api.settings.get(),  { settings: DEFAULT_SETTINGS }),
      safe(() => api.incidents.list(), { items: [] }),
      safe(() => api.risks.list(),     { items: [] }),
      safe(() => api.riskmap.list(),   { items: [] }),
      safe(() => api.users.list(),     { items: [] }),
      safe(() => api.roles.list(),     { items: [] })
    ]);
    setSettings({ ...DEFAULT_SETTINGS, ...(s?.settings || {}) });
    setIncidents(inc.items || []);
    setRisks(rsk.items || []);
    setRiskmap(rmp.items || []);
    setUsers(usr.items || []);
    setRoles(rls.items || []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await bootstrapSession();
        if (cancelled) return;
        await loadEverything(user);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [bootstrapSession, loadEverything]);

  // ===== auth =====
  const login = useCallback(async (username, password) => {
    try {
      const { user } = await api.login(username, password);
      setCurrentUser(user);
      // Догружаем role и остальное
      const { role } = await api.me();
      setCurrentRole(role);
      await loadEverything(user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Ошибка авторизации' };
    }
  }, [loadEverything]);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setCurrentUser(null);
    setCurrentRole(null);
    setIncidents([]); setRisks([]); setRiskmap([]); setUsers([]); setRoles([]);
  }, []);

  const changeOwnPassword = useCallback(async (oldPassword, newPassword) => {
    try {
      await api.changePassword(oldPassword, newPassword);
      setCurrentUser((u) => u ? { ...u, mustChangePassword: false } : u);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Ошибка смены пароля' };
    }
  }, []);

  return {
    loaded, hasStorage: true,
    currentUser, currentRole, setCurrentUser, setCurrentRole,
    incidents, risks, riskmap, users, roles, settings,
    setIncidents, setRisks, setRiskmap, setUsers, setRoles, setSettings,
    login, logout, changeOwnPassword
  };
}
