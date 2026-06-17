/* ========== 暗峰娱乐 · 数据管理层 ========== */
const Store = {
  STORAGE_KEY: 'anfeng_store_data',

  /** 默认数据 */
  defaults() {
    return {
      rooms: [
        { id: 'r1', name: 'PS5 1号包间', type: 'ps5', hourlyRate: 15, deposit: 0, sortOrder: 1 },
        { id: 'r2', name: 'PS5 2号包间', type: 'ps5', hourlyRate: 15, deposit: 0, sortOrder: 2 },
        { id: 'r3', name: 'PS4 1号包间', type: 'ps4', hourlyRate: 10, deposit: 0, sortOrder: 3 },
        { id: 'r4', name: 'PS4 2号包间', type: 'ps4', hourlyRate: 10, deposit: 0, sortOrder: 4 },
        { id: 'r5', name: 'Switch 包间',   type: 'switch', hourlyRate: 12, deposit: 0, sortOrder: 5 },
      ],
      sessions: [],
      orders: [],
      nextId: { rooms: 6, sessions: 1, orders: 1 },
      createdAt: Date.now(),
    };
  },

  /** 加载数据 */
  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const def = this.defaults();
        for (const key of Object.keys(def)) {
          if (!(key in data)) data[key] = def[key];
        }
        return data;
      }
    } catch (e) {
      console.warn('加载数据失败，使用默认值', e);
    }
    return this.defaults();
  },

  /** 保存数据 */
  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('保存数据失败', e);
      showToast('数据保存失败，请检查浏览器存储空间', 'error');
    }
  },

  /** 获取所有数据（简写） */
  get() { return this.load(); },

  /** ---- 包间 CRUD ---- */
  getRooms() { return this.get().rooms; },

  getRoom(roomId) {
    return this.getRooms().find(r => r.id === roomId);
  },

  addRoom(name, type, hourlyRate, deposit = 0) {
    const data = this.get();
    const id = 'r' + (data.nextId.rooms++);
    data.rooms.push({
      id, name, type, hourlyRate: Number(hourlyRate), deposit: Number(deposit),
      sortOrder: data.rooms.length + 1,
    });
    this.save(data);
    return id;
  },

  updateRoom(roomId, updates) {
    const data = this.get();
    const room = data.rooms.find(r => r.id === roomId);
    if (!room) return false;
    Object.assign(room, updates);
    this.save(data);
    return true;
  },

  deleteRoom(roomId) {
    const data = this.get();
    const active = data.sessions.find(s => s.roomId === roomId && s.status === 'active');
    if (active) {
      showToast('该包间有正在进行中的计时，无法删除', 'error');
      return false;
    }
    data.rooms = data.rooms.filter(r => r.id !== roomId);
    this.save(data);
    return true;
  },

  /** ---- 会话 CRUD ---- */
  getSessions() { return this.get().sessions; },

  getSession(sessionId) {
    return this.getSessions().find(s => s.id === sessionId);
  },

  /** 获取当前活跃的会话 */
  getActiveSessions() {
    return this.getSessions().filter(s => s.status === 'active');
  },

  /** 获取指定包间的活跃会话 */
  getActiveSessionForRoom(roomId) {
    return this.getSessions().find(s => s.roomId === roomId && s.status === 'active');
  },

  /** 开启一个新会话 */
  startSession(roomId, customerName = '', customerPhone = '', deposit = 0) {
    const data = this.get();
    const existing = data.sessions.find(s => s.roomId === roomId && s.status === 'active');
    if (existing) {
      showToast('该包间已有正在进行的计时', 'error');
      return null;
    }
    const id = 's' + (data.nextId.sessions++);
    const session = {
      id,
      roomId,
      customerName: customerName || '散客',
      customerPhone,
      startTime: Date.now(),
      endTime: null,
      status: 'active',
      totalTime: 0,
      actualTime: 0,
      timeFee: 0,
      deposit: Number(deposit),
      orderTotal: 0,
      totalAmount: 0,
      discountPercent: 0,
      discountFixed: 0,
      customHours: null,
      customRate: null,
      autoHours: 0,
      notes: '',
      createdAt: Date.now(),
    };
    data.sessions.push(session);
    this.save(data);
    return id;
  },

  /**
   * 结束会话（结算）
   * @param {string} sessionId
   * @param {number} endTime - 结束时间戳
   * @param {object} options - 自定义结算参数
   * @param {number} options.customHours  - 手动设置结算小时数（不传则自动计算）
   * @param {number} options.customRate   - 手动设置费率（不传则用包间标准费率）
   * @param {number} options.discountPercent - 折扣百分比 0-100
   * @param {number} options.discountFixed   - 固定减免金额
   */
  endSession(sessionId, endTime = Date.now(), options = {}) {
    const { customHours, customRate, discountPercent, discountFixed } = options;
    const data = this.get();
    const session = data.sessions.find(s => s.id === sessionId);
    if (!session || session.status !== 'active') return null;

    const room = data.rooms.find(r => r.id === session.roomId);
    if (!room) return null;

    const durationMs = endTime - session.startTime;
    const durationMin = Math.ceil(durationMs / 60000);
    // 自动计算：不足1小时按1小时算
    const autoHours = Math.ceil(durationMin / 60);

    // 手动值优先（允许 0 作为合法手动输入）
    const hasCustomHours = (customHours !== undefined && customHours !== null && customHours !== '');
    const hasCustomRate  = (customRate  !== undefined && customRate  !== null && customRate  !== '');

    const billedHours = hasCustomHours ? Number(customHours) : autoHours;
    const billedRate  = hasCustomRate  ? Number(customRate)  : room.hourlyRate;

    session.endTime = endTime;
    session.status = 'completed';
    session.totalTime = billedHours * 60;     // 结算所用的总分钟数
    session.actualTime = durationMin;          // 实际时长（仅参考）

    // 计时费用
    session.timeFee = billedHours * billedRate;

    // 订单总额
    const sessionOrders = data.orders.filter(o => o.sessionId === sessionId);
    session.orderTotal = sessionOrders.reduce((sum, o) => sum + o.price * o.quantity, 0);

    // 折扣计算
    const pct = (discountPercent !== undefined && discountPercent !== null && discountPercent !== '')
      ? Number(discountPercent) : 0;
    const fix = (discountFixed !== undefined && discountFixed !== null && discountFixed !== '')
      ? Number(discountFixed) : 0;
    session.discountPercent = pct;
    session.discountFixed = fix;

    const subtotal = session.timeFee + session.orderTotal;
    const discountAmount = Math.round(subtotal * pct / 100 * 100) / 100 + fix;

    // 应收 = 计时费 + 商品费 - 押金 - 折扣
    session.totalAmount = Math.max(0, Math.round((subtotal - session.deposit - discountAmount) * 100) / 100);

    // 记录自定义值供历史查看
    session.customHours = hasCustomHours ? billedHours : null;
    session.customRate  = hasCustomRate  ? billedRate  : null;
    session.autoHours = autoHours;

    this.save(data);
    return session;
  },

  /** 删除会话 */
  deleteSession(sessionId) {
    const data = this.get();
    data.sessions = data.sessions.filter(s => s.id !== sessionId);
    data.orders = data.orders.filter(o => o.sessionId !== sessionId);
    this.save(data);
  },

  /** 获取今天的会话 */
  getTodaySessions() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const todayEnd = todayStart + 86400000;
    return this.getSessions().filter(s => {
      const t = s.status === 'active' ? s.startTime : (s.endTime || s.startTime);
      return t >= todayStart && t < todayEnd;
    });
  },

  /** 获取指定日期的已结算会话 */
  getCompletedSessionsByDate(dateStr) {
    const start = new Date(dateStr + 'T00:00:00+08:00').getTime();
    const end = start + 86400000;
    return this.getSessions().filter(s => {
      if (s.status !== 'completed' || !s.endTime) return false;
      return s.endTime >= start && s.endTime < end;
    });
  },

  /** 获取所有已结算会话 */
  getAllCompletedSessions() {
    return this.getSessions().filter(s => s.status === 'completed');
  },

  /** ---- 订单 CRUD ---- */
  getOrders() { return this.get().orders; },

  getOrdersForSession(sessionId) {
    return this.getOrders().filter(o => o.sessionId === sessionId);
  },

  addOrder(sessionId, itemName, price, quantity = 1) {
    const data = this.get();
    const id = 'o' + (data.nextId.orders++);
    data.orders.push({
      id, sessionId, itemName, price: Number(price), quantity: Number(quantity),
      time: Date.now(),
    });
    this.save(data);
    return id;
  },

  removeOrder(orderId) {
    const data = this.get();
    data.orders = data.orders.filter(o => o.id !== orderId);
    this.save(data);
  },

  /** 获取所有已完成会话的订单 */
  getCompletedOrders() {
    const completedIds = this.getAllCompletedSessions().map(s => s.id);
    return this.getOrders().filter(o => completedIds.includes(o.sessionId));
  },

  /** ---- 统计数据 ---- */
  getStats() {
    const data = this.get();
    const rooms = data.rooms;
    const activeSessions = data.sessions.filter(s => s.status === 'active');
    const todayCompleted = data.sessions.filter(s => {
      if (s.status !== 'completed' || !s.endTime) return false;
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return s.endTime >= start && s.endTime < start + 86400000;
    });

    const todayRevenue = todayCompleted.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalRevenue = data.sessions
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    return {
      totalRooms: rooms.length,
      activeRooms: activeSessions.length,
      idleRooms: rooms.length - activeSessions.length,
      todaySessions: todayCompleted.length,
      todayRevenue,
      totalRevenue,
      activeSessions: activeSessions.length,
    };
  },

  /** ---- 重置所有数据 ---- */
  reset() {
    const def = this.defaults();
    this.save(def);
    return def;
  },
};

