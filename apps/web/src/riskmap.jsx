// ============================================================================
// КАРТА РИСКОВ ИТ И ИБ — отдельный модуль
// Модель: ISO 27001 Annex A + NIST CSF 2.0
// Все базовые UI-атомы (Card, Button, Input, ...) импортируются из основного файла.
// ============================================================================
import React, { useState, useMemo, useRef } from 'react';
import {
  Map, Plus, Search, Trash2, Download, Upload,
  RefreshCw, FileSpreadsheet
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  ResponsiveContainer, Tooltip
} from 'recharts';
import { utils as xlsxUtils, writeFile as xlsxWrite, read as xlsxRead } from 'xlsx';

import {
  Badge, Button, Card, Input, TextArea, Select, Modal, ScaleSelect,
  formatDate, todayISO, riskZone, useAuth
} from './risk-platform.jsx';

// ============= CONSTANTS =============
export const RISKMAP_STORAGE_KEY = 'platform:riskmap';
export const RISKMAP_COUNTER_KEY = 'platform:riskmap-counter';

export const RISKMAP_PERMISSION_RESOURCE = { id: 'riskmap', label: 'Карта рисков ИТ/ИБ' };

export const RISKMAP_TYPES = [
  'Кибербезопасностные риски',
  'Риски утечки и конфиденциальности',
  'Риски доступа и идентификации',
  'Риски третьих сторон / поставщиков',
  'Стратегические риски',
  'Технические/инфраструктурные риски',
  'Процессные/организационные риски',
  'Регуляторно-правовые риски'
];

export const RISKMAP_SOURCES = ['Внешний', 'Внутренний', 'Смешанный'];

export const RISKMAP_CIA = [
  'Конфиденциальность', 'Целостность', 'Доступность',
  'К+Ц', 'К+Д', 'Ц+Д', 'К+Ц+Д'
];

export const NIST_FUNCTIONS = [
  'GV-Govern', 'ID-Identify', 'PR-Protect',
  'DE-Detect', 'RS-Respond', 'RC-Recover'
];

export const CONTROL_EFFECTIVENESS = ['Высокая', 'Средняя', 'Низкая', 'Не оценена'];

export const TREATMENT_DECISIONS = [
  'Принять (Accept)',
  'Снижать (Mitigate)',
  'Передать (Transfer)',
  'Избежать (Avoid)'
];

export const RISK_APPETITE_LEVELS = ['Низкий', 'Средний', 'Высокий'];

export const RISKMAP_STATUS = ['Открыт', 'В работе', 'Принят', 'Закрыт'];

// Фиксированный порядок колонок для Excel импорта/экспорта
const EXCEL_COLUMNS = [
  { key: 'id',                     label: 'ID' },
  { key: 'process',                label: 'Процесс' },
  { key: 'subProcess',             label: 'Подпроцесс' },
  { key: 'processOwner',           label: 'Владелец процесса' },
  { key: 'asset',                  label: 'Актив' },
  { key: 'assetCriticality',       label: 'Критичность актива (1-5)' },
  { key: 'ciaProperty',            label: 'Свойство КЦД' },
  { key: 'threat',                 label: 'Угроза' },
  { key: 'vulnerability',          label: 'Уязвимость' },
  { key: 'description',            label: 'Описание риска' },
  { key: 'riskType',               label: 'Тип риска' },
  { key: 'source',                 label: 'Источник риска' },
  { key: 'probability',            label: 'Вероятность (1-5)' },
  { key: 'impact',                 label: 'Воздействие (1-5)' },
  { key: 'inherentScore',          label: 'Присущий риск', computed: true },
  { key: 'inherentLevel',          label: 'Уровень присущего риска', computed: true },
  { key: 'controls',               label: 'Существующие контроли' },
  { key: 'isoControls',            label: 'ISO 27001 Annex A' },
  { key: 'nistFunction',           label: 'Функция NIST CSF' },
  { key: 'controlEffectiveness',   label: 'Эффективность контроля' },
  { key: 'residualProbability',    label: 'Остаточная вероятность (1-5)' },
  { key: 'residualImpact',         label: 'Остаточное воздействие (1-5)' },
  { key: 'residualScore',          label: 'Остаточный риск', computed: true },
  { key: 'residualLevel',          label: 'Уровень остаточного риска', computed: true },
  { key: 'riskAppetite',           label: 'Риск-аппетит (целевой уровень)' },
  { key: 'treatmentDecision',      label: 'Решение по обработке' },
  { key: 'treatmentPlan',          label: 'План обработки' },
  { key: 'treatmentOwner',         label: 'Ответственный за обработку' },
  { key: 'deadline',               label: 'Срок реализации' },
  { key: 'kri',                    label: 'KRI / индикатор' },
  { key: 'identifiedAt',           label: 'Дата идентификации' },
  { key: 'lastReviewedAt',         label: 'Дата последнего пересмотра' },
  { key: 'nextReviewAt',           label: 'Дата следующего пересмотра' },
  { key: 'status',                 label: 'Статус' },
  { key: 'comments',               label: 'Комментарии' }
];

// ============= HELPERS =============
export const emptyRiskMap = () => ({
  id: '',
  process: '', subProcess: '', processOwner: '',
  asset: '', assetCriticality: 0, ciaProperty: '',
  threat: '', vulnerability: '', description: '',
  riskType: '', source: '',
  probability: 0, impact: 0,
  controls: '', isoControls: '', nistFunction: '',
  controlEffectiveness: '',
  residualProbability: 0, residualImpact: 0,
  riskAppetite: '',
  treatmentDecision: '', treatmentPlan: '',
  treatmentOwner: '', deadline: '', kri: '',
  identifiedAt: todayISO(), lastReviewedAt: '', nextReviewAt: '',
  status: 'Открыт', comments: ''
});

export const inherentScore = (r) => (Number(r.probability) || 0) * (Number(r.impact) || 0);
export const residualScore = (r) =>
  (Number(r.residualProbability) || 0) * (Number(r.residualImpact) || 0);

// Преобразование Excel serial date в YYYY-MM-DD
const excelSerialToDate = (n) => {
  const num = Number(n);
  if (!num || isNaN(num)) return '';
  // Excel epoch: 1899-12-30 (учитывает 1900-leap-bug)
  const ms = (num - 25569) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const parseDateLike = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return excelSerialToDate(v);
  const s = String(v).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD.MM.YYYY
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  // числа в виде строки (excel serial)
  if (/^\d+$/.test(s)) return excelSerialToDate(s);
  // ISO с временем
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return s;
};

