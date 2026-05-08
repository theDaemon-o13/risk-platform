import React, { useState, useEffect, useMemo, useRef, createContext, useContext, useCallback } from 'react';
import {
  AlertTriangle, ShieldAlert, Activity, Plus, Search, X, Edit2, Trash2,
  Link2, Database, TrendingUp, AlertCircle, Shield, LayoutGrid,
  AlertOctagon, Zap, Settings as SettingsIcon, Save, RefreshCw,
  Users, Lock, LogOut, Eye, EyeOff, Copy, Check, KeyRound, UserPlus,
  ShieldCheck, Cpu, Crown
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid
} from 'recharts';

// ============= COLOR PALETTE =============
const COLOR_PALETTE = {
  zinc:    { bg: 'bg-zinc-500/10',    text: 'text-zinc-300',    border: 'border-zinc-500/30',    dot: 'bg-zinc-400' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
  rose:    { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30',    dot: 'bg-rose-400' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/30',     dot: 'bg-sky-400' },
  orange:  { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/30',  dot: 'bg-orange-400' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/30',  dot: 'bg-violet-400' },
  teal:    { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/30',    dot: 'bg-teal-400' }
};

const PALETTE_HEX = {
  zinc: '#a1a1aa', amber: '#fbbf24', rose: '#f43f5e', emerald: '#10b981',
  sky: '#38bdf8', orange: '#fb923c', violet: '#a78bfa', teal: '#2dd4bf'
};

const BADGE_COLOR_NAMES = Object.keys(COLOR_PALETTE);

// ============= PERMISSIONS MODEL =============
// Resources × Actions matrix used for RBAC.
const PERMISSION_RESOURCES = [
  { id: 'incidents', label: 'Инциденты' },
  { id: 'risks',     label: 'Риски' },
  { id: 'users',     label: 'Пользователи' },
  { id: 'roles',     label: 'Роли' },
  { id: 'settings',  label: 'Справочники' }
];
const PERMISSION_ACTIONS = [
  { id: 'view',   label: 'Просмотр' },
  { id: 'create', label: 'Создание' },
  { id: 'edit',   label: 'Редактирование' },
  { id: 'delete', label: 'Удаление' }
];
const ALL_PERMISSIONS = PERMISSION_RESOURCES.flatMap((r) =>
  PERMISSION_ACTIONS.map((a) => `${r.id}.${a.id}`)
);
const buildPermissionsMap = (granted) => {
  const m = {};
  ALL_PERMISSIONS.forEach((p) => { m[p] = granted.includes(p); });
  return m;
};
const allTrue = () => buildPermissionsMap(ALL_PERMISSIONS);
const allFalse = () => buildPermissionsMap([]);

// ============= DEFAULT SETTINGS =============
const DEFAULT_SETTINGS = {
  incidentTypes: [
    { id: 'type-it', name: 'ИТ', color: 'sky' },
    { id: 'type-is', name: 'ИБ', color: 'amber' }
  ],
  incidentCategories: [
    { id: 'cat-it-1', typeId: 'type-it', name: 'Сбой оборудования' },
    { id: 'cat-it-2', typeId: 'type-it', name: 'Сбой ПО' },
    { id: 'cat-it-3', typeId: 'type-it', name: 'Сбой сети' },
    { id: 'cat-it-4', typeId: 'type-it', name: 'Потеря данных' },
    { id: 'cat-it-5', typeId: 'type-it', name: 'Недоступность сервиса' },
    { id: 'cat-it-6', typeId: 'type-it', name: 'Прочее' },
    { id: 'cat-is-1', typeId: 'type-is', name: 'Несанкционированный доступ' },
    { id: 'cat-is-2', typeId: 'type-is', name: 'Утечка данных' },
    { id: 'cat-is-3', typeId: 'type-is', name: 'Вредоносное ПО' },
    { id: 'cat-is-4', typeId: 'type-is', name: 'Фишинг' },
    { id: 'cat-is-5', typeId: 'type-is', name: 'Социальная инженерия' },
    { id: 'cat-is-6', typeId: 'type-is', name: 'DDoS-атака' },
    { id: 'cat-is-7', typeId: 'type-is', name: 'Нарушение целостности' },
    { id: 'cat-is-8', typeId: 'type-is', name: 'Прочее' }
  ],
  severities: [
    { id: 'sev-1', name: 'Низкая',      color: 'emerald' },
    { id: 'sev-2', name: 'Средняя',     color: 'amber' },
    { id: 'sev-3', name: 'Высокая',     color: 'orange' },
    { id: 'sev-4', name: 'Критическая', color: 'rose' }
  ],
  // Auth-related platform settings
  sessionTimeoutMinutes: 30
};

// Default seed roles. System roles can't be deleted; their permissions are immutable too (for super admin).
const DEFAULT_ROLES = [
  {
    id: 'role-super-admin', name: 'Супер-администратор', description: 'Полный доступ ко всем разделам платформы',
    isSystem: true, permissions: allTrue(), color: 'rose'
  },
  {
    id: 'role-is-officer', name: 'Специалист ИБ', description: 'Управление инцидентами и рисками, просмотр пользователей',
    isSystem: false,
    permissions: buildPermissionsMap([
      'incidents.view', 'incidents.create', 'incidents.edit', 'incidents.delete',
      'risks.view', 'risks.create', 'risks.edit', 'risks.delete',
      'settings.view', 'settings.edit',
      'users.view', 'roles.view'
    ]), color: 'amber'
  },
  {
    id: 'role-it-specialist', name: 'ИТ-специалист',
    description: 'Регистрация и работа с ИТ-инцидентами, просмотр риск-регистра',
    isSystem: false,
    permissions: buildPermissionsMap([
      'incidents.view', 'incidents.create', 'incidents.edit',
      'risks.view'
    ]), color: 'sky'
  },
  {
    id: 'role-viewer', name: 'Аудитор / Наблюдатель', description: 'Только чтение всех данных',
    isSystem: false,
    permissions: buildPermissionsMap([
      'incidents.view', 'risks.view', 'users.view', 'roles.view', 'settings.view'
    ]), color: 'emerald'
  }
];

const INCIDENT_STATUS = ['Открыт', 'В работе', 'Закрыт'];
const RISK_CATEGORIES = [
  'ИТ — Инфраструктура', 'ИТ — Приложения', 'ИТ — Данные', 'ИТ — Сеть',
  'ИБ — Конфиденциальность', 'ИБ — Целостность', 'ИБ — Доступность', 'ИБ — Соответствие требованиям'
];
const RESPONSE_STRATEGIES = ['Принятие', 'Снижение', 'Передача', 'Избежание'];
const MONITORING_FREQ = ['Ежедневно', 'Еженедельно', 'Ежемесячно', 'Ежеквартально', 'Ежегодно'];
const RISK_STATUS = ['Не исполняется', 'В работе', 'Исполнено'];

const STORAGE_KEYS = {
  incidents: 'platform:incidents',
  risks: 'platform:risks',
  counters: 'platform:counters',
  settings: 'platform:settings',
  users: 'platform:users',
  roles: 'platform:roles',
  session: 'platform:session',
  bootstrap: 'platform:bootstrapped'
};

// ============= HELPERS =============
const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const formatMoney = (n) => !n ? '0' : new Intl.NumberFormat('ru-RU').format(n);
const todayISO = () => new Date().toISOString().split('T')[0];
const newId = () => Math.random().toString(36).slice(2, 11);

const severityColor = (name, severities) => {
  const item = (severities || []).find((s) => s.name === name);
  return COLOR_PALETTE[item?.color || 'zinc'];
};
const typeColor = (name, types) => {
  const item = (types || []).find((t) => t.name === name);
  return item?.color || 'zinc';
};
const categoriesForType = (typeName, settings) => {
  const t = settings.incidentTypes.find((x) => x.name === typeName);
  if (!t) return [];
  return settings.incidentCategories.filter((c) => c.typeId === t.id).map((c) => c.name);
};
const allTypeNames = (settings) => settings.incidentTypes.map((t) => t.name);
const allSeverityNames = (settings) => settings.severities.map((s) => s.name);

const incidentStatusColor = (st) => ({
  'Открыт':   { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30' },
  'В работе': { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/30' },
  'Закрыт':   { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' }
}[st] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' });

const riskStatusColor = (st) => ({
  'Исполнено':      { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  'В работе':       { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/30' },
  'Не исполняется': { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/30' }
}[st] || { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/30' });

const riskZone = (score) => {
  if (score >= 15) return { name: 'Критический', class: 'bg-rose-600',    textClass: 'text-rose-200',    border: 'border-rose-500' };
  if (score >= 10) return { name: 'Высокий',     class: 'bg-orange-600',  textClass: 'text-orange-200',  border: 'border-orange-500' };
  if (score >= 5)  return { name: 'Средний',     class: 'bg-amber-600',   textClass: 'text-amber-200',   border: 'border-amber-500' };
  return            { name: 'Низкий',            class: 'bg-emerald-700', textClass: 'text-emerald-200', border: 'border-emerald-600' };
};

// ============= CRYPTO (SHA-256 + salt) =============
const generateSalt = () => {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
};
const hashPassword = async (password, salt) => {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};
// Generate a memorable but strong-ish temporary password.
const generateTempPassword = () => {
  const adjectives = ['Quick', 'Bright', 'Sharp', 'Strong', 'Clear', 'Solid', 'Brave', 'Calm'];
  const nouns = ['Lion', 'Falcon', 'River', 'Mountain', 'Storm', 'Forest', 'Star', 'Tiger'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(100 + Math.random() * 900);
  const sym = '!@#$%&*'[Math.floor(Math.random() * 7)];
  return `${adj}${noun}${num}${sym}`;
};

// ============= BOOTSTRAP =============
// Creates initial users & roles on first run with FIXED default passwords.
// Both must be changed on first login.
const DEFAULT_TECH_PASSWORD = 'tech123!';
const DEFAULT_ADMIN_PASSWORD = 'admin123!';

const generateBootstrapAccounts = async () => {
  const techSalt = generateSalt();
  const adminSalt = generateSalt();
  const techHash = await hashPassword(DEFAULT_TECH_PASSWORD, techSalt);
  const adminHash = await hashPassword(DEFAULT_ADMIN_PASSWORD, adminSalt);

  const users = [
    {
      id: 'user-tech-default',
      username: 'tech',
      fullName: 'Техническая учётная запись',
      email: '',
      passwordHash: techHash,
      passwordSalt: techSalt,
      roleId: 'role-super-admin', // tech accounts effectively have super-admin permissions
      isTechnical: true, // hidden from normal user list
      isActive: true,
      mustChangePassword: true, // forced change on first login
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    },
    {
      id: 'user-super-admin',
      username: 'admin',
      fullName: 'Супер-администратор',
      email: '',
      passwordHash: adminHash,
      passwordSalt: adminSalt,
      roleId: 'role-super-admin',
      isTechnical: false,
      isActive: true,
      mustChangePassword: true, // forced change on first login
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    }
  ];

  return { users, roles: DEFAULT_ROLES, credentials: { tech: DEFAULT_TECH_PASSWORD, admin: DEFAULT_ADMIN_PASSWORD } };
};

// ============= STORAGE HOOK =============
const useStorage = () => {
  const [incidents, setIncidents] = useState([]);
  const [risks, setRisks] = useState([]);
  const [counters, setCounters] = useState({ incident: 0, risk: 0 });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [session, setSession] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [hasStorage, setHasStorage] = useState(true);
  const [bootstrapCreds, setBootstrapCreds] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const memBackup = { _data: {} };
        let store = window.storage;
        if (!store) {
          setHasStorage(false);
          // Drop in mem fallback so the rest of the code uniformly uses .get/.set/.delete
          store = {
            get: async (k) => memBackup._data[k] !== undefined ? { value: memBackup._data[k] } : null,
            set: async (k, v) => { memBackup._data[k] = v; },
            delete: async (k) => { delete memBackup._data[k]; }
          };
          window.__memStore = store;
        }

        const tryGet = async (key, fallback) => {
          try { const r = await store.get(key); return r ? JSON.parse(r.value) : fallback; }
          catch { return fallback; }
        };

        const inc = await tryGet(STORAGE_KEYS.incidents, []);
        const rsk = await tryGet(STORAGE_KEYS.risks, []);
        const cnt = await tryGet(STORAGE_KEYS.counters, { incident: 0, risk: 0 });
        const set = await tryGet(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
        let usr = await tryGet(STORAGE_KEYS.users, null);
        let rls = await tryGet(STORAGE_KEYS.roles, null);
        const ses = await tryGet(STORAGE_KEYS.session, null);
        const booted = await tryGet(STORAGE_KEYS.bootstrap, false);

        // First run: bootstrap users & roles
        if (!booted || !usr || !rls) {
          const { users: bUsers, roles: bRoles, credentials } = await generateBootstrapAccounts();
          usr = bUsers; rls = bRoles;
          await store.set(STORAGE_KEYS.users, JSON.stringify(bUsers));
          await store.set(STORAGE_KEYS.roles, JSON.stringify(bRoles));
          await store.set(STORAGE_KEYS.bootstrap, JSON.stringify(true));
          setBootstrapCreds(credentials);
        }

        setIncidents(inc);
        setRisks(rsk);
        setCounters(cnt);
        // Backfill new fields (e.g. sessionTimeoutMinutes) into existing settings
        setSettings({ ...DEFAULT_SETTINGS, ...set });
        setUsers(usr);
        setRoles(rls);
        setSession(ses);
      } catch (e) {
        console.error('Storage load error:', e);
        setHasStorage(false);
      } finally {
        setLoaded(true);
      }
    };
    load();
  }, []);

  const save = async (key, value) => {
    try {
      if (window.storage) await window.storage.set(key, JSON.stringify(value));
      else if (window.__memStore) await window.__memStore.set(key, JSON.stringify(value));
    }
    catch (e) { console.error('Storage save error:', e); }
  };
  const remove = async (key) => {
    try {
      if (window.storage) await window.storage.delete(key);
      else if (window.__memStore) await window.__memStore.delete(key);
    } catch (e) { console.error('Storage delete error:', e); }
  };

  const persistIncidents = async (next) => { setIncidents(next); await save(STORAGE_KEYS.incidents, next); };
  const persistRisks     = async (next) => { setRisks(next);     await save(STORAGE_KEYS.risks, next); };
  const persistCounters  = async (next) => { setCounters(next);  await save(STORAGE_KEYS.counters, next); };
  const persistSettings  = async (next) => { setSettings(next);  await save(STORAGE_KEYS.settings, next); };
  const persistUsers     = async (next) => { setUsers(next);     await save(STORAGE_KEYS.users, next); };
  const persistRoles     = async (next) => { setRoles(next);     await save(STORAGE_KEYS.roles, next); };
  const persistSession   = async (next) => {
    setSession(next);
    if (next) await save(STORAGE_KEYS.session, next);
    else await remove(STORAGE_KEYS.session);
  };

  const nextIncidentId = () => {
    const n = (counters.incident || 0) + 1;
    return { id: `INC-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`, n };
  };
  const nextRiskId = () => {
    const n = (counters.risk || 0) + 1;
    return { id: `RSK-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`, n };
  };

  return {
    incidents, risks, counters, settings, users, roles, session,
    loaded, hasStorage, bootstrapCreds, clearBootstrapCreds: () => setBootstrapCreds(null),
    persistIncidents, persistRisks, persistCounters, persistSettings,
    persistUsers, persistRoles, persistSession,
    nextIncidentId, nextRiskId
  };
};

// ============= AUTH CONTEXT =============
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ============= SETTINGS CONTEXT =============
const SettingsContext = createContext(DEFAULT_SETTINGS);
const useSettings = () => useContext(SettingsContext);

// ============= UI PRIMITIVES =============
const Badge = ({ children, color = 'zinc', className = '' }) => {
  const palette = COLOR_PALETTE[color] || COLOR_PALETTE.zinc;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${palette.bg} ${palette.text} ${palette.border} ${className}`}>
      {children}
    </span>
  );
};

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', type = 'button', disabled = false, title }) => {
  const variants = {
    primary:   'bg-amber-400 text-zinc-950 hover:bg-amber-300 disabled:bg-zinc-700 disabled:text-zinc-500',
    secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-700',
    ghost:     'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800',
    danger:    'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30',
    outline:   'bg-transparent text-zinc-300 hover:bg-zinc-800 border border-zinc-700'
  };
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3 py-1.5 text-sm', lg: 'px-4 py-2 text-sm' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center gap-1.5 font-medium rounded transition-colors ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-zinc-900/60 border border-zinc-800 rounded ${className}`}>{children}</div>
);

const Input = ({ label, value, onChange, type = 'text', placeholder, required = false, className = '', autoComplete, onKeyDown }) => (
  <div className={className}>
    {label && (
      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
        {label}{required && <span className="text-amber-400 ml-1">*</span>}
      </label>
    )}
    <input type={type} value={value || ''} placeholder={placeholder} autoComplete={autoComplete}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      onKeyDown={onKeyDown}
      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 text-sm rounded outline-none focus:border-amber-400/60 transition-colors" />
  </div>
);

const TextArea = ({ label, value, onChange, placeholder, rows = 3, required = false, className = '' }) => (
  <div className={className}>
    {label && (
      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
        {label}{required && <span className="text-amber-400 ml-1">*</span>}
      </label>
    )}
    <textarea value={value || ''} placeholder={placeholder} rows={rows}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 text-sm rounded outline-none focus:border-amber-400/60 transition-colors resize-y" />
  </div>
);

const Select = ({ label, value, onChange, options, required = false, className = '', placeholder = 'Выберите...' }) => (
  <div className={className}>
    {label && (
      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
        {label}{required && <span className="text-amber-400 ml-1">*</span>}
      </label>
    )}
    <select value={value || ''} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 text-sm rounded outline-none focus:border-amber-400/60 transition-colors appearance-none cursor-pointer"
      style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg width=\'12\' height=\'12\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M2 4l4 4 4-4\' stroke=\'%2371717a\' fill=\'none\' stroke-width=\'1.5\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', paddingRight: '2.25rem' }}>
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => {
        if (typeof opt === 'string') return <option key={opt} value={opt}>{opt}</option>;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  </div>
);

const Modal = ({ open, onClose, title, children, size = 'lg' }) => {
  if (!open) return null;
  const sizes = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full ${sizes[size]} max-h-[90vh] flex flex-col bg-zinc-900 border border-zinc-800 rounded shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="text-[15px] font-semibold text-zinc-100 tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 transition-colors"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
};

const ColorPicker = ({ value, onChange }) => (
  <div className="flex gap-1 items-center">
    {BADGE_COLOR_NAMES.map((c) => (
      <button key={c} type="button" onClick={() => onChange(c)} title={c}
        className={`w-5 h-5 rounded-full border-2 transition-all ${value === c ? 'border-zinc-100 scale-110' : 'border-zinc-700 hover:border-zinc-500'}`}
        style={{ background: PALETTE_HEX[c] }} />
    ))}
  </div>
);

const PasswordInput = ({ label, value, onChange, placeholder, required = false, autoComplete, onKeyDown }) => {
  const [show, setShow] = useState(false);
  return (
    <div>
      {label && (
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
          {label}{required && <span className="text-amber-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value || ''} placeholder={placeholder} autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-2 pr-9 text-sm rounded outline-none focus:border-amber-400/60 transition-colors" />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
};

const CopyableField = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
      const el = document.createElement('textarea');
      el.value = value; document.body.appendChild(el); el.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      finally { document.body.removeChild(el); }
    }
  };
  return (
    <div>
      {label && <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">{label}</div>}
      <div className="flex items-center gap-2 p-3 bg-zinc-950 border border-amber-500/40 rounded">
        <code className="flex-1 font-mono text-sm text-amber-300 select-all">{value}</code>
        <button onClick={handleCopy}
          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
            copied ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
          }`}>
          {copied ? <><Check size={12} /> Скопировано</> : <><Copy size={12} /> Копировать</>}
        </button>
      </div>
    </div>
  );
};

// ============= LOGIN PAGE =============
const LoginPage = ({ onLogin, bootstrapCreds, onDismissBootstrap }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (busy) return;
    if (!username || !password) { setError('Введите логин и пароль'); return; }
    setBusy(true); setError('');
    try {
      const result = await onLogin(username, password);
      if (!result.ok) setError(result.error);
    } catch (err) {
      console.error('Login error:', err);
      setError('Ошибка авторизации: ' + (err?.message || 'неизвестная ошибка'));
    } finally { setBusy(false); }
  };

  const onEnter = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6" style={{
      backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(251, 191, 36, 0.04), transparent 50%), radial-gradient(circle at 80% 100%, rgba(56, 189, 248, 0.03), transparent 50%)'
    }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-amber-400 flex items-center justify-center rounded-sm">
            <Shield size={18} strokeWidth={2.5} className="text-zinc-950" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-tight text-zinc-100 leading-none">RISK CONSOLE</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-1">ИТ / ИБ управление</div>
          </div>
        </div>

        {bootstrapCreds && (
          <Card className="p-4 mb-4 border-amber-500/30 bg-amber-500/5">
            <div className="flex items-start gap-2 mb-3">
              <KeyRound size={16} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold text-zinc-100">Учётные данные по умолчанию</div>
                <p className="text-xs text-zinc-400 mt-1">
                  Это первый запуск платформы. Войдите под одной из учётных записей —
                  система потребует сменить пароль при первом входе.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Техническая УЗ</div>
                <CopyableField value={`tech / ${bootstrapCreds.tech}`} />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Супер-администратор</div>
                <CopyableField value={`admin / ${bootstrapCreds.admin}`} />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onDismissBootstrap} className="mt-3 w-full justify-center">
              Скрыть подсказку
            </Button>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight mb-1">Вход в систему</h2>
          <p className="text-xs text-zinc-500 mb-5">Введите учётные данные для продолжения</p>
          <div className="space-y-4">
            <Input label="Логин" value={username} onChange={setUsername} placeholder="username" autoComplete="username" required onKeyDown={onEnter} />
            <PasswordInput label="Пароль" value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" required onKeyDown={onEnter} />
            {error && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded">
                {error}
              </div>
            )}
            <Button onClick={submit} variant="primary" disabled={busy} className="w-full justify-center" size="lg">
              {busy ? 'Проверка...' : 'Войти'}
            </Button>
          </div>
        </Card>

        <div className="text-center text-[11px] text-zinc-600 mt-6 font-mono">
          RISK CONSOLE · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};

// ============= FORCE PASSWORD CHANGE PAGE =============
const ForcePasswordChangePage = ({ user, onSubmit, onCancel }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError('');
    if (newPassword.length < 8) { setError('Новый пароль должен быть не короче 8 символов'); return; }
    if (newPassword === oldPassword) { setError('Новый пароль должен отличаться от текущего'); return; }
    if (newPassword !== confirm) { setError('Пароли не совпадают'); return; }
    setBusy(true);
    try {
      const r = await onSubmit(oldPassword, newPassword);
      if (!r.ok) setError(r.error);
    } catch (err) {
      console.error('Password change error:', err);
      setError('Ошибка смены пароля: ' + (err?.message || 'неизвестная ошибка'));
    } finally { setBusy(false); }
  };

  const onEnter = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6" style={{
      backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(251, 191, 36, 0.04), transparent 50%)'
    }}>
      <div className="w-full max-w-md">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <KeyRound size={16} className="text-amber-400" />
            <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Смена пароля</h2>
          </div>
          <p className="text-xs text-zinc-500 mb-5">
            Это ваш первый вход — необходимо задать постоянный пароль.<br />
            Учётная запись: <span className="text-zinc-300 font-mono">{user.username}</span>
          </p>
          <div className="space-y-4">
            <PasswordInput label="Временный пароль" value={oldPassword} onChange={setOldPassword} required autoComplete="current-password" onKeyDown={onEnter} />
            <PasswordInput label="Новый пароль" value={newPassword} onChange={setNewPassword} required autoComplete="new-password" onKeyDown={onEnter} />
            <PasswordInput label="Подтверждение нового пароля" value={confirm} onChange={setConfirm} required autoComplete="new-password" onKeyDown={onEnter} />
            <div className="text-[11px] text-zinc-500">
              Минимум 8 символов. Должен отличаться от временного.
            </div>
            {error && (
              <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded">
                {error}
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onCancel} className="flex-1 justify-center">Выйти</Button>
              <Button onClick={submit} variant="primary" disabled={busy} className="flex-1 justify-center">
                {busy ? '...' : 'Сохранить'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ============= TOP BAR =============
const TopBar = ({ tab, setTab }) => {
  const auth = useAuth();
  const can = auth.can;

  const allTabs = [
    { id: 'dashboard', label: 'Дашборд',      icon: LayoutGrid,    require: null },
    { id: 'incidents', label: 'Инциденты',    icon: AlertTriangle, require: 'incidents.view' },
    { id: 'risks',     label: 'Риск-регистр', icon: ShieldAlert,   require: 'risks.view' },
    { id: 'users',     label: 'Пользователи', icon: Users,         require: 'users.view' },
    { id: 'roles',     label: 'Роли',         icon: ShieldCheck,   require: 'roles.view' },
    { id: 'settings',  label: 'Справочники',  icon: SettingsIcon,  require: 'settings.view' }
  ];
  const tabs = allTabs.filter((t) => !t.require || can(t.require));
  const role = auth.currentRole;

  return (
    <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-6 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-400 flex items-center justify-center rounded-sm">
            <Shield size={16} strokeWidth={2.5} className="text-zinc-950" />
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight text-zinc-100 leading-none">RISK CONSOLE</div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">ИТ / ИБ управление</div>
          </div>
        </div>
        <nav className="flex items-center gap-1 flex-wrap">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                tab === id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900'
              }`}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded text-xs">
            {auth.currentUser.isTechnical ? <Cpu size={12} className="text-violet-400" /> :
             role?.id === 'role-super-admin' ? <Crown size={12} className="text-amber-400" /> :
             <Users size={12} className="text-zinc-500" />}
            <span className="text-zinc-300 font-medium">{auth.currentUser.fullName || auth.currentUser.username}</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-500">{role?.name || '—'}</span>
          </div>
          <button onClick={auth.logout} className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 rounded transition-colors" title="Выход">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============= DASHBOARD =============
const KPICard = ({ label, value, sublabel, icon: Icon, accent = 'zinc' }) => {
  const accents = { zinc: 'text-zinc-400', amber: 'text-amber-400', rose: 'text-rose-400', emerald: 'text-emerald-400', sky: 'text-sky-400', orange: 'text-orange-400' };
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
          <div className="mt-2 text-3xl font-semibold text-zinc-100 tracking-tight tabular-nums">{value}</div>
          {sublabel && <div className="mt-1 text-xs text-zinc-500">{sublabel}</div>}
        </div>
        <Icon size={18} className={accents[accent]} />
      </div>
    </Card>
  );
};

const RiskMatrix = ({ risks, onCellClick }) => {
  const cells = useMemo(() => {
    const grid = {};
    for (let p = 1; p <= 5; p++) for (let i = 1; i <= 5; i++) grid[`${p}-${i}`] = [];
    risks.forEach((r) => { const key = `${r.probability}-${r.influence}`; if (grid[key]) grid[key].push(r); });
    return grid;
  }, [risks]);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-zinc-100">Матрица рисков 5×5</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Вероятность × Влияние</p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-700 rounded-sm" /><span className="text-zinc-400">Низкий</span></span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-600 rounded-sm" /><span className="text-zinc-400">Средний</span></span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-orange-600 rounded-sm" /><span className="text-zinc-400">Высокий</span></span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-600 rounded-sm" /><span className="text-zinc-400">Крит.</span></span>
        </div>
      </div>
      <div className="flex">
        <div className="flex flex-col justify-between mr-2 py-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium [writing-mode:vertical-rl] rotate-180 self-center">Вероятность →</div>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-[2rem_repeat(5,1fr)] gap-1">
            {[5, 4, 3, 2, 1].map((p) => (
              <React.Fragment key={p}>
                <div className="flex items-center justify-center text-[11px] font-mono text-zinc-500">{p}</div>
                {[1, 2, 3, 4, 5].map((i) => {
                  const score = p * i; const zone = riskZone(score); const items = cells[`${p}-${i}`];
                  return (
                    <button key={i} onClick={() => items.length > 0 && onCellClick(items)}
                      className={`relative aspect-square flex items-center justify-center ${zone.class} rounded-sm hover:ring-2 hover:ring-zinc-100/50 transition-all ${items.length === 0 ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}>
                      <span className="text-[10px] font-mono text-zinc-950/50 absolute top-1 left-1.5">{score}</span>
                      {items.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 justify-center items-center px-1">
                          {items.slice(0, 4).map((r) => (
                            <span key={r.id} className="text-[10px] font-mono font-bold text-zinc-950 bg-white/30 px-1 py-0.5 rounded">
                              {r.id.split('-').slice(-1)[0]}
                            </span>
                          ))}
                          {items.length > 4 && <span className="text-[10px] font-mono font-bold text-zinc-950">+{items.length - 4}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
            <div></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-center text-[11px] font-mono text-zinc-500 pt-1">{i}</div>
            ))}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium text-center mt-2">Влияние →</div>
        </div>
      </div>
    </Card>
  );
};

const Dashboard = ({ incidents, risks, hasStorage, loadDemo, clearAll, onCellClick }) => {
  const settings = useSettings();
  const auth = useAuth();
  const canSeeIncidents = auth.can('incidents.view');
  const canSeeRisks = auth.can('risks.view');

  const stats = useMemo(() => {
    const open = incidents.filter((i) => i.status !== 'Закрыт').length;
    const highestSev = settings.severities[settings.severities.length - 1]?.name;
    const critical = incidents.filter((i) => i.severity === highestSev).length;
    const activeRisks = risks.filter((r) => r.status !== 'Исполнено').length;
    const criticalRisks = risks.filter((r) => r.probability * r.influence >= 15).length;
    const totalDamage = incidents.reduce((s, i) => s + (Number(i.damage) || 0), 0);
    const totalRiskValue = risks.reduce((s, r) => s + (Number(r.totalLoss) || 0), 0);
    return { open, critical, activeRisks, criticalRisks, totalDamage, totalRiskValue, highestSev };
  }, [incidents, risks, settings]);

  const COLORS_TYPE = useMemo(() => {
    const m = {};
    settings.incidentTypes.forEach((t) => { m[t.name] = PALETTE_HEX[t.color] || PALETTE_HEX.zinc; });
    return m;
  }, [settings.incidentTypes]);

  const COLORS_SEV = useMemo(() => {
    const m = {};
    settings.severities.forEach((s) => { m[s.name] = PALETTE_HEX[s.color] || PALETTE_HEX.zinc; });
    return m;
  }, [settings.severities]);

  const incidentsByType = useMemo(() => {
    const counts = {};
    settings.incidentTypes.forEach((t) => { counts[t.name] = 0; });
    incidents.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [incidents, settings.incidentTypes]);

  const incidentsBySeverity = useMemo(() => settings.severities.map((s) => ({
    name: s.name, value: incidents.filter((i) => i.severity === s.name).length
  })), [incidents, settings.severities]);

  const incidentsByStatus = useMemo(() => INCIDENT_STATUS.map((s) => ({
    name: s, value: incidents.filter((i) => i.status === s).length
  })), [incidents]);

  const risksByZone = useMemo(() => {
    const zones = { 'Низкий': 0, 'Средний': 0, 'Высокий': 0, 'Критический': 0 };
    risks.forEach((r) => { zones[riskZone(r.probability * r.influence).name]++; });
    return Object.entries(zones).map(([name, value]) => ({ name, value }));
  }, [risks]);

  const COLORS_ZONE = { 'Низкий': '#047857', 'Средний': '#d97706', 'Высокий': '#ea580c', 'Критический': '#e11d48' };
  const showEmpty = (canSeeIncidents ? incidents.length === 0 : true) && (canSeeRisks ? risks.length === 0 : true);
  const isAdmin = auth.can('settings.edit');

  return (
    <div className="space-y-5">
      {showEmpty && isAdmin && (
        <Card className="p-8 text-center">
          <Database size={32} className="mx-auto text-zinc-600 mb-3" />
          <h3 className="text-zinc-100 font-medium mb-1">База пуста</h3>
          <p className="text-sm text-zinc-500 mb-5 max-w-md mx-auto">
            Начните с регистрации первого инцидента или создайте риск-регистр.
            Можно загрузить демо-данные для быстрого ознакомления.
          </p>
          <Button variant="primary" onClick={loadDemo}><Zap size={14} /> Загрузить демо-данные</Button>
          {!hasStorage && <p className="text-[11px] text-amber-400 mt-4">⚠ Persistent storage недоступен — данные сохранятся только в этой сессии.</p>}
        </Card>
      )}

      {!showEmpty && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {canSeeIncidents && <>
              <KPICard label="Всего инцидентов" value={incidents.length} icon={AlertTriangle} accent="zinc" />
              <KPICard label="Открытых" value={stats.open} icon={AlertCircle} accent="rose" sublabel={`из ${incidents.length}`} />
              <KPICard label={stats.highestSev || 'Высш. уровень'} value={stats.critical} icon={AlertOctagon} accent="rose" />
            </>}
            {canSeeRisks && <>
              <KPICard label="Всего рисков" value={risks.length} icon={ShieldAlert} accent="zinc" />
              <KPICard label="Активных рисков" value={stats.activeRisks} icon={Activity} accent="amber" sublabel={`из ${risks.length}`} />
              <KPICard label="Высокая зона" value={stats.criticalRisks} icon={TrendingUp} accent="orange" sublabel="оценка ≥ 15" />
            </>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {canSeeIncidents && (
              <Card className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Фактический ущерб от инцидентов</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
                  {formatMoney(stats.totalDamage)} <span className="text-sm text-zinc-500 font-normal">TJS</span>
                </div>
              </Card>
            )}
            {canSeeRisks && (
              <Card className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Потенциальные потери (риск-регистр)</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-100 tabular-nums">
                  {formatMoney(stats.totalRiskValue)} <span className="text-sm text-zinc-500 font-normal">TJS</span>
                </div>
              </Card>
            )}
          </div>

          {canSeeRisks && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2"><RiskMatrix risks={risks} onCellClick={onCellClick} /></div>
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-zinc-100 mb-4">Распределение рисков по зонам</h3>
                {risks.length === 0 ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">Нет рисков</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={risksByZone} layout="vertical" margin={{ top: 5, right: 16, left: 60, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" fontSize={11} />
                      <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="value" radius={[0, 2, 2, 0]}>
                        {risksByZone.map((entry) => <Cell key={entry.name} fill={COLORS_ZONE[entry.name]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {canSeeIncidents && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-zinc-100 mb-3">Инциденты по типу</h3>
                {incidents.length === 0 ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">Нет данных</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={incidentsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {incidentsByType.map((entry) => <Cell key={entry.name} fill={COLORS_TYPE[entry.name] || '#71717a'} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
                  {incidentsByType.map((t) => (
                    <div key={t.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: COLORS_TYPE[t.name] || '#71717a' }} />
                      {t.name} <span className="text-zinc-100 font-mono">{t.value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-zinc-100 mb-3">Инциденты по серьёзности</h3>
                {incidents.length === 0 ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">Нет данных</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={incidentsBySeverity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={10} />
                      <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {incidentsBySeverity.map((entry) => <Cell key={entry.name} fill={COLORS_SEV[entry.name] || '#71717a'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="text-[14px] font-semibold text-zinc-100 mb-3">Инциденты по статусу</h3>
                {incidents.length === 0 ? (
                  <div className="text-zinc-500 text-sm py-8 text-center">Нет данных</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={incidentsByStatus} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 4" stroke="#27272a" />
                      <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                      <YAxis stroke="#71717a" fontSize={11} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12 }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="value" radius={[2, 2, 0, 0]} fill="#fbbf24" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </div>
          )}

          {auth.can('incidents.delete') && auth.can('risks.delete') && (
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={clearAll}><Trash2 size={12} /> Очистить всё</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============= INCIDENT FORM/VIEW/PAGE =============
const emptyIncident = (settings) => ({
  date: todayISO(),
  type: settings.incidentTypes[0]?.name || '',
  category: '',
  title: '',
  description: '',
  source: '',
  severity: settings.severities[Math.floor(settings.severities.length / 2)]?.name || '',
  status: 'Открыт',
  responsible: '',
  resolutionDate: '',
  damage: 0,
  notes: ''
});

const IncidentForm = ({ initial, onSave, onCancel }) => {
  const settings = useSettings();
  const [data, setData] = useState(initial || emptyIncident(settings));
  const update = (field, value) => setData((d) => ({ ...d, [field]: value }));

  const handleSave = () => {
    if (!data.title || !data.category || !data.type) {
      alert('Заполните обязательные поля: Тип, Категория, Заголовок');
      return;
    }
    onSave(data);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input label="Дата инцидента" type="date" value={data.date} onChange={(v) => update('date', v)} required />
        <Select label="Тип" value={data.type} onChange={(v) => { update('type', v); update('category', ''); }} options={allTypeNames(settings)} required />
        <Select label="Категория" value={data.category} onChange={(v) => update('category', v)} options={categoriesForType(data.type, settings)} required />
      </div>
      <Input label="Заголовок" value={data.title} onChange={(v) => update('title', v)} placeholder="Краткое описание инцидента" required />
      <TextArea label="Описание" value={data.description} onChange={(v) => update('description', v)} placeholder="Что именно произошло" rows={3} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Источник обнаружения" value={data.source} onChange={(v) => update('source', v)} placeholder="SIEM / Обращение / Мониторинг..." />
        <Input label="Ответственный" value={data.responsible} onChange={(v) => update('responsible', v)} placeholder="ФИО или подразделение" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Серьёзность" value={data.severity} onChange={(v) => update('severity', v)} options={allSeverityNames(settings)} required />
        <Select label="Статус" value={data.status} onChange={(v) => update('status', v)} options={INCIDENT_STATUS} required />
        <Input label="Дата закрытия" type="date" value={data.resolutionDate} onChange={(v) => update('resolutionDate', v)} />
      </div>
      <Input label="Ущерб (TJS)" type="number" value={data.damage} onChange={(v) => update('damage', v)} placeholder="0" />
      <TextArea label="Комментарии" value={data.notes} onChange={(v) => update('notes', v)} placeholder="Доп. информация, действия" rows={3} />
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="primary" onClick={handleSave}>{initial ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </div>
  );
};

const InfoRow = ({ label, children }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">{label}</div>
    <div className="text-sm text-zinc-100">{children || '—'}</div>
  </div>
);

const IncidentView = ({ incident, linkedRisks, onClose, onEdit, onDelete, canEdit, canDelete }) => {
  const settings = useSettings();
  const sev = severityColor(incident.severity, settings.severities);
  const st = incidentStatusColor(incident.status);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-amber-400">{incident.id}</span>
        <Badge color={typeColor(incident.type, settings.incidentTypes)}>{incident.type}</Badge>
        <Badge color="zinc">{incident.category}</Badge>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${sev.bg} ${sev.text} ${sev.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
          {incident.severity}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${st.bg} ${st.text} ${st.border}`}>{incident.status}</span>
      </div>
      <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">{incident.title}</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-950/60 border border-zinc-800 rounded">
        <InfoRow label="Дата">{formatDate(incident.date)}</InfoRow>
        <InfoRow label="Источник">{incident.source}</InfoRow>
        <InfoRow label="Ответственный">{incident.responsible}</InfoRow>
        <InfoRow label="Дата закрытия">{formatDate(incident.resolutionDate)}</InfoRow>
        <InfoRow label="Ущерб (TJS)">{formatMoney(incident.damage)}</InfoRow>
        <InfoRow label="Создан">{formatDateTime(incident.createdAt)}</InfoRow>
      </div>

      {incident.description && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Описание</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{incident.description}</div>
        </div>
      )}
      {incident.notes && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Комментарии</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{incident.notes}</div>
        </div>
      )}

      {linkedRisks.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2 flex items-center gap-1.5">
            <Link2 size={11} /> Связанные риски ({linkedRisks.length})
          </div>
          <div className="space-y-1.5">
            {linkedRisks.map((r) => {
              const score = r.probability * r.influence; const zone = riskZone(score);
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded">
                  <span className="font-mono text-xs text-amber-400">{r.id}</span>
                  <span className="flex-1 text-sm text-zinc-200 truncate">{r.riskEvent}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border rounded ${zone.border}/30 ${zone.textClass}`}>
                    {zone.name} · {score}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        {canDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={13} /> Удалить</Button>}
        {canEdit && <Button variant="secondary" onClick={onEdit}><Edit2 size={13} /> Редактировать</Button>}
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
      </div>
    </div>
  );
};

const IncidentsPage = ({ incidents, risks, onCreate, onUpdate, onDelete }) => {
  const settings = useSettings();
  const auth = useAuth();
  const canCreate = auth.can('incidents.create');
  const canEdit = auth.can('incidents.edit');
  const canDelete = auth.can('incidents.delete');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filterType && i.type !== filterType) return false;
      if (filterStatus && i.status !== filterStatus) return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q) ||
              (i.description || '').toLowerCase().includes(q) || (i.responsible || '').toLowerCase().includes(q))) return false;
      }
      return true;
    }).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [incidents, search, filterType, filterStatus, filterSeverity]);

  const linkedRisksFor = (id) => risks.filter((r) => (r.linkedIncidents || []).includes(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Инциденты</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Регистрация ИТ и ИБ-инцидентов</p>
        </div>
        {canCreate && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} /> Новый инцидент</Button>}
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: ID, заголовок, описание, ответственный..."
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-9 pr-3 py-1.5 text-sm rounded outline-none focus:border-amber-400/60" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все типы</option>
          {allTypeNames(settings).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все статусы</option>
          {INCIDENT_STATUS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Любая серьёзность</option>
          {allSeverityNames(settings).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterType || filterStatus || filterSeverity) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterType(''); setFilterStatus(''); setFilterSeverity(''); }}>
            <X size={12} /> Сбросить
          </Button>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <AlertTriangle size={28} className="mx-auto mb-2 text-zinc-700" />
            <div className="text-sm">{incidents.length === 0 ? 'Инцидентов ещё нет' : 'Ничего не найдено'}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/50 border-b border-zinc-800">
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-4 py-2.5 font-medium">Дата</th>
                  <th className="px-4 py-2.5 font-medium">Тип</th>
                  <th className="px-4 py-2.5 font-medium">Категория</th>
                  <th className="px-4 py-2.5 font-medium">Заголовок</th>
                  <th className="px-4 py-2.5 font-medium">Серьёзность</th>
                  <th className="px-4 py-2.5 font-medium">Статус</th>
                  <th className="px-4 py-2.5 font-medium">Связи</th>
                  <th className="px-4 py-2.5 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const sev = severityColor(i.severity, settings.severities);
                  const st = incidentStatusColor(i.status);
                  const links = linkedRisksFor(i.id);
                  return (
                    <tr key={i.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setViewing(i)}>
                      <td className="px-4 py-3 font-mono text-xs text-amber-400">{i.id}</td>
                      <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{formatDate(i.date)}</td>
                      <td className="px-4 py-3"><Badge color={typeColor(i.type, settings.incidentTypes)}>{i.type}</Badge></td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{i.category}</td>
                      <td className="px-4 py-3 text-zinc-100 max-w-md truncate">{i.title}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${sev.bg} ${sev.text} ${sev.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                          {i.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border rounded ${st.bg} ${st.text} ${st.border}`}>{i.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {links.length > 0 ? <span className="inline-flex items-center gap-1 text-amber-400"><Link2 size={11} /> {links.length}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && <button onClick={() => setEditing(i)} className="p-1 text-zinc-500 hover:text-zinc-100" title="Редактировать"><Edit2 size={13} /></button>}
                          {canDelete && <button onClick={() => { if (confirm(`Удалить инцидент ${i.id}?`)) onDelete(i.id); }} className="p-1 text-zinc-500 hover:text-rose-400" title="Удалить"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый инцидент">
        <IncidentForm onSave={(data) => { onCreate(data); setCreating(false); }} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Редактирование ${editing?.id || ''}`}>
        {editing && <IncidentForm initial={editing} onSave={(data) => { onUpdate(editing.id, data); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Инцидент ${viewing?.id || ''}`}>
        {viewing && (
          <IncidentView incident={viewing} linkedRisks={linkedRisksFor(viewing.id)}
            canEdit={canEdit} canDelete={canDelete}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setViewing(null); }}
            onDelete={() => { if (confirm(`Удалить инцидент ${viewing.id}?`)) { onDelete(viewing.id); setViewing(null); } }} />
        )}
      </Modal>
    </div>
  );
};

// ============= RISK FORM/VIEW/PAGE =============
const emptyRisk = () => ({
  process: '', category: '', riskEvent: '', causes: '', impact: '',
  probability: 3, influence: 3, businessLoss: 0, businessImpact: 0, totalLoss: 0,
  responseStrategy: 'Снижение', measures: '', responsible: '',
  monitoringFrequency: 'Ежемесячно', status: 'Не исполняется', comments: '', linkedIncidents: []
});

const ScaleSelect = ({ label, value, onChange, max = 5, required = false }) => (
  <div>
    <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
      {label}{required && <span className="text-amber-400 ml-1">*</span>}
    </label>
    <div className="flex gap-1">
      {Array.from({ length: max + 1 }, (_, i) => i).map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`flex-1 py-1.5 text-sm font-mono border rounded transition-colors ${
            value === n ? 'bg-amber-400 text-zinc-950 border-amber-400' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
          }`}>{n}</button>
      ))}
    </div>
  </div>
);

const RiskForm = ({ initial, onSave, onCancel, allIncidents }) => {
  const settings = useSettings();
  const [data, setData] = useState(initial || emptyRisk());
  const update = (field, value) => setData((d) => ({ ...d, [field]: value }));
  const score = (data.probability || 0) * (data.influence || 0);
  const zone = riskZone(score);

  const toggleIncident = (id) => {
    const linked = data.linkedIncidents || [];
    update('linkedIncidents', linked.includes(id) ? linked.filter((x) => x !== id) : [...linked, id]);
  };

  const handleSave = () => {
    if (!data.process || !data.category || !data.riskEvent) {
      alert('Заполните обязательные поля: Процесс, Категория, Событие риска');
      return;
    }
    onSave(data);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Процесс" value={data.process} onChange={(v) => update('process', v)} placeholder="Какой бизнес-процесс затрагивает риск" required />
        <Select label="Риск-категория" value={data.category} onChange={(v) => update('category', v)} options={RISK_CATEGORIES} required />
      </div>
      <TextArea label="Событие риска" value={data.riskEvent} onChange={(v) => update('riskEvent', v)} placeholder="Что именно может произойти" rows={2} required />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextArea label="Причины" value={data.causes} onChange={(v) => update('causes', v)} placeholder="Что может стать причиной" rows={3} />
        <TextArea label="Воздействие (эффект)" value={data.impact} onChange={(v) => update('impact', v)} placeholder="К чему приведёт реализация риска" rows={3} />
      </div>

      <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Оценка риска</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Итоговая оценка:</span>
            <span className={`px-2 py-0.5 text-sm font-mono font-bold rounded text-zinc-950 ${zone.class}`}>{score}</span>
            <span className="text-xs text-zinc-300">{zone.name}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScaleSelect label="Вероятность (0–5)" value={data.probability} onChange={(v) => update('probability', v)} required />
          <ScaleSelect label="Влияние (0–5)" value={data.influence} onChange={(v) => update('influence', v)} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScaleSelect label="Потери бизнеса (0–5)" value={data.businessLoss} onChange={(v) => update('businessLoss', v)} />
          <ScaleSelect label="Оценка влияния от Бизнеса (0–5)" value={data.businessImpact} onChange={(v) => update('businessImpact', v)} />
        </div>
        <Input label="Потери в суммарном выражении (TJS)" type="number" value={data.totalLoss} onChange={(v) => update('totalLoss', v)} placeholder="0" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select label="Стратегия реагирования" value={data.responseStrategy} onChange={(v) => update('responseStrategy', v)} options={RESPONSE_STRATEGIES} />
        <Select label="Периодичность мониторинга" value={data.monitoringFrequency} onChange={(v) => update('monitoringFrequency', v)} options={MONITORING_FREQ} />
      </div>
      <TextArea label="Принимаемые меры / действия" value={data.measures} onChange={(v) => update('measures', v)} rows={3} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Ответственное лицо" value={data.responsible} onChange={(v) => update('responsible', v)} />
        <Select label="Статус исполнения" value={data.status} onChange={(v) => update('status', v)} options={RISK_STATUS} />
      </div>
      <TextArea label="Комментарии ответственного лица" value={data.comments} onChange={(v) => update('comments', v)} rows={2} />

      <div>
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">
          Связанные инциденты <span className="text-zinc-600 normal-case tracking-normal">({(data.linkedIncidents || []).length} выбрано)</span>
        </label>
        {allIncidents.length === 0 ? (
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded text-zinc-500 text-sm text-center">
            Нет инцидентов
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto bg-zinc-950 border border-zinc-800 rounded divide-y divide-zinc-800">
            {allIncidents.map((i) => {
              const checked = (data.linkedIncidents || []).includes(i.id);
              return (
                <label key={i.id} className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-800/50 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => toggleIncident(i.id)} className="accent-amber-400" />
                  <span className="font-mono text-xs text-amber-400">{i.id}</span>
                  <Badge color={typeColor(i.type, settings.incidentTypes)}>{i.type}</Badge>
                  <span className="text-sm text-zinc-300 flex-1 truncate">{i.title}</span>
                  <span className="text-[11px] text-zinc-500 whitespace-nowrap">{formatDate(i.date)}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="primary" onClick={handleSave}>{initial ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </div>
  );
};

const RiskView = ({ risk, linkedIncidents, onClose, onEdit, onDelete, canEdit, canDelete }) => {
  const settings = useSettings();
  const score = risk.probability * risk.influence;
  const zone = riskZone(score);
  const st = riskStatusColor(risk.status);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-amber-400">{risk.id}</span>
        <Badge color={risk.category.startsWith('ИТ') ? 'sky' : 'amber'}>{risk.category}</Badge>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${st.bg} ${st.text} ${st.border}`}>{risk.status}</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded text-zinc-950 ${zone.class}`}>{zone.name} · {score}</span>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1">Процесс</div>
        <div className="text-base text-zinc-100 mb-3">{risk.process}</div>
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight leading-snug">{risk.riskEvent}</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-zinc-950/60 border border-zinc-800 rounded">
        <InfoRow label="Вероятность"><span className="font-mono text-amber-400">{risk.probability}</span> / 5</InfoRow>
        <InfoRow label="Влияние"><span className="font-mono text-amber-400">{risk.influence}</span> / 5</InfoRow>
        <InfoRow label="Потери бизнеса (оценка)"><span className="font-mono">{risk.businessLoss}</span> / 5</InfoRow>
        <InfoRow label="Влияние от Бизнеса"><span className="font-mono">{risk.businessImpact}</span> / 5</InfoRow>
        <InfoRow label="Стратегия реагирования">{risk.responseStrategy}</InfoRow>
        <InfoRow label="Мониторинг">{risk.monitoringFrequency}</InfoRow>
        <InfoRow label="Ответственный">{risk.responsible}</InfoRow>
        <InfoRow label="Потенциальные потери">{formatMoney(risk.totalLoss)} <span className="text-zinc-500 text-xs">TJS</span></InfoRow>
      </div>

      {risk.causes && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Причины</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{risk.causes}</div>
        </div>
      )}
      {risk.impact && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Воздействие (эффект)</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{risk.impact}</div>
        </div>
      )}
      {risk.measures && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Принимаемые меры</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{risk.measures}</div>
        </div>
      )}
      {risk.comments && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-1.5">Комментарии</div>
          <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{risk.comments}</div>
        </div>
      )}

      {linkedIncidents.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2 flex items-center gap-1.5">
            <Link2 size={11} /> Связанные инциденты ({linkedIncidents.length})
          </div>
          <div className="space-y-1.5">
            {linkedIncidents.map((i) => {
              const sev = severityColor(i.severity, settings.severities);
              return (
                <div key={i.id} className="flex items-center gap-3 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded">
                  <span className="font-mono text-xs text-amber-400">{i.id}</span>
                  <Badge color={typeColor(i.type, settings.incidentTypes)}>{i.type}</Badge>
                  <span className="flex-1 text-sm text-zinc-200 truncate">{i.title}</span>
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium border rounded ${sev.bg} ${sev.text} ${sev.border}`}>{i.severity}</span>
                  <span className="text-[11px] text-zinc-500 whitespace-nowrap">{formatDate(i.date)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        {canDelete && <Button variant="danger" onClick={onDelete}><Trash2 size={13} /> Удалить</Button>}
        {canEdit && <Button variant="secondary" onClick={onEdit}><Edit2 size={13} /> Редактировать</Button>}
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
      </div>
    </div>
  );
};

const RisksPage = ({ risks, incidents, onCreate, onUpdate, onDelete }) => {
  const auth = useAuth();
  const canCreate = auth.can('risks.create');
  const canEdit = auth.can('risks.edit');
  const canDelete = auth.can('risks.delete');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZone, setFilterZone] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterZone) {
        const score = r.probability * r.influence;
        if (riskZone(score).name !== filterZone) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!(r.id.toLowerCase().includes(q) || (r.process || '').toLowerCase().includes(q) ||
              (r.riskEvent || '').toLowerCase().includes(q) || (r.responsible || '').toLowerCase().includes(q))) return false;
      }
      return true;
    }).sort((a, b) => (b.probability * b.influence) - (a.probability * a.influence));
  }, [risks, search, filterCategory, filterStatus, filterZone]);

  const linkedIncidentsFor = (risk) => (risk.linkedIncidents || []).map((id) => incidents.find((i) => i.id === id)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Риск-регистр</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Управление ИТ и ИБ-рисками со связкой к инцидентам</p>
        </div>
        {canCreate && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} /> Новый риск</Button>}
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-9 pr-3 py-1.5 text-sm rounded outline-none focus:border-amber-400/60" />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все категории</option>
          {RISK_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все статусы</option>
          {RISK_STATUS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все зоны</option>
          <option value="Низкий">Низкий</option>
          <option value="Средний">Средний</option>
          <option value="Высокий">Высокий</option>
          <option value="Критический">Критический</option>
        </select>
        {(search || filterCategory || filterStatus || filterZone) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterCategory(''); setFilterStatus(''); setFilterZone(''); }}>
            <X size={12} /> Сбросить
          </Button>
        )}
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <ShieldAlert size={28} className="mx-auto mb-2 text-zinc-700" />
            <div className="text-sm">{risks.length === 0 ? 'Рисков ещё нет' : 'Ничего не найдено'}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/50 border-b border-zinc-800">
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  <th className="px-4 py-2.5 font-medium">ID</th>
                  <th className="px-4 py-2.5 font-medium">Категория</th>
                  <th className="px-4 py-2.5 font-medium">Процесс</th>
                  <th className="px-4 py-2.5 font-medium">Событие риска</th>
                  <th className="px-4 py-2.5 font-medium text-center">В</th>
                  <th className="px-4 py-2.5 font-medium text-center">Вл</th>
                  <th className="px-4 py-2.5 font-medium text-center">Оценка</th>
                  <th className="px-4 py-2.5 font-medium">Стратегия</th>
                  <th className="px-4 py-2.5 font-medium">Статус</th>
                  <th className="px-4 py-2.5 font-medium">Связи</th>
                  <th className="px-4 py-2.5 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const score = r.probability * r.influence;
                  const zone = riskZone(score);
                  const st = riskStatusColor(r.status);
                  const linkCount = (r.linkedIncidents || []).length;
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 cursor-pointer transition-colors" onClick={() => setViewing(r)}>
                      <td className="px-4 py-3 font-mono text-xs text-amber-400">{r.id}</td>
                      <td className="px-4 py-3 text-xs">
                        <Badge color={r.category.startsWith('ИТ') ? 'sky' : 'amber'}>
                          {r.category.replace('ИТ — ', '').replace('ИБ — ', '')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs max-w-[180px] truncate">{r.process}</td>
                      <td className="px-4 py-3 text-zinc-100 max-w-md truncate">{r.riskEvent}</td>
                      <td className="px-4 py-3 text-center font-mono text-zinc-300">{r.probability}</td>
                      <td className="px-4 py-3 text-center font-mono text-zinc-300">{r.influence}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-block px-2 py-0.5 text-xs font-mono font-bold rounded text-zinc-950 ${zone.class}`}>{score}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{r.responseStrategy}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium border rounded ${st.bg} ${st.text} ${st.border}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {linkCount > 0 ? <span className="inline-flex items-center gap-1 text-amber-400"><Link2 size={11} /> {linkCount}</span> : '—'}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && <button onClick={() => setEditing(r)} className="p-1 text-zinc-500 hover:text-zinc-100" title="Редактировать"><Edit2 size={13} /></button>}
                          {canDelete && <button onClick={() => { if (confirm(`Удалить риск ${r.id}?`)) onDelete(r.id); }} className="p-1 text-zinc-500 hover:text-rose-400" title="Удалить"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый риск" size="xl">
        <RiskForm allIncidents={incidents} onSave={(data) => { onCreate(data); setCreating(false); }} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Редактирование ${editing?.id || ''}`} size="xl">
        {editing && <RiskForm initial={editing} allIncidents={incidents} onSave={(data) => { onUpdate(editing.id, data); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Риск ${viewing?.id || ''}`} size="xl">
        {viewing && (
          <RiskView risk={viewing} linkedIncidents={linkedIncidentsFor(viewing)}
            canEdit={canEdit} canDelete={canDelete}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setViewing(null); }}
            onDelete={() => { if (confirm(`Удалить риск ${viewing.id}?`)) { onDelete(viewing.id); setViewing(null); } }} />
        )}
      </Modal>
    </div>
  );
};

// ============= USERS PAGE =============
const UserForm = ({ initial, roles, onSave, onCancel, isSelf, isCreating }) => {
  const auth = useAuth();
  const [data, setData] = useState(initial || {
    username: '', fullName: '', email: '', roleId: roles[0]?.id || '', isActive: true, isTechnical: false
  });
  const update = (field, value) => setData((d) => ({ ...d, [field]: value }));

  // Only technical accounts can create technical accounts
  const canSetTechnical = auth.currentUser.isTechnical;
  const visibleRoles = roles; // All roles selectable

  const handleSave = () => {
    if (!data.username.trim()) { alert('Логин обязателен'); return; }
    if (!data.fullName.trim()) { alert('ФИО обязательно'); return; }
    if (!data.roleId) { alert('Выберите роль'); return; }
    if (!/^[a-zA-Z0-9._-]+$/.test(data.username.trim())) {
      alert('Логин может содержать только латинские буквы, цифры, точку, дефис и подчёркивание');
      return;
    }
    onSave({ ...data, username: data.username.trim() });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Логин" value={data.username} onChange={(v) => update('username', v)} placeholder="ivanov" required autoComplete="off" />
        <Input label="Полное имя (ФИО)" value={data.fullName} onChange={(v) => update('fullName', v)} placeholder="Иванов И.И." required />
      </div>
      <Input label="Email (опционально)" value={data.email} onChange={(v) => update('email', v)} placeholder="user@example.com" />
      <Select label="Роль" value={data.roleId} onChange={(v) => update('roleId', v)} required
        options={visibleRoles.map((r) => ({ value: r.id, label: r.name + (r.isSystem ? ' (системная)' : '') }))} />

      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
          <input type="checkbox" checked={data.isActive} onChange={(e) => update('isActive', e.target.checked)}
            className="accent-amber-400" disabled={isSelf} />
          Учётная запись активна
          {isSelf && <span className="text-[11px] text-zinc-500">(нельзя отключить себя)</span>}
        </label>
        {canSetTechnical && isCreating && (
          <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={data.isTechnical} onChange={(e) => update('isTechnical', e.target.checked)}
              className="accent-violet-400" />
            <Cpu size={12} className="text-violet-400" />
            Техническая УЗ
          </label>
        )}
      </div>

      {isCreating && (
        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded">
          После создания будет показан временный пароль. Пользователь должен будет сменить его при первом входе.
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="primary" onClick={handleSave}>{isCreating ? 'Создать' : 'Сохранить'}</Button>
      </div>
    </div>
  );
};

const UsersPage = ({ users, roles, onCreate, onUpdate, onDelete, onResetPassword }) => {
  const auth = useAuth();
  const canCreate = auth.can('users.create');
  const canEdit = auth.can('users.edit');
  const canDelete = auth.can('users.delete');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [credentialModal, setCredentialModal] = useState(null); // { username, password, mode: 'created'|'reset' }

  // Hide technical accounts from non-technical users
  const visibleUsers = useMemo(() => {
    return users.filter((u) => auth.currentUser.isTechnical || !u.isTechnical);
  }, [users, auth.currentUser.isTechnical]);

  const filtered = useMemo(() => {
    return visibleUsers.filter((u) => {
      if (filterRole && u.roleId !== filterRole) return false;
      if (filterActive === 'active' && !u.isActive) return false;
      if (filterActive === 'inactive' && u.isActive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(u.username.toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q) ||
              (u.email || '').toLowerCase().includes(q))) return false;
      }
      return true;
    }).sort((a, b) => a.username.localeCompare(b.username));
  }, [visibleUsers, search, filterRole, filterActive]);

  const handleCreate = async (data) => {
    const { user, tempPassword } = await onCreate(data);
    setCreating(false);
    setCredentialModal({ username: user.username, password: tempPassword, mode: 'created' });
  };
  const handleResetPassword = async (user) => {
    if (!confirm(`Сбросить пароль для пользователя «${user.username}»?\n\nБудет сгенерирован новый временный пароль. Старый пароль перестанет работать.`)) return;
    const tempPassword = await onResetPassword(user.id);
    setCredentialModal({ username: user.username, password: tempPassword, mode: 'reset' });
  };

  const isSelf = (u) => u.id === auth.currentUser.id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Пользователи</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Управление учётными записями · {visibleUsers.length} запис{visibleUsers.length === 1 ? 'ь' : 'ей'}
            {auth.currentUser.isTechnical && (
              <span className="ml-2 text-violet-400">+ {users.filter((u) => u.isTechnical).length} техн.</span>
            )}
          </p>
        </div>
        {canCreate && <Button variant="primary" onClick={() => setCreating(true)}><UserPlus size={14} /> Новый пользователь</Button>}
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск: логин, ФИО, email..."
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-9 pr-3 py-1.5 text-sm rounded outline-none focus:border-amber-400/60" />
        </div>
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все роли</option>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="bg-zinc-950 border border-zinc-800 text-zinc-100 px-3 py-1.5 text-sm rounded">
          <option value="">Все</option>
          <option value="active">Активные</option>
          <option value="inactive">Отключённые</option>
        </select>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Users size={28} className="mx-auto mb-2 text-zinc-700" />
            <div className="text-sm">{visibleUsers.length === 0 ? 'Пользователей нет' : 'Ничего не найдено'}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/50 border-b border-zinc-800">
                <tr className="text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  <th className="px-4 py-2.5 font-medium">Логин</th>
                  <th className="px-4 py-2.5 font-medium">ФИО</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Роль</th>
                  <th className="px-4 py-2.5 font-medium">Статус</th>
                  <th className="px-4 py-2.5 font-medium">Последний вход</th>
                  <th className="px-4 py-2.5 font-medium w-32"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const role = roles.find((r) => r.id === u.roleId);
                  return (
                    <tr key={u.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {u.isTechnical && <Cpu size={12} className="text-violet-400" />}
                          {role?.id === 'role-super-admin' && !u.isTechnical && <Crown size={12} className="text-amber-400" />}
                          <span className="font-mono text-zinc-100">{u.username}</span>
                          {isSelf(u) && <span className="text-[10px] text-amber-400 px-1.5 py-0.5 bg-amber-500/10 rounded">вы</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-200">{u.fullName || '—'}</td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{u.email || '—'}</td>
                      <td className="px-4 py-3">
                        {role ? <Badge color={role.color || 'zinc'}>{role.name}</Badge> : <span className="text-rose-400 text-xs">роль удалена</span>}
                      </td>
                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <Badge color="emerald">Активен</Badge>
                        ) : (
                          <Badge color="zinc">Отключён</Badge>
                        )}
                        {u.mustChangePassword && <Badge color="amber" className="ml-1">Смена пароля</Badge>}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{formatDateTime(u.lastLoginAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <>
                              <button onClick={() => handleResetPassword(u)} className="p-1 text-zinc-500 hover:text-amber-400" title="Сбросить пароль"><KeyRound size={13} /></button>
                              <button onClick={() => setEditing(u)} className="p-1 text-zinc-500 hover:text-zinc-100" title="Редактировать"><Edit2 size={13} /></button>
                            </>
                          )}
                          {canDelete && !isSelf(u) && (
                            <button onClick={() => { if (confirm(`Удалить пользователя «${u.username}»? Действие необратимо.`)) onDelete(u.id); }}
                              className="p-1 text-zinc-500 hover:text-rose-400" title="Удалить"><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новый пользователь">
        <UserForm roles={roles} isCreating onSave={handleCreate} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Редактирование пользователя «${editing?.username || ''}»`}>
        {editing && (
          <UserForm initial={editing} roles={roles} isSelf={isSelf(editing)}
            onSave={(data) => { onUpdate(editing.id, data); setEditing(null); }}
            onCancel={() => setEditing(null)} />
        )}
      </Modal>

      <Modal open={!!credentialModal} onClose={() => setCredentialModal(null)} title="Временный пароль" size="md">
        {credentialModal && (
          <div className="space-y-4">
            <div className="flex items-start gap-2">
              <KeyRound size={18} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">
                  {credentialModal.mode === 'created' ? 'Пользователь создан' : 'Пароль сброшен'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Передайте эти данные пользователю любым удобным способом. Пароль больше не будет показан.
                  При первом входе пользователь должен будет задать постоянный пароль.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <CopyableField label="Логин" value={credentialModal.username} />
              <CopyableField label="Временный пароль" value={credentialModal.password} />
              <CopyableField label="Полная строка для отправки" value={`Логин: ${credentialModal.username}\nПароль: ${credentialModal.password}`} />
            </div>
            <div className="flex items-center justify-end pt-3 border-t border-zinc-800">
              <Button variant="primary" onClick={() => setCredentialModal(null)}>Закрыть</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============= ROLES PAGE =============
const RoleForm = ({ initial, onSave, onCancel }) => {
  const [data, setData] = useState(initial || {
    name: '', description: '', color: 'zinc', isSystem: false, permissions: allFalse()
  });
  const update = (field, value) => setData((d) => ({ ...d, [field]: value }));
  const togglePerm = (perm) => setData((d) => ({ ...d, permissions: { ...d.permissions, [perm]: !d.permissions[perm] } }));
  const setAllForResource = (resourceId, value) => setData((d) => {
    const next = { ...d.permissions };
    PERMISSION_ACTIONS.forEach((a) => { next[`${resourceId}.${a.id}`] = value; });
    return { ...d, permissions: next };
  });
  const isSystem = data.isSystem;

  const handleSave = () => {
    if (!data.name.trim()) { alert('Имя роли обязательно'); return; }
    onSave(data);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Имя роли" value={data.name} onChange={(v) => update('name', v)} placeholder="например, ИТ-аналитик" required />
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1.5 font-medium">Цвет роли</label>
          <div className="flex items-center gap-3">
            <ColorPicker value={data.color} onChange={(c) => update('color', c)} />
            <Badge color={data.color}>{data.name || 'превью'}</Badge>
          </div>
        </div>
      </div>
      <TextArea label="Описание" value={data.description} onChange={(v) => update('description', v)} rows={2} placeholder="Кому предназначена эта роль" />

      {isSystem && (
        <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded">
          Это системная роль. Её права изменить нельзя.
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Права доступа</label>
        </div>
        <div className="border border-zinc-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950">
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="text-left px-3 py-2 font-medium">Раздел</th>
                {PERMISSION_ACTIONS.map((a) => (
                  <th key={a.id} className="text-center px-2 py-2 font-medium">{a.label}</th>
                ))}
                <th className="text-right px-3 py-2 font-medium">Все</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_RESOURCES.map((res) => {
                const allOn = PERMISSION_ACTIONS.every((a) => data.permissions[`${res.id}.${a.id}`]);
                return (
                  <tr key={res.id} className="border-t border-zinc-800">
                    <td className="px-3 py-2 text-zinc-200 font-medium">{res.label}</td>
                    {PERMISSION_ACTIONS.map((a) => {
                      const key = `${res.id}.${a.id}`;
                      return (
                        <td key={a.id} className="text-center px-2 py-2">
                          <input type="checkbox" checked={!!data.permissions[key]} onChange={() => togglePerm(key)}
                            disabled={isSystem} className="accent-amber-400 w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50" />
                        </td>
                      );
                    })}
                    <td className="text-right px-3 py-2">
                      <button type="button" onClick={() => setAllForResource(res.id, !allOn)} disabled={isSystem}
                        className="text-[11px] text-zinc-400 hover:text-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed underline">
                        {allOn ? 'снять' : 'все'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          Просмотр включается автоматически, если разрешены создание / редактирование / удаление.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="primary" onClick={handleSave} disabled={isSystem}>{initial ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </div>
  );
};

const RoleView = ({ role, userCount, onClose, onEdit, onDelete, canEdit, canDelete }) => {
  const isSystem = role.isSystem;
  const grantedCount = Object.values(role.permissions || {}).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={role.color || 'zinc'}>{role.name}</Badge>
        {isSystem && <Badge color="rose">Системная</Badge>}
        <span className="text-xs text-zinc-500">{grantedCount} / {ALL_PERMISSIONS.length} прав</span>
        <span className="text-xs text-zinc-500">· пользователей: {userCount}</span>
      </div>
      {role.description && <p className="text-sm text-zinc-300">{role.description}</p>}

      <div className="border border-zinc-800 rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-950">
            <tr className="text-[11px] uppercase tracking-wider text-zinc-500">
              <th className="text-left px-3 py-2 font-medium">Раздел</th>
              {PERMISSION_ACTIONS.map((a) => (
                <th key={a.id} className="text-center px-2 py-2 font-medium">{a.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_RESOURCES.map((res) => (
              <tr key={res.id} className="border-t border-zinc-800">
                <td className="px-3 py-2 text-zinc-200">{res.label}</td>
                {PERMISSION_ACTIONS.map((a) => {
                  const has = !!role.permissions?.[`${res.id}.${a.id}`];
                  return (
                    <td key={a.id} className="text-center px-2 py-2">
                      {has ? <Check size={14} className="inline text-emerald-400" /> : <X size={14} className="inline text-zinc-700" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        {canDelete && !isSystem && <Button variant="danger" onClick={onDelete}><Trash2 size={13} /> Удалить</Button>}
        {canEdit && !isSystem && <Button variant="secondary" onClick={onEdit}><Edit2 size={13} /> Редактировать</Button>}
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
      </div>
    </div>
  );
};

const RolesPage = ({ roles, users, onCreate, onUpdate, onDelete }) => {
  const auth = useAuth();
  const canCreate = auth.can('roles.create');
  const canEdit = auth.can('roles.edit');
  const canDelete = auth.can('roles.delete');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  const userCountByRole = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.roleId] = (m[u.roleId] || 0) + 1; });
    return m;
  }, [users]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Роли</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Управление набором прав. Системные роли защищены от изменений.</p>
        </div>
        {canCreate && <Button variant="primary" onClick={() => setCreating(true)}><Plus size={14} /> Новая роль</Button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {roles.map((r) => {
          const grantedCount = Object.values(r.permissions || {}).filter(Boolean).length;
          const userCount = userCountByRole[r.id] || 0;
          return (
            <Card key={r.id} className="p-4 cursor-pointer hover:border-zinc-700 transition-colors" onClick={() => setViewing(r)}>
              <div className="flex items-start justify-between mb-2">
                <Badge color={r.color || 'zinc'}>{r.name}</Badge>
                {r.isSystem && <Badge color="rose">Системная</Badge>}
              </div>
              {r.description && <p className="text-xs text-zinc-400 mb-3 line-clamp-2">{r.description}</p>}
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span><span className="text-zinc-300 font-mono">{grantedCount}</span> / {ALL_PERMISSIONS.length} прав</span>
                <span><span className="text-zinc-300 font-mono">{userCount}</span> польз.</span>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Новая роль">
        <RoleForm onSave={(data) => { onCreate(data); setCreating(false); }} onCancel={() => setCreating(false)} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Редактирование роли «${editing?.name || ''}»`}>
        {editing && <RoleForm initial={editing} onSave={(data) => { onUpdate(editing.id, data); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Роль «${viewing?.name || ''}»`}>
        {viewing && (
          <RoleView role={viewing} userCount={userCountByRole[viewing.id] || 0}
            canEdit={canEdit} canDelete={canDelete}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setViewing(null); }}
            onDelete={() => {
              const cnt = userCountByRole[viewing.id] || 0;
              if (cnt > 0) { alert(`Нельзя удалить роль — её используют ${cnt} пользовател(я). Сначала переназначьте.`); return; }
              if (confirm(`Удалить роль «${viewing.name}»?`)) { onDelete(viewing.id); setViewing(null); }
            }} />
        )}
      </Modal>
    </div>
  );
};

// ============= SETTINGS PAGE =============
const SettingsPage = ({ settings, incidents, onSave }) => {
  const auth = useAuth();
  const canEdit = auth.can('settings.edit');
  const [draft, setDraft] = useState(settings);

  useEffect(() => { setDraft(settings); }, [settings]);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const addType = () => setDraft((d) => ({ ...d, incidentTypes: [...d.incidentTypes, { id: newId(), name: 'Новый тип', color: 'zinc' }] }));
  const updateType = (id, field, value) => setDraft((d) => ({ ...d, incidentTypes: d.incidentTypes.map((t) => t.id === id ? { ...t, [field]: value } : t) }));
  const removeType = (id) => {
    const t = draft.incidentTypes.find((x) => x.id === id);
    if (!t) return;
    const used = incidents.filter((i) => i.type === t.name).length;
    if (used > 0) { alert(`Нельзя удалить тип «${t.name}» — он используется в ${used} инцидент(ах).`); return; }
    const catCount = draft.incidentCategories.filter((c) => c.typeId === id).length;
    if (!confirm(`Удалить тип «${t.name}»${catCount ? ` и его ${catCount} категори(й)` : ''}?`)) return;
    setDraft((d) => ({ ...d, incidentTypes: d.incidentTypes.filter((x) => x.id !== id), incidentCategories: d.incidentCategories.filter((c) => c.typeId !== id) }));
  };

  const addCategory = (typeId) => setDraft((d) => ({ ...d, incidentCategories: [...d.incidentCategories, { id: newId(), typeId, name: 'Новая категория' }] }));
  const updateCategory = (id, name) => setDraft((d) => ({ ...d, incidentCategories: d.incidentCategories.map((c) => c.id === id ? { ...c, name } : c) }));
  const removeCategory = (id) => {
    const c = draft.incidentCategories.find((x) => x.id === id);
    if (!c) return;
    const used = incidents.filter((i) => i.category === c.name).length;
    if (used > 0) { alert(`Нельзя удалить категорию «${c.name}» — она используется в ${used} инцидент(ах).`); return; }
    setDraft((d) => ({ ...d, incidentCategories: d.incidentCategories.filter((x) => x.id !== id) }));
  };

  const addSeverity = () => setDraft((d) => ({ ...d, severities: [...d.severities, { id: newId(), name: 'Новый уровень', color: 'zinc' }] }));
  const updateSeverity = (id, field, value) => setDraft((d) => ({ ...d, severities: d.severities.map((s) => s.id === id ? { ...s, [field]: value } : s) }));
  const removeSeverity = (id) => {
    const s = draft.severities.find((x) => x.id === id);
    if (!s) return;
    const used = incidents.filter((i) => i.severity === s.name).length;
    if (used > 0) { alert(`Нельзя удалить уровень «${s.name}» — он используется в ${used} инцидент(ах).`); return; }
    setDraft((d) => ({ ...d, severities: d.severities.filter((x) => x.id !== id) }));
  };
  const moveSeverity = (id, dir) => setDraft((d) => {
    const arr = [...d.severities];
    const idx = arr.findIndex((s) => s.id === id);
    const newIdx = idx + dir;
    if (idx < 0 || newIdx < 0 || newIdx >= arr.length) return d;
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    return { ...d, severities: arr };
  });

  const validate = () => {
    const errors = [];
    const typeNames = draft.incidentTypes.map((t) => t.name.trim());
    if (typeNames.some((n) => !n)) errors.push('Все типы должны иметь имя.');
    if (new Set(typeNames).size !== typeNames.length) errors.push('Имена типов должны быть уникальными.');
    const sevNames = draft.severities.map((s) => s.name.trim());
    if (sevNames.some((n) => !n)) errors.push('Все уровни должны иметь имя.');
    if (new Set(sevNames).size !== sevNames.length) errors.push('Имена уровней должны быть уникальными.');
    draft.incidentTypes.forEach((t) => {
      const catNames = draft.incidentCategories.filter((c) => c.typeId === t.id).map((c) => c.name.trim());
      if (catNames.some((n) => !n)) errors.push(`Все категории «${t.name}» должны иметь имя.`);
      if (new Set(catNames).size !== catNames.length) errors.push(`Категории «${t.name}» должны быть уникальными.`);
    });
    if (draft.sessionTimeoutMinutes && (draft.sessionTimeoutMinutes < 1 || draft.sessionTimeoutMinutes > 480)) {
      errors.push('Таймаут сессии должен быть в диапазоне 1–480 минут.');
    }
    return errors;
  };

  const handleSave = () => {
    const errors = validate();
    if (errors.length > 0) { alert(errors.join('\n')); return; }
    const typeRenames = {};
    draft.incidentTypes.forEach((nt) => {
      const old = settings.incidentTypes.find((o) => o.id === nt.id);
      if (old && old.name !== nt.name) typeRenames[old.name] = nt.name;
    });
    const sevRenames = {};
    draft.severities.forEach((ns) => {
      const old = settings.severities.find((o) => o.id === ns.id);
      if (old && old.name !== ns.name) sevRenames[old.name] = ns.name;
    });
    const catRenames = {};
    draft.incidentCategories.forEach((nc) => {
      const old = settings.incidentCategories.find((o) => o.id === nc.id);
      if (old && old.name !== nc.name) catRenames[old.name] = nc.name;
    });
    onSave(draft, { typeRenames, sevRenames, catRenames });
  };

  const handleReset = () => {
    if (!confirm('Сбросить настройки к значениям по умолчанию?')) return;
    setDraft({ ...DEFAULT_SETTINGS, sessionTimeoutMinutes: settings.sessionTimeoutMinutes });
  };
  const handleRevert = () => setDraft(settings);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight">Справочники</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Типы, категории и серьёзность инцидентов; настройки безопасности.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}><RefreshCw size={12} /> К дефолтным</Button>
            {dirty && <Button variant="outline" size="sm" onClick={handleRevert}>Откатить</Button>}
            <Button variant="primary" onClick={handleSave} disabled={!dirty}>
              <Save size={13} /> {dirty ? 'Сохранить *' : 'Сохранено'}
            </Button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="px-3 py-2 bg-zinc-800/50 border border-zinc-700 text-zinc-400 text-xs rounded">
          У вас нет прав на редактирование справочников. Доступен только просмотр.
        </div>
      )}
      {canEdit && dirty && (
        <div className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs rounded">
          Есть несохранённые изменения. Они применятся к существующим инцидентам только после нажатия «Сохранить».
        </div>
      )}

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-zinc-100 mb-1">Безопасность сессии</h3>
        <p className="text-xs text-zinc-500 mb-3">Автоматический выход при бездействии пользователя.</p>
        <div className="max-w-xs">
          <Input label="Таймаут сессии (минут)" type="number"
            value={draft.sessionTimeoutMinutes || 30}
            onChange={(v) => setDraft((d) => ({ ...d, sessionTimeoutMinutes: Math.max(1, Math.min(480, Number(v) || 30)) }))} />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Типы инцидентов</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Верхнеуровневая классификация: ИТ / ИБ или своё разделение.</p>
          </div>
          {canEdit && <Button variant="outline" size="sm" onClick={addType}><Plus size={12} /> Добавить тип</Button>}
        </div>
        <div className="space-y-2">
          {draft.incidentTypes.map((t) => {
            const usedCount = incidents.filter((i) => i.type === t.name).length;
            return (
              <div key={t.id} className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-800 rounded">
                <input value={t.name} onChange={(e) => updateType(t.id, 'name', e.target.value)} disabled={!canEdit}
                  className="flex-1 bg-transparent text-zinc-100 text-sm px-2 py-1 outline-none focus:bg-zinc-900 rounded disabled:opacity-60" />
                {canEdit && <ColorPicker value={t.color} onChange={(c) => updateType(t.id, 'color', c)} />}
                <Badge color={t.color}>превью: {t.name || '—'}</Badge>
                <span className="text-[11px] text-zinc-500 font-mono w-20 text-right">{usedCount} исп.</span>
                {canEdit && (
                  <button onClick={() => removeType(t.id)} className="p-1 text-zinc-500 hover:text-rose-400"><Trash2 size={14} /></button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Категории инцидентов</h3>
        <div className="space-y-5">
          {draft.incidentTypes.map((t) => {
            const cats = draft.incidentCategories.filter((c) => c.typeId === t.id);
            return (
              <div key={t.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge color={t.color}>{t.name}</Badge>
                    <span className="text-[11px] text-zinc-500">{cats.length} категори{cats.length === 1 ? 'я' : 'й'}</span>
                  </div>
                  {canEdit && <Button variant="ghost" size="sm" onClick={() => addCategory(t.id)}><Plus size={11} /> Добавить</Button>}
                </div>
                <div className="space-y-1.5">
                  {cats.map((c) => {
                    const usedCount = incidents.filter((i) => i.category === c.name).length;
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-2 bg-zinc-950 border border-zinc-800 rounded">
                        <input value={c.name} onChange={(e) => updateCategory(c.id, e.target.value)} disabled={!canEdit}
                          className="flex-1 bg-transparent text-zinc-200 text-sm px-2 py-1 outline-none focus:bg-zinc-900 rounded disabled:opacity-60" />
                        <span className="text-[11px] text-zinc-500 font-mono w-20 text-right">{usedCount} исп.</span>
                        {canEdit && (
                          <button onClick={() => removeCategory(c.id)} className="p-1 text-zinc-500 hover:text-rose-400"><Trash2 size={13} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Уровни серьёзности</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Порядок важен — последний считается «высшим».</p>
          </div>
          {canEdit && <Button variant="outline" size="sm" onClick={addSeverity}><Plus size={12} /> Добавить уровень</Button>}
        </div>
        <div className="space-y-2">
          {draft.severities.map((s, idx) => {
            const usedCount = incidents.filter((i) => i.severity === s.name).length;
            const sevPalette = COLOR_PALETTE[s.color] || COLOR_PALETTE.zinc;
            return (
              <div key={s.id} className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-800 rounded">
                <span className="font-mono text-[11px] text-zinc-600 w-6 text-center">{idx + 1}</span>
                <input value={s.name} onChange={(e) => updateSeverity(s.id, 'name', e.target.value)} disabled={!canEdit}
                  className="flex-1 bg-transparent text-zinc-100 text-sm px-2 py-1 outline-none focus:bg-zinc-900 rounded disabled:opacity-60" />
                {canEdit && <ColorPicker value={s.color} onChange={(c) => updateSeverity(s.id, 'color', c)} />}
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium border rounded ${sevPalette.bg} ${sevPalette.text} ${sevPalette.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sevPalette.dot}`} />
                  {s.name || '—'}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono w-20 text-right">{usedCount} исп.</span>
                {canEdit && (
                  <>
                    <div className="flex items-center gap-0.5">
                      <button onClick={() => moveSeverity(s.id, -1)} disabled={idx === 0} className="p-1 text-zinc-500 hover:text-zinc-100 disabled:opacity-30">↑</button>
                      <button onClick={() => moveSeverity(s.id, 1)} disabled={idx === draft.severities.length - 1} className="p-1 text-zinc-500 hover:text-zinc-100 disabled:opacity-30">↓</button>
                    </div>
                    <button onClick={() => removeSeverity(s.id)} className="p-1 text-zinc-500 hover:text-rose-400"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

// ============= DEMO DATA =============
const generateDemoData = () => {
  const Y = new Date().getFullYear();
  const incidents = [
    { id: `INC-${Y}-001`, createdAt: new Date(Date.now()-12*864e5).toISOString(), date: new Date(Date.now()-12*864e5).toISOString().split('T')[0],
      type: 'ИБ', category: 'Фишинг', title: 'Фишинговая рассылка от имени HR-отдела',
      description: 'Получено уведомление от 4 сотрудников о подозрительных письмах с просьбой ввести учётные данные на поддельной странице.',
      source: 'Обращение сотрудников', severity: 'Высокая', status: 'Закрыт',
      responsible: 'Искандар Х.', resolutionDate: new Date(Date.now()-10*864e5).toISOString().split('T')[0],
      damage: 0, notes: 'Учётные данные не были скомпрометированы. Проведён внеплановый инструктаж.' },
    { id: `INC-${Y}-002`, createdAt: new Date(Date.now()-8*864e5).toISOString(), date: new Date(Date.now()-8*864e5).toISOString().split('T')[0],
      type: 'ИТ', category: 'Сбой сети', title: 'Кратковременная недоступность ДБО',
      description: 'Сбой основного сетевого канала, переключение на резервный заняло 14 минут.',
      source: 'Мониторинг', severity: 'Средняя', status: 'Закрыт',
      responsible: 'Сетевой отдел', resolutionDate: new Date(Date.now()-8*864e5).toISOString().split('T')[0],
      damage: 0, notes: 'Инициирована проверка SLA с провайдером.' },
    { id: `INC-${Y}-003`, createdAt: new Date(Date.now()-5*864e5).toISOString(), date: new Date(Date.now()-5*864e5).toISOString().split('T')[0],
      type: 'ИБ', category: 'Несанкционированный доступ', title: 'Множественные неудачные попытки входа',
      description: 'Зафиксированы попытки brute-force на учётную запись администратора со внешних IP.',
      source: 'SIEM', severity: 'Высокая', status: 'В работе',
      responsible: 'Искандар Х.', resolutionDate: null,
      damage: 0, notes: 'IP заблокированы на WAF. Учётная запись временно отключена.' },
    { id: `INC-${Y}-004`, createdAt: new Date(Date.now()-3*864e5).toISOString(), date: new Date(Date.now()-3*864e5).toISOString().split('T')[0],
      type: 'ИТ', category: 'Сбой ПО', title: 'Ошибка обновления АБС в одном из филиалов',
      description: 'После накатывания патча в филиале г. Бохтар АБС не запускалась 1 час 20 минут.',
      source: 'Обращение филиала', severity: 'Средняя', status: 'Закрыт',
      responsible: 'Группа сопровождения АБС', resolutionDate: new Date(Date.now()-3*864e5).toISOString().split('T')[0],
      damage: 4500, notes: 'Откачен патч, доработан скрипт обновления.' },
    { id: `INC-${Y}-005`, createdAt: new Date(Date.now()-1*864e5).toISOString(), date: new Date(Date.now()-1*864e5).toISOString().split('T')[0],
      type: 'ИБ', category: 'Вредоносное ПО', title: 'Срабатывание EDR на рабочей станции',
      description: 'Kaspersky EDR заблокировал запуск подозрительного исполняемого файла.',
      source: 'Kaspersky Endpoint Security', severity: 'Критическая', status: 'Открыт',
      responsible: 'Искандар Х.', resolutionDate: null,
      damage: 0, notes: 'Хост изолирован, проводится анализ.' }
  ];
  const risks = [
    { id: `RSK-${Y}-001`, createdAt: new Date(Date.now()-30*864e5).toISOString(),
      process: 'Дистанционное банковское обслуживание', category: 'ИБ — Конфиденциальность',
      riskEvent: 'Компрометация учётных данных клиента вследствие фишинга',
      causes: 'Низкий уровень осведомлённости клиентов; отсутствие двухфакторной аутентификации у части клиентов',
      impact: 'Несанкционированные операции по счетам, репутационный ущерб, регуляторные санкции',
      probability: 4, influence: 4, businessLoss: 4, businessImpact: 4, totalLoss: 250000,
      responseStrategy: 'Снижение',
      measures: 'Внедрение обязательной 2FA, регулярные кампании по информированию клиентов, мониторинг аномалий в SIEM',
      responsible: 'Искандар Х. (ИБ)', monitoringFrequency: 'Ежемесячно', status: 'В работе',
      comments: '2FA внедрено по корпоративным каналам.',
      linkedIncidents: [`INC-${Y}-001`, `INC-${Y}-003`] },
    { id: `RSK-${Y}-002`, createdAt: new Date(Date.now()-25*864e5).toISOString(),
      process: 'Эксплуатация ИТ-инфраструктуры', category: 'ИТ — Сеть',
      riskEvent: 'Длительная недоступность сетевой инфраструктуры',
      causes: 'Единственный канал связи у провайдера, отсутствие резервирования',
      impact: 'Простой операционной деятельности, нарушение SLA',
      probability: 3, influence: 4, businessLoss: 3, businessImpact: 3, totalLoss: 80000,
      responseStrategy: 'Снижение',
      measures: 'Подключение резервных каналов связи во все филиалы',
      responsible: 'Сетевой отдел', monitoringFrequency: 'Ежеквартально', status: 'В работе',
      comments: 'Резерв в 60% филиалов.', linkedIncidents: [`INC-${Y}-002`] },
    { id: `RSK-${Y}-003`, createdAt: new Date(Date.now()-20*864e5).toISOString(),
      process: 'Управление обновлениями ПО', category: 'ИТ — Приложения',
      riskEvent: 'Сбой банковских систем после установки обновлений',
      causes: 'Недостаточное тестирование на pre-prod',
      impact: 'Простой операционных систем',
      probability: 3, influence: 3, businessLoss: 2, businessImpact: 3, totalLoss: 30000,
      responseStrategy: 'Снижение',
      measures: 'Внедрение pre-prod среды, регламент отката',
      responsible: 'Группа сопровождения АБС', monitoringFrequency: 'Ежемесячно', status: 'В работе',
      comments: 'Регламент в финальной редакции.', linkedIncidents: [`INC-${Y}-004`] },
    { id: `RSK-${Y}-004`, createdAt: new Date(Date.now()-15*864e5).toISOString(),
      process: 'Защита конечных устройств', category: 'ИБ — Целостность',
      riskEvent: 'Заражение рабочих станций вредоносным ПО',
      causes: 'Открытие сотрудниками вложений из непроверенных источников',
      impact: 'Потеря данных, эскалация атаки',
      probability: 4, influence: 5, businessLoss: 4, businessImpact: 5, totalLoss: 500000,
      responseStrategy: 'Снижение',
      measures: 'EDR на всех рабочих станциях, обучение сотрудников',
      responsible: 'Искандар Х. (ИБ)', monitoringFrequency: 'Ежедневно', status: 'В работе',
      comments: 'EDR покрытие 95%.', linkedIncidents: [`INC-${Y}-005`] },
    { id: `RSK-${Y}-005`, createdAt: new Date(Date.now()-10*864e5).toISOString(),
      process: 'Управление доступом', category: 'ИБ — Соответствие требованиям',
      riskEvent: 'Несоответствие требованиям НБТ по управлению доступом',
      causes: 'Отсутствие регулярного пересмотра прав',
      impact: 'Регуляторные предписания, штрафы',
      probability: 2, influence: 3, businessLoss: 2, businessImpact: 2, totalLoss: 20000,
      responseStrategy: 'Снижение',
      measures: 'Регулярный пересмотр прав, IAM-решение',
      responsible: 'Искандар Х. (ИБ)', monitoringFrequency: 'Ежеквартально', status: 'Не исполняется',
      comments: 'Закупка IAM в плане.', linkedIncidents: [] }
  ];
  return { incidents, risks, counters: { incident: incidents.length, risk: risks.length } };
};

// ============= ROOT APP =============
export default function App() {
  const storage = useStorage();
  const [tab, setTab] = useState('dashboard');
  const [matrixModal, setMatrixModal] = useState(null);
  const idleTimerRef = useRef(null);

  // ===== AUTH =====
  const currentUser = useMemo(() => {
    if (!storage.session?.userId) return null;
    return storage.users.find((u) => u.id === storage.session.userId) || null;
  }, [storage.session, storage.users]);

  const currentRole = useMemo(() => {
    if (!currentUser) return null;
    // Technical accounts effectively have all permissions regardless of stored role.
    if (currentUser.isTechnical) return { ...DEFAULT_ROLES[0], name: 'Техническая УЗ', color: 'violet', permissions: allTrue() };
    return storage.roles.find((r) => r.id === currentUser.roleId) || null;
  }, [currentUser, storage.roles]);

  const can = useCallback((perm) => {
    if (!currentUser) return false;
    if (currentUser.isTechnical) return true;
    if (!currentRole) return false;
    if (!currentRole.permissions[perm]) {
      // Auto-grant `view` if any other action on the same resource is allowed
      if (perm.endsWith('.view')) {
        const res = perm.split('.')[0];
        return PERMISSION_ACTIONS.some((a) => a.id !== 'view' && currentRole.permissions[`${res}.${a.id}`]);
      }
      return false;
    }
    return true;
  }, [currentUser, currentRole]);

  // ===== Idle timer =====
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!storage.session) return;
    const minutes = storage.settings.sessionTimeoutMinutes || 30;
    idleTimerRef.current = setTimeout(() => {
      storage.persistSession(null);
      alert(`Сессия завершена из-за бездействия (${minutes} минут).`);
    }, minutes * 60 * 1000);
  }, [storage.session, storage.settings.sessionTimeoutMinutes]);

  useEffect(() => {
    if (!storage.session) return;
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart', 'scroll'];
    const handler = () => resetIdleTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [storage.session, resetIdleTimer]);

  // ===== Auth actions =====
  const login = async (username, password) => {
    const u = storage.users.find((x) => x.username.toLowerCase() === username.toLowerCase().trim());
    if (!u) return { ok: false, error: 'Неверный логин или пароль' };
    if (!u.isActive) return { ok: false, error: 'Учётная запись отключена. Обратитесь к администратору.' };
    const hash = await hashPassword(password, u.passwordSalt);
    if (hash !== u.passwordHash) return { ok: false, error: 'Неверный логин или пароль' };
    await storage.persistUsers(storage.users.map((x) => x.id === u.id ? { ...x, lastLoginAt: new Date().toISOString() } : x));
    await storage.persistSession({ userId: u.id, loggedInAt: new Date().toISOString() });
    return { ok: true };
  };

  const logout = async () => { await storage.persistSession(null); };

  const changeOwnPassword = async (oldPassword, newPassword) => {
    if (!currentUser) return { ok: false, error: 'Нет активной сессии' };
    const oldHash = await hashPassword(oldPassword, currentUser.passwordSalt);
    if (oldHash !== currentUser.passwordHash) return { ok: false, error: 'Неверный текущий пароль' };
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    await storage.persistUsers(storage.users.map((x) => x.id === currentUser.id
      ? { ...x, passwordHash: newHash, passwordSalt: newSalt, mustChangePassword: false }
      : x));
    return { ok: true };
  };

  const auth = { currentUser, currentRole, can, login, logout, changeOwnPassword };

  // ===== Data CRUD =====
  const createIncident = async (data) => {
    const { id, n } = storage.nextIncidentId();
    await storage.persistIncidents([...storage.incidents, { ...data, id, createdAt: new Date().toISOString() }]);
    await storage.persistCounters({ ...storage.counters, incident: n });
  };
  const updateIncident = async (id, data) => {
    await storage.persistIncidents(storage.incidents.map((i) => i.id === id ? { ...i, ...data, id } : i));
  };
  const deleteIncident = async (id) => {
    await storage.persistIncidents(storage.incidents.filter((i) => i.id !== id));
    await storage.persistRisks(storage.risks.map((r) => ({
      ...r, linkedIncidents: (r.linkedIncidents || []).filter((x) => x !== id)
    })));
  };
  const createRisk = async (data) => {
    const { id, n } = storage.nextRiskId();
    await storage.persistRisks([...storage.risks, { ...data, id, createdAt: new Date().toISOString() }]);
    await storage.persistCounters({ ...storage.counters, risk: n });
  };
  const updateRisk = async (id, data) => {
    await storage.persistRisks(storage.risks.map((r) => r.id === id ? { ...r, ...data, id } : r));
  };
  const deleteRisk = async (id) => {
    await storage.persistRisks(storage.risks.filter((r) => r.id !== id));
  };
  const loadDemo = async () => {
    const { incidents, risks, counters } = generateDemoData();
    await storage.persistIncidents(incidents);
    await storage.persistRisks(risks);
    await storage.persistCounters(counters);
  };
  const clearAll = async () => {
    if (!confirm('Удалить все инциденты и риски?')) return;
    await storage.persistIncidents([]);
    await storage.persistRisks([]);
    await storage.persistCounters({ incident: 0, risk: 0 });
  };

  // ===== User CRUD =====
  const createUser = async (data) => {
    if (storage.users.some((u) => u.username.toLowerCase() === data.username.toLowerCase())) {
      throw new Error('Пользователь с таким логином уже существует');
    }
    const tempPassword = generateTempPassword();
    const salt = generateSalt();
    const hash = await hashPassword(tempPassword, salt);
    const newUser = {
      id: newId(),
      username: data.username,
      fullName: data.fullName,
      email: data.email || '',
      passwordHash: hash,
      passwordSalt: salt,
      roleId: data.roleId,
      isTechnical: data.isTechnical && currentUser?.isTechnical,
      isActive: data.isActive !== false,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    };
    await storage.persistUsers([...storage.users, newUser]);
    return { user: newUser, tempPassword };
  };
  const updateUser = async (id, data) => {
    if (storage.users.some((u) => u.id !== id && u.username.toLowerCase() === data.username.toLowerCase())) {
      alert('Пользователь с таким логином уже существует'); return;
    }
    await storage.persistUsers(storage.users.map((u) => u.id === id ? { ...u,
      username: data.username, fullName: data.fullName, email: data.email || '',
      roleId: data.roleId, isActive: data.isActive } : u));
  };
  const deleteUser = async (id) => {
    if (id === currentUser?.id) { alert('Нельзя удалить себя'); return; }
    const target = storage.users.find((u) => u.id === id);
    if (target?.isTechnical && !currentUser?.isTechnical) { alert('Только техническая УЗ может удалять технические УЗ'); return; }
    await storage.persistUsers(storage.users.filter((u) => u.id !== id));
  };
  const resetUserPassword = async (id) => {
    const tempPassword = generateTempPassword();
    const salt = generateSalt();
    const hash = await hashPassword(tempPassword, salt);
    await storage.persistUsers(storage.users.map((u) => u.id === id
      ? { ...u, passwordHash: hash, passwordSalt: salt, mustChangePassword: true } : u));
    return tempPassword;
  };

  // ===== Role CRUD =====
  const createRole = async (data) => {
    await storage.persistRoles([...storage.roles, { ...data, id: `role-${newId()}`, isSystem: false }]);
  };
  const updateRole = async (id, data) => {
    const existing = storage.roles.find((r) => r.id === id);
    if (existing?.isSystem) { alert('Системную роль изменять нельзя'); return; }
    await storage.persistRoles(storage.roles.map((r) => r.id === id ? { ...r, ...data, id, isSystem: false } : r));
  };
  const deleteRole = async (id) => {
    const existing = storage.roles.find((r) => r.id === id);
    if (existing?.isSystem) { alert('Системную роль удалить нельзя'); return; }
    await storage.persistRoles(storage.roles.filter((r) => r.id !== id));
  };

  // ===== Settings save (with cascading rename) =====
  const saveSettings = async (newSettings, { typeRenames, sevRenames, catRenames }) => {
    const hasRenames = Object.keys(typeRenames).length || Object.keys(sevRenames).length || Object.keys(catRenames).length;
    if (hasRenames) {
      const updatedIncidents = storage.incidents.map((i) => {
        let next = i;
        if (typeRenames[next.type])     next = { ...next, type: typeRenames[next.type] };
        if (sevRenames[next.severity])  next = { ...next, severity: sevRenames[next.severity] };
        if (catRenames[next.category])  next = { ...next, category: catRenames[next.category] };
        return next;
      });
      await storage.persistIncidents(updatedIncidents);
    }
    await storage.persistSettings(newSettings);
  };

  // ===== RENDER =====
  if (!storage.loaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-zinc-500 text-sm font-mono">Загрузка...</div>
      </div>
    );
  }

  // Not logged in → login screen
  if (!currentUser) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
          body { font-family: 'Manrope', system-ui, sans-serif; }
          .font-mono, [class*="font-mono"] { font-family: 'JetBrains Mono', ui-monospace, monospace !important; }
        `}</style>
        <LoginPage onLogin={login} bootstrapCreds={storage.bootstrapCreds} onDismissBootstrap={storage.clearBootstrapCreds} />
      </>
    );
  }

  // Logged in but must change password → forced change screen
  if (currentUser.mustChangePassword) {
    return (
      <AuthContext.Provider value={auth}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
          body { font-family: 'Manrope', system-ui, sans-serif; }
          .font-mono, [class*="font-mono"] { font-family: 'JetBrains Mono', ui-monospace, monospace !important; }
        `}</style>
        <ForcePasswordChangePage user={currentUser} onSubmit={changeOwnPassword} onCancel={logout} />
      </AuthContext.Provider>
    );
  }

  // Make sure tab is accessible by current role; if not, fall back to dashboard.
  const tabPermMap = {
    incidents: 'incidents.view', risks: 'risks.view',
    users: 'users.view', roles: 'roles.view', settings: 'settings.view'
  };
  const currentTabPerm = tabPermMap[tab];
  const visibleTab = (!currentTabPerm || can(currentTabPerm)) ? tab : 'dashboard';

  return (
    <AuthContext.Provider value={auth}>
      <SettingsContext.Provider value={storage.settings}>
        <div className="min-h-screen bg-zinc-950 text-zinc-100" style={{
          backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(251, 191, 36, 0.04), transparent 50%), radial-gradient(circle at 80% 100%, rgba(56, 189, 248, 0.03), transparent 50%)',
          fontFamily: '"Manrope", system-ui, -apple-system, sans-serif'
        }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
            body { font-family: 'Manrope', system-ui, sans-serif; }
            .font-mono, [class*="font-mono"] { font-family: 'JetBrains Mono', ui-monospace, monospace !important; }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: #09090b; }
            ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: #52525b; }
            select option { background: #18181b; color: #fafafa; }
          `}</style>

          <TopBar tab={visibleTab} setTab={setTab} />

          <main className="max-w-[1600px] mx-auto px-6 py-6">
            {visibleTab === 'dashboard' && (
              <Dashboard incidents={storage.incidents} risks={storage.risks}
                hasStorage={storage.hasStorage} loadDemo={loadDemo} clearAll={clearAll}
                onCellClick={(items) => setMatrixModal(items)} />
            )}
            {visibleTab === 'incidents' && can('incidents.view') && (
              <IncidentsPage incidents={storage.incidents} risks={storage.risks}
                onCreate={createIncident} onUpdate={updateIncident} onDelete={deleteIncident} />
            )}
            {visibleTab === 'risks' && can('risks.view') && (
              <RisksPage risks={storage.risks} incidents={storage.incidents}
                onCreate={createRisk} onUpdate={updateRisk} onDelete={deleteRisk} />
            )}
            {visibleTab === 'users' && can('users.view') && (
              <UsersPage users={storage.users} roles={storage.roles}
                onCreate={createUser} onUpdate={updateUser} onDelete={deleteUser}
                onResetPassword={resetUserPassword} />
            )}
            {visibleTab === 'roles' && can('roles.view') && (
              <RolesPage roles={storage.roles} users={storage.users}
                onCreate={createRole} onUpdate={updateRole} onDelete={deleteRole} />
            )}
            {visibleTab === 'settings' && can('settings.view') && (
              <SettingsPage settings={storage.settings} incidents={storage.incidents} onSave={saveSettings} />
            )}
          </main>

          <Modal open={!!matrixModal} onClose={() => setMatrixModal(null)} title="Риски в выбранной ячейке">
            {matrixModal && (
              <div className="space-y-2">
                {matrixModal.map((r) => {
                  const score = r.probability * r.influence;
                  const zone = riskZone(score);
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-800 rounded">
                      <span className="font-mono text-xs text-amber-400">{r.id}</span>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded text-zinc-950 ${zone.class}`}>{score}</span>
                      <span className="flex-1 text-sm text-zinc-200">{r.riskEvent}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Modal>

          <footer className="max-w-[1600px] mx-auto px-6 py-6 mt-8 border-t border-zinc-800/60">
            <div className="flex items-center justify-between text-[11px] text-zinc-600 font-mono">
              <span>RISK CONSOLE · {new Date().getFullYear()}</span>
              <span>{storage.incidents.length} INC · {storage.risks.length} RSK · {storage.users.length} USR · {storage.hasStorage ? 'STORAGE OK' : 'IN-MEMORY ONLY'}</span>
            </div>
          </footer>
        </div>
      </SettingsContext.Provider>
    </AuthContext.Provider>
  );
}
