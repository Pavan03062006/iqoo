/**
 * HydroChamber Sensor Fusion Engine
 * Processes Barometer, Acoustic Probe, and IMU inputs locally on device.
 * Emits unified rescuer alerts and tactical recommendations.
 */

export const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};

export const ENV_STATES = {
  STABLE: 'STABLE',
  CHANGING: 'ENVIRONMENT CHANGING',
  HIGH_RISK: 'RISK INCREASING / HIGH RISK',
  STABILIZED: 'CONDITION STABILIZED'
};

export const SPATIAL_PROFILES = {
  TEST_CHAMBER: {
    id: 'TEST_CHAMBER',
    name: 'Acrylic Lab Chamber',
    depthM: 0.5,
    volumeL: 10,
    compliance: 0.8,
    acousticDamping: 0.05
  },
  BASEMENT: {
    id: 'BASEMENT',
    name: 'Basement Utility Room',
    depthM: 2.4,
    volumeL: 45000,
    compliance: 0.2,
    acousticDamping: 0.25
  },
  DRAINAGE_SUMP: {
    id: 'DRAINAGE_SUMP',
    name: 'Drainage Sump Shaft',
    depthM: 3.0,
    volumeL: 1500,
    compliance: 0.4,
    acousticDamping: 0.1
  },
  SEALED_VAULT: {
    id: 'SEALED_VAULT',
    name: 'Hermetic Utility Vault',
    depthM: 1.8,
    volumeL: 12000,
    compliance: 1.2,
    acousticDamping: 0.08
  }
};

export class SensorFusionEngine {
  constructor(barometer, acoustic, imu, soundFX) {
    this.barometer = barometer;
    this.acoustic = acoustic;
    this.imu = imu;
    this.soundFX = soundFX;

    this.currentProfile = SPATIAL_PROFILES.TEST_CHAMBER;

    // Configurable tactical sensitivity thresholds
    this.thresholds = {
      pRateWarn: 0.03,
      pRateCritical: 0.15,
      aDeltaWarn: 15,
      aDeltaCritical: 50
    };

    this.currentState = ENV_STATES.STABLE;
    this.riskLevel = RISK_LEVELS.LOW;
    this.recommendation = 'ENTRY POSSIBLE — PROCEED WITH CAUTION';
    this.isPhoneMoving = false;

    this.previousState = ENV_STATES.STABLE;
    this.listeners = new Set();
    this.startTime = Date.now();

    // Mission Event Log (Blackbox)
    this.missionLogs = [
      {
        time: new Date().toLocaleTimeString(),
        elapsed: '00:00',
        type: 'INIT',
        text: 'HydroChamber offline tactical sensing engine initialized.'
      }
    ];

    this.initListeners();
  }

