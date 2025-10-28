// Front-end controller for the in-browser dashboard experience.

const tabs = Array.from(document.querySelectorAll('.tab'));
const sections = new Map(
  Array.from(document.querySelectorAll('main > section')).map((section) => [
    section.id,
    section,
  ]),
);

const elements = {
  // Transaction form
  amount: document.getElementById('amt'),
  counterparty: document.getElementById('to'),
  memo: document.getElementById('memo'),
  output: document.getElementById('out'),
  receipts: document.getElementById('receipts'),

  // Mandates
  mandateIssuer: document.getElementById('m_issuer'),
  mandateSubject: document.getElementById('m_subject'),
  mandateScope: document.getElementById('m_scope'),
  mandateMax: document.getElementById('m_max'),
  mandateCurrency: document.getElementById('m_currency'),
  mandates: document.getElementById('mandates'),

  // Sandbox & admin toggles
  loopEnabled: document.getElementById('loop_enabled'),
  loopStatus: document.getElementById('loop_status'),
  sandboxMode: document.getElementById('sandbox_mode'),
  syntheticAgents: document.getElementById('synthetic_agents'),
  syntheticRate: document.getElementById('synthetic_rate'),
  dryRun: document.getElementById('dryrun'),
  x402: document.getElementById('x402'),
  visaAI: document.getElementById('visa_ai'),
  coinbaseStatus: document.getElementById('coinbase_status'),
  walletStatus: document.getElementById('wallet_status'),
  connectWalletButton: document.querySelector('[data-action="connect-wallet"]'),

  // Diagnostics
  diagnostics: document.getElementById('diag'),

  // License
  licenseKey: document.getElementById('license_key'),

  // AWS profile
  region: document.getElementById('region'),
  bucket: document.getElementById('bucket'),
  dist: document.getElementById('dist'),
  akid: document.getElementById('akid'),
  secret: document.getElementById('secret'),
  awsOutput: document.getElementById('awsout'),

  // Analytics
  analyticsWindow: document.getElementById('win'),
  analyticsMetrics: document.getElementById('metrics'),
  analyticsBreakdown: document.getElementById('breakdown'),

  // Inbound + logs
  inboundList: document.getElementById('inbounds'),
  logBox: document.getElementById('logbox'),

  // Coinbase modal
  x402ModalBackdrop: document.getElementById('x402_modal_backdrop'),
  x402Form: document.getElementById('x402_form'),
  x402Facilitator: document.getElementById('x402_facilitator'),
  x402Wallet: document.getElementById('x402_wallet'),
  x402ApiKeyId: document.getElementById('x402_api_key_id'),
  x402ApiKeySecret: document.getElementById('x402_api_key_secret'),
  x402Notice: document.getElementById('x402_notice'),

  // Navigation & filters
  navToggle: document.querySelector('[data-action="toggle-nav"]'),
  navPanel: document.getElementById('nav_panel'),
  activityFilterRail: document.getElementById('activity_filter_rail'),
  activityFilterStatus: document.getElementById('activity_filter_status'),
};

const state = {
  logStream: null,
  walletAccount: null,
  x402Config: null,
  navOpen: false,
  receipts: [],
};

function activateTab(id) {
  sections.forEach((section, sectionId) => {
    if (!section) return;
    const isActive = sectionId === id;
    section.classList.toggle('active', isActive);
    section.hidden = !isActive;
  });

  tabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.tab === id);
  });
  closeNav();
}

function setBadge(element, isActive, onLabel = 'On', offLabel = 'Off') {
  if (!element) return;
  const label = element.dataset.label || element.getAttribute('data-label') || '';
  const value = isActive ? onLabel : offLabel;
  element.innerHTML = `<strong>${label}</strong><span>${value}</span>`;
  element.classList.toggle('on', isActive);
  element.classList.toggle('off', !isActive);
  element.setAttribute('aria-label', `${label} ${value}`);
}

function asJson(value) {
  return JSON.stringify(value, null, 2);
}

function formatError(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unexpected error';
}

