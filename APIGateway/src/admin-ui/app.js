const $ = (id) => document.getElementById(id);
const loginView = $('login-view');
const dashboardView = $('dashboard-view');
let overview = null;
let editingId = null;

const show = (element, visible) => element.classList.toggle('hidden', !visible);
const node = (tag, className, content) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content !== undefined) element.textContent = content;
  return element;
};
const message = (element, text, error = true) => {
  element.textContent = text;
  element.classList.toggle('error', error);
  show(element, Boolean(text));
};
const cookie = (name) => {
  const match = document.cookie.split(';').map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  if (!match) return '';
  try { return decodeURIComponent(match.slice(name.length + 1)); }
  catch { return ''; }
};

async function request(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { ...(options.body ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) };
  if (!['GET', 'HEAD'].includes(method)) {
    const csrf = cookie('csrf_token');
    if (csrf) headers['x-csrf-token'] = csrf;
  }
  const response = await fetch(path, {
    ...options, method, headers, credentials: 'same-origin', cache: 'no-store'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Yêu cầu thất bại (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data.data;
}

function showLogin(text = '') {
  overview = null;
  show(loginView, true);
  show(dashboardView, false);
  show($('editor'), false);
  show($('editor-backdrop'), false);
  message($('login-error'), text);
}

function showDashboard(session) {
  show(loginView, false);
  show(dashboardView, true);
  $('session-user').textContent = session.userId || 'SSO Admin';
  message($('notice'), '');
}

async function checkSession() {
  try {
    const session = await request('/api/v1/auth/session');
    if (!session?.roles?.includes('ROLE_ADMIN')) {
      showLogin('Tài khoản hiện tại không có quyền ROLE_ADMIN. Hãy đăng xuất và dùng tài khoản quản trị.');
      return;
    }
    showDashboard(session);
    await loadOverview();
  } catch (error) {
    showLogin(error.status === 401 ? '' : error.message);
  }
}

async function loadOverview() {
  try {
    overview = await request('/api/v1/gateway-admin/overview');
    render();
  } catch (error) {
    if (error.status === 401 || error.status === 403) return showLogin(error.message);
    message($('notice'), error.message);
  }
}

function appendCell(row, content, className = '') {
  const cell = node('td', className);
  if (typeof content === 'string') cell.textContent = content;
  else cell.append(content);
  row.append(cell);
  return cell;
}

function renderMetrics() {
  $('metric-services').textContent = `${overview.services.filter((service) => service.state === 'reachable').length}/${overview.services.length}`;
  $('metric-routes').textContent = overview.routes.length;
  $('metric-enabled').textContent = overview.routes.filter((route) => route.enabled).length;
  $('metric-version').textContent = `v${overview.version}`;
  $('metric-updated').textContent = overview.updatedAt
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(overview.updatedAt))
    : 'Chưa có thay đổi';
}

function renderRoutes() {
  const query = $('route-search').value.trim().toLowerCase();
  const routes = overview.routes.filter((route) =>
    [route.name, route.method, route.sourcePath, route.upstreamPath, route.serviceKey]
      .some((value) => value.toLowerCase().includes(query)));
  const body = $('dynamic-body');
  body.replaceChildren();
  show($('route-empty'), routes.length === 0);
  for (const route of routes) {
    const row = node('tr');
    const routeInfo = node('div');
    routeInfo.append(node('strong', '', route.name), node('small', '', `${route.sourcePath} → ${route.upstreamPath}`));
    appendCell(row, routeInfo);
    appendCell(row, node('span', `method ${route.method.toLowerCase()}`, route.method));
    appendCell(row, route.serviceKey);
    appendCell(row, node('span', `status-pill ${route.enabled ? 'on' : 'off'}`, route.enabled ? '● Đang bật' : '● Đã tắt'));
    const edit = node('button', 'text-button', 'Chỉnh sửa');
    edit.type = 'button';
    edit.addEventListener('click', () => openEditor(route.id));
    appendCell(row, edit);
    body.append(row);
  }
}

function renderServices() {
  const grid = $('service-grid');
  grid.replaceChildren();
  for (const service of overview.services) {
    const card = node('div', 'service-card');
    const heading = node('div', 'service-head');
    const state = service.state === 'reachable' ? ['on', '● Hoạt động']
      : service.state === 'unreachable' ? ['bad', '● Không kết nối'] : ['warn', '● Chưa cấu hình'];
    heading.append(node('strong', '', service.name), node('span', `status-pill ${state[0]}`, state[1]));
    card.append(heading, node('small', '', service.target || 'Chưa có URL upstream'));
    grid.append(card);
  }
}

function renderStaticRoutes() {
  const query = $('static-search').value.trim().toLowerCase();
  const body = $('static-body');
  body.replaceChildren();
  for (const route of overview.staticRoutes.filter((item) =>
    [item.path, item.service, item.auth].some((value) => value.toLowerCase().includes(query)))) {
    const row = node('tr');
    appendCell(row, node('strong', '', route.path));
    appendCell(row, route.service);
    appendCell(row, node('span', `auth-pill ${route.auth === 'public' ? 'public' : ''}`,
      route.auth === 'public' ? 'Theo endpoint' : 'JWT'));
    const details = route.publicRequests.length
      ? route.publicRequests.map((item) => `${item.method} ${item.path}`).join(' · ')
      : '—';
    const cell = appendCell(row, `${route.publicRequests.length} endpoint`);
    cell.title = details;
    body.append(row);
  }
}

function render() {
  if (!overview) return;
  renderMetrics();
  renderRoutes();
  renderServices();
  renderStaticRoutes();
}

function openEditor(id = null) {
  if (!overview) return;
  editingId = id;
  const route = overview.routes.find((item) => item.id === id);
  $('editor-title').textContent = route ? 'Chỉnh sửa route' : 'Thêm route';
  $('route-name').value = route?.name || '';
  $('route-method').value = route?.method || 'GET';
  $('route-source').value = route?.sourcePath || '';
  $('route-upstream').value = route?.upstreamPath || '';
  $('route-enabled').checked = route?.enabled ?? true;
  const select = $('route-service');
  select.replaceChildren();
  for (const service of overview.services) {
    const option = node('option', '', `${service.name}${service.target ? '' : ' (chưa cấu hình)'}`);
    option.value = service.key;
    option.disabled = !service.target && service.key !== route?.serviceKey;
    select.append(option);
  }
  select.value = route?.serviceKey || overview.services.find((service) => service.target)?.key || '';
  show($('delete-route'), Boolean(route));
  message($('editor-error'), '');
  show($('editor-backdrop'), true);
  show($('editor'), true);
  $('route-name').focus();
}

function closeEditor() {
  show($('editor-backdrop'), false);
  show($('editor'), false);
  editingId = null;
}

async function replaceRoutes(routes) {
  const saved = await request('/api/v1/gateway-admin/routes', {
    method: 'PUT', body: JSON.stringify({ version: overview.version, routes })
  });
  overview = { ...overview, ...saved };
  render();
  closeEditor();
  message($('notice'), `Đã lưu cấu hình v${saved.version}. Các route mới có hiệu lực ngay.`, false);
}

$('login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('login-form').querySelector('button');
  button.disabled = true;
  message($('login-error'), '');
  try {
    const session = await request('/api/v1/auth/login', {
      method: 'POST', body: JSON.stringify({ username: $('username').value, password: $('password').value })
    });
    $('password').value = '';
    if (!session?.roles?.includes('ROLE_ADMIN')) {
      showLogin('Tài khoản này không có quyền ROLE_ADMIN.');
      return;
    }
    showDashboard(session);
    await loadOverview();
  } catch (error) {
    $('password').value = '';
    message($('login-error'), error.message);
  } finally { button.disabled = false; }
});

$('logout-button').addEventListener('click', async () => {
  try {
    await request('/api/v1/auth/logout', { method: 'POST', body: '{}' });
    showLogin();
  } catch (error) {
    message($('notice'), `Không thể đăng xuất: ${error.message}`);
  }
});
$('refresh-button').addEventListener('click', loadOverview);
$('add-route-button').addEventListener('click', () => openEditor());
$('route-search').addEventListener('input', renderRoutes);
$('static-search').addEventListener('input', renderStaticRoutes);
$('close-editor').addEventListener('click', closeEditor);
$('editor-backdrop').addEventListener('click', closeEditor);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeEditor(); });