// ============= SEED DATA =============
// Извлечено из «Карта рисков ИТ и ИБ — заполненный шаблон.xlsx» (банк, НБТ, Закон РТ № 1537).
// Probability/Impact/Residual в исходнике = 0 (формулы по пустым ячейкам).
// Здесь заданы экспертные оценки на основе критичности актива и описания риска,
// чтобы модуль был сразу пригоден для демонстрации.
export const SEED_RISKMAP = [
  {
    id: 'R-CYB-001', process: 'Управление ИБ', subProcess: 'Защита от социальной инженерии',
    processOwner: '[ОУ-ИБ]', asset: 'Корпоративная почта, УЗ AD',
    assetCriticality: 4, ciaProperty: 'К+Ц',
    threat: 'Фишинговые атаки на сотрудников',
    vulnerability: 'Недостаточная осведомлённость персонала; ограниченное покрытие MFA',
    description: 'Массовые фишинговые рассылки с целью получения учётных данных. Возможна компрометация рабочих УЗ и эскалация атаки внутрь сети.',
    riskType: 'Кибербезопасностные риски', source: 'Внешний',
    probability: 4, impact: 4,
    controls: 'Антиспам-фильтр, DLP, периодическое обучение пользователей',
    isoControls: 'A.5.31, A.6.3', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 3, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Внедрить регулярные phishing-симуляции (1 раз в квартал). 2) Расширить MFA на все УЗ с почтовым доступом. 3) Обновить программу обучения по ИБ.',
    treatmentOwner: '[ОУ-ИБ]', deadline: '2026-09-30',
    kri: 'Кол-во кликов на симуляциях; кол-во компрометаций УЗ',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт',
    comments: 'Владелец: указать должность согласно оргструктуре | Вероятность/воздействие/эффективность контроля — оценить ИТ/ИБ-специалистом'
  },
  {
    id: 'R-CYB-002', process: 'Управление ИБ', subProcess: 'Защита привилегированных пользователей',
    processOwner: '[ОУ-ИБ]', asset: 'УЗ топ-менеджмента, ИТ-администраторов',
    assetCriticality: 5, ciaProperty: 'К+Ц',
    threat: 'Целевой фишинг (spear phishing) на руководство и админов',
    vulnerability: 'Отсутствие усиленной защиты привилегированных УЗ; публичность данных о топ-менеджменте',
    description: 'Подготовленная атака на руководство и ИТ-администраторов с использованием OSINT. Компрометация привилегированной УЗ ведёт к полной компрометации инфраструктуры.',
    riskType: 'Кибербезопасностные риски', source: 'Внешний',
    probability: 3, impact: 5,
    controls: 'MFA для админов (УТОЧНИТЬ покрытие), отдельная политика паролей',
    isoControls: 'A.6.3, A.8.23', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Внедрить PAM-решение для всех админов. 2) Аппаратные токены FIDO2 для топ-менеджмента и ИТ-админов. 3) Целевые тренинги для VIP-группы.',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-ИТ]', deadline: '2026-12-31',
    kri: '% админов с MFA; кол-во инцидентов с привилегированными УЗ',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-003', process: 'Эксплуатация ИТ-систем', subProcess: 'Защита от вредоносного ПО',
    processOwner: '[ОУ-ИТ]', asset: 'Файловые серверы, рабочие станции, СХД',
    assetCriticality: 5, ciaProperty: 'К+Ц+Д',
    threat: 'Атака программы-вымогателя (ransomware)',
    vulnerability: 'Возможные пробелы в сегментации сети; зависимость от единственной системы резервного копирования; недостаточный уровень EDR',
    description: 'Ransomware-атака с шифрованием рабочих станций и серверов. Возможен полный простой банка на дни. Прямой регуляторный риск перед НБТ.',
    riskType: 'Кибербезопасностные риски', source: 'Внешний',
    probability: 4, impact: 5,
    controls: 'Антивирус Kaspersky, резервное копирование, частичная сегментация сети',
    isoControls: 'A.8.7, A.8.13', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 3, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Внедрить EDR-решение с поведенческим анализом. 2) Иммутабельные (immutable) резервные копии с air-gap. 3) Регулярные тесты восстановления (ежеквартально). 4) Микросегментация сети.',
    treatmentOwner: '[ОУ-ИТ] / [ОУ-ИБ]', deadline: '2027-03-31',
    kri: 'Время восстановления при тесте DRP; кол-во заражений в месяц',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-005', process: 'Управление ИБ', subProcess: 'Защита данных от утечки',
    processOwner: '[ОУ-ИБ]', asset: 'АБС, БД клиентов, файловые хранилища',
    assetCriticality: 5, ciaProperty: 'Конфиденциальность',
    threat: 'Несанкционированный экспорт ПДн клиентов и банковской тайны',
    vulnerability: 'Возможные пробелы в покрытии DLP; широкий доступ сотрудников к данным клиентов; отсутствие классификации данных',
    description: 'Намеренная или случайная выгрузка персональных данных клиентов. Прямое нарушение Закона РТ № 1537 «О защите ПДн» и нормативов НБТ.',
    riskType: 'Риски утечки и конфиденциальности', source: 'Смешанный',
    probability: 3, impact: 5,
    controls: 'DLP (УТОЧНИТЬ покрытие), журналирование, ограничение прав доступа',
    isoControls: 'A.5.34, A.8.12', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить классификацию данных. 2) Расширить покрытие DLP (e-mail, web, USB, печать). 3) Регулярный аудит прав доступа к БД клиентов. 4) Маскирование ПДн в тестовых средах.',
    treatmentOwner: '[ОУ-ИБ]', deadline: '2026-09-30',
    kri: 'Кол-во инцидентов DLP в месяц; % систем с DLP',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-007', process: 'Управление доступом', subProcess: 'Жизненный цикл учётных записей',
    processOwner: '[ОУ-ИБ] / [ОУ-Кадров]', asset: 'Active Directory, АБС, ДБО-админка',
    assetCriticality: 5, ciaProperty: 'К+Ц',
    threat: 'Эксплуатация активных УЗ уволенных сотрудников',
    vulnerability: 'Отсутствие автоматизации offboarding; разрыв между HR-процессом и ИТ',
    description: 'Неотключённые УЗ уволенных сотрудников могут использоваться для несанкционированного доступа. Высокий риск как со стороны бывших сотрудников, так и при компрометации забытых УЗ.',
    riskType: 'Риски доступа и идентификации', source: 'Смешанный',
    probability: 3, impact: 4,
    controls: 'Процесс offboarding, ручной аудит УЗ',
    isoControls: 'A.5.18, A.8.2', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Низкая',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Автоматизировать связку HR-системы с AD (IDM). 2) Ежемесячный аудит активных УЗ. 3) SLA отключения УЗ — в день увольнения.',
    treatmentOwner: '[ОУ-ИТ] / [ОУ-ИБ]', deadline: '2026-06-30',
    kri: 'Кол-во активных УЗ уволенных; срок отключения УЗ',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-008', process: 'Управление доступом', subProcess: 'Управление правами доступа',
    processOwner: '[ОУ-ИБ]', asset: 'AD, бизнес-приложения, привилегированные системы',
    assetCriticality: 4, ciaProperty: 'К+Ц',
    threat: 'Эскалация привилегий через избыточные права',
    vulnerability: 'Накопление прав при ротациях; отсутствие принципа least privilege; нерегулярный пересмотр прав',
    description: 'Сотрудники накапливают права доступа при переводах между подразделениями. Создаёт риск злоупотреблений и расширяет поверхность атаки при компрометации УЗ.',
    riskType: 'Риски доступа и идентификации', source: 'Внутренний',
    probability: 3, impact: 3,
    controls: 'Матрица доступа, RBAC (частично)',
    isoControls: 'A.5.15, A.8.2', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Внедрить регулярный пересмотр прав (recertification) — раз в полгода. 2) Внедрить роль-ориентированный доступ (RBAC) во всех ключевых системах. 3) SoD-матрица (разделение обязанностей).',
    treatmentOwner: '[ОУ-ИБ]', deadline: '2026-12-31',
    kri: '% УЗ с пересмотром прав за 6 мес.; кол-во SoD-конфликтов',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-010', process: 'Управление уязвимостями', subProcess: 'Patch management',
    processOwner: '[ОУ-ИТ]', asset: 'Серверы, сетевое оборудование, гипервизоры',
    assetCriticality: 5, ciaProperty: 'К+Ц+Д',
    threat: 'Эксплуатация неустранённых CVE',
    vulnerability: 'Отсутствие/нерегулярность процесса patch management; зависимость от вендоров для обновлений АБС',
    description: 'Известные уязвимости (CVE) на серверах и сетевом оборудовании, для которых не установлены обновления. Риск компрометации через публично известные эксплойты.',
    riskType: 'Кибербезопасностные риски', source: 'Смешанный',
    probability: 4, impact: 4,
    controls: 'Сканер уязвимостей (УТОЧНИТЬ), процесс обновления (УТОЧНИТЬ периодичность)',
    isoControls: 'A.8.8, A.8.32', nistFunction: 'ID-Identify',
    controlEffectiveness: 'Низкая',
    residualProbability: 3, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Формализовать политику patch management с SLA по критичности (Critical — 7 дней, High — 30 дней). 2) Ежемесячный отчёт по уязвимостям на Комитете по ИБ. 3) Виртуальный патчинг через WAF/IPS для систем без возможности быстрого обновления.',
    treatmentOwner: '[ОУ-ИТ]', deadline: '2026-09-30',
    kri: 'Среднее время устранения критичных CVE; кол-во CVE >30 дней',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-012', process: 'ДБО', subProcess: 'Защита веб-приложений',
    processOwner: '[ОУ-ИТ] / [Розница] / [Корпоратив]',
    asset: 'ДБО ФЛ, ДБО ЮЛ, мобильное приложение',
    assetCriticality: 5, ciaProperty: 'К+Ц+Д',
    threat: 'Эксплуатация уязвимостей веб-сервисов (OWASP Top 10)',
    vulnerability: 'Возможные ошибки разработки; недостаточный SAST/DAST; ограниченное покрытие WAF',
    description: 'SQL-инъекции, XSS, IDOR и другие уязвимости в системах ДБО. Прямая угроза средствам клиентов и репутации банка.',
    riskType: 'Кибербезопасностные риски', source: 'Смешанный',
    probability: 3, impact: 5,
    controls: 'WAF (УТОЧНИТЬ), периодический pentest (УТОЧНИТЬ)',
    isoControls: 'A.8.26, A.8.29', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Ежегодный внешний pentest ДБО. 2) Внедрить SAST/DAST в CI/CD. 3) Bug bounty или ответственное раскрытие уязвимостей. 4) Полное покрытие WAF.',
    treatmentOwner: '[ОУ-ИТ] / [ОУ-ИБ]', deadline: '2027-03-31',
    kri: 'Кол-во уязвимостей по результатам pentest; покрытие WAF',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-017', process: 'Управление доступом', subProcess: 'Аутентификация',
    processOwner: '[ОУ-ИБ]', asset: 'АБС, AD, VPN, ДБО, привилегированные УЗ',
    assetCriticality: 5, ciaProperty: 'К+Ц',
    threat: 'Отсутствие/частичное MFA для критичных систем',
    vulnerability: 'Доступ к критичным системам только по паролю; ограниченное покрытие MFA',
    description: 'Возможность входа в АБС, AD-админ-консоль, VPN, ДБО без второго фактора аутентификации. Делает банк уязвимым к атакам через скомпрометированные пароли.',
    riskType: 'Риски доступа и идентификации', source: 'Смешанный',
    probability: 4, impact: 5,
    controls: 'MFA внедрено частично (УТОЧНИТЬ перечень систем)',
    isoControls: 'A.8.5', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 3, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить дорожную карту внедрения MFA на все критичные системы. 2) MFA для всех привилегированных УЗ — приоритет 1. 3) MFA для удалённых пользователей — приоритет 2.',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-ИТ]', deadline: '2026-09-30',
    kri: '% критичных систем с MFA; % УЗ с MFA',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-CYB-018', process: 'Управление третьими сторонами', subProcess: 'Управление цепочкой поставок',
    processOwner: '[ОУ-ИБ] / [Юр.отдел]', asset: 'Системы, поддерживаемые внешними вендорами',
    assetCriticality: 4, ciaProperty: 'К+Ц+Д',
    threat: 'Компрометация поставщика (supply chain attack)',
    vulnerability: 'Отсутствие/неполнота процесса оценки ИБ-зрелости поставщиков; зависимость от обновлений вендора',
    description: 'Атака через цепочку поставок: компрометация вендора ПО, обновлений, ИТ-аутсорсера. Сложно обнаружить, последствия масштабны.',
    riskType: 'Риски третьих сторон / поставщиков', source: 'Внешний',
    probability: 3, impact: 4,
    controls: 'Договорные требования ИБ (частично), оценка поставщиков (УТОЧНИТЬ)',
    isoControls: 'A.5.19, A.5.21', nistFunction: 'GV-Govern',
    controlEffectiveness: 'Низкая',
    residualProbability: 3, residualImpact: 4,
    riskAppetite: 'Средний',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить процедуру оценки ИБ-зрелости вендоров (TPRM). 2) Опросный лист для всех поставщиков с доступом к данным/системам. 3) Включение требований ИБ во все новые договоры. 4) Right-to-audit clause.',
    treatmentOwner: '[ОУ-ИБ] / [Юр.отдел]', deadline: '2026-12-31',
    kri: '% поставщиков с оценкой ИБ; кол-во инцидентов через вендоров',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-001', process: 'Управление непрерывностью', subProcess: 'BCP/DRP для ИТ-сервисов',
    processOwner: '[ОУ-ИТ] / [ОУ-ИБ] / [Опер.риск]',
    asset: 'Все критичные ИТ-сервисы (АБС, ДБО, процессинг)',
    assetCriticality: 5, ciaProperty: 'Доступность',
    threat: 'Длительный простой критичных систем при отсутствии актуальных и протестированных BCP/DRP',
    vulnerability: 'Возможная неактуальность BCP/DRP; редкие тесты; необученность персонала; отсутствие резервного ЦОД (УТОЧНИТЬ)',
    description: 'Невозможность восстановления ИТ-сервисов в установленные сроки при инциденте. Прямое нарушение нормативов НБТ по непрерывности банковских операций.',
    riskType: 'Стратегические риски', source: 'Внутренний',
    probability: 3, impact: 5,
    controls: 'План ОНБ, инструкции по восстановлению (УТОЧНИТЬ актуальность)',
    isoControls: 'A.5.29, A.5.30', nistFunction: 'RC-Recover',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Актуализировать BCP/DRP по результатам последних изменений в инфраструктуре. 2) Ежегодный полный тест DRP. 3) Полугодовые тесты по сценариям. 4) Резервный ЦОД с RTO согласно BIA.',
    treatmentOwner: '[ОУ-ИТ] / [ОУ-ИБ]', deadline: '2027-03-31',
    kri: 'Дата последнего теста DRP; результаты теста (RTO/RPO достигнут?)',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-002', process: 'Управление непрерывностью', subProcess: 'Резервное копирование',
    processOwner: '[ОУ-ИТ]', asset: 'Резервные копии АБС, БД клиентов, конфигурации систем',
    assetCriticality: 5, ciaProperty: 'Ц+Д',
    threat: 'Невозможность восстановления данных из резервных копий при необходимости',
    vulnerability: 'Возможная нехватка тестов восстановления; зависимость от единственного хранилища; отсутствие иммутабельных копий',
    description: 'Резервные копии создаются, но регулярное тестирование восстановления может быть недостаточным. Риск обнаружения проблем только в момент инцидента.',
    riskType: 'Технические/инфраструктурные риски', source: 'Внутренний',
    probability: 3, impact: 5,
    controls: 'Резервное копирование (УТОЧНИТЬ конфигурацию), журнал бэкапов',
    isoControls: 'A.8.13', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Ежеквартальные тесты восстановления критичных систем. 2) Внедрить иммутабельные копии для защиты от ransomware. 3) Удалённое off-site хранение копий. 4) Соответствие правилу 3-2-1.',
    treatmentOwner: '[ОУ-ИТ]', deadline: '2026-09-30',
    kri: 'Доля успешных тестов восстановления; глубина хранения копий',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-003', process: 'Управление инцидентами', subProcess: 'Реагирование на инциденты ИБ',
    processOwner: '[ОУ-ИБ]', asset: 'Все ИТ-системы и данные банка',
    assetCriticality: 4, ciaProperty: 'К+Ц+Д',
    threat: 'Несвоевременное или неэффективное реагирование на инциденты ИБ',
    vulnerability: 'Возможное отсутствие формализованного IRP (Incident Response Plan); ограниченный мониторинг; отсутствие 24/7 SOC',
    description: 'Инциденты ИБ могут обнаруживаться с задержкой, что увеличивает ущерб и время восстановления. Без формального IRP возможны хаотичные действия при инциденте.',
    riskType: 'Кибербезопасностные риски', source: 'Внутренний',
    probability: 4, impact: 4,
    controls: 'SIEM (УТОЧНИТЬ покрытие), журнал инцидентов, процедура ОПКО',
    isoControls: 'A.5.24, A.5.26, A.5.27', nistFunction: 'RS-Respond',
    controlEffectiveness: 'Средняя',
    residualProbability: 3, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить и протестировать IRP. 2) Tabletop-учения 2 раза в год. 3) Расширить покрытие SIEM (включая ДБО, АБС-приложения). 4) Оценить целесообразность внешнего MSSP/SOC.',
    treatmentOwner: '[ОУ-ИБ]', deadline: '2026-12-31',
    kri: 'Среднее время обнаружения (MTTD); среднее время реагирования (MTTR)',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-004', process: 'Управление изменениями', subProcess: 'Внесение изменений в продуктивную среду',
    processOwner: '[ОУ-ИТ]', asset: 'АБС, ДБО, инфраструктурные сервисы',
    assetCriticality: 4, ciaProperty: 'Ц+Д',
    threat: 'Сбой систем после неуправляемых изменений в продуктивной среде',
    vulnerability: 'Возможная неполнота процедуры change management; отсутствие тестовой среды для всех систем; нерегулярное согласование на CAB',
    description: 'Изменения в АБС, ДБО, сетевой инфраструктуре, внесённые без полноценного тестирования и согласования, приводят к сбоям и простоям.',
    riskType: 'Процессные/организационные риски', source: 'Внутренний',
    probability: 3, impact: 4,
    controls: 'Процедура change management, тестовая среда (УТОЧНИТЬ покрытие)',
    isoControls: 'A.8.32', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 3,
    riskAppetite: 'Средний',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить регламент Change Advisory Board (CAB). 2) Категоризация изменений (Standard/Normal/Emergency). 3) Обязательный rollback-план для всех изменений. 4) Полное покрытие тестовой средой критичных систем.',
    treatmentOwner: '[ОУ-ИТ]', deadline: '2026-09-30',
    kri: 'Кол-во инцидентов из-за изменений; % изменений с rollback-планом',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-005', process: 'Управление персоналом', subProcess: 'Осведомлённость персонала',
    processOwner: '[ОУ-ИБ] / [ОУ-Кадров]', asset: 'Все сотрудники банка',
    assetCriticality: 4, ciaProperty: 'К+Ц',
    threat: 'Нарушения ИБ из-за низкой осведомлённости персонала',
    vulnerability: 'Нерегулярность тренингов; отсутствие тестирования знаний; устаревший контент',
    description: 'Сотрудники банка — основной вектор атак. Без регулярного обучения и проверки знаний возрастает вероятность успешного фишинга, утечек, нарушений политик ИБ.',
    riskType: 'Процессные/организационные риски', source: 'Внутренний',
    probability: 4, impact: 3,
    controls: 'Программа обучения (УТОЧНИТЬ периодичность), тесты ИБ',
    isoControls: 'A.6.3', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 3, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить ежегодную программу обучения с обязательным тестированием. 2) Phishing-симуляции 1 раз в квартал. 3) Целевые тренинги для группы риска (бухгалтерия, ИТ-админы, топ-менеджмент). 4) Обучение при приёме на работу (onboarding).',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-Кадров]', deadline: '2027-03-31',
    kri: '% сотрудников, прошедших обучение; средний балл тестов',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-006', process: 'Соответствие требованиям', subProcess: 'Регуляторное соответствие НБТ',
    processOwner: '[ОУ-ИБ] / [Комплаенс]', asset: 'Все ИТ/ИБ-процессы и документация',
    assetCriticality: 5, ciaProperty: 'К+Ц+Д',
    threat: 'Несоответствие требованиям НБТ к ИБ и ИТ в банковской деятельности',
    vulnerability: 'Возможная задержка адаптации к новым нормативам; недостаточная регулярность внутреннего контроля',
    description: 'Несоответствие требованиям НБТ ведёт к предписаниям, штрафам, ограничениям лицензии. Один из основных регуляторных рисков для банка.',
    riskType: 'Регуляторно-правовые риски', source: 'Внешний',
    probability: 3, impact: 5,
    controls: 'Внутренние политики, периодические проверки СВА, отчётность в НБТ',
    isoControls: 'A.5.31, A.5.36', nistFunction: 'GV-Govern',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 4,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Реестр регуляторных требований с привязкой к контролям. 2) Ежегодный gap-анализ против требований НБТ. 3) Своевременная актуализация политик и процедур. 4) Подготовка ответов на запросы НБТ в установленные сроки.',
    treatmentOwner: '[ОУ-ИБ] / [Комплаенс]', deadline: '2026-09-30',
    kri: 'Кол-во замечаний НБТ; своевременность ответов на запросы',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-007', process: 'Управление ИБ', subProcess: 'Защита ПДн (Закон РТ № 1537)',
    processOwner: '[ОУ-ИБ] / [Комплаенс]', asset: 'ПДн клиентов, ПДн сотрудников',
    assetCriticality: 5, ciaProperty: 'К+Ц',
    threat: 'Нарушение требований Закона РТ № 1537 «О защите персональных данных»',
    vulnerability: 'Возможное отсутствие реестра обработок ПДн; согласия клиентов; локализация данных',
    description: 'Несоответствие требованиям законодательства РТ по защите ПДн ведёт к штрафам, искам клиентов, репутационному ущербу.',
    riskType: 'Регуляторно-правовые риски', source: 'Внешний',
    probability: 3, impact: 4,
    controls: 'Положение об обработке ПДн (УТОЧНИТЬ актуальность), согласия клиентов',
    isoControls: 'A.5.34', nistFunction: 'GV-Govern',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить и поддерживать реестр обработок ПДн. 2) Регламент реагирования на запросы субъектов ПДн. 3) Pre-DPIA для новых ИТ-проектов с ПДн. 4) Локализация хранения ПДн на территории РТ.',
    treatmentOwner: '[ОУ-ИБ] / [Юр.отдел]', deadline: '2026-09-30',
    kri: 'Кол-во жалоб от субъектов ПДн; кол-во инцидентов с ПДн',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-008', process: 'Управление ИТ-проектами', subProcess: 'Внедрение новых ИТ-продуктов',
    processOwner: '[ОУ-ИТ] / [Бизнес-владелец]', asset: 'Новые внедряемые ИТ-системы',
    assetCriticality: 3, ciaProperty: 'К+Ц+Д',
    threat: 'Внедрение ИТ-систем без должной проверки требований ИБ (security-by-design)',
    vulnerability: 'Подключение ИБ к проектам на поздних стадиях; отсутствие обязательной приёмки ИБ',
    description: 'Если ИБ привлекается только на этапе приёмки, исправление архитектурных недостатков становится дорогим или невозможным. Системы выходят в эксплуатацию с встроенными уязвимостями.',
    riskType: 'Стратегические риски', source: 'Внутренний',
    probability: 3, impact: 4,
    controls: 'Согласование ИБ при внедрении (УТОЧНИТЬ обязательность)',
    isoControls: 'A.8.25, A.8.27', nistFunction: 'ID-Identify',
    controlEffectiveness: 'Низкая',
    residualProbability: 3, residualImpact: 3,
    riskAppetite: 'Средний',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Включить ИБ обязательным согласующим во все ИТ-проекты с этапа инициации. 2) Чек-лист security-by-design. 3) Обязательная безопасная конфигурация (CIS) до ввода в эксплуатацию. 4) Pen-test перед production-релизом.',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-ИТ]', deadline: '2026-12-31',
    kri: '% проектов с участием ИБ; кол-во уязвимостей, обнаруженных после запуска',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-009', process: 'Управление третьими сторонами', subProcess: 'Удалённый доступ подрядчиков',
    processOwner: '[ОУ-ИБ] / [ОУ-ИТ]', asset: 'Серверы, сетевое оборудование, БД',
    assetCriticality: 4, ciaProperty: 'К+Ц',
    threat: 'Утечка или НСД через подрядчиков с удалённым доступом',
    vulnerability: 'Постоянный VPN-доступ подрядчиков; недостаточный контроль сессий; ограниченное журналирование',
    description: 'Подрядчики ИТ часто имеют постоянный удалённый доступ к серверам банка. Без должного контроля и журналирования действий это создаёт значительные риски.',
    riskType: 'Риски третьих сторон / поставщиков', source: 'Смешанный',
    probability: 3, impact: 4,
    controls: 'VPN, NDA, журналирование (УТОЧНИТЬ полноту)',
    isoControls: 'A.5.19, A.5.22', nistFunction: 'PR-Protect',
    controlEffectiveness: 'Средняя',
    residualProbability: 2, residualImpact: 3,
    riskAppetite: 'Низкий',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Внедрить PAM с записью сессий подрядчиков. 2) Доступ по запросу (just-in-time), а не постоянный. 3) MFA для всех внешних подключений. 4) Регулярный аудит активности подрядчиков.',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-ИТ]', deadline: '2026-09-30',
    kri: 'Кол-во подрядчиков с постоянным доступом; % сессий с записью',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  },
  {
    id: 'R-OPS-010', process: 'Управление активами', subProcess: 'Реестр и классификация активов',
    processOwner: '[ОУ-ИБ] / [ОУ-ИТ]', asset: 'Все информационные активы банка',
    assetCriticality: 3, ciaProperty: 'К+Ц+Д',
    threat: 'Неполнота реестра активов и отсутствие классификации',
    vulnerability: 'Отсутствие или неполнота актуального реестра активов; отсутствие классификации информации',
    description: 'Без полного реестра активов и классификации невозможно эффективно применять контроли ИБ. Прямое требование ISO 27001 (A.5.9, A.5.12).',
    riskType: 'Процессные/организационные риски', source: 'Внутренний',
    probability: 3, impact: 3,
    controls: 'Частичный реестр в CMDB / AD (УТОЧНИТЬ полноту)',
    isoControls: 'A.5.9, A.5.12, A.5.13', nistFunction: 'ID-Identify',
    controlEffectiveness: 'Низкая',
    residualProbability: 3, residualImpact: 3,
    riskAppetite: 'Средний',
    treatmentDecision: 'Снижать (Mitigate)',
    treatmentPlan: '1) Утвердить методологию классификации информации. 2) Полная инвентаризация ИТ-активов с классификацией критичности. 3) Маркировка документов и баз данных по классификации. 4) Ежегодная актуализация реестра.',
    treatmentOwner: '[ОУ-ИБ] / [ОУ-ИТ]', deadline: '2027-03-31',
    kri: '% активов с классификацией; дата последней актуализации реестра',
    identifiedAt: '2025-11-04', lastReviewedAt: '2025-11-04', nextReviewAt: '2026-11-04',
    status: 'Открыт', comments: ''
  }
];