/* ========== 工具函数 ========== */

/** 格式化时间 HH:mm:ss */
function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

/** 格式化日期 YYYY-MM-DD */
function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 格式化日期时间 */
function formatDateTime(ts) {
  return formatDate(ts) + ' ' + formatTime(ts);
}

/** 格式化秒数为 HH:MM:SS */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 计算两个时间戳之间的时长（秒） */
function durationBetween(start, end) {
  return Math.floor((end - start) / 1000);
}

/** 根据类型返回显示名 */
function getTypeLabel(type) {
  const map = { ps5: 'PS5', ps4: 'PS4', switch: 'Switch', general: '通用' };
  return map[type] || type;
}

/** 根据类型返回标签 class */
function getTypeTagClass(type) {
  const map = { ps5: 'tag-ps', ps4: 'tag-ps', switch: 'tag-switch', general: 'tag-general' };
  return map[type] || 'tag-general';
}

/** Toast 通知 */
function showToast(msg, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, 2500);
  setTimeout(() => el.remove(), 3000);
}

/** 格式化金额 */
function formatMoney(amount) {
  return '¥' + Number(amount).toFixed(2);
}

/* ========== 导出/导入数据 ========== */
function exportData() {
  const data = Store.get();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `暗峰娱乐数据_${formatDate(Date.now())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出', 'success');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.rooms || !data.sessions || !data.orders) {
        showToast('数据格式不正确', 'error');
        return;
      }
      Store.save(data);
      showToast('数据已导入，页面即将刷新', 'success');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      showToast('导入失败：' + err.message, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetAllData() {
  if (!confirm('确定要重置所有数据吗？此操作不可撤销！')) return;
  Store.reset();
  showToast('数据已重置', 'info');
  setTimeout(() => location.reload(), 500);
}