$('route-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!overview) return;
  const route = {
    id: editingId || crypto.randomUUID(),
    name: $('route-name').value.trim(),
    method: $('route-method').value,
    sourcePath: $('route-source').value.trim(),
    upstreamPath: $('route-upstream').value.trim(),
    serviceKey: $('route-service').value,
    enabled: $('route-enabled').checked
  };
  const routes = editingId
    ? overview.routes.map((item) => item.id === editingId ? route : item)
    : [...overview.routes, route];
  const button = $('save-route');
  button.disabled = true;
  message($('editor-error'), '');
  try { await replaceRoutes(routes); }
  catch (error) {
    message($('editor-error'), error.status === 409
      ? 'Cấu hình đã thay đổi ở phiên khác. Đóng cửa sổ này và chọn Làm mới trước khi lưu lại.'
      : error.message);
  } finally { button.disabled = false; }
});

$('delete-route').addEventListener('click', async () => {
  if (!overview || !editingId || !window.confirm('Xóa route này? Thay đổi sẽ có hiệu lực ngay.')) return;
  const button = $('delete-route');
  button.disabled = true;
  try { await replaceRoutes(overview.routes.filter((route) => route.id !== editingId)); }
  catch (error) { message($('editor-error'), error.message); }
  finally { button.disabled = false; }
});

checkSession();
