// Runtime-конфиг фронта.
// Этот файл монтируется в контейнер nginx и читается index.html'ом ДО загрузки SPA.
// Менять можно прямо на хосте — пересборка фронта не нужна, достаточно перезагрузить страницу.
window.__APP_CONFIG__ = {
  apiBaseUrl: '/api',
  orgName: 'Risk Platform',
  sessionTimeoutMinutes: 30
};
