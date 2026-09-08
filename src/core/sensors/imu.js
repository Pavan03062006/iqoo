/**
 * HydroChamber IMU Motion Filter
 * Distinguishes between physical rescuer handling vs environmental changes.
 */

export class IMUFilter {
  constructor() {
    this.isSupported = false;
    this.isActive = false;
    this.isMoving = false;
    this.jitter = 0;
    this.pollingRate = 0;
    this.lastTimestamp = performance.now();
    this.sampleCount = 0;
    this.rateHistory = [];

    this.motionThreshold = 1.25; // m/s^2 dynamic acceleration threshold
    this.listeners = new Set();

    this.accel = { x: 0, y: 0, z: 0 };
    this.gyro = { alpha: 0, beta: 0, gamma: 0 };

    this.handleMotionEvent = this.handleMotionEvent.bind(this);
    this.handleOrientationEvent = this.handleOrientationEvent.bind(this);
  }

  async init() {
    if (typeof window === 'undefined') return false;

    // Check device motion support
    if ('DeviceMotionEvent' in window) {
      this.isSupported = true;
      try {
        // iOS 13+ requires explicit permission request
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          const perm = await DeviceMotionEvent.requestPermission();
          if (perm !== 'granted') {
            console.warn('IMU motion permission denied.');
            return false;
          }
        }
        window.addEventListener('devicemotion', this.handleMotionEvent, { passive: true });
        window.addEventListener('deviceorientation', this.handleOrientationEvent, { passive: true });
        this.isActive = true;
        return true;
      } catch (err) {
        console.warn('Could not activate device motion listener:', err);
      }
    }
    return false;
  }

  handleMotionEvent(event) {
    const now = performance.now();
    this.sampleCount++;

    // Calculate polling rate
    const dt = (now - this.lastTimestamp) / 1000;
    if (dt >= 1.0) {
      this.pollingRate = Math.round(this.sampleCount / dt);
      this.sampleCount = 0;
      this.lastTimestamp = now;
    }

    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (acc) {
      this.accel.x = acc.x || 0;
      this.accel.y = acc.y || 0;
      this.accel.z = acc.z || 0;

      // If acceleration has gravity, subtract 9.8 approx, else use raw magnitude
      const mag = Math.sqrt(this.accel.x ** 2 + this.accel.y ** 2 + this.accel.z ** 2);
      const dynamicMag = event.acceleration ? mag : Math.abs(mag - 9.81);

      // Low pass filter jitter
      this.jitter = this.jitter * 0.7 + dynamicMag * 0.3;
      this.isMoving = this.jitter > this.motionThreshold;

      this.notify();
    }
  }

  handleOrientationEvent(event) {
    this.gyro.alpha = Math.round(event.alpha || 0); // Heading / Azimuth
    this.gyro.beta = Math.round(event.beta || 0);   // Pitch
    this.gyro.gamma = Math.round(event.gamma || 0); // Roll
    this.notify();
  }

  // Simulation mode support for desktop testing
  simulateMotion(jitterValue) {
    this.jitter = jitterValue;
    this.isMoving = jitterValue > this.motionThreshold;
    this.pollingRate = 60;
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      cb({
        isMoving: this.isMoving,
        jitter: this.jitter,
        pollingRate: this.pollingRate,
        isSupported: this.isSupported,
        accel: this.accel,
        gyro: this.gyro
      });
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotionEvent);
      window.removeEventListener('deviceorientation', this.handleOrientationEvent);
    }
    this.listeners.clear();
  }
}