  setProfile(profileKey) {
    if (SPATIAL_PROFILES[profileKey]) {
      this.currentProfile = SPATIAL_PROFILES[profileKey];
      this.logEvent('PROFILE', `Enclosure spatial profile set to: ${this.currentProfile.name}`);
      this.evaluate();
    }
  }

  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.logEvent('CONFIG', 'Sensor fusion sensitivity thresholds updated.');
    this.evaluate();
  }

  logEvent(type, text) {
    const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const ss = String(elapsedSec % 60).padStart(2, '0');

    this.missionLogs.unshift({
      time: new Date().toLocaleTimeString(),
      elapsed: `${mm}:${ss}`,
      type,
      text
    });

    if (this.missionLogs.length > 100) {
      this.missionLogs.pop();
    }
    this.notify();
  }

  initListeners() {
    this.imu.subscribe((imuData) => {
      const wasMoving = this.isPhoneMoving;
      this.isPhoneMoving = imuData.isMoving;

      if (this.isPhoneMoving && !wasMoving) {
        this.logEvent('IMU_HOLD', 'Rescuer handling motion detected. Suppressing false alarm.');
      }
      this.evaluate();
    });

    this.barometer.subscribe(() => {
      this.evaluate();
    });

    this.acoustic.subscribe(() => {
      this.evaluate();
    });
  }

  evaluate() {
    const pRate = this.barometer.pressureRate; // hPa / s
    const aDelta = this.acoustic.acousticDelta; // percentage 0-100
    const pTrend = this.barometer.pressureTrend;

    // RULE 1: IMU Handling Filter (Compensates for rescuer movement)
    if (this.isPhoneMoving) {
      this.recommendation = 'HOLD PHONE STEADY — FILTERING RESCUER MOTION';
      this.notify();
      return;
    }

    let newState = this.currentState;
    let newRisk = RISK_LEVELS.LOW;
    let newRec = 'ENTRY POSSIBLE — PROCEED WITH CAUTION';

    // Scaling based on spatial profile compliance
    const pCrit = this.thresholds.pRateCritical / this.currentProfile.compliance;
    const pWarn = this.thresholds.pRateWarn / this.currentProfile.compliance;

    // RULE 2: High Risk Detection (Rapid water ingress or major cavity compression)
    if (pRate > pCrit || (pRate > pWarn && aDelta > this.thresholds.aDeltaWarn * 1.8) || aDelta > this.thresholds.aDeltaCritical) {
      newState = ENV_STATES.HIGH_RISK;
      newRisk = RISK_LEVELS.HIGH;
      newRec = 'CRITICAL: WATER RISING RAPIDLY — DO NOT ENTER ENCLOSURE';
    }
    // RULE 3: Environment Changing (Active water entering, pressure or acoustics shifting)
    else if (pRate > pWarn || aDelta > this.thresholds.aDeltaWarn || pTrend === 'RISING') {
      newState = ENV_STATES.CHANGING;
      newRisk = RISK_LEVELS.MEDIUM;
      newRec = 'WATER INGRESS DETECTED — RE-EVALUATE AIR SPACE BEFORE ENTRY';
    }
    // RULE 4: Condition Stabilized (Previously changing/critical, but now rate has leveled off)
    else if (
      (this.currentState === ENV_STATES.CHANGING || this.currentState === ENV_STATES.HIGH_RISK) &&
      Math.abs(pRate) <= (pWarn * 0.6) &&
      aDelta > 8
    ) {
      newState = ENV_STATES.STABILIZED;
      newRisk = RISK_LEVELS.LOW;
      newRec = 'WATER LEVEL STABILIZED — FLOOD INGRESS HAS PAUSED';
    }
    // RULE 5: Normal Baseline Stable
    else if (aDelta <= 8 && Math.abs(pRate) <= (pWarn * 0.6)) {
      newState = ENV_STATES.STABLE;
      newRisk = RISK_LEVELS.LOW;
      newRec = 'ENCLOSURE STABLE — NORMAL ENTRY PRECAUTIONS APPLY';
    }

    // Trigger Tactical Audio & Voice Alerts on state transitions
    if (newState !== this.currentState) {
      if (newState === ENV_STATES.HIGH_RISK) {
        this.soundFX.playHazardAlarm();
        this.soundFX.speak('Critical risk: water rising rapidly. Do not enter.');
        this.logEvent('RISK_HIGH', 'STATE TRANSITION -> HIGH RISK (Rapid flood surge)');
      } else if (newState === ENV_STATES.CHANGING) {
        this.soundFX.playWarningBeep();
        this.soundFX.speak('Warning: water ingress detected.');
        this.logEvent('WARN', 'STATE TRANSITION -> ENVIRONMENT CHANGING');
      } else if (newState === ENV_STATES.STABILIZED) {
        this.soundFX.playSonarPing();
        this.soundFX.speak('Condition stabilized. Ingress paused.');
        this.logEvent('STABILIZED', 'STATE TRANSITION -> CONDITION STABILIZED');
      } else if (newState === ENV_STATES.STABLE) {
        this.logEvent('STABLE', 'STATE TRANSITION -> STABLE');
      }
      this.previousState = this.currentState;
      this.currentState = newState;
    }

    this.riskLevel = newRisk;
    this.recommendation = newRec;

    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const payload = {
      state: this.currentState,
      riskLevel: this.riskLevel,
      recommendation: this.recommendation,
      isPhoneMoving: this.isPhoneMoving,
      pressureRate: this.barometer.pressureRate,
      pressureTrend: this.barometer.pressureTrend,
      acousticDelta: this.acoustic.acousticDelta,
      currentProfile: this.currentProfile,
      thresholds: this.thresholds,
      missionLogs: this.missionLogs
    };

    for (const cb of this.listeners) {
      cb(payload);
    }
  }
}