// ============= EXCEL I/O =============
export const exportRiskMapToXlsx = (records, filename = 'Карта рисков ИТ и ИБ.xlsx') => {
  const headers = EXCEL_COLUMNS.map((c) => c.label);
  const rows = records.map((r) => EXCEL_COLUMNS.map(({ key }) => {
    if (key === 'inherentScore') return inherentScore(r);
    if (key === 'inherentLevel') return riskZone(inherentScore(r)).name;
    if (key === 'residualScore') return residualScore(r);
    if (key === 'residualLevel') return riskZone(residualScore(r)).name;
    return r[key] ?? '';
  }));
  const aoa = [headers, ...rows];
  const ws = xlsxUtils.aoa_to_sheet(aoa);
  // Ширины колонок
  ws['!cols'] = EXCEL_COLUMNS.map((c) => ({ wch: Math.min(48, Math.max(12, c.label.length + 4)) }));
  const wb = xlsxUtils.book_new();
  xlsxUtils.book_append_sheet(wb, ws, 'Карта рисков ИТ и ИБ');
  xlsxWrite(wb, filename, { bookType: 'xlsx', compression: true });
};

export const importRiskMapFromXlsx = async (file) => {
  const buf = await file.arrayBuffer();
  const wb = xlsxRead(buf, { type: 'array' });
  // Берём первый лист, либо «Карта рисков ИТ и ИБ»
  const sheetName = wb.SheetNames.find((n) => /карт/i.test(n)) || wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = xlsxUtils.sheet_to_json(ws, { header: 1, defval: '' });
  if (!aoa.length) return { records: [], errors: ['Лист пуст'] };

  // Ищем строку с заголовками — содержит «ID» и «Процесс»
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, aoa.length); i++) {
    const row = aoa[i].map((c) => String(c).trim().toLowerCase());
    if (row.includes('id') && row.some((c) => c.includes('процесс'))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return { records: [], errors: ['Не найдена строка заголовков (ожидается колонка «ID» и «Процесс»)'] };

  const headers = aoa[headerRowIdx].map((c) => String(c).trim());
  // Сопоставляем заголовки с keys по нормализованному label
  const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
  const labelToKey = new Map(EXCEL_COLUMNS.map((c) => [norm(c.label), c.key]));
  const colMap = headers.map((h) => labelToKey.get(norm(h)) || null);

  const records = [];
  const errors = [];
  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row || row.every((c) => c === '' || c === null || c === undefined)) continue;
    const rec = emptyRiskMap();
    let hasContent = false;
    row.forEach((val, idx) => {
      const key = colMap[idx];
      if (!key) return;
      const col = EXCEL_COLUMNS.find((c) => c.key === key);
      if (col?.computed) return;
      let v = val;
      if (key === 'identifiedAt' || key === 'lastReviewedAt' || key === 'nextReviewAt' || key === 'deadline') {
        v = parseDateLike(val);
      } else if (['assetCriticality', 'probability', 'impact', 'residualProbability', 'residualImpact'].includes(key)) {
        v = Number(val) || 0;
      } else {
        v = val === null || val === undefined ? '' : String(val);
      }
      rec[key] = v;
      if (v !== '' && v !== 0) hasContent = true;
    });
    if (!rec.id) {
      // если ID отсутствует — пропускаем
      continue;
    }
    if (hasContent) records.push(rec);
  }
  return { records, errors };
};

