/* ========== 暗峰娱乐 · 应用主逻辑 ========== */

let appState = {
  currentPage: 'dashboard',
  timerIntervals: {},
  currentDate: new Date(),
  selectedOrderSessionId: null,
};

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  navigateTo('dashboard');
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const el = document.getElementById('currentTime');
  if (el) el.textContent = new Date().toLocaleString('zh-CN', { hour12: false });
}

/* ========== 导航 ========== */
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

function navigateTo(page) {
  appState.currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  const titles = {
    dashboard: '仪表盘',
    rooms: '包间管理',
    tracking: '计时管理',
    orders: '订单管理',
    history: '历史记录',
    statusboard: '状态板',
  };
  document.getElementById('pageTitle').textContent = titles[page] || '暗峰娱乐';

  const content = document.getElementById('content');
  switch (page) {
    case 'dashboard': renderDashboard(content); break;
    case 'rooms': renderRooms(content); break;
    case 'tracking': renderTracking(content); break;
    case 'orders': renderOrders(content); break;
    case 'history': renderHistory(content); break;
    case 'statusboard': renderStatusBoard(content); break;
  }
}

/* ============================================================
   仪表盘
   ============================================================ */
function renderDashboard(el) {
  const stats = Store.getStats();
  const rooms = Store.getRooms();
  const activeSessions = Store.getActiveSessions();

  el.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card blue">
        <div class="stat-label">包间总数</div>
        <div class="stat-value accent">${stats.totalRooms}</div>
        <div class="stat-sub">空闲 ${stats.idleRooms} · 使用中 ${stats.activeRooms}</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">今日上机</div>
        <div class="stat-value success">${stats.todaySessions}</div>
        <div class="stat-sub">当前 ${stats.activeRooms} 间使用中</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">今日营收</div>
        <div class="stat-value warning">${formatMoney(stats.todayRevenue)}</div>
        <div class="stat-sub">累计 ${formatMoney(stats.totalRevenue)}</div>
      </div>
      <div class="stat-card purple">
        <div class="stat-label">使用中包间</div>
        <div class="stat-value" style="color:#a371f7">${stats.activeRooms}</div>
        <div class="stat-sub">空闲 ${stats.idleRooms} 间</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <span class="card-title">包间状态一览</span>
        <button class="btn btn-sm btn-primary" onclick="navigateTo('tracking')">⏱️ 管理计时</button>
      </div>
      <div class="rooms-grid" id="dashboardRooms">
        ${renderRoomCards(rooms, activeSessions)}
      </div>
    </div>
  `;
}

function renderRoomCards(rooms, activeSessions) {
  if (!rooms || rooms.length === 0) {
    return `<div class="empty-state"><div class="icon">🛋️</div><div class="text">还没有包间，请先添加包间</div></div>`;
  }

  return rooms.map(room => {
    const active = activeSessions.find(s => s.roomId === room.id);
    const isOccupied = !!active;

    return `
      <div class="room-card ${isOccupied ? 'occupied' : ''}">
        <div class="room-card-header">
          <span class="room-name">${room.name}</span>
          <span class="tag ${getTypeTagClass(room.type)}">${getTypeLabel(room.type)}</span>
        </div>
        <div class="room-card-body">
          <div class="room-info-item">
            <span class="label">状态</span>
            <span class="room-badge ${isOccupied ? 'badge-occupied' : 'badge-idle'}">
              ${isOccupied ? '有客' : '空闲'}
            </span>
          </div>
          <div class="room-info-item">
            <span class="label">收费标准</span>
            <span class="value">${room.hourlyRate} 元/小时</span>
          </div>
          ${isOccupied ? `
          <div class="room-info-item">
            <span class="label">顾客</span>
            <span class="value">${active.customerName}</span>
          </div>
          <div class="room-info-item">
            <span class="label">已用时长</span>
            <span class="value timer-value" data-session-id="${active.id}">--:--:--</span>
          </div>
          ` : ''}
        </div>
        <div class="room-card-actions">
          ${isOccupied
            ? `<button class="btn btn-sm btn-success" onclick="navigateTo('orders')">🧾 订单</button>
               <button class="btn btn-sm btn-danger" onclick="endSessionModal('${active.id}')">结账</button>`
            : `<button class="btn btn-sm btn-primary" onclick="openStartSession('${room.id}')">▶ 开台</button>`
          }
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================================
   包间管理

/* ============================================================
   状态板（大屏 TV 友好）
   ============================================================ */
function renderStatusBoard(el) {
  const rooms = Store.getRooms();
  const activeSessions = Store.getActiveSessions();

  el.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <h3 style="font-size:1.3rem;font-weight:700;">📺 包间状态板</h3>
      <span style="font-size:1.1rem;font-weight:600;color:var(--text-muted);">${new Date().toLocaleString("zh-CN",{hour12:false})}</span>
    </div>
    <div class="status-board">
      ${rooms.length === 0 ? `<div class="empty-state"><div class="icon">🛋️</div><div class="text">暂无包间</div></div>` :
        rooms.map(room => {
          const session = activeSessions.find(s => s.roomId === room.id);
          const isOccupied = !!session;
          return `
            <div class="status-board-card ${isOccupied ? "occupied" : "idle"}">
              <div class="status-icon">${isOccupied ? "🟢" : "🟢"}</div>
              <div class="room-name">${room.name}</div>
              <div class="room-type">${getTypeLabel(room.type)}</div>
              <div class="status-label">${isOccupied ? "有客" : "空闲"}</div>
              ${isOccupied ? `<div class="customer-name">${session.customerName}</div>`
                + `<div class="timer-small" id="sb-timer-${session.id}">--:--:--</div>` : ""}
            </div>
          `;
        }).join("")
      }
    </div>
  `;

  /* 启动计时器 */
  activeSessions.forEach(s => startStatusBoardTimer(s.id));
}

function startStatusBoardTimer(sessionId) {
  const update = () => {
    const session = Store.getSession(sessionId);
    if (!session || session.status !== "active") return;
    const el = document.getElementById("sb-timer-" + sessionId);
    if (el) el.textContent = formatDuration(durationBetween(session.startTime, Date.now()));
  };
  update();
  setInterval(update, 1000);
}

   ============================================================ */
function renderRooms(el) {
  const rooms = Store.getRooms();

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <div class="card-header">
        <span class="card-title">包间列表</span>
        <button class="btn btn-sm btn-primary" onclick="showAddRoomModal()">＋ 添加包间</button>
      </div>
      ${rooms.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🛋️</div>
          <div class="text">暂无包间，点击上方按钮添加</div>
        </div>
      ` : `
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>包间名称</th>
                <th>类型</th>
                <th>收费标准</th>
                <th>押金</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              ${rooms.map(room => {
                const active = Store.getActiveSessionForRoom(room.id);
                return `
                  <tr>
                    <td><strong>${room.name}</strong></td>
                    <td><span class="tag ${getTypeTagClass(room.type)}">${getTypeLabel(room.type)}</span></td>
                    <td>${room.hourlyRate} 元/小时</td>
                    <td>${room.deposit > 0 ? formatMoney(room.deposit) : '无'}</td>
                    <td><span class="room-badge ${active ? 'badge-occupied' : 'badge-idle'}">${active ? '有客' : '空闲'}</span></td>
                    <td class="actions-cell">
                      <button class="btn btn-sm btn-outline" onclick="showEditRoomModal('${room.id}')">编辑</button>
                      <button class="btn btn-sm btn-danger" onclick="deleteRoomConfirm('${room.id}')" ${active ? 'disabled' : ''}>删除</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;
}

/* ============================================================
   计时管理
   ============================================================ */
function renderTracking(el) {
  const rooms = Store.getRooms();
  const activeSessions = Store.getActiveSessions();

  el.innerHTML = `
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card green">
        <div class="stat-label">使用中包间</div>
        <div class="stat-value success">${activeSessions.length}</div>
        <div class="stat-sub">共 ${rooms.length} 间</div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">空闲包间</div>
        <div class="stat-value accent">${rooms.length - activeSessions.length}</div>
        <div class="stat-sub">可开台</div>
      </div>
    </div>

    <div class="rooms-grid" id="trackingGrid">
      ${rooms.map(room => {
        const session = activeSessions.find(s => s.roomId === room.id);
        return renderTrackingCard(room, session);
      }).join('')}
    </div>
  `;

  activeSessions.forEach(s => startTimer(s.id));
}

function renderTrackingCard(room, session) {
  const isOccupied = !!session;

  return `
    <div class="room-card ${isOccupied ? 'occupied' : ''}">
      <div class="room-card-header">
        <span class="room-name">${room.name}</span>
        <span class="tag ${getTypeTagClass(room.type)}">${getTypeLabel(room.type)}</span>
      </div>
      <div class="room-card-body">
        ${isOccupied ? `
          <div class="timer-display running" id="timer-${session.id}">00:00:00</div>
          <div class="timer-info">
            <div class="timer-info-item">
              <div class="label">顾客</div>
              <div class="value">${session.customerName}</div>
            </div>
            <div class="timer-info-item">
              <div class="label">费率</div>
              <div class="value">${room.hourlyRate} 元/小时</div>
            </div>
            <div class="timer-info-item">
              <div class="label">开始时间</div>
              <div class="value">${formatTime(session.startTime)}</div>
            </div>
            <div class="timer-info-item">
              <div class="label">预计费用</div>
              <div class="value" id="fee-${session.id}">¥0.00</div>
            </div>
          </div>
        ` : `
          <div class="timer-display stopped">空闲</div>
          <div class="timer-info">
            <div class="timer-info-item">
              <div class="label">费率</div>
              <div class="value">${room.hourlyRate} 元/小时</div>
            </div>
            <div class="timer-info-item">
              <div class="label">状态</div>
              <div class="value" style="color:var(--text-muted)">等待开台</div>
            </div>
          </div>
        `}
      </div>
      <div class="room-card-actions">
        ${isOccupied
          ? `<button class="btn btn-sm btn-outline" onclick="navigateTo('orders')">🧾 订单</button>
             <button class="btn btn-sm btn-danger" onclick="endSessionModal('${session.id}')">🛑 结账</button>`
          : `<button class="btn btn-sm btn-primary btn-lg" style="flex:2" onclick="openStartSession('${room.id}')">▶ 开台</button>`
        }
      </div>
    </div>
  `;
}

/* ========== 计时器逻辑 ========== */
function startTimer(sessionId) {
  if (appState.timerIntervals[sessionId]) {
    clearInterval(appState.timerIntervals[sessionId]);
  }

  const session = Store.getSession(sessionId);
  if (!session || session.status !== 'active') return;

  const room = Store.getRoom(session.roomId);
  if (!room) return;

  const update = () => {
    const elapsed = durationBetween(session.startTime, Date.now());
    const displayEl = document.getElementById(`timer-${sessionId}`);
    const feeEl = document.getElementById(`fee-${sessionId}`);

    if (displayEl) {
      displayEl.textContent = formatDuration(elapsed);
    }
    if (feeEl) {
      const hours = Math.ceil(elapsed / 3600);
      feeEl.textContent = formatMoney(hours * room.hourlyRate);
    }

    const dashTimer = document.querySelector(`.timer-value[data-session-id="${sessionId}"]`);
    if (dashTimer) dashTimer.textContent = formatDuration(elapsed);

    const runningFee = document.getElementById(`running-fee-${sessionId}`);
    if (runningFee) {
      const hours = Math.ceil(elapsed / 3600);
      runningFee.textContent = formatMoney(hours * room.hourlyRate);
    }
  };

  update();
  appState.timerIntervals[sessionId] = setInterval(update, 1000);
}

function stopTimer(sessionId) {
  if (appState.timerIntervals[sessionId]) {
    clearInterval(appState.timerIntervals[sessionId]);
    delete appState.timerIntervals[sessionId];
  }
}

/* ============================================================
   开台弹窗
   ============================================================ */
function openStartSession(roomId) {
  const room = Store.getRoom(roomId);
  if (!room) return;

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = `▶ 开台 — ${room.name}`;
  modalBody.innerHTML = `
    <div class="form-group">
      <label>顾客姓名</label>
      <input class="form-control" id="customerName" placeholder="例如：张先生" value="">
    </div>
    <div class="form-group">
      <label>联系电话（选填）</label>
      <input class="form-control" id="customerPhone" placeholder="手机号" value="">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>押金（选填）</label>
        <input class="form-control" id="deposit" type="number" min="0" step="5" value="0" placeholder="0">
      </div>
      <div class="form-group">
        <label>费率</label>
        <input class="form-control" value="${room.hourlyRate} 元/小时" disabled>
      </div>
    </div>
    <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-lg" onclick="confirmStartSession('${roomId}')">▶ 确认开台</button>
    </div>
  `;

  openModal();
}

function confirmStartSession(roomId) {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const deposit = parseFloat(document.getElementById('deposit').value) || 0;

  const sessionId = Store.startSession(roomId, name || '散客', phone, deposit);
  if (sessionId) {
    closeModal();
    showToast('开台成功！', 'success');
    navigateTo('tracking');
  }
}

/* ============================================================
   结算弹窗（可编辑 + 实时计算）
   ============================================================ */
function endSessionModal(sessionId) {
  const session = Store.getSession(sessionId);
  if (!session) return;
  const room = Store.getRoom(session.roomId);
  if (!room) return;

  const orders = Store.getOrdersForSession(sessionId);
  const elapsedSeconds = durationBetween(session.startTime, Date.now());
  const elapsedMin = Math.ceil(elapsedSeconds / 60);
  const autoHours = Math.ceil(elapsedMin / 60);

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = `💰 结账 — ${room.name}`;

  modalBody.innerHTML = `
    <div class="settlement-section">
      <div class="settlement-row">
        <span>顾客</span>
        <strong>${session.customerName}</strong>
      </div>
      <div class="settlement-row">
        <span>实际上机</span>
        <strong>${elapsedMin} 分钟（${formatDuration(elapsedSeconds)}）</strong>
      </div>
    </div>

    <!-- 可编辑计时设置 -->
    <div class="card" style="margin-bottom:12px;padding:14px;">
      <div style="font-size:0.82rem;color:var(--accent);font-weight:600;margin-bottom:10px;">⚙️ 计时设置（可修改）</div>
      <div class="form-row" style="margin-bottom:8px;">
        <div class="form-group" style="margin-bottom:0;">
          <label>结算小时数</label>
          <input class="form-control settlement-input" id="setHours" type="number" min="0" step="0.5"
            value="${autoHours}" data-default="${autoHours}"
            oninput="recalcSettlement()">
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">自动计算: ${autoHours} 小时</div>
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>费率（元/小时）</label>
          <input class="form-control settlement-input" id="setRate" type="number" min="0" step="1"
            value="${room.hourlyRate}" data-default="${room.hourlyRate}"
            oninput="recalcSettlement()">
          <div style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">标准: ${room.hourlyRate} 元/小时</div>
        </div>
      </div>
    </div>

    <!-- 折扣设置 -->
    <div class="card" style="margin-bottom:12px;padding:14px;">
      <div style="font-size:0.82rem;color:var(--accent);font-weight:600;margin-bottom:10px;">🏷️ 折扣设置</div>
      <div class="form-row">
        <div class="form-group" style="margin-bottom:0;">
          <label>折扣比例 (%)</label>
          <input class="form-control settlement-input" id="discPct" type="number" min="0" max="100" step="1" value="0"
            oninput="recalcSettlement()">
        </div>
        <div class="form-group" style="margin-bottom:0;">
          <label>固定减免（元）</label>
          <input class="form-control settlement-input" id="discFix" type="number" min="0" step="1" value="0"
            oninput="recalcSettlement()">
        </div>
      </div>
    </div>

    <!-- 结算明细 -->
    <div class="settlement-section" id="settlementBreakdown">
      <div class="settlement-row">
        <span>计时费</span>
        <strong id="lineTimeFee">${formatMoney(autoHours * room.hourlyRate)}</strong>
      </div>
      <div class="settlement-row">
        <span>商品消费</span>
        <strong>${formatMoney(orders.reduce((s,o) => s + o.price * o.quantity, 0))}</strong>
      </div>
      ${session.deposit > 0 ? `
      <div class="settlement-row">
        <span>押金</span>
        <strong>-${formatMoney(session.deposit)}</strong>
      </div>` : ''}
      <div class="settlement-row" id="discountLine" style="display:none;">
        <span>折扣</span>
        <strong id="lineDiscount" style="color:var(--success);">-¥0.00</strong>
      </div>
      <div class="settlement-row total">
        <span>应收合计</span>
        <strong id="lineTotal">${formatMoney(autoHours * room.hourlyRate + orders.reduce((s,o) => s + o.price * o.quantity, 0) - session.deposit)}</strong>
      </div>
    </div>

    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:14px;">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-success btn-lg" onclick="confirmEndSession('${sessionId}')">✅ 确认结账</button>
    </div>
  `;

  // 保存结算用的原始数据（供 recalcSettlement 读取）
  document.getElementById("settlementBreakdown")._settlementData = {
    orderTotal: orders.reduce((s, o) => s + o.price * o.quantity, 0),
    deposit: session.deposit,
  };

  openModal();
  recalcSettlement();
}

/** 实时重算结算金额 */
function recalcSettlement() {
  const hours = parseFloat(document.getElementById('setHours')?.value) || 0;
  const rate  = parseFloat(document.getElementById('setRate')?.value) || 0;
  const discPct = parseFloat(document.getElementById('discPct')?.value) || 0;
  const discFix = parseFloat(document.getElementById('discFix')?.value) || 0;

  const breakdown = document.getElementById('settlementBreakdown');
  if (!breakdown) return;

  const data = breakdown._settlementData || { orderTotal: 0, deposit: 0 };
  // 尝试从 modal 的 dataset 读取，否则从 DOM 读取
  const orderTotal = data.orderTotal;
  const deposit = data.deposit;

  const timeFee = hours * rate;
  const subtotal = timeFee + orderTotal;
  const discountAmount = Math.round(subtotal * discPct / 100 * 100) / 100 + discFix;
  const total = Math.max(0, subtotal - deposit - discountAmount);

  document.getElementById('lineTimeFee').textContent = formatMoney(timeFee);

  const discLine = document.getElementById('discountLine');
  const discEl = document.getElementById('lineDiscount');
  if (discountAmount > 0) {
    discLine.style.display = 'flex';
    discEl.textContent = '-' + formatMoney(discountAmount);
  } else {
    discLine.style.display = 'none';
  }

  document.getElementById('lineTotal').textContent = formatMoney(total);
}

// 将 recalcSettlement 需要的结算数据存到 DOM 上
function patchSettlementData() {
  // 在 endSessionModal 中已处理
}

function confirmEndSession(sessionId) {
  const hours = document.getElementById('setHours')?.value;
  const rate  = document.getElementById('setRate')?.value;
  const discPct = document.getElementById('discPct')?.value;
  const discFix = document.getElementById('discFix')?.value;

  const options = {
    customHours: hours,
    customRate: rate,
    discountPercent: discPct || 0,
    discountFixed: discFix || 0,
  };

  const result = Store.endSession(sessionId, Date.now(), options);
  if (result) {
    stopTimer(sessionId);
    closeModal();
    showToast(`✅ 结账完成！应收 ${formatMoney(result.totalAmount)}`, 'success');
    navigateTo('tracking');
  }
}

/* ============================================================
   订单管理
   ============================================================ */
function renderOrders(el) {
  const activeSessions = Store.getActiveSessions();

  if (activeSessions.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">🧾</div>
        <div class="text">当前没有进行中的计时，无法管理订单</div>
        <button class="btn btn-primary" onclick="navigateTo('tracking')">去开台</button>
      </div>
    `;
    return;
  }

  let sessionId = appState.selectedOrderSessionId;
  if (!sessionId || !activeSessions.find(s => s.id === sessionId)) {
    sessionId = activeSessions[0].id;
    appState.selectedOrderSessionId = sessionId;
  }

  const session = Store.getSession(sessionId);
  const room = Store.getRoom(session.roomId);
  const orders = Store.getOrdersForSession(sessionId);
  const elapsedSeconds = durationBetween(session.startTime, Date.now());
  const hours = Math.ceil(elapsedSeconds / 3600);
  const timeFee = hours * room.hourlyRate;
  const orderTotal = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);

  el.innerHTML = `
    <div style="display:flex; gap:20px; flex-wrap:wrap;">
      <div style="flex:1; min-width:280px;">
        <div class="card" style="margin-bottom:12px;">
          <div class="card-header">
            <span class="card-title">选择包间</span>
          </div>
          <div style="display:flex; gap:4px; flex-wrap:wrap;">
            ${activeSessions.map(s => {
              const r = Store.getRoom(s.roomId);
              const isActive = s.id === sessionId;
              return `
                <button class="btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline'}"
                  onclick="switchOrderSession('${s.id}')">
                  ${r ? r.name : '未知包间'} · ${s.customerName}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-header">
            <span class="card-title">⏱️ ${room.name}</span>
            <span class="tag ${getTypeTagClass(room.type)}">${getTypeLabel(room.type)}</span>
          </div>
          <div class="timer-info">
            <div class="timer-info-item">
              <div class="label">顾客</div>
              <div class="value">${session.customerName}</div>
            </div>
            <div class="timer-info-item">
              <div class="label">已用时长</div>
              <div class="value" id="timer-${session.id}">--:--:--</div>
            </div>
            <div class="timer-info-item">
              <div class="label">计时费</div>
              <div class="value" id="running-fee-${session.id}">${formatMoney(timeFee)}</div>
            </div>
            <div class="timer-info-item">
              <div class="label">商品费</div>
              <div class="value">${formatMoney(orderTotal)}</div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:12px;">
          <div class="card-header">
            <span class="card-title">快速添加</span>
          </div>
          <div class="quick-add-grid">
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '可乐', 3)">🥤 可乐 ¥3</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '雪碧', 3)">🥤 雪碧 ¥3</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '矿泉水', 2)">💧 矿泉水 ¥2</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '红牛', 8)">🔋 红牛 ¥8</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '可乐爆米花', 12)">🍿 爆米花 ¥12</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '薯片', 5)">🥔 薯片 ¥5</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '充电线', 5)">🔌 充电线 ¥5</button>
            <button class="quick-add-btn" onclick="quickAddOrder('${sessionId}', '手柄租赁', 10)">🎮 手柄租 ¥10</button>
          </div>
          <div style="display:flex; gap:6px;">
            <input class="form-control" id="customItemName" placeholder="自定义商品名" style="flex:1;">
            <input class="form-control" id="customItemPrice" type="number" min="0" step="1" placeholder="价格" style="width:80px;">
            <button class="btn btn-sm btn-primary" onclick="customAddOrder('${sessionId}')">添加</button>
          </div>
        </div>
      </div>

      <div style="flex:1; min-width:280px;">
        <div class="card">
          <div class="card-header">
            <span class="card-title">🧾 订单清单</span>
            <button class="btn btn-sm btn-danger" onclick="endSessionModal('${sessionId}')">💰 结账</button>
          </div>
          ${orders.length === 0 ? `
            <div class="empty-state" style="padding:30px 20px;">
              <div class="icon">📋</div>
              <div class="text">暂无订单，点击左侧商品添加</div>
            </div>
          ` : `
            <div id="orderList">
              ${orders.map(o => `
                <div class="order-item">
                  <span class="name">${o.itemName}</span>
                  <span class="qty">×${o.quantity}</span>
                  <span class="price">${formatMoney(o.price * o.quantity)}</span>
                  <span class="remove" onclick="removeOrderItem('${o.id}')">✕</span>
                </div>
              `).join('')}
            </div>
            <div class="order-total">
              <span>商品合计</span>
              <span>${formatMoney(orderTotal)}</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  startTimer(sessionId);
}

function switchOrderSession(sessionId) {
  appState.selectedOrderSessionId = sessionId;
  renderOrders(document.getElementById('content'));
}

function quickAddOrder(sessionId, name, price) {
  Store.addOrder(sessionId, name, price);
  showToast(`已添加：${name} ¥${price}`, 'success');
  renderOrders(document.getElementById('content'));
}

function customAddOrder(sessionId) {
  const name = document.getElementById('customItemName').value.trim();
  const price = parseFloat(document.getElementById('customItemPrice').value);
  if (!name) { showToast('请输入商品名称', 'error'); return; }
  if (!price || price <= 0) { showToast('请输入有效价格', 'error'); return; }

  Store.addOrder(sessionId, name, price);
  document.getElementById('customItemName').value = '';
  document.getElementById('customItemPrice').value = '';
  showToast(`已添加：${name} ¥${price}`, 'success');
  renderOrders(document.getElementById('content'));
}

function removeOrderItem(orderId) {
  Store.removeOrder(orderId);
  showToast('已移除', 'info');
  renderOrders(document.getElementById('content'));
}

/* ============================================================
   历史记录
   ============================================================ */
function renderHistory(el) {
  const selectedDate = appState.currentDate;
  const dateStr = formatDate(selectedDate);
  const sessions = Store.getCompletedSessionsByDate(dateStr);

  const dayRevenue = sessions.reduce((sum, s) => sum + s.totalAmount, 0);
  const daySessions = sessions.length;

  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getTime();
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1).getTime();
  const monthSessions = Store.getAllCompletedSessions().filter(s => {
    return s.endTime >= monthStart && s.endTime < monthEnd;
  });
  const monthRevenue = monthSessions.reduce((sum, s) => sum + s.totalAmount, 0);

  el.innerHTML = `
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card green">
        <div class="stat-label">${dateStr} 已完成订单</div>
        <div class="stat-value success">${daySessions}</div>
        <div class="stat-sub">单</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-label">${dateStr} 营收</div>
        <div class="stat-value warning">${formatMoney(dayRevenue)}</div>
        <div class="stat-sub"></div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">本月营收</div>
        <div class="stat-value accent">${formatMoney(monthRevenue)}</div>
        <div class="stat-sub">${monthSessions.length} 单</div>
      </div>
    </div>

    <div class="date-nav">
      <button class="btn btn-outline btn-sm" onclick="changeHistoryDate(-1)">‹ 前一天</button>
      <span class="current-date">${dateStr}</span>
      <button class="btn btn-outline btn-sm" onclick="changeHistoryDate(1)">后一天 ›</button>
      <button class="btn btn-outline btn-sm" onclick="changeHistoryDate(0)">今天</button>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">📜 结算记录 — ${dateStr}</span>
      </div>
      ${sessions.length === 0 ? `
        <div class="empty-state">
          <div class="icon">📅</div>
          <div class="text">该日期暂无结算记录</div>
        </div>
      ` : `
        ${sessions.map(s => {
          const room = Store.getRoom(s.roomId);
          const orders = Store.getOrdersForSession(s.id);
          const orderDetails = orders.length > 0
            ? orders.map(o => `${o.itemName}×${o.quantity}`).join('、')
            : '无';

          // 折扣信息
          const hasDiscount = (s.discountPercent > 0 || s.discountFixed > 0);
          const discountParts = [];
          if (s.discountPercent > 0) discountParts.push(`${s.discountPercent}%折扣`);
          if (s.discountFixed > 0) discountParts.push(`减¥${s.discountFixed}`);
          const discountText = hasDiscount ? discountParts.join('+') : null;

          // 自定义时间/费率信息
          const hasCustom = (s.customHours !== null || s.customRate !== null);

          // 计算原价（打折前的应收）
          const originalAmount = s.timeFee + s.orderTotal - s.deposit;

          return `
            <div class="history-item">
              <div class="history-item-header">
                <span><strong>${room ? room.name : '已删除包间'}</strong></span>
                <span class="tag ${room ? getTypeTagClass(room.type) : 'tag-general'}">
                  ${room ? getTypeLabel(room.type) : '通用'}
                </span>
              </div>
              <div class="history-details">
                <div class="detail-item">顾客：<strong>${s.customerName}</strong></div>
                <div class="detail-item">上机：<strong>${formatTime(s.startTime)}</strong></div>
                <div class="detail-item">下机：<strong>${formatTime(s.endTime)}</strong></div>
                <div class="detail-item">实际时长：<strong>${s.actualTime || s.totalTime}分钟</strong></div>
                <div class="detail-item">结算时长：<strong>${s.totalTime}分钟 ${hasCustom ? '(手动调整)' : ''}</strong></div>
                <div class="detail-item">计时费率：<strong>${s.customRate ? s.customRate + '元/时' : (room ? room.hourlyRate + '元/时' : '—')}</strong></div>
                <div class="detail-item">计时费：<strong>${formatMoney(s.timeFee)}</strong></div>
                <div class="detail-item">商品：<strong>${orderDetails} (${formatMoney(s.orderTotal)})</strong></div>
                ${s.deposit > 0 ? `<div class="detail-item">押金：<strong>${formatMoney(s.deposit)}</strong></div>` : ''}
                ${discountText ? `<div class="detail-item" style="color:var(--success);">折扣：<strong>-${discountText}</strong></div>` : ''}
                <div class="detail-item" style="color:var(--accent);font-weight:700;font-size:0.92rem;">
                  实收：<strong>${formatMoney(s.totalAmount)}</strong>
                  ${originalAmount > s.totalAmount ? `<span style="color:var(--text-muted);font-weight:400;font-size:0.78rem;"> (原价 ${formatMoney(originalAmount)})</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      `}
    </div>
  `;
}

function changeHistoryDate(delta) {
  const d = new Date(appState.currentDate);
  if (delta === 0) {
    appState.currentDate = new Date();
  } else {
    d.setDate(d.getDate() + delta);
    appState.currentDate = d;
  }
  renderHistory(document.getElementById('content'));
}

/* ========== 包间管理弹窗 ========== */
function showAddRoomModal() {
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = '＋ 添加包间';
  modalBody.innerHTML = `
    <div class="form-group">
      <label>包间名称</label>
      <input class="form-control" id="roomName" placeholder="例如：PS5 VIP包间">
    </div>
    <div class="form-group">
      <label>类型</label>
      <select class="form-control" id="roomType">
        <option value="ps5">PS5</option>
        <option value="ps4">PS4</option>
        <option value="switch">Switch</option>
        <option value="general">通用</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>收费标准（元/小时）</label>
        <input class="form-control" id="roomRate" type="number" min="0" step="5" value="15">
      </div>
      <div class="form-group">
        <label>押金（元）</label>
        <input class="form-control" id="roomDeposit" type="number" min="0" step="10" value="0">
      </div>
    </div>
    <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-lg" onclick="confirmAddRoom()">确认添加</button>
    </div>
  `;

  openModal();
}

function confirmAddRoom() {
  const name = document.getElementById('roomName').value.trim();
  const type = document.getElementById('roomType').value;
  const rate = parseFloat(document.getElementById('roomRate').value) || 15;
  const deposit = parseFloat(document.getElementById('roomDeposit').value) || 0;

  if (!name) { showToast('请输入包间名称', 'error'); return; }

  Store.addRoom(name, type, rate, deposit);
  closeModal();
  showToast('包间已添加', 'success');
  navigateTo('rooms');
}

function showEditRoomModal(roomId) {
  const room = Store.getRoom(roomId);
  if (!room) return;

  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  modalTitle.textContent = `编辑 — ${room.name}`;
  modalBody.innerHTML = `
    <div class="form-group">
      <label>包间名称</label>
      <input class="form-control" id="roomName" value="${room.name}">
    </div>
    <div class="form-group">
      <label>类型</label>
      <select class="form-control" id="roomType">
        <option value="ps5" ${room.type === 'ps5' ? 'selected' : ''}>PS5</option>
        <option value="ps4" ${room.type === 'ps4' ? 'selected' : ''}>PS4</option>
        <option value="switch" ${room.type === 'switch' ? 'selected' : ''}>Switch</option>
        <option value="general" ${room.type === 'general' ? 'selected' : ''}>通用</option>
      </select>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>收费标准（元/小时）</label>
        <input class="form-control" id="roomRate" type="number" min="0" step="5" value="${room.hourlyRate}">
      </div>
      <div class="form-group">
        <label>押金（元）</label>
        <input class="form-control" id="roomDeposit" type="number" min="0" step="10" value="${room.deposit || 0}">
      </div>
    </div>
    <div style="margin-top:16px; display:flex; gap:8px; justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary btn-lg" onclick="confirmEditRoom('${roomId}')">保存修改</button>
    </div>
  `;

  openModal();
}

function confirmEditRoom(roomId) {
  const name = document.getElementById('roomName').value.trim();
  const type = document.getElementById('roomType').value;
  const rate = parseFloat(document.getElementById('roomRate').value) || 15;
  const deposit = parseFloat(document.getElementById('roomDeposit').value) || 0;

  if (!name) { showToast('请输入包间名称', 'error'); return; }

  Store.updateRoom(roomId, { name, type, hourlyRate: rate, deposit });
  closeModal();
  showToast('包间信息已更新', 'success');
  navigateTo('rooms');
}

function deleteRoomConfirm(roomId) {
  const room = Store.getRoom(roomId);
  if (!room) return;
  if (!confirm(`确定要删除「${room.name}」吗？`)) return;

  if (Store.deleteRoom(roomId)) {
    showToast('包间已删除', 'info');
    navigateTo('rooms');
  }
}

/* ========== 模态框控制 ========== */
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
