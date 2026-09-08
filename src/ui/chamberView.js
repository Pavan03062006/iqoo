/**
 * Transparent Chamber Interactive Simulator & Judge Demo Bench Controller
 */

export class ChamberView {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('view-chamber');
    this.render();
    this.bindEvents();
    this.subscribeToSimulator();
  }

  render() {
    this.container.innerHTML = `
      <div class="chamber-container">
        <!-- Visual Simulation Stage -->
        <div class="chamber-stage" id="chamberStage">
          <!-- Acrylic Tank -->
          <div class="tank-column">
            <!-- Mounted iQOO Sensing Device -->
            <div class="phone-mount">
              <span class="mount-brand">iQOO SENSING</span>
              <div class="mount-sensors">
                <span class="sensor-dot" title="Barometer"></span>
                <span class="sensor-dot" style="background:#ffaa00;" title="Acoustic Mic"></span>
                <span class="sensor-dot" style="background:#00ff88;" title="IMU"></span>
              </div>
              <span class="mount-status-line">OFFLINE LOCAL</span>
            </div>

            <!-- Acoustic Ping Waves -->
            <div class="acoustic-waves">
              <div class="sound-arc"></div>
              <div class="sound-arc"></div>
              <div class="sound-arc"></div>
            </div>

            <!-- Rising Water Column -->
            <div class="tank-water" id="simWaterColumn" style="height: 15%;">
              <div class="water-surface"></div>
              <div class="bubble" style="left: 20%; animation-duration: 2.2s;"></div>
              <div class="bubble" style="left: 55%; animation-duration: 1.8s; animation-delay: 0.5s;"></div>
              <div class="bubble" style="left: 80%; animation-duration: 2.5s; animation-delay: 1.1s;"></div>
            </div>
          </div>

          <!-- Overlaid Telemetry Labels -->
          <div class="tank-overlay-labels">
            <div class="tank-badge">
              Air Cavity: <strong id="simAirVolume">8.5 L</strong>
            </div>
            <div class="tank-badge">
              Water Level: <strong id="simWaterLevel">15%</strong>
            </div>
            <div class="tank-badge">
              Pressure Rise: <strong id="simPressureDelta">+0.14 hPa</strong>
            </div>
            <div class="tank-badge">
              Resonance: <strong id="simAcousticRes">520 Hz</strong>
            </div>
          </div>
        </div>

        <!-- Pump & Chamber Physics Controls -->
        <div class="pump-controls">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:var(--font-display); font-size:12px; font-weight:800; color:#fff;">
              CHAMBER WATER PUMP
            </span>
            <button class="telemetry-badge" id="btnToggleSeal" style="background:rgba(0,240,255,0.1); border:1px solid var(--neon-cyan); padding:2px 8px; border-radius:4px; cursor:pointer;">
              SEAL: HERMETIC
            </button>
          </div>

          <div class="pump-btn-group">
            <button class="pump-btn" id="btnPumpIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              PUMP IN (↑)
            </button>
            <button class="pump-btn active" id="btnPumpStop">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="6" width="12" height="12"/>
              </svg>
              STOP PUMP
            </button>
            <button class="pump-btn" id="btnPumpOut">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
              DRAIN (↓)
            </button>
          </div>

          <!-- Water Level Slider & Ingress Speed -->
          <div class="slider-group">
            <div class="slider-label-row">
              <span>MANUAL WATER LEVEL</span>
              <span id="sliderValDisplay">15% (7.5 cm water / 42.5 cm air)</span>
            </div>
            <input type="range" class="tactical-range" id="simWaterSlider" min="0" max="88" value="15"/>
          </div>

          <!-- Flow Speed Selection -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
            <span style="font-family:var(--font-mono); font-size:10px; color:#94a3b8;">FLOW SPEED:</span>
            <div style="display:flex; gap:6px;">
              <button class="telemetry-badge" id="speedSlow" style="background:rgba(0,240,255,0.1); border:1px solid var(--bg-card-border); padding:2px 6px; cursor:pointer;">0.5× TRICKLE</button>
              <button class="telemetry-badge" id="speedNormal" style="background:rgba(0,240,255,0.25); border:1px solid var(--neon-cyan); padding:2px 6px; cursor:pointer;">1.0× FLOOD</button>
              <button class="telemetry-badge" id="speedFast" style="background:rgba(255,42,85,0.15); border:1px solid var(--neon-red); padding:2px 6px; cursor:pointer;">2.5× SURGE</button>
            </div>
          </div>
        </div>

        <!-- 1-Click Judge Presentation Scenarios -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
          <span style="font-family:var(--font-display); font-size:12px; font-weight:800; color:#cbd5e1;">
            JUDGE LIVE DEMO PRESETS
          </span>
          <button class="telemetry-badge" id="btnPipeSurge" style="background:rgba(255,42,85,0.15); border:1px solid var(--neon-red); color:var(--neon-red); padding:3px 8px; border-radius:4px; cursor:pointer; font-weight:700;">
            ⚡ SIMULATE PIPE BURST
          </button>
        </div>

        <div class="scenarios-grid">
          <!-- Scenario 1 -->
          <div class="scenario-card" id="scenario1">
            <div class="scenario-tag">SCENARIO A</div>
            <div class="scenario-title">Dry Baseline</div>
            <div class="scenario-desc">Calibrates dry baseline: stable air pressure, unshifted acoustic frequency.</div>
          </div>

          <!-- Scenario 2 -->
          <div class="scenario-card" id="scenario2">
            <div class="scenario-tag" style="color:var(--neon-red);">SCENARIO B</div>
            <div class="scenario-title">Water Ingress</div>
            <div class="scenario-desc">Pumps water into chamber: triggers STABLE → CHANGING → HIGH RISK.</div>
          </div>

          <!-- Scenario 3 -->
          <div class="scenario-card" id="scenario3">
            <div class="scenario-tag" style="color:var(--neon-green);">SCENARIO C</div>
            <div class="scenario-title">Condition Stabilized</div>
            <div class="scenario-desc">Halts water ingress: sensor rates drop to 0, showing condition stabilized.</div>
          </div>

          <!-- Scenario 4 -->
          <div class="scenario-card" id="scenario4">
            <div class="scenario-tag">SCENARIO D</div>
            <div class="scenario-title">Motion Filter Test</div>
            <div class="scenario-desc">Tests phone handling shake: IMU filter suppresses false alarms.</div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const btnIn = document.getElementById('btnPumpIn');
    const btnStop = document.getElementById('btnPumpStop');
    const btnOut = document.getElementById('btnPumpOut');
    const slider = document.getElementById('simWaterSlider');
    const btnSeal = document.getElementById('btnToggleSeal');

    const updatePumpUI = (state) => {
      [btnIn, btnStop, btnOut].forEach(btn => btn?.classList.remove('active'));
      if (state === 'IN') btnIn?.classList.add('active');
      else if (state === 'OUT') btnOut?.classList.add('active');
      else btnStop?.classList.add('active');
    };

    if (btnIn) {
      btnIn.addEventListener('click', () => {
        this.app.chamber.setPump('IN');
        updatePumpUI('IN');
        this.app.soundFX.playClick();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        this.app.chamber.setPump('IDLE');
        updatePumpUI('IDLE');
        this.app.soundFX.playClick();
      });
    }

    if (btnOut) {
      btnOut.addEventListener('click', () => {
        this.app.chamber.setPump('OUT');
        updatePumpUI('OUT');
        this.app.soundFX.playClick();
      });
    }

    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.app.chamber.setWaterLevel(val);
        const disp = document.getElementById('sliderValDisplay');
        if (disp) disp.textContent = `${Math.round(val)}%`;
      });
    }

    if (btnSeal) {
      btnSeal.addEventListener('click', () => {
        this.app.chamber.toggleSeal();
        const isSealed = this.app.chamber.isSealed;
        btnSeal.textContent = isSealed ? 'SEAL: HERMETIC' : 'SEAL: VENTED';
        this.app.soundFX.playClick();
      });
    }

    // Speed buttons
    const spSlow = document.getElementById('speedSlow');
    const spNormal = document.getElementById('speedNormal');
    const spFast = document.getElementById('speedFast');

    const updateSpeedUI = (speed) => {
      [spSlow, spNormal, spFast].forEach(b => {
        if (b) {
          b.style.borderColor = 'var(--bg-card-border)';
          b.style.background = 'rgba(0,240,255,0.1)';
        }
      });
      if (speed === 0.5 && spSlow) {
        spSlow.style.borderColor = 'var(--neon-cyan)';
        spSlow.style.background = 'rgba(0,240,255,0.3)';
      } else if (speed === 1.0 && spNormal) {
        spNormal.style.borderColor = 'var(--neon-cyan)';
        spNormal.style.background = 'rgba(0,240,255,0.3)';
      } else if (speed === 2.5 && spFast) {
        spFast.style.borderColor = 'var(--neon-red)';
        spFast.style.background = 'rgba(255,42,85,0.3)';
      }
    };

    if (spSlow) {
      spSlow.addEventListener('click', () => {
        this.app.chamber.setSpeed(0.5);
        updateSpeedUI(0.5);
        this.app.soundFX.playClick();
      });
    }
    if (spNormal) {
      spNormal.addEventListener('click', () => {
        this.app.chamber.setSpeed(1.0);
        updateSpeedUI(1.0);
        this.app.soundFX.playClick();
      });
    }
    if (spFast) {
      spFast.addEventListener('click', () => {
        this.app.chamber.setSpeed(2.5);
        updateSpeedUI(2.5);
        this.app.soundFX.playClick();
      });
    }

    // Pipe Burst Flash Surge
    const btnBurst = document.getElementById('btnPipeSurge');
    if (btnBurst) {
      btnBurst.addEventListener('click', () => {
        this.app.chamber.setSpeed(3.0);
        this.app.chamber.setPump('IN');
        updatePumpUI('IN');
        updateSpeedUI(2.5);
        this.app.soundFX.playHazardAlarm();
        this.app.fusion.logEvent('PIPE_BURST', 'Flash Pipe Burst simulated! High-velocity water ingress triggered.');
      });
    }

    // Bind Judge Presets
    const s1 = document.getElementById('scenario1');
    const s2 = document.getElementById('scenario2');
    const s3 = document.getElementById('scenario3');
    const s4 = document.getElementById('scenario4');

    if (s1) {
      s1.addEventListener('click', () => {
        this.app.chamber.setPump('IDLE');
        this.app.chamber.setWaterLevel(0);
        if (slider) slider.value = 0;
        this.app.barometer.setSimulatedOffset(0);
        this.app.acoustic.setSimulatedDelta(0);
        this.app.barometer.calibrateBaseline();
        this.app.acoustic.calibrateBaseline();
        this.app.soundFX.playSonarPing();
        updatePumpUI('IDLE');
      });
    }

    if (s2) {
      s2.addEventListener('click', () => {
        this.app.chamber.setSpeed(1.2);
        this.app.chamber.setPump('IN');
        updatePumpUI('IN');
        this.app.soundFX.playWarningBeep();
      });
    }

    if (s3) {
      s3.addEventListener('click', () => {
        this.app.chamber.setPump('IDLE');
        updatePumpUI('IDLE');
        this.app.soundFX.playSonarPing();
      });
    }

    if (s4) {
      s4.addEventListener('click', () => {
        this.app.imu.simulateMotion(2.4);
        this.app.soundFX.playWarningBeep();
        setTimeout(() => {
          this.app.imu.simulateMotion(0.1);
        }, 3200);
      });
    }
  }

  subscribeToSimulator() {
    this.app.chamber.subscribe((data) => {
      const waterCol = document.getElementById('simWaterColumn');
      const airVol = document.getElementById('simAirVolume');
      const waterLvl = document.getElementById('simWaterLevel');
      const pDelta = document.getElementById('simPressureDelta');
      const acRes = document.getElementById('simAcousticRes');
      const slider = document.getElementById('simWaterSlider');
      const sliderDisp = document.getElementById('sliderValDisplay');

      if (waterCol) waterCol.style.height = `${data.waterLevel}%`;
      if (airVol) airVol.textContent = `${data.availableAirVolumeL} L`;
      if (waterLvl) waterLvl.textContent = `${Math.round(data.waterLevel)}%`;
      if (pDelta) {
        const sign = data.airPressureOffsetHpa >= 0 ? '+' : '';
        pDelta.textContent = `${sign}${data.airPressureOffsetHpa.toFixed(2)} hPa`;
      }
      if (acRes) acRes.textContent = `${data.resonanceHz} Hz`;
      if (slider && document.activeElement !== slider) {
        slider.value = data.waterLevel;
      }
      const waterCm = (data.waterLevel * 0.5).toFixed(1);
      const airCm = (50 - data.waterLevel * 0.5).toFixed(1);
      if (sliderDisp) sliderDisp.textContent = `${Math.round(data.waterLevel)}% (${waterCm} cm water / ${airCm} cm air)`;

      // Couple simulation directly to Barometer and Acoustic engines
      this.app.barometer.setSimulatedOffset(data.airPressureOffsetHpa);
      this.app.acoustic.setSimulatedDelta(data.acousticDeltaPercent);
    });
  }
}