async function fetchJson(url, options = {}) {
  const request = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  };

  if (request.body && typeof request.body !== 'string') {
    request.body = JSON.stringify(request.body);
  }

  const response = await fetch(url, request);
  if (!response.ok) {
    const body = await response.text();
    let message = body || `${response.status} ${response.statusText}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && parsed.error) {
        message = parsed.error;
      }
    } catch {
      /* ignore JSON parse errors */
    }
    throw new Error(message);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return null;
}

function updateWalletStatus() {
  const connected = Boolean(state.walletAccount);
  if (elements.walletStatus) {
    setBadge(elements.walletStatus, connected, 'Connected', 'Disconnected');
    if (connected) {
      elements.walletStatus.title = state.walletAccount ?? '';
    } else {
      elements.walletStatus.removeAttribute('title');
    }
  }
  if (elements.connectWalletButton) {
    elements.connectWalletButton.textContent = connected
      ? `Wallet ${state.walletAccount?.slice(0, 6)}…${state.walletAccount?.slice(-4)}`
      : 'Connect Wallet';
  }
}

async function connectWallet(event) {
  event?.preventDefault();
  const provider = window.ethereum;
  if (!provider) {
    window.alert('No web3 wallet detected. Install Coinbase Wallet or MetaMask.');
    return;
  }
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' });
    state.walletAccount = Array.isArray(accounts) ? accounts[0] ?? null : null;
    updateWalletStatus();
  } catch (error) {
    console.error('wallet connect failed', error);
    window.alert('Unable to connect wallet. Check your extension permissions.');
  }
}

function watchWallet() {
  const provider = window.ethereum;
  if (!provider) return;
  provider
    .request?.({ method: 'eth_accounts' })
    .then((accounts) => {
      if (Array.isArray(accounts) && accounts[0]) {
        state.walletAccount = accounts[0];
        updateWalletStatus();
      }
    })
    .catch(() => {});
  if (typeof provider.on === 'function') {
    provider.on('accountsChanged', (accounts) => {
      state.walletAccount = Array.isArray(accounts) ? accounts[0] ?? null : null;
      updateWalletStatus();
    });
  }
}

async function loadX402Config() {
  try {
    const response = await fetchJson('/api/admin/x402-config');
    state.x402Config = response?.config || null;
    if (elements.coinbaseStatus) {
      const configured = Boolean(state.x402Config);
      setBadge(elements.coinbaseStatus, configured, 'Ready', 'Missing');
      if (configured && state.x402Config.walletAddress) {
        elements.coinbaseStatus.title = state.x402Config.walletAddress;
      } else {
        elements.coinbaseStatus.removeAttribute?.('title');
      }
    }
  } catch (error) {
    console.error('Failed to load Coinbase config', error);
  }
}

function renderReceipts() {
  if (!elements.receipts) return;
  const railFilter = elements.activityFilterRail?.value || 'ALL';
  const statusFilter = elements.activityFilterStatus?.value || 'ALL';
  const data = Array.isArray(state.receipts) ? state.receipts : [];

  if (data.length === 0) {
    elements.receipts.innerHTML =
      '<p class="muted small">No transactions yet. They will appear here instantly.</p>';
    return;
  }

  const filtered = data.filter((receipt) => {
    const railOk = railFilter === 'ALL' || receipt.rail === railFilter;
    const statusOk =
      statusFilter === 'ALL' ||
      (receipt.status || '').toUpperCase() === statusFilter.toUpperCase();
    return railOk && statusOk;
  });

  if (filtered.length === 0) {
    elements.receipts.innerHTML =
      '<p class="muted small">No entries match the selected filters.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((receipt, index) => {
    const item = document.createElement('details');
    if (index === 0) item.open = true;
    const createdAt = new Date(receipt.createdAt || Date.now()).toLocaleString();
    const railLabel = receipt.rail === 'CARD' ? 'Visa Agent' : 'X402';
    const pillClass = receipt.rail === 'CARD' ? 'visa' : 'x402';
    const status = receipt.status || 'UNKNOWN';

    item.innerHTML = `
      <summary>
        <span class="pill ${pillClass}">${railLabel}</span>
        <span class="pill status">#${receipt.id} · ${status}</span>
        <span class="muted">${createdAt}</span>
      </summary>
      <pre>${asJson(receipt.payload)}</pre>
    `;

    fragment.appendChild(item);
  });

  elements.receipts.replaceChildren(fragment);
}

function openX402Modal(event) {
  event?.preventDefault();
  if (!elements.x402ModalBackdrop) return;
  elements.x402Notice?.classList.remove('error');
  if (elements.x402Notice) {
    elements.x402Notice.textContent =
      'Values are encrypted at rest. Re-enter keys to rotate.';
  }
  if (elements.x402Form) {
    elements.x402Form.reset();
  }
  const cfg = state.x402Config;
  if (elements.x402Facilitator) {
    elements.x402Facilitator.value =
      cfg?.facilitatorUrl || 'https://x402.org/facilitator';
  }
  if (elements.x402Wallet) {
    elements.x402Wallet.value = cfg?.walletAddress || '';
  }
  if (elements.x402ApiKeyId) {
    elements.x402ApiKeyId.value = '';
    elements.x402ApiKeyId.placeholder = cfg?.apiKeyId || 'Enter new key id';
  }
  if (elements.x402ApiKeySecret) {
    elements.x402ApiKeySecret.value = '';
    elements.x402ApiKeySecret.placeholder =
      cfg?.apiKeySecret || 'Enter new secret';
  }
  elements.x402ModalBackdrop.classList.remove('hidden');
}

function closeX402Modal(event) {
  event?.preventDefault();
  if (!elements.x402ModalBackdrop) return;
  elements.x402ModalBackdrop.classList.add('hidden');
  if (elements.x402Notice) {
    elements.x402Notice.classList.remove('error');
    elements.x402Notice.textContent =
      'Values are encrypted at rest. Re-enter keys to rotate.';
  }
}

async function submitX402Config(event) {
  event?.preventDefault();
  if (!elements.x402Notice) return;
  const facilitatorUrl =
    elements.x402Facilitator?.value.trim() || 'https://x402.org/facilitator';
  const walletAddress = elements.x402Wallet?.value.trim() || '';
  const apiKeyId = elements.x402ApiKeyId?.value.trim() || '';
  const apiKeySecret = elements.x402ApiKeySecret?.value.trim() || '';

  if (!walletAddress || !apiKeyId || !apiKeySecret) {
    elements.x402Notice.classList.add('error');
    elements.x402Notice.textContent = 'All fields are required.';
    return;
  }

  try {
    elements.x402Notice.classList.remove('error');
    elements.x402Notice.textContent = 'Saving...';
    await fetchJson('/api/admin/x402-config', {
      method: 'POST',
      body: {
        facilitatorUrl,
        walletAddress,
        apiKeyId,
        apiKeySecret,
      },
    });
    await loadX402Config();
    closeX402Modal();
  } catch (error) {
    elements.x402Notice.classList.add('error');
    elements.x402Notice.textContent = formatError(error);
  }
}

function normaliseRate() {
  const { syntheticRate } = elements;
  const raw = syntheticRate?.value || '10';
  const number = Math.max(1, Math.floor(Number(raw) || 10));

  if (syntheticRate) syntheticRate.value = String(number);

  return number;
}

function collectTogglePayload() {
  const sandboxMode = !!elements.sandboxMode?.checked;
  const syntheticAgents = !!elements.syntheticAgents?.checked;
  const loop = !!elements.loopEnabled?.checked;
  const rate = normaliseRate();

  return {
    LOOP_ENABLED: loop,
    SANDBOX_MODE: sandboxMode,
    SYNTHETIC_AGENTS: syntheticAgents,
    SYNTHETIC_RATE: rate,
  };
}

async function loadToggles() {
  try {
    const toggles = await fetchJson('/api/admin/toggles');
    const sandbox = Boolean(toggles.SANDBOX_MODE);
    const synthetic = Boolean(toggles.SYNTHETIC_AGENTS);
    const rate = toggles.SYNTHETIC_RATE || '10';

    if (elements.loopEnabled) {
      elements.loopEnabled.checked = Boolean(toggles.LOOP_ENABLED);
      setBadge(elements.loopStatus, toggles.LOOP_ENABLED, 'Engaged', 'Idle');
    }

    if (elements.sandboxMode) elements.sandboxMode.checked = sandbox;
    if (elements.syntheticAgents) elements.syntheticAgents.checked = synthetic;
    if (elements.syntheticRate) elements.syntheticRate.value = rate;

    setBadge(elements.dryRun, toggles.PAYMENTS_DRY_RUN, 'Simulated', 'Live');
    setBadge(elements.x402, toggles.X402_LIVE, 'Live', 'Sandbox');
    setBadge(elements.visaAI, toggles.VISA_AI_LIVE, 'Live', 'Offline');
  } catch (error) {
    console.error('Failed to load toggles', error);
  }
}

async function saveToggles() {
  try {
    const payload = collectTogglePayload();
    await fetchJson('/api/admin/toggles', { method: 'PUT', body: payload });
    await loadToggles();
  } catch (error) {
    console.error('Failed to save toggles', error);
  }
}

async function rotateLicense() {
  const key = elements.licenseKey?.value.trim();
  if (!key) {
    window.alert('Enter a license key value first.');
    return;
  }

  try {
    await fetchJson('/api/admin/license', { method: 'PUT', body: { key } });
    window.alert('License rotated successfully.');
  } catch (error) {
    window.alert(`Failed to rotate license: ${formatError(error)}`);
  }
}

async function sendTransaction() {
  if (!elements.output) return;

  const amountMajor = parseFloat(elements.amount?.value || '0');
  if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
    elements.output.textContent = 'Enter a valid amount above zero.';
    return;
  }
  const amountMinor = Math.max(1, Math.round(amountMajor * 100));
  const railInput = document.querySelector('input[name="rail"]:checked');
  const selectedRail =
    railInput && railInput instanceof HTMLInputElement
      ? railInput.value
      : 'X402';
  const intent = {
    amountMinor,
    currency: 'USDC',
    memo: elements.memo?.value || undefined,
    counterparty: elements.counterparty?.value || 'cb:mlr',
    rail: selectedRail,
  };

  const mandate = {
    issuerDID: 'did:example:mlr',
    subjectDID: 'did:example:recipient',
    scope: 'TIP',
    maxAmountMinor: 10_000_000,
    currency: 'USDC',
    expiresAt: Date.now() + 3_600_000, // 1 hour default
  };

  try {
    elements.output.textContent = 'Submitting payment...';
    const response = await fetchJson('/api/execute', {
      method: 'POST',
      body: { mandate, intent },
    });
    elements.output.textContent = asJson(response);
    await loadReceipts();
  } catch (error) {
    elements.output.textContent = `Error: ${formatError(error)}`;
  }
}

async function loadReceipts() {
  if (!elements.receipts) return;

  try {
    const receipts = await fetchJson('/api/receipts');
    state.receipts = Array.isArray(receipts) ? receipts : [];
    renderReceipts();
  } catch (error) {
    state.receipts = [];
    elements.receipts.innerHTML = `<p class="muted">Failed to load receipts: ${formatError(error)}</p>`;
  }
}

async function issueMandate() {
  const issuer = elements.mandateIssuer?.value.trim();
  const subject = elements.mandateSubject?.value.trim();
  const scope = elements.mandateScope?.value || 'TIP';
  const currency = elements.mandateCurrency?.value.trim() || 'USDC';
  const maxAmountMinor = Math.max(1, Number(elements.mandateMax?.value || '0'));

  if (!issuer || !subject) {
    window.alert('Issuer and subject DIDs are required.');
    return;
  }

  try {
    await fetchJson('/api/mandates', {
      method: 'POST',
      body: {
        issuerDID: issuer,
        subjectDID: subject,
        scope,
        maxAmountMinor,
        currency,
        expiresAt: Date.now() + 86_400_000, // 24 hours
      },
    });
    await loadMandates();
  } catch (error) {
    window.alert(`Failed to create mandate: ${formatError(error)}`);
  }
}

async function deleteMandate(id) {
  try {
    await fetchJson(`/api/mandates/${id}`, { method: 'DELETE' });
    await loadMandates();
  } catch (error) {
    window.alert(`Failed to delete mandate: ${formatError(error)}`);
  }
}

async function loadMandates() {
  if (!elements.mandates) return;

  try {
    const mandates = await fetchJson('/api/mandates');

    if (!mandates || mandates.length === 0) {
      elements.mandates.innerHTML =
        '<p class="muted small">No mandates issued yet.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    mandates.forEach((mandate) => {
      const item = document.createElement('details');
      const expires = mandate.expires_at
        ? new Date(mandate.expires_at).toLocaleString()
        : 'No expiry';
      item.innerHTML = `
        <summary>
          <span>
            <span class="pill status">Mandate</span>
            <span class="pill status">${mandate.scope}</span>
          </span>
          <span class="muted">Expires: ${expires}</span>
        </summary>
        <div style="padding:16px">
          <p class="hint">Issuer: ${mandate.issuer_did}</p>
          <p class="hint">Subject: ${mandate.subject_did}</p>
          <p class="hint">Limit: ${mandate.currency} ${mandate.max_amount_minor}</p>
          <div class="control-actions" style="margin-top:14px">
            <button type="button" data-action="delete-mandate" data-id="${mandate.id}">Revoke Mandate</button>
          </div>
        </div>
      `;

      fragment.appendChild(item);
    });

    elements.mandates.replaceChildren(fragment);
  } catch (error) {
    elements.mandates.innerHTML = `<p class="muted">Failed to load mandates: ${formatError(error)}</p>`;
  }
}

async function runDiagnostics() {
  if (!elements.diagnostics) return;

  elements.diagnostics.textContent = 'Running diagnostics...';
  try {
    const response = await fetchJson('/api/admin/diagnostics', { method: 'POST' });
    elements.diagnostics.textContent = asJson(response);
  } catch (error) {
    elements.diagnostics.textContent = `Error: ${formatError(error)}`;
  }
}

async function saveAwsConfig() {
  try {
    const payload = {
      region: elements.region?.value.trim(),
      s3Bucket: elements.bucket?.value.trim() || undefined,
      distributionId: elements.dist?.value.trim() || undefined,
      accessKeyId: elements.akid?.value.trim(),
      secretAccessKey: elements.secret?.value.trim(),
    };

    const response = await fetchJson('/api/admin/aws-config', {
      method: 'POST',
      body: payload,
    });

    if (elements.awsOutput) {
      elements.awsOutput.textContent = asJson(response);
    }
  } catch (error) {
    if (elements.awsOutput) {
      elements.awsOutput.textContent = `Error: ${formatError(error)}`;
    }
  }
}

async function simulateAws() {
  try {
    const response = await fetchJson('/api/admin/aws-simulate', { method: 'POST' });
    if (elements.awsOutput) {
      elements.awsOutput.textContent = asJson(response);
    }
  } catch (error) {
    if (elements.awsOutput) {
      elements.awsOutput.textContent = `Error: ${formatError(error)}`;
    }
  }
}

async function loadAwsConfig() {
  if (!elements.awsOutput) return;

  try {
    const result = await fetchJson('/api/admin/aws-config');
    if (!result || !result.config) {
      elements.awsOutput.textContent = 'No config stored yet.';
      return;
    }

    const { config } = result;
    if (elements.region) elements.region.value = config.region || '';
    if (elements.bucket) elements.bucket.value = config.s3Bucket || '';
    if (elements.dist) elements.dist.value = config.distributionId || '';
    if (elements.akid) elements.akid.value = config.accessKeyId || '';
    if (elements.secret) elements.secret.value = config.secretAccessKey || '';
    elements.awsOutput.textContent = asJson(config);
  } catch (error) {
    elements.awsOutput.textContent = `Error loading config: ${formatError(error)}`;
  }
}

async function loadAnalytics() {
  if (!elements.analyticsMetrics || !elements.analyticsBreakdown) return;

  const windowMinutes = Math.max(
    5,
    Number(elements.analyticsWindow?.value || '60') || 60,
  );

  try {
    const analytics = await fetchJson(`/api/analytics?window=${windowMinutes}`);
    const metrics = [
      { label: 'Total tx', value: analytics.total },
      { label: 'Tx per min', value: analytics.perMin },
      { label: 'Success rate %', value: analytics.successRate },
      { label: 'Window (min)', value: analytics.windowMinutes },
    ];

    const fragment = document.createDocumentFragment();
    metrics.forEach((metric) => {
      const node = document.createElement('div');
      node.className = 'metric';
      node.innerHTML = `<span>${metric.label}</span><b>${metric.value}</b>`;
      fragment.appendChild(node);
    });
    elements.analyticsMetrics.replaceChildren(fragment);

    const breakdown = {
      byRail: analytics.byRail,
      byStatus: analytics.byStatus,
      since: new Date(analytics.since).toLocaleString(),
      now: new Date(analytics.now).toLocaleString(),
    };
    elements.analyticsBreakdown.textContent = asJson(breakdown);
  } catch (error) {
    elements.analyticsBreakdown.textContent = `Failed to load analytics: ${formatError(error)}`;
  }
}

async function loadInbound() {
  if (!elements.inboundList) return;

  try {
    const result = await fetchJson('/api/webhooks/inbound');
    const events = (result && result.events) || [];

    if (events.length === 0) {
      elements.inboundList.innerHTML = '<p class="muted">No inbound events yet.</p>';
      return;
    }

    const fragment = document.createDocumentFragment();
    events.forEach((event) => {
      const item = document.createElement('div');
      item.className = 'item';
      const received = new Date(event.received_at).toLocaleString();
      const badge = `<span class="badge ${event.signature_valid ? 'on' : 'off'}">${event.signature_valid ? 'Signed' : 'Failed'}</span>`;

      item.innerHTML = `
        <div class="row" style="justify-content: space-between">
          <strong>#${event.id} ${event.source} · ${event.event_type}</strong>
          <span class="muted">${received}</span>
        </div>
        <div class="row inline-note">
          <span>Signature ${badge}</span>
        </div>
        <pre>${asJson(event.payload)}</pre>
      `;

      fragment.appendChild(item);
    });

    elements.inboundList.replaceChildren(fragment);
  } catch (error) {
    elements.inboundList.innerHTML = `<p class="muted">Failed to load inbound events: ${formatError(error)}</p>`;
  }
}

function streamLogs() {
  if (!elements.logBox || state.logStream) return;

  const box = elements.logBox;
  box.textContent = 'Listening for events...\n';

  const source = new EventSource('/api/logs');
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const line = `[${new Date(payload.ts).toLocaleTimeString()}] ${String(
        payload.level || 'info',
      ).toUpperCase()}: ${payload.msg}`;
      box.textContent += `${line}\n`;
      box.scrollTop = box.scrollHeight;
    } catch {
      // Ignore malformed entries.
    }
  };
  source.onerror = () => {
    box.textContent += '[stream] disconnected\n';
  };

  state.logStream = source;
}

function openNav() {
  if (!elements.navPanel || state.navOpen) return;
  elements.navPanel.classList.remove('hidden');
  elements.navPanel.classList.add('open');
  document.body.classList.add('nav-open');
  elements.navToggle?.setAttribute('aria-expanded', 'true');
  state.navOpen = true;
}

function closeNav() {
  if (!elements.navPanel || !state.navOpen) return;
  elements.navPanel.classList.remove('open');
  elements.navPanel.classList.add('hidden');
  document.body.classList.remove('nav-open');
  elements.navToggle?.setAttribute('aria-expanded', 'false');
  state.navOpen = false;
}

function toggleNav(event) {
  event?.preventDefault();
  if (state.navOpen) closeNav();
  else openNav();
}

function attachTabHandlers() {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activateTab(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activateTab(tab.dataset.tab);
      }
    });
  });
}

function attachUiHandlers() {
  const actions = {
    'send-transaction': sendTransaction,
    'issue-mandate': issueMandate,
    'save-toggles': saveToggles,
    'run-diagnostics': runDiagnostics,
    'rotate-license': rotateLicense,
    'save-aws': saveAwsConfig,
    'simulate-aws': simulateAws,
    'refresh-analytics': loadAnalytics,
    'refresh-inbound': loadInbound,
    'connect-wallet': connectWallet,
    'open-x402-modal': openX402Modal,
    'close-x402-modal': closeX402Modal,
    'submit-x402-config': submitX402Config,
    'toggle-nav': toggleNav,
  };

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const actionTarget = target.closest('[data-action]');
    if (!(actionTarget instanceof HTMLElement)) return;

    const action = actionTarget.dataset.action;
    if (action && typeof actions[action] === 'function') {
      actions[action](event);
    }

    if (action === 'delete-mandate' && actionTarget.dataset.id) {
      deleteMandate(actionTarget.dataset.id);
    }
  });
}

function attachModalHandlers() {
  elements.x402Form?.addEventListener('submit', submitX402Config);
  elements.x402ModalBackdrop?.addEventListener('click', (event) => {
    if (event.target === elements.x402ModalBackdrop) {
      closeX402Modal(event);
    }
  });
  elements.navPanel?.addEventListener('click', (event) => {
    if (event.target === elements.navPanel) {
      closeNav();
    }
  });
}

async function loadAll() {
  await loadToggles();
  await loadX402Config();
  await Promise.all([
    loadReceipts(),
    loadMandates(),
    loadAnalytics(),
    loadInbound(),
    loadAwsConfig(),
  ]);
  streamLogs();
}

function init() {
  attachTabHandlers();
  attachUiHandlers();
  attachModalHandlers();
  elements.activityFilterRail?.addEventListener('change', renderReceipts);
  elements.activityFilterStatus?.addEventListener('change', renderReceipts);
  elements.navToggle?.setAttribute('aria-expanded', 'false');
  activateTab('control');
  watchWallet();
  updateWalletStatus();
  renderReceipts();
  loadAll();
}

window.addEventListener('beforeunload', () => {
  if (state.logStream) {
    state.logStream.close();
  }
});

init();
