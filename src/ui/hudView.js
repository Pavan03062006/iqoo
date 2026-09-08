/**
 * Field Rescuer Tactical HUD View Controller
 */

import { SPATIAL_PROFILES } from '../core/fusion/sensorFusion.js';

export class HudView {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('view-hud');
    this.pressureCanvas = null;
    this.pressureCtx = null;
    this.acousticCanvas = null;
    this.acousticCtx = null;
    this.pressureHistory = [];
    this.maxHistoryPoints = 80;

    this.isCameraActive = false;
    this.videoStream = null;

    this.render();
    this.initCanvases();
    this.bindEvents();
    this.subscribeToEngines();
    this.startCanvasLoops();
  }

  render() {
    this.container.innerHTML = `
      <div class="hud-container">
        <!-- Main Environmental Status Card -->
        <div class="status-card state-stable" id="hudStatusCard">
          <div class="status-card-header">
            <span class="status-caption">HYDROCHAMBER SENSING CORE</span>
            <span class="status-badge" id="hudRiskBadge">RISK: LOW</span>
          </div>
          <div class="status-title status-label" id="hudStatusTitle">STABLE</div>
          <div class="status-recommendation">
            <svg class="recommendation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div class="recommendation-text" id="hudRecommendation">
              ENCLOSURE STABLE — PROCEED WITH CAUTION
            </div>
          </div>
        </div>

        <!-- Enclosure Spatial Profile Selector -->
        <div class="spatial-profile-bar">
          <div class="profile-select-row">
            <span class="profile-select-label">SPATIAL PROFILE:</span>
            <select class="profile-dropdown" id="profileSelect">
              <option value="TEST_CHAMBER">Acrylic Lab Chamber (0.5m / 10L)</option>
              <option value="BASEMENT">Basement Utility Room (2.4m / 45kL)</option>
              <option value="DRAINAGE_SUMP">Drainage Sump Shaft (3.0m / 1.5kL)</option>
              <option value="SEALED_VAULT">Hermetic Vault (1.8m / 12kL)</option>
            </select>
          </div>
          <div class="profile-specs-pill">
            <span>Air Volume: <strong id="specVolume">10 L</strong></span>
            <span>Est. Column: <strong id="specHeight">0.5 m</strong></span>
            <span>Compliance: <strong id="specCompliance">0.8×</strong></span>
          </div>
        </div>

        <!-- Metric Cards Grid -->
        <div class="metrics-grid">
          <!-- Barometer Card -->
          <div class="metric-card" id="barometerMetricCard">
            <div class="metric-header">
              <span class="metric-title">BAROMETER (dP/dt)</span>
              <span class="trend-arrow trend-flat" id="hudTrendArrow">→</span>
            </div>
            <div class="metric-value-row">
              <span class="metric-val" id="hudPressureVal">1013.25</span>
              <span class="metric-unit">hPa</span>
            </div>
            <div class="metric-sub" id="hudPressureSub">
              <span>Rate:</span>
              <strong id="hudPressureRate">+0.00 hPa/s</strong>
            </div>
          </div>

          <!-- Acoustic Cavity Card -->
          <div class="metric-card" id="acousticMetricCard">
            <div class="metric-header">
              <span class="metric-title">ACOUSTIC CAVITY</span>
              <span class="telemetry-badge" id="hudAcousticState">MONITORING</span>
            </div>
            <div class="metric-value-row">
              <span class="metric-val" id="hudAcousticDelta">0%</span>
              <span class="metric-unit">Δ Echo</span>
            </div>
            <div class="metric-sub" id="hudAcousticSub">
              <span>Peak:</span>
              <strong id="hudResonancePeak">440 Hz</strong>
            </div>
          </div>
        </div>

        <!-- IMU Handling Filter Gate -->
        <div class="imu-banner" id="hudImuBanner">
          <div class="imu-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div>
              <div class="imu-label">IMU MOTION FILTER</div>
              <div class="imu-subtext" id="hudImuSubtext">Phone stationary • Measurements reliable</div>
            </div>
          </div>
          <div class="imu-indicator" id="hudImuBadge">STATIONARY</div>
        </div>

        <!-- Tactical Orientation Compass & Horizon -->
        <div class="orientation-card">
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="compass-badge" id="hudCompassHeading">352° N</span>
            <span style="font-family:var(--font-mono); font-size:10px; color:#94a3b8;">ATTITUDE:</span>
          </div>
          <div class="orientation-readouts">
            <span>PITCH: <strong id="hudPitch">0°</strong></span>
            <span>ROLL: <strong id="hudRoll">0°</strong></span>
            <span style="color:var(--neon-green);" id="hudAttitudeStatus">LEVEL</span>
          </div>
        </div>

        <!-- Live Waveforms & FFT Canvas -->
        <div class="telemetry-card">
          <div class="telemetry-card-header">
            <span class="telemetry-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              PRESSURE TELEMETRY (hPa)
            </span>
            <span class="telemetry-badge" id="hudCanvasTrendBadge">SLOPE: 0.00</span>
          </div>
          <div class="graph-canvas-container">
            <canvas id="pressureCanvas" width="440" height="96"></canvas>
          </div>
        </div>

        <div class="telemetry-card">
          <div class="telemetry-card-header">
            <span class="telemetry-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              ACOUSTIC CAVITY SPECTROGRAM (FFT)
            </span>
            <div style="display:flex; gap:6px;">
              <button class="telemetry-badge" id="btnToggleProbeMode" style="background:rgba(0,240,255,0.1); border:1px solid var(--neon-cyan); padding:2px 6px; border-radius:4px; cursor:pointer;">
                MODE: AUDIBLE
              </button>
              <button class="telemetry-badge" id="btnToggleAutoSonar" style="background:rgba(0,255,136,0.1); border:1px solid var(--neon-green); padding:2px 6px; border-radius:4px; cursor:pointer;">
                AUTO-SONAR: OFF
              </button>
            </div>
          </div>
          <div class="graph-canvas-container">
            <canvas id="acousticCanvas" width="440" height="96"></canvas>
          </div>
        </div>

        <!-- Tactical Action Controls Row 1 -->
        <div class="actions-row">
          <button class="tactical-btn btn-primary" id="btnCalibrate">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path>
            </svg>
            CALIBRATE ZERO
          </button>
          <button class="tactical-btn" id="btnManualPing">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            EMIT SONIC PING
          </button>
        </div>

        <!-- Tactical Action Controls Row 2 -->
        <div class="actions-row">
          <button class="tactical-btn" id="btnOpenNVCamera">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            INSPECT BREACH (NV)
          </button>
          <button class="tactical-btn" id="btnOpenSettings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            SENSITIVITY
          </button>
        </div>

        <!-- Tactical Action Controls Row 3 -->
        <div class="actions-row">
          <button class="tactical-btn" id="btnToggleMute">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <span id="muteLabel">AUDIO: ON</span>
          </button>
          <button class="tactical-btn" id="btnToggleVoice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="23"></line>
              <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span id="voiceLabel">VOICE: ON</span>
          </button>
        </div>

        <!-- Export Action Row -->
        <div class="actions-row">
          <button class="tactical-btn" id="btnExportLog" style="grid-column: 1 / -1;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            EXPORT BLACKBOX TELEMETRY (CSV)
          </button>
        </div>

        <!-- Mission Blackbox Event Timeline -->
        <div class="blackbox-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:#cbd5e1; display:flex; align-items:center; gap:6px;">
              <span style="width:6px; height:6px; border-radius:50%; background:var(--neon-green);"></span>
              MISSION BLACKBOX RECORDER
            </span>
            <span style="font-family:var(--font-mono); font-size:10px; color:#64748b;" id="blackboxCount">1 Events</span>
          </div>
          <div class="blackbox-list" id="blackboxList">
            <div class="blackbox-item">
              <span class="blackbox-time">00:00</span>
              <span class="blackbox-text">HydroChamber offline tactical sensing engine initialized.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Optical Breach Night-Vision Modal Overlay -->
      <div class="camera-modal" id="cameraModal">
        <div class="camera-viewport-wrap">
          <video id="cameraVideo" autoplay playsinline muted></video>
          <div class="nv-reticle">
            <div class="nv-crosshair"></div>
          </div>
          <div class="camera-hud-overlay">
            <div>OPTICAL NIGHT-VISION [520nm PHOSPHOR]</div>
            <div id="camTelemetryOverlay">1013.25 hPa | STABLE</div>
          </div>
          <button class="camera-close-btn" id="btnCloseCamera">
            DISENGAGE OPTICAL HUD
          </button>
        </div>
      </div>

      <!-- Sensitivity Settings Modal -->
      <div class="settings-modal" id="settingsModal">
        <div class="settings-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-display); font-size:13px; font-weight:800; color:#fff;">
              SENSOR FUSION SENSITIVITY
            </span>
            <button id="btnCloseSettings" style="background:none; border:none; color:#cbd5e1; font-size:18px; cursor:pointer;">✕</button>
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>PRESSURE RATE WARN (hPa/s)</span>
              <span id="valPRate">0.03</span>
            </div>
            <input type="range" class="tactical-range" id="rangePRate" min="0.01" max="0.10" step="0.01" value="0.03" />
          </div>

          <div class="slider-group">
            <div class="slider-label-row">
              <span>ACOUSTIC SHIFT WARN (Δ Echo %)</span>
              <span id="valAEcho">15%</span>
            </div>
            <input type="range" class="tactical-range" id="rangeAEcho" min="5" max="35" step="1" value="15" />
          </div>

          <button class="tactical-btn btn-primary" id="btnSaveSettings" style="margin-top:8px;">
            APPLY CALIBRATION
          </button>
        </div>
      </div>
    `;
  }

  initCanvases() {
    this.pressureCanvas = document.getElementById('pressureCanvas');
    if (this.pressureCanvas) {
      this.pressureCtx = this.pressureCanvas.getContext('2d');
    }
    this.acousticCanvas = document.getElementById('acousticCanvas');
    if (this.acousticCanvas) {
      this.acousticCtx = this.acousticCanvas.getContext('2d');
    }
  }

  bindEvents() {
    // Calibrate Baseline
    const btnCalibrate = document.getElementById('btnCalibrate');
    if (btnCalibrate) {
      btnCalibrate.addEventListener('click', () => {
        this.app.barometer.calibrateBaseline();
        this.app.acoustic.calibrateBaseline();
        this.app.fusion.logEvent('CALIBRATE', 'Baseline calibrated (Pressure zeroed, Acoustic locked).');
        this.app.soundFX.playSonarPing();
        this.app.soundFX.speak('Baseline calibrated. Zero locked.');
      });
    }

    // Ping Sonar Probe
    const btnPing = document.getElementById('btnManualPing');
    if (btnPing) {
      btnPing.addEventListener('click', () => {
        this.app.acoustic.pingProbe();
        this.app.soundFX.playSonarPing();
        this.app.fusion.logEvent('SONAR_PING', 'Active acoustic chirp probe pulse transmitted.');
      });
    }

    // Toggle Sonar Mode (Audible vs Ultrasonic)
    const btnProbeMode = document.getElementById('btnToggleProbeMode');
    if (btnProbeMode) {
      btnProbeMode.addEventListener('click', () => {
        const nextMode = this.app.acoustic.probeMode === 'AUDIBLE' ? 'ULTRASONIC' : 'AUDIBLE';
        this.app.acoustic.setProbeMode(nextMode);
        btnProbeMode.textContent = `MODE: ${nextMode}`;
        this.app.soundFX.playClick();
        this.app.fusion.logEvent('SONAR_MODE', `Acoustic frequency mode switched to ${nextMode}`);
      });
    }

    // Toggle Auto-Sonar
    const btnAutoSonar = document.getElementById('btnToggleAutoSonar');
    if (btnAutoSonar) {
      btnAutoSonar.addEventListener('click', () => {
        const active = this.app.acoustic.toggleAutoSonar();
        btnAutoSonar.textContent = active ? 'AUTO-SONAR: ON (2.4s)' : 'AUTO-SONAR: OFF';
        btnAutoSonar.style.borderColor = active ? 'var(--neon-green)' : 'var(--bg-card-border)';
        this.app.soundFX.playClick();
      });
    }

    // Spatial Profile Selector
    const profileSelect = document.getElementById('profileSelect');
    if (profileSelect) {
      profileSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        this.app.fusion.setProfile(key);
        const profile = SPATIAL_PROFILES[key];
        const specVol = document.getElementById('specVolume');
        const specH = document.getElementById('specHeight');
        const specC = document.getElementById('specCompliance');
        if (specVol) specVol.textContent = `${profile.volumeL >= 1000 ? (profile.volumeL / 1000) + 'k' : profile.volumeL} L`;
        if (specH) specH.textContent = `${profile.depthM} m`;
        if (specC) specC.textContent = `${profile.compliance}×`;
        this.app.soundFX.playClick();
      });
    }

    // Audio & Voice Toggles
    const btnToggleMute = document.getElementById('btnToggleMute');
    if (btnToggleMute) {
      btnToggleMute.addEventListener('click', () => {
        const isMuted = this.app.soundFX.toggleMute();
        const label = document.getElementById('muteLabel');
        if (label) label.textContent = isMuted ? 'AUDIO: MUTED' : 'AUDIO: ON';
        this.app.soundFX.playClick();
      });
    }

    const btnToggleVoice = document.getElementById('btnToggleVoice');
    if (btnToggleVoice) {
      // Initialize voice synthesis enabled by default
      this.app.soundFX.voiceEnabled = true;
      btnToggleVoice.addEventListener('click', () => {
        const isVoice = this.app.soundFX.toggleVoice();
        const label = document.getElementById('voiceLabel');
        if (label) label.textContent = isVoice ? 'VOICE: ON' : 'VOICE: OFF';
        this.app.soundFX.playClick();
      });
    }

    // Export Telemetry CSV
    const btnExportLog = document.getElementById('btnExportLog');
    if (btnExportLog) {
      btnExportLog.addEventListener('click', () => {
        this.exportTelemetryCSV();
        this.app.soundFX.playClick();
      });
    }

    // Optical Breach Camera Night-Vision Modal
    const btnOpenCam = document.getElementById('btnOpenNVCamera');
    const btnCloseCam = document.getElementById('btnCloseCamera');
    const camModal = document.getElementById('cameraModal');
    const videoElem = document.getElementById('cameraVideo');

    if (btnOpenCam && camModal) {
      btnOpenCam.addEventListener('click', async () => {
        camModal.classList.add('active');
        this.isCameraActive = true;
        this.app.soundFX.playClick();
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            this.videoStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: 'environment' }
            });
            if (videoElem) {
              videoElem.srcObject = this.videoStream;
            }
          } catch (camErr) {
            console.info('Camera unavailable or permission denied, using tactical optical reticle pattern.');
          }
        }
      });
    }

    if (btnCloseCam && camModal) {
      btnCloseCam.addEventListener('click', () => {
        camModal.classList.remove('active');
        this.isCameraActive = false;
        if (this.videoStream) {
          this.videoStream.getTracks().forEach(t => t.stop());
          this.videoStream = null;
        }
        this.app.soundFX.playClick();
      });
    }

    // Sensitivity Settings Modal
    const btnOpenSettings = document.getElementById('btnOpenSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const btnSaveSettings = document.getElementById('btnSaveSettings');
    const settingsModal = document.getElementById('settingsModal');
    const rangeP = document.getElementById('rangePRate');
    const rangeA = document.getElementById('rangeAEcho');
    const valP = document.getElementById('valPRate');
    const valA = document.getElementById('valAEcho');

    if (btnOpenSettings && settingsModal) {
      btnOpenSettings.addEventListener('click', () => {
        settingsModal.classList.add('active');
        this.app.soundFX.playClick();
      });
    }

    if (btnCloseSettings && settingsModal) {
      btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.remove('active');
      });
    }

    if (rangeP && valP) {
      rangeP.addEventListener('input', (e) => {
        valP.textContent = `${parseFloat(e.target.value).toFixed(2)}`;
      });
    }

    if (rangeA && valA) {
      rangeA.addEventListener('input', (e) => {
        valA.textContent = `${e.target.value}%`;
      });
    }

    if (btnSaveSettings && settingsModal) {
      btnSaveSettings.addEventListener('click', () => {
        const pRateWarn = parseFloat(rangeP?.value || '0.03');
        const aDeltaWarn = parseFloat(rangeA?.value || '15');
        this.app.fusion.setThresholds({
          pRateWarn,
          pRateCritical: pRateWarn * 4,
          aDeltaWarn,
          aDeltaCritical: aDeltaWarn * 3
        });
        settingsModal.classList.remove('active');
        this.app.soundFX.playSonarPing();
      });
    }
  }

  subscribeToEngines() {
    // Sensor Fusion updates
    this.app.fusion.subscribe((fusion) => {
      const card = document.getElementById('hudStatusCard');
      const title = document.getElementById('hudStatusTitle');
      const badge = document.getElementById('hudRiskBadge');
      const rec = document.getElementById('hudRecommendation');
      const camOverlay = document.getElementById('camTelemetryOverlay');

      if (!card || !title || !badge || !rec) return;

      // Reset classes
      card.className = 'status-card';

      if (fusion.state.includes('HIGH RISK')) {
        card.classList.add('state-critical');
        title.textContent = 'HIGH RISK';
      } else if (fusion.state.includes('CHANGING')) {
        card.classList.add('state-changing');
        title.textContent = 'ENVIRONMENT CHANGING';
      } else if (fusion.state.includes('STABILIZED')) {
        card.classList.add('state-stabilized');
        title.textContent = 'CONDITION STABILIZED';
      } else {
        card.classList.add('state-stable');
        title.textContent = 'STABLE';
      }

      badge.textContent = `RISK: ${fusion.riskLevel}`;
      rec.textContent = fusion.recommendation;

      if (camOverlay) {
        camOverlay.textContent = `${this.app.barometer.currentPressure.toFixed(2)} hPa | ${title.textContent}`;
      }

      // Update Blackbox list
      this.updateBlackboxUI(fusion.missionLogs);
    });

    // Barometer updates
    this.app.barometer.subscribe((baro) => {
      const pVal = document.getElementById('hudPressureVal');
      const pRate = document.getElementById('hudPressureRate');
      const arrow = document.getElementById('hudTrendArrow');
      const slopeBadge = document.getElementById('hudCanvasTrendBadge');

      if (pVal) pVal.textContent = baro.currentPressure.toFixed(2);
      if (pRate) {
        const sign = baro.pressureRate >= 0 ? '+' : '';
        pRate.textContent = `${sign}${baro.pressureRate.toFixed(2)} hPa/s`;
      }

      if (arrow) {
        if (baro.pressureTrend === 'RISING') {
          arrow.textContent = '↑';
          arrow.className = 'trend-arrow trend-up';
        } else if (baro.pressureTrend === 'FALLING') {
          arrow.textContent = '↓';
          arrow.className = 'trend-arrow trend-down';
        } else {
          arrow.textContent = '→';
          arrow.className = 'trend-arrow trend-flat';
        }
      }

      if (slopeBadge) {
        const sign = baro.pressureRate >= 0 ? '+' : '';
        slopeBadge.textContent = `SLOPE: ${sign}${baro.pressureRate.toFixed(2)}`;
      }

      this.pressureHistory.push(baro.currentPressure);
      if (this.pressureHistory.length > this.maxHistoryPoints) {
        this.pressureHistory.shift();
      }
    });

    // Acoustic updates
    this.app.acoustic.subscribe((ac) => {
      const deltaVal = document.getElementById('hudAcousticDelta');
      const peakVal = document.getElementById('hudResonancePeak');
      const acState = document.getElementById('hudAcousticState');

      if (deltaVal) deltaVal.textContent = `${ac.acousticDelta}%`;
      if (peakVal) peakVal.textContent = `${ac.resonantPeak} Hz`;
      if (acState) {
        acState.textContent = ac.isProbePinging ? 'PINGING...' : (ac.hasBaseline ? 'LOCKED' : 'CALIBRATING');
      }
    });

    // IMU updates with Orientation Compass & Attitude
    this.app.imu.subscribe((imu) => {
      const banner = document.getElementById('hudImuBanner');
      const badge = document.getElementById('hudImuBadge');
      const subtext = document.getElementById('hudImuSubtext');
      const compassHeading = document.getElementById('hudCompassHeading');
      const pitchEl = document.getElementById('hudPitch');
      const rollEl = document.getElementById('hudRoll');
      const attEl = document.getElementById('hudAttitudeStatus');

      if (!banner || !badge || !subtext) return;

      if (imu.isMoving) {
        banner.classList.add('moving');
        badge.textContent = 'MOVING';
        subtext.textContent = 'Phone moving • Suppressing false alarm';
      } else {
        banner.classList.remove('moving');
        badge.textContent = 'STATIONARY';
        subtext.textContent = 'Phone stationary • Measurements reliable';
      }

      if (imu.gyro) {
        const alpha = Math.round(imu.gyro.alpha || 0);
        const beta = Math.round(imu.gyro.beta || 0);
        const gamma = Math.round(imu.gyro.gamma || 0);

        if (compassHeading) {
          const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
          const dirIndex = Math.round(alpha / 45) % 8;
          compassHeading.textContent = `${alpha}° ${dirs[dirIndex]}`;
        }
        if (pitchEl) pitchEl.textContent = `${beta}°`;
        if (rollEl) rollEl.textContent = `${gamma}°`;

        if (attEl) {
          if (Math.abs(beta) < 15 && Math.abs(gamma) < 15) {
            attEl.textContent = 'LEVEL';
            attEl.style.color = 'var(--neon-green)';
          } else {
            attEl.textContent = 'TILTED';
            attEl.style.color = 'var(--neon-amber)';
          }
        }
      }
    });
  }

  updateBlackboxUI(logs) {
    const list = document.getElementById('blackboxList');
    const count = document.getElementById('blackboxCount');
    if (!list || !logs) return;

    if (count) count.textContent = `${logs.length} Events`;

    list.innerHTML = logs.slice(0, 15).map(item => {
      let extraClass = '';
      if (item.type.includes('RISK_HIGH')) extraClass = 'item-critical';
      else if (item.type.includes('WARN')) extraClass = 'item-warn';

      return `
        <div class="blackbox-item ${extraClass}">
          <span class="blackbox-time">${item.elapsed}</span>
          <span class="blackbox-text">${item.text}</span>
        </div>
      `;
    }).join('');
  }

  startCanvasLoops() {
    const drawPressure = () => {
      if (this.pressureCtx && this.pressureCanvas) {
        const ctx = this.pressureCtx;
        const w = this.pressureCanvas.width;
        const h = this.pressureCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = 16; y < h; y += 24) {
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
        }
        ctx.stroke();

        if (this.pressureHistory.length > 1) {
          const minP = Math.min(...this.pressureHistory) - 0.2;
          const maxP = Math.max(...this.pressureHistory) + 0.2;
          const range = Math.max(0.4, maxP - minP);

          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          const stepX = w / (this.maxHistoryPoints - 1);
          for (let i = 0; i < this.pressureHistory.length; i++) {
            const x = i * stepX;
            const normY = (this.pressureHistory[i] - minP) / range;
            const y = h - (normY * (h - 20) + 10);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Glow effect
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.lineWidth = 6;
          ctx.stroke();
        }
      }

      if (this.acousticCtx && this.acousticCanvas) {
        const ctx = this.acousticCtx;
        const w = this.acousticCanvas.width;
        const h = this.acousticCanvas.height;
        const fft = this.app.acoustic.fftData;

        ctx.clearRect(0, 0, w, h);

        if (fft) {
          const barCount = 48;
          const barWidth = (w / barCount) - 2;
          const step = Math.floor(fft.length / barCount);

          for (let i = 0; i < barCount; i++) {
            const rawVal = fft[i * step] || 0;
            const barHeight = (rawVal / 255) * (h - 8);
            const x = i * (barWidth + 2);
            const y = h - barHeight;

            // Gradient bars
            const grad = ctx.createLinearGradient(0, y, 0, h);
            grad.addColorStop(0, '#00f0ff');
            grad.addColorStop(1, '#0044aa');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, barWidth, barHeight);
          }
        }
      }

      requestAnimationFrame(drawPressure);
    };

    requestAnimationFrame(drawPressure);
  }

  exportTelemetryCSV() {
    const rows = [
      ['Timestamp', 'Elapsed', 'Pressure_hPa', 'Pressure_Rate_hPa_s', 'Acoustic_Delta_%', 'Resonance_Hz', 'IMU_Moving', 'Risk_Level', 'Enclosure_Profile']
    ];
    const now = new Date().toISOString();
    rows.push([
      now,
      '00:00',
      this.app.barometer.currentPressure.toFixed(2),
      this.app.barometer.pressureRate.toFixed(3),
      this.app.acoustic.acousticDelta,
      this.app.acoustic.resonantPeak,
      this.app.imu.isMoving ? 'YES' : 'NO',
      this.app.fusion.riskLevel,
      this.app.fusion.currentProfile.name
    ]);

    // Include mission blackbox history
    if (this.app.fusion.missionLogs) {
      this.app.fusion.missionLogs.forEach(entry => {
        rows.push([entry.time, entry.elapsed, '', '', '', '', '', entry.type, entry.text.replace(/,/g, ';')]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hydrochamber_mission_log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
