/**
 * HydroChamber Master Bootstrap
 * Pairs sensor engines, fusion pipeline, and mobile tactical views.
 */

import './styles/variables.css';
import './styles/base.css';
import './styles/hud.css';
import './styles/chamber.css';
import './styles/diagnostics.css';
import './styles/pitch.css';

import { IMUFilter } from './core/sensors/imu.js';
import { BarometerEngine } from './core/sensors/barometer.js';
import { AcousticEngine } from './core/sensors/acoustic.js';
import { SoundFX } from './core/sound/soundFX.js';
import { ChamberSimulator } from './core/chamber/chamberSim.js';
import { SensorFusionEngine } from './core/fusion/sensorFusion.js';

import { HudView } from './ui/hudView.js';
import { ChamberView } from './ui/chamberView.js';
import { DiagnosticsView } from './ui/diagnosticsView.js';
import { PitchView } from './ui/pitchView.js';

class HydroChamberApp {
  constructor() {
    // Instantiate Core Engines
    this.soundFX = new SoundFX();
    this.imu = new IMUFilter();
    this.barometer = new BarometerEngine();
    this.acoustic = new AcousticEngine();
    this.chamber = new ChamberSimulator();
    this.fusion = new SensorFusionEngine(this.barometer, this.acoustic, this.imu, this.soundFX);

    this.currentTab = 'hud';
    this.isTorchActive = false;

    this.init();
  }

  async init() {
    // Initialize views
    this.hudView = new HudView(this);
    this.chamberView = new ChamberView(this);
    this.diagnosticsView = new DiagnosticsView(this);
    this.pitchView = new PitchView(this);

    // Initialize sensors
    await this.imu.init();
    await this.barometer.init();
    await this.acoustic.init();

    // Setup navigation & controls
    this.bindNavigation();
    this.bindGlobalControls();
    this.registerServiceWorker();

    console.log('⚡ HydroChamber Rescuer Engine Initialized [100% Offline Mode]');
  }

  bindNavigation() {
    const dockItems = document.querySelectorAll('.dock-item');
    const viewPanels = {
      hud: document.getElementById('view-hud'),
      chamber: document.getElementById('view-chamber'),
      diagnostics: document.getElementById('view-diagnostics'),
      pitch: document.getElementById('view-pitch')
    };

    const deviceContainer = document.querySelector('.device-container');

    dockItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        if (!targetView || targetView === this.currentTab) return;

        this.soundFX.playClick();
        this.currentTab = targetView;

        // Update dock button states
        dockItems.forEach((item) => item.classList.remove('active'));
        btn.classList.add('active');

        // Update panel visibility
        Object.entries(viewPanels).forEach(([key, panel]) => {
          if (panel) {
            if (key === targetView) {
              panel.classList.add('active');
            } else {
              panel.classList.remove('active');
            }
          }
        });

        // Expand container width slightly on desktop for chamber or pitch if helpful
        if (targetView === 'pitch' || targetView === 'chamber') {
          deviceContainer?.classList.add('expanded-mode');
        } else {
          deviceContainer?.classList.remove('expanded-mode');
        }
      });
    });
  }

  bindGlobalControls() {
    const torchBtn = document.getElementById('btnTorch');
    const torchOverlay = document.getElementById('torchOverlay');

    if (torchBtn && torchOverlay) {
      torchBtn.addEventListener('click', async () => {
        this.isTorchActive = !this.isTorchActive;
        torchBtn.classList.toggle('active', this.isTorchActive);
        torchOverlay.classList.toggle('active', this.isTorchActive);
        this.soundFX.playClick();
      });

      torchOverlay.addEventListener('click', () => {
        this.isTorchActive = false;
        torchBtn.classList.remove('active');
        torchOverlay.classList.remove('active');
      });
    }

    // Attempt to acquire wake lock so rescuer screen stays active
    if ('wakeLock' in navigator) {
      try {
        navigator.wakeLock.request('screen').catch(() => {});
      } catch (e) {}
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.info('Service Worker registration skipped in development:', err);
      });
    }
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.hydroApp = new HydroChamberApp();
});
