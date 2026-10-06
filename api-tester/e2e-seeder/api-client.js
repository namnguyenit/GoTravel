const axios = require('axios');

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      headers: { 'Content-Type': 'application/json' }
    });
    this.token = null;
    this.userId = null;
    this.username = null;
    this.password = null;
    this.cookies = new Map();
    this.origin = new URL(baseURL).origin;
    this.client.defaults.maxRedirects = 0;
    this.client.interceptors.request.use(config => {
      const target = new URL(config.url, this.baseURL);
      if (target.origin !== this.origin) throw new Error('Seed client requests must stay on the gateway origin');
      config.headers.set('Origin', this.origin);
      const values = [...this.cookies.entries()].filter(([, c]) =>
        (!c.secure || target.protocol === 'https:') &&
        (!c.expires || c.expires > Date.now()) && target.pathname.startsWith(c.path));
      if (values.length) config.headers.set('Cookie', values.map(([name, c]) => name + '=' + c.value).join('; '));
      if (!['get', 'head', 'options'].includes((config.method || 'get').toLowerCase())) {
        const csrf = this.cookies.get('csrf_token');
        if (csrf && (!csrf.expires || csrf.expires > Date.now())) config.headers.set('X-CSRF-Token', decodeURIComponent(csrf.value));
      }
      return config;
    });
    const receive = response => {
      for (const raw of response.headers['set-cookie'] || []) {
        const parts = raw.split(';').map(part => part.trim());
        const separator = parts[0].indexOf('=');
        const name = parts[0].slice(0, separator), value = parts[0].slice(separator + 1);
        if (!['access_token', 'csrf_token'].includes(name)) continue;
        const attributes = Object.fromEntries(parts.slice(1).map(part => {
          const i = part.indexOf('='); return i < 0 ? [part.toLowerCase(), true] : [part.slice(0, i).toLowerCase(), part.slice(i + 1)];
        }));
        const host = new URL(this.origin).hostname;
        const domain = String(attributes.domain || host).replace(/^\./, '').toLowerCase();
        if (host !== domain && !host.endsWith('.' + domain)) continue;
        const expires = attributes['max-age'] !== undefined ? Date.now() + Number(attributes['max-age']) * 1000 : attributes.expires ? Date.parse(attributes.expires) : null;
        if (!value || (expires && expires <= Date.now())) this.cookies.delete(name);
        else this.cookies.set(name, { value, path: attributes.path || '/', secure: !!attributes.secure, expires });
      }
      return response;
    };
    this.client.interceptors.response.use(receive, error => { if (error.response) receive(error.response); return Promise.reject(error); });
  }

  setToken(token) {
    this.token = token;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // ============================================================
  // AUTH
  // ============================================================
  async register(username, email, password, fullName, phoneNumber, dateOfBirth, avatarUrl) {
    try {
      const res = await this.client.post('/api/v1/auth/register', {
        username, email, password, fullName, phoneNumber, dateOfBirth, avatarUrl
      });
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] Register ${username}: ${e.response?.data?.message || e.message}`);
      throw e;
    }
  }

  async login(username, password) {
    try {
      const res = await this.client.post('/api/v1/auth/login', { username, password });
      const token = res.data?.data?.token;
      if (token) this.setToken(token);
      else if (!res.data?.data?.authenticated || !this.cookies.has('access_token')) throw new Error('No valid gateway session returned from login');
      this.userId = res.data?.data?.userId || this.userId;
      this.username = username;
      this.password = password;
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] Login ${username}: ${e.response?.data?.message || e.message}`);
      throw e;
    }
  }

  async getProfile() {
    try {
      const res = await this.client.get('/api/v1/me');
      this.userId = res.data?.data?.id || res.data?.id;
      return res.data;
    } catch (e) {
      // Non-fatal: just log
      console.error(`  [WARN] getProfile failed: ${e.response?.data?.message || e.message}`);
    }
  }

  // Relogin to refresh JWT with new roles after role upgrade
  async refreshToken() {
    if (!this.username || !this.password) return;
    try {
      await this.login(this.username, this.password);
    } catch (e) {
      console.error(`  [FAIL] refreshToken for ${this.username}`);
    }
  }

  // ============================================================
  // USER ROLE UPGRADES
  // ============================================================
  async upgradeToHost() {
    try {
      const randomID = () => Math.floor(100000000000 + Math.random() * 900000000000).toString();
      const randomTax = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const FormData = require('form-data');
      const form = new FormData();
      form.append('fullName', this.username || 'Nguyen Van Host');
      form.append('phone', '09' + Math.floor(10000000 + Math.random() * 89999999));
      form.append('cccdNumber', randomID());
      form.append('taxCode', randomTax());
      form.append('idCard', randomID());
      form.append('bankAccount', '' + Math.floor(100000000 + Math.random() * 899999999));
      form.append('bankName', ['VCB', 'MB', 'TCB', 'ACB', 'BIDV'][Math.floor(Math.random() * 5)]);
      // An explicit test fixture, never an imitation of a real identity document.
      const { createRequire } = require('node:module');
      const sharp = createRequire(require('node:path').resolve(__dirname, '../../cloudinary-service/package.json'))('sharp');
      const fixture = await sharp(Buffer.from('<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg"><rect width="800" height="500" fill="white"/><text x="40" y="230" font-size="32" fill="black">TEST FIXTURE - NOT AN ID DOCUMENT</text></svg>')).png().toBuffer();
      form.append('frontImage', fixture, { filename: 'seed-test-front.png', contentType: 'image/png' });
      form.append('backImage', fixture, { filename: 'seed-test-back.png', contentType: 'image/png' });
      const res = await this.client.post('/api/v1/me/upgrade-host', form, {
        headers: form.getHeaders()
      });
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] upgradeToHost ${this.username}: ${e.response?.data?.message || e.message}`);
    }
  }

  async upgradeToEnterprise() {
    try {
      const randomTax = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();
      const companyNames = [
        'Công ty TNHH GoTravel', 'Tập đoàn Du lịch Việt', 'Công ty CP Lữ Hành Quốc Tế',
        'Tổng Công ty Du lịch Saigon', 'Công ty TNHH Vietravel',
        'Công ty Du lịch Hà Nội', 'Công ty CP Thế Giới Lữ Hành'
      ];
      const res = await this.client.post('/api/v1/me/upgrade-enterprise', {
        companyName: companyNames[Math.floor(Math.random() * companyNames.length)] + ' ' + Math.floor(Math.random() * 999),
        taxCode: randomTax(),
        companyAddress: ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng'][Math.floor(Math.random() * 3)],
        representativeName: 'Nguyen Van Doanh Nghiep'
      });
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] upgradeToEnterprise ${this.username}: ${e.response?.data?.message || e.message}`);
    }
  }

  // ============================================================
  // ADMIN ACTIONS
  // ============================================================
  async adminApproveHost(userId) {
    try {
      const res = await this.client.post(`/api/v1/admin/hosts/${userId}/success`, {});
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] adminApproveHost ${userId}: ${e.response?.data?.message || e.message}`);
    }
  }

  async adminApproveEnterprise(userId) {
    try {
      const res = await this.client.post(`/api/v1/admin/enterprises/${userId}/success`, {});
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] adminApproveEnterprise ${userId}: ${e.response?.data?.message || e.message}`);
    }
  }

  async adminGetAllUsers(page = 0, size = 50) {
    try {
      const res = await this.client.get(`/api/v1/admin/users?page=${page}&size=${size}`);
      return res.data?.data || [];
    } catch (e) {
      console.error(`  [FAIL] adminGetAllUsers: ${e.response?.data?.message || e.message}`);
      return [];
    }
  }

  async adminDeleteUser(userId) {
    try {
      await this.client.delete(`/api/v1/admin/users/${userId}`);
      return true;
    } catch (e) {
      // Silently fail – user might not exist
      return false;
    }
  }

  // ============================================================
  // LANDMARKS
  // ============================================================
  async createLandmark(payload) {
    try {
      const res = await this.client.post('/api/v1/catalog/admin/landmarks', payload);
      // API returns 201 with no body data (Void return type)
      // We just return true to indicate success
      return res.status === 201 ? { success: true } : null;
    } catch (e) {
      console.error(`  [FAIL] createLandmark "${payload.name}": ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  async adminGetLandmarks(page = 0, size = 100) {
    try {
      const res = await this.client.get(`/api/v1/catalog/admin/landmarks?page=${page}&size=${size}`);
      return res.data?.data?.content || [];
    } catch (e) {
      console.error(`  [FAIL] adminGetLandmarks: ${e.response?.data?.message || e.message}`);
      return [];
    }
  }

  // ============================================================
  // COMPLEXES
  // ============================================================
  async createComplex(payload) {
    try {
      const res = await this.client.post('/api/v1/catalog/host/complexes', payload);
      return res.status === 201 ? { success: true } : null;
    } catch (e) {
      console.error(`  [FAIL] createComplex "${payload.name}": ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  async getMyComplexes() {
    try {
      const res = await this.client.get('/api/v1/catalog/host/complexes');
      return res.data?.data || [];
    } catch (e) {
      console.error(`  [FAIL] getMyComplexes: ${e.response?.data?.message || e.message}`);
      return [];
    }
  }

  // ============================================================
  // LISTINGS
  // ============================================================
  async createListing(payload) {
    try {
      const res = await this.client.post('/api/v1/catalog/host/listings', payload);
      return res.status === 201 ? { success: true, data: res.data?.data } : null;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.error(`  [FAIL] createListing "${payload.title?.substring(0, 40)}": ${msg}`);
      return null;
    }
  }

  async getMyListings(page = 0, size = 100) {
    try {
      const res = await this.client.get(`/api/v1/catalog/host/listings?page=${page}&size=${size}`);
      return res.data?.data?.content || [];
    } catch (e) {
      return [];
    }
  }

  async adminGetAllListings(page = 0, size = 100) {
    try {
      const res = await this.client.get(`/api/v1/catalog/admin/listings?page=${page}&size=${size}`);
      return res.data?.data?.content || [];
    } catch (e) {
      console.error(`  [FAIL] adminGetAllListings: ${e.response?.data?.message || e.message}`);
      return [];
    }
  }

  async adminChangeListingStatus(listingId, status) {
    try {
      const res = await this.client.patch(`/api/v1/catalog/admin/listings/${listingId}/status?status=${status}`);
      return res.status === 200;
    } catch (e) {
      console.error(`  [FAIL] adminChangeListingStatus: ${e.response?.data?.message || e.message}`);
      return false;
    }
  }

  async deleteListing(listingId) {
    try {
      await this.client.delete(`/api/v1/catalog/host/listings/${listingId}`);
      return true;
    } catch (e) {
      return false;
    }
  }

  async initializeInventory(listingId, payload) {
    try {
      const res = await this.client.post(`/api/v1/host/inventory/listings/${listingId}/initialize`, payload);
      return res.status === 200 ? { success: true } : null;
    } catch (e) {
      const msg = e.response?.data?.message || e.message;
      console.error(`  [FAIL] initializeInventory for listing ${listingId}: ${msg}`);
      return null;
    }
  }

  // ============================================================
  // ORDERS & PAYMENTS
  // ============================================================
  async bookNow(payload) {
    try {
      const res = await this.client.post('/api/v1/orders/book-now', payload);
      return res.data?.data || res.data;
    } catch (e) {
      const listingId = payload?.item?.listingId || 'unknown listing';
      console.error(`  [FAIL] bookNow listing ${listingId}: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  async createPayment(orderId, amount, hostId) {
    try {
      const res = await this.client.post('/api/v1/payments/create', {
        orderId,
        amount,
        hostId
      });
      return res.data?.data || res.data;
    } catch (e) {
      console.error(`  [FAIL] createPayment order ${orderId}: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  async mockPayment(paymentId) {
    try {
      const res = await this.client.post(`/api/v1/payments/${paymentId}/mock-pay`, {});
      return res.status === 200 ? { success: true } : null;
    } catch (e) {
      console.error(`  [FAIL] mockPayment ${paymentId}: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }

  async checkPurchased(listingId) {
    try {
      const res = await this.client.get(`/api/v1/orders/check-purchased/${listingId}`);
      return Boolean(res.data?.data ?? res.data);
    } catch (e) {
      console.error(`  [WARN] checkPurchased listing ${listingId}: ${e.response?.data?.message || e.message}`);
      return false;
    }
  }

  // ============================================================
  // REVIEWS
  // ============================================================
  async createReview(listingId, rating, comment, images = []) {
    try {
      const res = await this.client.post('/api/v1/catalog/reviews', {
        listingId, rating, comment, images
      });
      return res.data;
    } catch (e) {
      console.error(`  [FAIL] createReview listing ${listingId}: ${e.response?.data?.message || e.message}`);
      return null;
    }
  }
}

module.exports = ApiClient;
