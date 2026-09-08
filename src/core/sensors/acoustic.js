/**
 * HydroChamber Acoustic Cavity Reflection Probe
 * Emits active acoustic interrogation chirps and analyzes returning room/chamber echo.
 */

export class AcousticEngine {
  constructor() {
    this.audioCtx = null;
    this.analyser = null;
    this.micStream = null;
    this.isMicActive = false;
    this.fftData = null;
    this.baselineSpectrum = null;
    this.acousticDelta = 0; // % difference from baseline
    this.resonantPeak = 440; // Hz
    this.baselineResonantPeak = 440;
    this.listeners = new Set();
    this.isProbePinging = false;
    this.simulatedDelta = 0;
    this.probeMode = 'AUDIBLE'; // 'AUDIBLE' | 'ULTRASONIC'
    this.autoSonarActive = false;
    this.autoSonarTimer = null;
  }

  async init() {
    if (typeof window === 'undefined') return false;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      this.audioCtx = new AudioContextClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.8;
      this.fftData = new Uint8Array(this.analyser.frequencyBinCount);

      // Listen for microphone if user authorizes
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const source = this.audioCtx.createMediaStreamSource(this.micStream);
          source.connect(this.analyser);
          this.isMicActive = true;
        } catch (micErr) {
          console.info('Microphone permission not yet granted; active probe ready on user tap.');
        }
      }

      this.startAnalysisLoop();
      return true;
    } catch (err) {
      console.warn('Acoustic engine init error:', err);
      return false;
    }
  }

  async requestMicrophone() {
    if (this.isMicActive) return true;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = new AudioContextClass();
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 512;
        this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
      }
      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const source = this.audioCtx.createMediaStreamSource(this.micStream);
      source.connect(this.analyser);
      this.isMicActive = true;
      this.startAnalysisLoop();
      return true;
    } catch (err) {
      console.warn('Microphone request failed:', err);
      return false;
    }
  }

  setProbeMode(mode) {
    this.probeMode = mode; // 'AUDIBLE' or 'ULTRASONIC'
    this.notify();
  }

  toggleAutoSonar() {
    this.autoSonarActive = !this.autoSonarActive;
    if (this.autoSonarActive) {
      this.autoSonarTimer = setInterval(() => {
        this.pingProbe();
      }, 2400);
      this.pingProbe();
    } else {
      if (this.autoSonarTimer) {
        clearInterval(this.autoSonarTimer);
        this.autoSonarTimer = null;
      }
    }
    this.notify();
    return this.autoSonarActive;
  }

  /**
   * Emits an active acoustic chirp probe through the speaker
   */
  async pingProbe() {
    if (!this.audioCtx) return;
    if (this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.isProbePinging = true;
    this.notify();

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    const now = this.audioCtx.currentTime;

    if (this.probeMode === 'ULTRASONIC') {
      // 18.5 kHz - 20 kHz near-inaudible chirp
      osc.frequency.setValueAtTime(18500, now);
      osc.frequency.exponentialRampToValueAtTime(20500, now + 0.085);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    } else {
      // Linear audible chirp from 1800 Hz to 3000 Hz in 85ms
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(3000, now + 0.085);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    }

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.09);

    setTimeout(() => {
      this.isProbePinging = false;
      this.notify();
    }, 200);
  }

  calibrateBaseline() {
    if (this.fftData) {
      this.baselineSpectrum = new Uint8Array(this.fftData);
      this.baselineResonantPeak = this.resonantPeak;
    }
    this.acousticDelta = 0;
    this.notify();
  }

  startAnalysisLoop() {
    const loop = () => {
      if (this.analyser && this.fftData) {
        this.analyser.getByteFrequencyData(this.fftData);

        // Calculate peak frequency and spectral centroid
        let maxVal = 0;
        let maxIndex = 0;
        let weightedSum = 0;
        let totalVal = 0;

        for (let i = 0; i < this.fftData.length; i++) {
          const val = this.fftData[i];
          if (val > maxVal) {
            maxVal = val;
            maxIndex = i;
          }
          weightedSum += i * val;
          totalVal += val;
        }

        const nyquist = this.audioCtx ? this.audioCtx.sampleRate / 2 : 22050;
        const binHz = nyquist / this.fftData.length;
        this.resonantPeak = Math.round(maxIndex * binHz);

        // Compare with baseline if established
        if (this.baselineSpectrum && totalVal > 10) {
          let diffSum = 0;
          for (let i = 0; i < this.fftData.length; i++) {
            diffSum += Math.abs(this.fftData[i] - this.baselineSpectrum[i]);
          }
          const rawDelta = (diffSum / (this.fftData.length * 128)) * 100;
          this.acousticDelta = Math.min(100, Math.round(rawDelta + this.simulatedDelta));
        } else {
          this.acousticDelta = Math.min(100, Math.round(this.simulatedDelta));
        }

        this.notify();
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  setSimulatedDelta(deltaPercent) {
    this.simulatedDelta = deltaPercent;
    this.acousticDelta = Math.min(100, Math.round(deltaPercent));
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb({
        isMicActive: this.isMicActive,
        isProbePinging: this.isProbePinging,
        acousticDelta: this.acousticDelta,
        resonantPeak: this.resonantPeak,
        fftData: this.fftData,
        hasBaseline: !!this.baselineSpectrum
      });
    }
  }
}
