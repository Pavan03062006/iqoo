/**
 * 12-Section Project Explainer & Pitch Deck View Controller
 */

export class PitchView {
  constructor(app) {
    this.app = app;
    this.container = document.getElementById('view-pitch');
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="pitch-container">
        <!-- Pitch Header Hero -->
        <div class="pitch-header-card">
          <span class="pitch-tag">PROJECT BRIEF & DEFENSE</span>
          <h1 class="pitch-headline">HydroChamber</h1>
          <div class="pitch-one-liner">
            "HydroChamber is an offline smartphone-based environmental sensing system that uses the rescuer's iQOO phone to detect changes inside an enclosed flooded space and provide an early warning before the rescuer enters."
          </div>
        </div>

        <!-- 1. The Problem -->
        <div class="section-card">
          <div class="section-num-badge">01. THE PROBLEM</div>
          <div class="section-title">Enclosed Flooded Space Dilemma</div>
          <div class="section-body">
            Imagine a flooded basement or enclosed subterranean vault. Water is entering the room, but the rescuer is outside. They don't know:
            <ul style="margin: 8px 0 8px 18px; line-height: 1.6;">
              <li>Is the water still rising?</li>
              <li>Is the situation actively getting worse?</li>
              <li>Is the available air space rapidly decreasing?</li>
              <li>Is it safe to enter?</li>
            </ul>
            Entering immediately without reconnaissance puts the rescuer's life in acute jeopardy.
          </div>
        </div>

        <!-- 2. Our Solution -->
        <div class="section-card">
          <div class="section-num-badge">02. OUR SOLUTION</div>
          <div class="section-title">iQOO Tactical Sensor Node</div>
          <div class="section-body">
            We turn the rescuer's existing iQOO smartphone into an <strong>offline environmental sensing instrument</strong>.
            <div class="ascii-diagram">
        iQOO PHONE
            ↓
 ┌─────────────────────┐
 │ Barometer           │
 │ Microphone          │
 │ Speaker             │
 │ Accelerometer/IMU   │
 └─────────────────────┘
            ↓
     LOCAL PROCESSING
            ↓
     ENVIRONMENT STATUS
            ↓
       RESCUER ALERT</div>
          </div>
        </div>

        <!-- 3. Physical Sensing Channels -->
        <div class="section-card">
          <div class="section-num-badge">03. HOW IT DETECTS CHANGES</div>
          <div class="section-title">Tri-Channel Environmental Physics</div>
          <div class="section-body">
            <p style="margin-bottom:8px;"><strong>1. Barometer:</strong> Monitors micro-pressure patterns over time (dP/dt). As water displaces enclosed chamber volume, the air space compresses and creates measurable pressure gradients.</p>
            <p style="margin-bottom:8px;"><strong>2. Speaker + Microphone:</strong> Active acoustic interrogation. The phone emits a chirp into the chamber and captures the returning acoustic impulse response. As water rises, the cavity height shortens, shifting cavity resonance upward.</p>
            <p><strong>3. IMU (Accelerometer/Gyroscope):</strong> Rescuers move. The IMU identifies: <em>"Was this change caused by the environment, or did the rescuer simply move the phone?"</em> This effectively eliminates false alarms.</p>
          </div>
        </div>

        <!-- 4. Sensor Fusion -->
        <div class="section-card">
          <div class="section-num-badge">04. SENSOR FUSION</div>
          <div class="section-title">100% Local Pattern Detection</div>
          <div class="section-body">
            <div class="ascii-diagram">
Barometer ───────┐
                 │
Microphone ──────┼──→ Sensor Fusion
                 │
IMU ─────────────┘
                       ↓
               Pattern Detection
                       ↓
              Environment Status</div>
            Zero cloud requirement. Zero external network packets. Everything is computed in real time on the device CPU.
          </div>
        </div>

        <!-- 5. What the Rescuer Sees -->
        <div class="section-card">
          <div class="section-num-badge">05. RESCUER INTERFACE</div>
          <div class="section-title">High-Contrast Actionable Output</div>
          <div class="section-body">
            No complicated differential equations. The rescuer gets unambiguous tactical triage:
            <div class="ascii-diagram">
HYDROCHAMBER MONITOR
Pressure Trend:       ↑
Acoustic Change:      DETECTED
Environmental State:  CHANGING
Risk Level:           HIGH
Recommendation:       PROCEED WITH CAUTION</div>
          </div>
        </div>

        <!-- 6. The Physical Demo -->
        <div class="section-card">
          <div class="section-num-badge">06. THE PHYSICAL DEMO</div>
          <div class="section-title">Transparent Chamber Live Proof</div>
          <div class="section-body">
            We don't need to explain with just slides. We show it physically using our acrylic chamber:
            <div class="ascii-diagram">
       PHONE
         ↓
┌──────────────────┐
│                  │
│       AIR        │
│                  │
│──────────────────│
│                  │
│      WATER ↑     │
│~~~~~~~~~~~~~~~~~~│
└──────────────────┘</div>
            Judges literally watch: <strong>water rising → sensor readings changing → phone detecting change → HUD transitioning from STABLE → CHANGING → HIGH RISK → CONDITION STABILIZED</strong>.
          </div>
        </div>

        <!-- 7. Disaster Suitability -->
        <div class="section-card">
          <div class="section-num-badge">07. WHY USEFUL FOR RESCUE</div>
          <div class="section-title">Deploying Hardware in Hand</div>
          <div class="section-body">
            Specialized rescue gear is rare, bulky, and often miles away. We extract high-value telemetry from a device the rescuer <em>already has in their pocket</em>. An additional, portable, offline sensing layer for preliminary assessment.
          </div>
        </div>

        <!-- 8. Offline Resilience -->
        <div class="section-card">
          <div class="section-num-badge">08. WHY 100% OFFLINE</div>
          <div class="section-title">Zero Infrastructure Assumption</div>
          <div class="section-body">
            In post-disaster flooding:
            <div style="display:flex; justify-content:space-between; margin:8px 0; font-family:var(--font-mono); font-size:11px;">
              <div>Internet ❌<br>Mobile Cell ❌<br>Wi-Fi ❌<br>Cloud ❌</div>
              <div>Phone Sensors ✅<br>Phone CPU ✅<br>Local Software ✅<br>HydroChamber ✅</div>
            </div>
          </div>
        </div>

        <!-- 9. Survivor Requirements -->
        <div class="section-card">
          <div class="section-num-badge">09. SURVIVOR BURDEN: ZERO</div>
          <div class="section-title">Rescuer-Centric Sensing</div>
          <div class="section-body">
            The trapped survivor does not need an app, does not need to press buttons, and does not need to communicate. The rescuer uses their iQOO phone as the external sensor node.
          </div>
        </div>

        <!-- 10. Hardware Engagement -->
        <div class="section-card">
          <div class="section-num-badge">10. WHY THIS PROJECT STANDS OUT</div>
          <div class="section-title">True Hardware Measurement</div>
          <div class="section-body">
            Most hackathon disaster apps are just <em>"Map + emergency button + database"</em>. HydroChamber directly utilizes the physical sensing hardware of the smartphone, transforming the phone into an actual scientific instrument.
          </div>
        </div>

        <!-- 11. Defensible Claims & Limitations -->
        <div class="alert-box danger">
          <div class="alert-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            CRITICAL JUDGE DEFENSE: REALISTIC CLAIMS
          </div>
          <div class="alert-text">
            <strong>What we DO NOT claim:</strong> We do NOT claim the phone measures exact oxygen percentages (requires a chemical O₂ sensor) or knows exact minutes of life remaining.<br><br>
            <strong>What we DO claim:</strong> Robust offline detection and tracking of physical environmental dynamics (pressure trend + acoustic cavity resonance + IMU motion compensation) associated with an enclosed flooded space.
          </div>
        </div>

        <!-- 12. Quick Start Prototype -->
        <div class="section-card">
          <div class="section-num-badge">12. HARDWARE VALIDATION SUMMARY</div>
          <div class="section-title">Rapid Hackathon Prototype Proof</div>
          <div class="section-body">
            By running the built-in <strong>Hardware Diagnostic Benchmark</strong> (Tab 3), judges and engineers can immediately verify sensor polling rates, acoustic SNR, and pressure resolution on any test phone.
          </div>
        </div>
      </div>
    `;
  }
}
