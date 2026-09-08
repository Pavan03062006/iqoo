/**
 * HydroChamber Physical Simulation Engine
 * Models a transparent acrylic test chamber with water ingress,
 * air column compression, and acoustic resonant frequency shift.
 */

export class ChamberSimulator {
  constructor() {
    this.totalHeightCm = 50; // 50 cm chamber height
    this.totalVolumeL = 10.0; // 10 liters dry air volume
    this.waterLevel = 15; // 0 to 100 percentage
    this.pumpState = 'IDLE'; // 'IN' | 'OUT' | 'IDLE'
    this.pumpSpeed = 1.0; // multiplier
    this.isSealed = true; // Hermetic seal vs vented
    this.listeners = new Set();
    this.timerId = null;

    this.airPressureOffsetHpa = 0;
    this.acousticDeltaPercent = 0;
    this.resonanceHz = 520;

    this.updatePhysics();
    this.startLoop();
  }

  startLoop() {
    let lastTime = performance.now();
    const tick = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (this.pumpState === 'IN') {
        this.waterLevel = Math.min(88, this.waterLevel + 3.8 * this.pumpSpeed * dt);
        this.updatePhysics();
      } else if (this.pumpState === 'OUT') {
        this.waterLevel = Math.max(0, this.waterLevel - 6.0 * this.pumpSpeed * dt);
        this.updatePhysics();
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  setWaterLevel(percent) {
    this.waterLevel = Math.max(0, Math.min(92, percent));
    this.updatePhysics();
  }

  setPump(state) {
    this.pumpState = state;
    this.notify();
  }

  setSpeed(speed) {
    this.pumpSpeed = speed;
    this.notify();
  }

  toggleSeal() {
    this.isSealed = !this.isSealed;
    this.updatePhysics();
  }

  updatePhysics() {
    const fractionFilled = this.waterLevel / 100;
    const remainingAirFraction = Math.max(0.08, 1 - fractionFilled);
    const airHeightM = (this.totalHeightCm * (1 - fractionFilled)) / 100;

    // Acoustic resonance: fundamental cavity frequency f = v / (4 * L)
    // Speed of sound v = 343 m/s
    const speedOfSound = 343;
    const fundamental = speedOfSound / (4 * Math.max(0.05, airHeightM));
    this.resonanceHz = Math.round(fundamental);

    // Acoustic delta from dry baseline (0% water)
    this.acousticDeltaPercent = Math.min(100, Math.round(fractionFilled * 85));

    // Pressure calculation (Boyle's law scaled with chamber compliance)
    if (this.isSealed) {
      // In a compliant acrylic chamber with small safety valve, compression produces 0 to 4.8 hPa
      this.airPressureOffsetHpa = (1 / remainingAirFraction - 1) * 0.8;
    } else {
      // Vented enclosure: minimal backpressure during rapid pumping
      this.airPressureOffsetHpa = this.pumpState === 'IN' ? 0.08 * this.pumpSpeed : 0.0;
    }

    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    const data = {
      waterLevel: this.waterLevel,
      pumpState: this.pumpState,
      pumpSpeed: this.pumpSpeed,
      isSealed: this.isSealed,
      airPressureOffsetHpa: this.airPressureOffsetHpa,
      acousticDeltaPercent: this.acousticDeltaPercent,
      resonanceHz: this.resonanceHz,
      availableAirVolumeL: (this.totalVolumeL * (1 - this.waterLevel / 100)).toFixed(1)
    };

    for (const cb of this.listeners) {
      cb(data);
    }
  }
}
