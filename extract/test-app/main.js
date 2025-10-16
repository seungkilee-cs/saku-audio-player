import { PEQProcessor, DEFAULT_PRESET } from '../peq-10band/src/index.js';

const audioElement = document.getElementById('audio');
const bandsContainer = document.getElementById('bands');
const preampSlider = document.getElementById('preamp-slider');
const preampValue = document.getElementById('preamp-value');
const bypassButton = document.getElementById('bypass-toggle');

const audioContext = new AudioContext();
const mediaSource = audioContext.createMediaElementSource(audioElement);

const peq = new PEQProcessor(audioContext, {
  preset: DEFAULT_PRESET,
  bypass: false,
});

mediaSource.connect(peq.inputNode);
peq.outputNode.connect(audioContext.destination);

function resumeContext() {
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch((error) => {
      console.warn('AudioContext resume failed', error);
    });
  }
}

audioElement.addEventListener('play', resumeContext);
audioElement.addEventListener('click', resumeContext);

function createBandControls() {
  const { bands } = peq.getState();
  bandsContainer.innerHTML = '';

  bands.forEach((band, index) => {
    const container = document.createElement('div');
    container.className = 'band';

    const label = document.createElement('label');
    label.textContent = `${Math.round(band.frequency)} Hz`;

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = -12;
    slider.max = 12;
    slider.step = 0.5;
    slider.value = band.gain;

    const value = document.createElement('span');
    value.textContent = `${band.gain.toFixed(1)} dB`;

    slider.addEventListener('input', (event) => {
      const gain = Number.parseFloat(event.target.value);
      peq.updateBand(index, { gain });
      value.textContent = `${gain.toFixed(1)} dB`;
    });

    container.appendChild(label);
    container.appendChild(slider);
    container.appendChild(value);
    bandsContainer.appendChild(container);
  });
}

function updatePreampUI() {
  const { preamp } = peq.getState();
  preampSlider.value = preamp;
  preampValue.textContent = `${preamp.toFixed(1)} dB`;
}

preampSlider.addEventListener('input', (event) => {
  const value = Number.parseFloat(event.target.value);
  peq.setPreamp(value);
  preampValue.textContent = `${value.toFixed(1)} dB`;
});

bypassButton.addEventListener('click', () => {
  const { bypass } = peq.getState();
  peq.setBypass(!bypass);
  bypassButton.textContent = bypass ? 'Disable EQ' : 'Enable EQ';
});

peq.on(peq.events.STATE_CHANGE, () => {
  updatePreampUI();
});

createBandControls();
updatePreampUI();
bypassButton.textContent = 'Disable EQ';