// ============= HEATMAP MATRIX =============
const RiskMapMatrix = ({ records, mode = 'residual', onCellClick, title }) => {
  const grid = useMemo(() => {
    const g = {};
    for (let p = 1; p <= 5; p++) for (let i = 1; i <= 5; i++) g[`${p}-${i}`] = [];
    records.forEach((r) => {
      const p = mode === 'residual' ? r.residualProbability : r.probability;
      const i = mode === 'residual' ? r.residualImpact : r.impact;
      const key = `${p}-${i}`;
      if (g[key]) g[key].push(r);
    });
    return g;
  }, [records, mode]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{title}</div>
        <div className="text-[10px] text-zinc-600 font-mono">
          {mode === 'residual' ? 'Остаточный' : 'Присущий'} · 5×5
        </div>
      </div>
      <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-1 text-xs">
        <div></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="text-center text-zinc-500 text-[10px] uppercase tracking-wider pb-1">{i}</div>
        ))}
        {[5, 4, 3, 2, 1].map((p) => (
          <React.Fragment key={p}>
            <div className="text-zinc-500 text-[10px] uppercase tracking-wider pr-2 flex items-center justify-end">{p}</div>
            {[1, 2, 3, 4, 5].map((i) => {
              const cell = grid[`${p}-${i}`] || [];
              const score = p * i;
              const z = riskZone(score);
              return (
                <button
                  key={`${p}-${i}`}
                  onClick={() => cell.length && onCellClick && onCellClick(cell)}
                  className={`aspect-square rounded flex items-center justify-center font-mono font-bold text-zinc-950 transition-transform ${z.class} ${cell.length ? 'cursor-pointer hover:scale-105' : 'opacity-25 cursor-default'}`}
                  title={`Вер. ${p} × Возд. ${i} = ${score}${cell.length ? ` · ${cell.length} риск(ов)` : ''}`}
                >
                  {cell.length || ''}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3 text-[10px] text-zinc-500">
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-600"></span>Критич.</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-600"></span>Высокий</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-600"></span>Средний</span>
        <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-700"></span>Низкий</span>
        <span className="ml-auto text-zinc-600">Y — Вероятность · X — Воздействие</span>
      </div>
    </Card>
  );
};

// ============= FORM =============
const RiskMapForm = ({ initial, onSave, onCancel }) => {
  const [data, setData] = useState(initial || emptyRiskMap());
  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const inh = inherentScore(data);
  const res = residualScore(data);
  const inhZ = riskZone(inh);
  const resZ = riskZone(res);

  const handleSave = () => {
    if (!data.process || !data.threat || !data.description) {
      alert('Заполните обязательные поля: Процесс, Угроза, Описание риска');
      return;
    }
    onSave(data);
  };

  return (
    <div className="space-y-5">
      {/* === ИДЕНТИФИКАЦИЯ === */}
      <Section title="Идентификация">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="ID" value={data.id} onChange={(v) => update('id', v)} placeholder="Авто, если оставить пустым" />
          <Input label="Процесс" value={data.process} onChange={(v) => update('process', v)} required />
          <Input label="Подпроцесс" value={data.subProcess} onChange={(v) => update('subProcess', v)} />
          <Input label="Владелец процесса" value={data.processOwner} onChange={(v) => update('processOwner', v)} placeholder="[ОУ-ИБ] / должность" />
        </div>
      </Section>

      {/* === АКТИВ И УГРОЗЫ === */}
      <Section title="Актив и угрозы">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Актив" value={data.asset} onChange={(v) => update('asset', v)} placeholder="Какой ИТ-актив затрагивает риск" />
          <ScaleSelect label="Критичность актива (0–5)" value={data.assetCriticality} onChange={(v) => update('assetCriticality', v)} />
          <Select label="Свойство КЦД" value={data.ciaProperty} onChange={(v) => update('ciaProperty', v)} options={RISKMAP_CIA} />
        </div>
        <TextArea label="Угроза" value={data.threat} onChange={(v) => update('threat', v)} rows={2} required />
        <TextArea label="Уязвимость" value={data.vulnerability} onChange={(v) => update('vulnerability', v)} rows={2} />
      </Section>

      {/* === ОПИСАНИЕ === */}
      <Section title="Описание">
        <TextArea label="Описание риска" value={data.description} onChange={(v) => update('description', v)} rows={3} required />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Тип риска" value={data.riskType} onChange={(v) => update('riskType', v)} options={RISKMAP_TYPES} />
          <Select label="Источник риска" value={data.source} onChange={(v) => update('source', v)} options={RISKMAP_SOURCES} />
        </div>
      </Section>

      {/* === ПРИСУЩИЙ РИСК === */}
      <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Оценка присущего риска</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Присущий риск:</span>
            <span className={`px-2 py-0.5 text-sm font-mono font-bold rounded text-zinc-950 ${inhZ.class}`}>{inh}</span>
            <span className="text-xs text-zinc-300">{inhZ.name}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScaleSelect label="Вероятность (0–5)" value={data.probability} onChange={(v) => update('probability', v)} />
          <ScaleSelect label="Воздействие (0–5)" value={data.impact} onChange={(v) => update('impact', v)} />
        </div>
      </div>

      {/* === КОНТРОЛИ === */}
      <Section title="Контроли">
        <TextArea label="Существующие контроли" value={data.controls} onChange={(v) => update('controls', v)} rows={2} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="ISO 27001 Annex A" value={data.isoControls} onChange={(v) => update('isoControls', v)} placeholder="A.5.31, A.6.3" />
          <Select label="Функция NIST CSF" value={data.nistFunction} onChange={(v) => update('nistFunction', v)} options={NIST_FUNCTIONS} />
          <Select label="Эффективность контроля" value={data.controlEffectiveness} onChange={(v) => update('controlEffectiveness', v)} options={CONTROL_EFFECTIVENESS} />
        </div>
      </Section>

      {/* === ОСТАТОЧНЫЙ РИСК === */}
      <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Оценка остаточного риска</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Остаточный риск:</span>
            <span className={`px-2 py-0.5 text-sm font-mono font-bold rounded text-zinc-950 ${resZ.class}`}>{res}</span>
            <span className="text-xs text-zinc-300">{resZ.name}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScaleSelect label="Остаточная вероятность (0–5)" value={data.residualProbability} onChange={(v) => update('residualProbability', v)} />
          <ScaleSelect label="Остаточное воздействие (0–5)" value={data.residualImpact} onChange={(v) => update('residualImpact', v)} />
        </div>
        <Select label="Риск-аппетит (целевой уровень)" value={data.riskAppetite} onChange={(v) => update('riskAppetite', v)} options={RISK_APPETITE_LEVELS} />
      </div>

      {/* === ОБРАБОТКА === */}
      <Section title="Обработка">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Решение по обработке" value={data.treatmentDecision} onChange={(v) => update('treatmentDecision', v)} options={TREATMENT_DECISIONS} />
          <Input label="Срок реализации" type="date" value={data.deadline} onChange={(v) => update('deadline', v)} />
        </div>
        <TextArea label="План обработки" value={data.treatmentPlan} onChange={(v) => update('treatmentPlan', v)} rows={3} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="Ответственный за обработку" value={data.treatmentOwner} onChange={(v) => update('treatmentOwner', v)} />
          <Input label="KRI / индикатор" value={data.kri} onChange={(v) => update('kri', v)} placeholder="Метрики мониторинга" />
        </div>
      </Section>

      {/* === ПЕРЕСМОТР === */}
      <Section title="Пересмотр">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Дата идентификации" type="date" value={data.identifiedAt} onChange={(v) => update('identifiedAt', v)} />
          <Input label="Дата последнего пересмотра" type="date" value={data.lastReviewedAt} onChange={(v) => update('lastReviewedAt', v)} />
          <Input label="Дата следующего пересмотра" type="date" value={data.nextReviewAt} onChange={(v) => update('nextReviewAt', v)} />
        </div>
      </Section>

      {/* === СТАТУС === */}
      <Section title="Статус">
        <Select label="Статус" value={data.status} onChange={(v) => update('status', v)} options={RISKMAP_STATUS} />
        <TextArea label="Комментарии" value={data.comments} onChange={(v) => update('comments', v)} rows={2} />
      </Section>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="primary" onClick={handleSave}>{initial ? 'Сохранить' : 'Создать'}</Button>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <div className="space-y-3">
    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 font-semibold border-b border-zinc-800 pb-1">{title}</div>
    <div className="space-y-3">{children}</div>
  </div>
);

// ============= READ-ONLY VIEW =============
const RiskMapView = ({ record, onClose, onEdit, onDelete, canEdit, canDelete }) => {
  const inh = inherentScore(record);
  const res = residualScore(record);
  const inhZ = riskZone(inh);
  const resZ = riskZone(res);

  const Field = ({ label, value, mono = false, full = false }) => (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-0.5">{label}</div>
      <div className={`text-sm text-zinc-200 ${mono ? 'font-mono' : ''} whitespace-pre-wrap break-words`}>{value || '—'}</div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
        <Field label="ID" value={record.id} mono />
        <Field label="Статус" value={record.status} />
        <Field label="Процесс" value={record.process} />
        <Field label="Подпроцесс" value={record.subProcess} />
        <Field label="Владелец процесса" value={record.processOwner} />
        <Field label="Тип риска" value={record.riskType} />
      </div>

      <Section title="Актив и угрозы">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Актив" value={record.asset} />
          <Field label="Критичность актива" value={String(record.assetCriticality || '—')} mono />
          <Field label="Свойство КЦД" value={record.ciaProperty} />
          <Field label="Источник" value={record.source} />
          <Field label="Угроза" value={record.threat} full />
          <Field label="Уязвимость" value={record.vulnerability} full />
        </div>
      </Section>

      <Section title="Описание">
        <Field label="Описание риска" value={record.description} full />
      </Section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">Присущий риск</div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-lg font-mono font-bold rounded text-zinc-950 ${inhZ.class}`}>{inh}</span>
            <span className="text-sm text-zinc-300">{inhZ.name}</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500">P={record.probability || 0} × I={record.impact || 0}</div>
        </div>
        <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-2">Остаточный риск</div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-lg font-mono font-bold rounded text-zinc-950 ${resZ.class}`}>{res}</span>
            <span className="text-sm text-zinc-300">{resZ.name}</span>
          </div>
          <div className="mt-2 text-xs text-zinc-500">P={record.residualProbability || 0} × I={record.residualImpact || 0} · Аппетит: {record.riskAppetite || '—'}</div>
        </div>
      </div>

      <Section title="Контроли">
        <Field label="Существующие контроли" value={record.controls} full />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="ISO 27001 Annex A" value={record.isoControls} mono />
          <Field label="Функция NIST CSF" value={record.nistFunction} mono />
          <Field label="Эффективность контроля" value={record.controlEffectiveness} />
        </div>
      </Section>

      <Section title="Обработка">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Решение по обработке" value={record.treatmentDecision} />
          <Field label="Срок реализации" value={formatDate(record.deadline)} />
        </div>
        <Field label="План обработки" value={record.treatmentPlan} full />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Ответственный за обработку" value={record.treatmentOwner} />
          <Field label="KRI / индикатор" value={record.kri} />
        </div>
      </Section>

      <Section title="Пересмотр">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">
          <Field label="Дата идентификации" value={formatDate(record.identifiedAt)} />
          <Field label="Последний пересмотр" value={formatDate(record.lastReviewedAt)} />
          <Field label="Следующий пересмотр" value={formatDate(record.nextReviewAt)} />
        </div>
      </Section>

      {record.comments && (
        <Section title="Комментарии">
          <Field label="" value={record.comments} full />
        </Section>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
        {canDelete && <Button variant="danger" onClick={onDelete}>Удалить</Button>}
        {canEdit && <Button variant="secondary" onClick={onEdit}>Редактировать</Button>}
        <Button variant="ghost" onClick={onClose}>Закрыть</Button>
      </div>
    </div>
  );
};

// ============= MAIN PAGE =============
export const RiskMapPage = ({ records, onCreate, onUpdate, onDelete, onLoadSeed, onClearAll, onImport, onExport }) => {
  const auth = useAuth();
  const canCreate = auth.can('riskmap.create');
  const canEdit = auth.can('riskmap.edit');
  const canDelete = auth.can('riskmap.delete');

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNist, setFilterNist] = useState('');
  const [filterZone, setFilterZone] = useState(''); // по остаточному риску
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [matrixModal, setMatrixModal] = useState(null);
  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (search) {
        const s = search.toLowerCase();
        const hay = [r.id, r.process, r.threat, r.description, r.asset, r.treatmentOwner].join(' ').toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (filterType && r.riskType !== filterType) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterNist && r.nistFunction !== filterNist) return false;
      if (filterZone) {
        const z = riskZone(residualScore(r)).name;
        if (z !== filterZone) return false;
      }
      return true;
    });
  }, [records, search, filterType, filterStatus, filterNist, filterZone]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { records: imported, errors } = await importRiskMapFromXlsx(file);
      if (errors?.length) {
        alert('Ошибки импорта:\n' + errors.join('\n'));
        return;
      }
      if (!imported.length) {
        alert('Файл не содержит распознанных записей');
        return;
      }
      const replace = confirm(`Импортировано записей: ${imported.length}.\n\nНажмите OK — заменить текущие записи.\nОтмена — добавить к существующим.`);
      await onImport(imported, replace);
    } catch (err) {
      console.error('Import error:', err);
      alert('Ошибка импорта: ' + (err?.message || 'неизвестная'));
    }
  };

  return (
    <div className="space-y-5">
      {/* === HEADER === */}
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
              <Map size={20} className="text-amber-400" />Карта рисков ИТ и ИБ
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Реестр в стандарте ISO 27001 Annex A + NIST CSF 2.0 · {records.length} запис(ей)</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} title="Импорт из Excel">
              <Upload size={14} />Импорт
            </Button>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button variant="outline" size="sm" onClick={onExport} title="Экспорт в Excel">
              <Download size={14} />Экспорт
            </Button>
            {canCreate && records.length === 0 && (
              <Button variant="secondary" size="sm" onClick={onLoadSeed} title="Загрузить демо-данные">
                <RefreshCw size={14} />Демо
              </Button>
            )}
            {canDelete && records.length > 0 && (
              <Button variant="ghost" size="sm" onClick={onClearAll} title="Удалить все">
                <Trash2 size={14} />Очистить
              </Button>
            )}
            {canCreate && (
              <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                <Plus size={14} />Новая запись
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* === HEATMAP === */}
      {records.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RiskMapMatrix records={records} mode="inherent" title="Матрица присущего риска"
            onCellClick={(items) => setMatrixModal({ items, mode: 'inherent' })} />
          <RiskMapMatrix records={records} mode="residual" title="Матрица остаточного риска"
            onCellClick={(items) => setMatrixModal({ items, mode: 'residual' })} />
        </div>
      )}

      {/* === FILTERS === */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Поиск по ID, процессу, угрозе, активу..."
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 pl-9 pr-3 py-2 text-sm rounded outline-none focus:border-amber-400/60" />
          </div>
          <Select label="" value={filterType} onChange={setFilterType} options={['', ...RISKMAP_TYPES]} placeholder="Все типы" />
          <Select label="" value={filterNist} onChange={setFilterNist} options={['', ...NIST_FUNCTIONS]} placeholder="Все функции NIST" />
          <Select label="" value={filterStatus} onChange={setFilterStatus} options={['', ...RISKMAP_STATUS]} placeholder="Все статусы" />
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 mr-1">Зона остаточного риска:</span>
          {['', 'Критический', 'Высокий', 'Средний', 'Низкий'].map((z) => (
            <button key={z || 'all'} onClick={() => setFilterZone(z)}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                filterZone === z ? 'bg-amber-400 text-zinc-950 border-amber-400' : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
              }`}>
              {z || 'Все'}
            </button>
          ))}
        </div>
      </Card>

      {/* === TABLE === */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <FileSpreadsheet size={32} className="mx-auto mb-2 text-zinc-700" />
            <div className="text-sm">{records.length === 0 ? 'Реестр пуст. Создайте запись или загрузите демо/импорт из Excel.' : 'Ничего не найдено по фильтрам'}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60 border-b border-zinc-800">
                <tr className="text-left text-[10px] uppercase tracking-wider text-zinc-500">
                  <th className="px-3 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Процесс / Угроза</th>
                  <th className="px-3 py-2.5 font-medium">Тип</th>
                  <th className="px-3 py-2.5 font-medium text-center">Присущий</th>
                  <th className="px-3 py-2.5 font-medium text-center">Остаточный</th>
                  <th className="px-3 py-2.5 font-medium">NIST</th>
                  <th className="px-3 py-2.5 font-medium">Срок</th>
                  <th className="px-3 py-2.5 font-medium">Статус</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const inh = inherentScore(r);
                  const res = residualScore(r);
                  const inhZ = riskZone(inh);
                  const resZ = riskZone(res);
                  return (
                    <tr key={r.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors cursor-pointer"
                      onClick={() => setViewing(r)}>
                      <td className="px-3 py-2.5 font-mono text-xs text-amber-400 whitespace-nowrap">{r.id}</td>
                      <td className="px-3 py-2.5 max-w-[420px]">
                        <div className="text-zinc-200 truncate" title={r.threat}>{r.threat || '—'}</div>
                        <div className="text-[11px] text-zinc-500 truncate" title={r.process}>{r.process}{r.subProcess ? ` · ${r.subProcess}` : ''}</div>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{r.riskType || '—'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-[11px] font-mono font-bold rounded text-zinc-950 ${inhZ.class}`}>{inh}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-block px-1.5 py-0.5 text-[11px] font-mono font-bold rounded text-zinc-950 ${resZ.class}`}>{res}</span>
                      </td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs font-mono whitespace-nowrap">{r.nistFunction || '—'}</td>
                      <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{formatDate(r.deadline)}</td>
                      <td className="px-3 py-2.5">
                        <Badge color={statusColorMap(r.status)}>{r.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* === MODALS === */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Новая запись · Карта рисков ИТ/ИБ" size="xl">
        {creating && <RiskMapForm onSave={(d) => { onCreate(d); setCreating(false); }} onCancel={() => setCreating(false)} />}
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Редактирование ${editing?.id || ''}`} size="xl">
        {editing && <RiskMapForm initial={editing} onSave={(d) => { onUpdate(editing.id, d); setEditing(null); }} onCancel={() => setEditing(null)} />}
      </Modal>
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Карта рисков · ${viewing?.id || ''}`} size="xl">
        {viewing && (
          <RiskMapView record={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setViewing(null); }}
            onDelete={() => { if (confirm(`Удалить запись ${viewing.id}?`)) { onDelete(viewing.id); setViewing(null); } }}
            canEdit={canEdit} canDelete={canDelete} />
        )}
      </Modal>
      <Modal open={!!matrixModal} onClose={() => setMatrixModal(null)}
        title={`Риски в ячейке (${matrixModal?.mode === 'residual' ? 'остаточный' : 'присущий'})`}>
        {matrixModal && (
          <div className="space-y-2">
            {matrixModal.items.map((r) => {
              const score = matrixModal.mode === 'residual' ? residualScore(r) : inherentScore(r);
              const z = riskZone(score);
              return (
                <button key={r.id} onClick={() => { setMatrixModal(null); setViewing(r); }}
                  className="w-full flex items-center gap-3 p-3 bg-zinc-950/60 border border-zinc-800 rounded text-left hover:bg-zinc-900">
                  <span className="font-mono text-xs text-amber-400">{r.id}</span>
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold rounded text-zinc-950 ${z.class}`}>{score}</span>
                  <span className="flex-1 text-sm text-zinc-200 truncate">{r.threat || r.description}</span>
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
};

const statusColorMap = (s) => ({
  'Открыт':   'rose',
  'В работе': 'sky',
  'Принят':   'amber',
  'Закрыт':   'emerald'
}[s] || 'zinc');

// ============= DASHBOARD WIDGETS =============
export const RiskMapDashboardSection = ({ records, onCellClick }) => {
  const auth = useAuth();
  if (!auth.can('riskmap.view')) return null;
  if (!records.length) return null;

  const stats = useMemo(() => {
    const total = records.length;
    let critical = 0, high = 0, overAppetite = 0, openCount = 0;
    records.forEach((r) => {
      const z = riskZone(residualScore(r)).name;
      if (z === 'Критический') critical++;
      if (z === 'Высокий') high++;
      // Превышение аппетита: фактическая зона выше целевой
      const order = { 'Низкий': 1, 'Средний': 2, 'Высокий': 3, 'Критический': 4 };
      if (r.riskAppetite && order[z] > (order[r.riskAppetite] || 0)) overAppetite++;
      if (r.status === 'Открыт' || r.status === 'В работе') openCount++;
    });
    return { total, critical, high, overAppetite, openCount };
  }, [records]);

  const nistDistribution = useMemo(() => {
    const counts = {};
    records.forEach((r) => { if (r.nistFunction) counts[r.nistFunction] = (counts[r.nistFunction] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  const typeDistribution = useMemo(() => {
    const counts = {};
    records.forEach((r) => { if (r.riskType) counts[r.riskType] = (counts[r.riskType] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [records]);

  const TYPE_COLORS = ['#f43f5e', '#fb923c', '#fbbf24', '#10b981', '#38bdf8', '#a78bfa', '#2dd4bf', '#a1a1aa'];

  return (
    <div className="space-y-4 mt-2">
      <div className="flex items-center gap-2 px-1">
        <Map size={16} className="text-amber-400" />
        <h2 className="text-sm font-semibold text-zinc-100 tracking-tight uppercase">Карта рисков ИТ/ИБ</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="Записей в карте" value={stats.total} />
        <KPI label="Критич. (остаточный)" value={stats.critical} accent="rose" />
        <KPI label="Высоких (остаточный)" value={stats.high} accent="orange" />
        <KPI label="Свыше риск-аппетита" value={stats.overAppetite} accent="amber" />
        <KPI label="Активных" value={stats.openCount} accent="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <RiskMapMatrix records={records} mode="residual" title="Остаточный риск 5×5" onCellClick={onCellClick} />
        </div>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">Распределение по NIST CSF</div>
          {nistDistribution.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={nistDistribution}>
                <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} />
                <YAxis tick={{ fill: '#71717a', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4 }} />
                <Bar dataKey="value" fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium mb-3">По типам риска</div>
          {typeDistribution.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">Нет данных</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeDistribution} dataKey="value" nameKey="name" outerRadius={70} label={(e) => e.value}>
                  {typeDistribution.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
};

const KPI = ({ label, value, accent = 'zinc' }) => {
  const accents = { zinc: 'text-zinc-400', amber: 'text-amber-400', rose: 'text-rose-400', emerald: 'text-emerald-400', sky: 'text-sky-400', orange: 'text-orange-400' };
  return (
    <Card className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${accents[accent]}`}>{value}</div>
    </Card>
  );
};
