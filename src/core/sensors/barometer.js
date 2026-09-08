/**
 * HydroChamber Barometric Pressure Driver & Trend Engine
 * Monitors atmospheric pressure patterns over time (dP/dt).
 */

export class BarometerEngine {
  constructor() {
    this.isHardwareAvailable = false;
    this.sensor = null;
    this.currentPressure = 1013.25; // hPa standard sea level
    this.baselinePressure = 1013.25;
    this.pressureTrend = 'STABLE'; // 'RISING' | 'STABLE' | 'FALLING'
    this.pressureRate = 0; // hPa/s
    this.buffer = []; // { time, pressure }
    this.bufferWindowMs = 8000; // 8-second sliding regression window
    this.listeners = new Set();
    this.simulatedOffset = 0;
  }

  async init() {
    if (typeof window === 'undefined') return false;

    // Check for Generic Sensor API AmbientPressureSensor
    if ('AmbientPressureSensor' in window) {
      try {
        // @ts-ignore
        this.sensor = new window.AmbientPressureSensor({ frequency: 10 });
        this.sensor.addEventListener('reading', () => {
          this.recordReading(this.sensor.pressure);
        });
        this.sensor.addEventListener('error', (event) => {
          console.warn('AmbientPressureSensor error:', event.error);
          this.isHardwareAvailable = false;
        });
        this.sensor.start();
        this.isHardwareAvailable = true;
        return true;
      } catch (e) {
        console.info('AmbientPressureSensor not accessible directly:', e);
      }
    }

    // Check PressureObserver (some Chromium flags)
    if ('PressureObserver' in window) {
      try {
        // @ts-ignore
        const observer = new window.PressureObserver((records) => {
          if (records.length > 0) {
            this.recordReading(records[records.length - 1].pressure);
          }
        });
        observer.observe('cpu');
      } catch (e) {
        // observer fallback
      }
    }

    // Default to calibrated engine
    this.recordReading(1013.25);
    return this.isHardwareAvailable;
  }

  calibrateBaseline() {
    this.baselinePressure = this.currentPressure;
    this.notify();
  }

  recordReading(rawPressureHpa) {
    const now = performance.now();
    // In simulation mode, add any simulated chamber pressure offset
    const pressure = rawPressureHpa + this.simulatedOffset;
    this.currentPressure = pressure;

    this.buffer.push({ time: now, pressure });

    // Clean buffer older than window
    const cutoff = now - this.bufferWindowMs;
    while (this.buffer.length > 0 && this.buffer[0].time < cutoff) {
      this.buffer.shift();
    }

    this.computeTrend();
    this.notify();
  }

  computeTrend() {
    if (this.buffer.length < 4) {
      this.pressureTrend = 'STABLE';
      this.pressureRate = 0;
      return;
    }

    // Ordinary least squares slope (hPa / s)
    const n = this.buffer.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    const t0 = this.buffer[0].time;

    for (let i = 0; i < n; i++) {
      const x = (this.buffer[i].time - t0) / 1000; // seconds
      const y = this.buffer[i].pressure;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const denominator = (n * sumX2 - sumX * sumX);
    if (denominator === 0) {
      this.pressureRate = 0;
    } else {
      this.pressureRate = (n * sumXY - sumX * sumY) / denominator;
    }

    // Classify Trend
    if (this.pressureRate > 0.04) {
      this.pressureTrend = 'RISING';
    } else if (this.pressureRate < -0.04) {
      this.pressureTrend = 'FALLING';
    } else {
      this.pressureTrend = 'STABLE';
    }
  }

  setSimulatedOffset(offsetHpa) {
    this.simulatedOffset = offsetHpa;
    this.recordReading(1013.25);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const deltaFromBaseline = this.currentPressure - this.baselinePressure;
    for (const cb of this.listeners) {
      cb({
        currentPressure: this.currentPressure,
        baselinePressure: this.baselinePressure,
        deltaFromBaseline,
        pressureTrend: this.pressureTrend,
        pressureRate: this.pressureRate,
        isHardwareAvailable: this.isHardwareAvailable,
        history: this.buffer
      });
    }
  }
}
