const API = '/api/v1/users';

const $ = (sel) => document.querySelector(sel);
const logEl = $('#log-output');

function log(msg, type = 'info') {
  const time = new Date().toLocaleTimeString('fr-FR');
  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${msg}</span>`;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function getToken() {
  const t = $('#access-token').value.trim();
  if (!t) {
    log('Collez un Access Token (depuis Auth Service) dans la barre ci-dessus', 'warn');
    return null;
  }
  return t;
}

async function apiCall(method, path, body = null) {
  const token = getToken();
  if (!token) throw new Error('Token manquant');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(path, opts);
  const data = await res.json();

  if (!res.ok) {
    log(`${method} ${path} → ${res.status} : ${data.error}`, 'err');
    throw data;
  }
  log(`${method} ${path} → ${res.status}`, 'ok');
  return data;
}

function showResult(boxId, jsonId, data) {
  const box = $(boxId);
  box.style.display = 'block';
  $(jsonId).textContent = JSON.stringify(data, null, 2);
}

// Health check
(async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    $('#health-status').innerHTML =
      '<span class="status-dot ok"></span><span style="font-size:13px">Connecté</span>';
    log(`Health: ${data.status} — ${data.service}`, 'ok');
  } catch {
    $('#health-status').innerHTML =
      '<span class="status-dot err"></span><span style="font-size:13px">Hors ligne</span>';
    log('Users Service inaccessible', 'err');
  }
})();

// ─── PROFIL ─────────────────────────────────────────────────────────
$('#btn-profile').addEventListener('click', async () => {
  try {
    const data = await apiCall('GET', `${API}/me`);
    showResult('#profile-result', '#profile-json', data.user);
  } catch (_e) { /* logged */ }
});

$('#btn-update-profile').addEventListener('click', async () => {
  try {
    const body = {};
    const u = $('#upd-username').value.trim();
    const f = $('#upd-firstname').value.trim();
    const l = $('#upd-lastname').value.trim();
    const p = $('#upd-phone').value.trim();
    const c = $('#upd-country').value.trim();
    if (u) body.username = u;
    if (f) body.firstName = f;
    if (l) body.lastName = l;
    if (p) body.phone = p;
    if (c) body.country = c;

    if (Object.keys(body).length === 0) {
      log('Remplissez au moins un champ', 'warn');
      return;
    }
    const data = await apiCall('PUT', `${API}/me`, body);
    log(`Profil mis à jour : ${data.user.username}`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-premium').addEventListener('click', async () => {
  try {
    const premiumLevel = $('#premium-level').value;
    if (!premiumLevel) { log('Sélectionnez un niveau', 'warn'); return; }
    const studentProof = $('#student-proof').value.trim() || undefined;
    const data = await apiCall('PUT', `${API}/me/premium`, { premiumLevel, studentProof });
    log(`Premium : ${data.user.premiumLevel}`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-delete-account').addEventListener('click', async () => {
  if (!confirm('Voulez-vous vraiment supprimer votre compte ?')) return;
  try {
    await apiCall('DELETE', `${API}/me`);
    log('Compte supprimé (soft delete)', 'ok');
  } catch (_e) { /* logged */ }
});

// ─── ADRESSES ───────────────────────────────────────────────────────
$('#btn-list-addr').addEventListener('click', async () => {
  try {
    const data = await apiCall('GET', `${API}/me/addresses`);
    showResult('#addr-list-result', '#addr-list-json', data.addresses);
    log(`${data.addresses.length} adresse(s) trouvée(s)`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-add-addr').addEventListener('click', async () => {
  try {
    const body = {
      label: $('#addr-label').value.trim() || undefined,
      street: $('#addr-street').value.trim(),
      city: $('#addr-city').value.trim(),
      zipCode: $('#addr-zip').value.trim(),
      country: $('#addr-country').value.trim(),
      isDefault: $('#addr-default').checked
    };
    if (!body.street || !body.city || !body.zipCode || !body.country) {
      log('Remplissez tous les champs obligatoires', 'warn');
      return;
    }
    const data = await apiCall('POST', `${API}/me/addresses`, body);
    log(`Adresse ajoutée : ${data.address.street}, ${data.address.city}`, 'ok');
  } catch (_e) { /* logged */ }
});

// ─── FAVORIS ────────────────────────────────────────────────────────
$('#btn-list-favs').addEventListener('click', async () => {
  try {
    const data = await apiCall('GET', `${API}/me/favorites`);
    showResult('#fav-list-result', '#fav-list-json', data);
    log(`${data.favorites.length} favori(s) (total: ${data.pagination.total})`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-add-fav').addEventListener('click', async () => {
  try {
    const adId = $('#fav-ad-id').value.trim();
    if (!adId) { log('Entrez un ID d\'annonce', 'warn'); return; }
    await apiCall('POST', `${API}/me/favorites/${adId}`);
    log(`Favori ajouté : ${adId}`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-remove-fav').addEventListener('click', async () => {
  try {
    const adId = $('#fav-ad-id').value.trim();
    if (!adId) { log('Entrez un ID d\'annonce', 'warn'); return; }
    await apiCall('DELETE', `${API}/me/favorites/${adId}`);
    log(`Favori retiré : ${adId}`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-check-fav').addEventListener('click', async () => {
  try {
    const adId = $('#fav-ad-id').value.trim();
    if (!adId) { log('Entrez un ID d\'annonce', 'warn'); return; }
    const data = await apiCall('GET', `${API}/me/favorites/${adId}/check`);
    log(`Favori ${adId} : ${data.isFavorite ? 'OUI' : 'NON'}`, data.isFavorite ? 'ok' : 'info');
  } catch (_e) { /* logged */ }
});

// ─── ADMIN ──────────────────────────────────────────────────────────
$('#btn-admin-list').addEventListener('click', async () => {
  try {
    const data = await apiCall('GET', `${API}/admin/users`);
    showResult('#admin-result', '#admin-json', data);
    log(`${data.users.length} utilisateur(s) (page ${data.pagination.page}/${data.pagination.pages})`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-admin-roles').addEventListener('click', async () => {
  try {
    const data = await apiCall('GET', `${API}/admin/roles`);
    showResult('#admin-result', '#admin-json', data);
    log(`${data.roles.length} rôle(s) disponible(s)`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-admin-role').addEventListener('click', async () => {
  try {
    const userId = $('#admin-user-id').value.trim();
    const roleId = parseInt($('#admin-role-id').value, 10);
    if (!userId || !roleId) { log('Remplissez User ID et Role ID', 'warn'); return; }
    const data = await apiCall('PUT', `${API}/admin/users/${userId}/role`, { roleId });
    log(`Rôle mis à jour pour ${userId}`, 'ok');
    showResult('#admin-result', '#admin-json', data);
  } catch (_e) { /* logged */ }
});

$('#btn-admin-delete').addEventListener('click', async () => {
  const userId = $('#admin-user-id').value.trim();
  if (!userId) { log('Entrez un User ID', 'warn'); return; }
  if (!confirm(`Supprimer l'utilisateur ${userId} ?`)) return;
  try {
    await apiCall('DELETE', `${API}/admin/users/${userId}`);
    log(`Utilisateur ${userId} supprimé (soft delete)`, 'ok');
  } catch (_e) { /* logged */ }
});

$('#btn-admin-restore').addEventListener('click', async () => {
  try {
    const userId = $('#admin-user-id').value.trim();
    if (!userId) { log('Entrez un User ID', 'warn'); return; }
    const data = await apiCall('PUT', `${API}/admin/users/${userId}/restore`);
    log(`Utilisateur ${userId} restauré`, 'ok');
    showResult('#admin-result', '#admin-json', data);
  } catch (_e) { /* logged */ }
});
