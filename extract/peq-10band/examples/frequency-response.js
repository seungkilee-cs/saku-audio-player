/**
 * Example: Frequency Response Calculation
 * 
 * This example demonstrates how to calculate and use frequency response
 * data from the @saku/peq-10band library.
 */

import {
  calculateFrequencyResponse,
  calculateProcessorResponse,
  getResponseAtFrequencies,
  PEQProcessor,
  DEFAULT_PRESET
} from '../src/index.js';

// Example 1: Calculate response from band configuration
console.log('=== Example 1: Band Configuration Response ===');

const bassBoostBands = [
  { frequency: 60, gain: 4, Q: 0.7, type: 'lowshelf' },
  { frequency: 150, gain: 2, Q: 1.0, type: 'peaking' },
  { frequency: 400, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 1000, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 2400, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 4800, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 9600, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 12000, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 14000, gain: 0, Q: 1.0, type: 'peaking' },
  { frequency: 16000, gain: 0, Q: 0.7, type: 'highshelf' }
];

const bassResponse = calculateFrequencyResponse(bassBoostBands, { numPoints: 64 });

console.log('Bass boost response calculated:');
console.log(`- Frequencies: ${bassResponse.frequencies.length} points from ${bassResponse.frequencies[0].toFixed(1)}Hz to ${bassResponse.frequencies[bassResponse.frequencies.length-1].toFixed(0)}Hz`);
console.log(`- Response range: ${Math.min(...bassResponse.magnitudeDb).toFixed(1)}dB to ${Math.max(...bassResponse.magnitudeDb).toFixed(1)}dB`);

// Example 2: Get response at specific frequencies
console.log('\n=== Example 2: Response at Specific Frequencies ===');

const testFrequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
const specificResponse = getResponseAtFrequencies(bassBoostBands, testFrequencies);

testFrequencies.forEach((freq, i) => {
  console.log(`${freq}Hz: ${specificResponse[i].toFixed(1)}dB`);
});

// Example 3: Using with PEQProcessor (requires AudioContext)
console.log('\n=== Example 3: PEQProcessor Integration ===');

// Note: This would require a real AudioContext in a browser environment
// For Node.js testing, we'll simulate the processor state
const simulatedProcessorState = {
  name: 'Vocal Clarity',
  description: 'Enhance vocal presence',
  preamp: -2,
  bands: [
    { frequency: 60, gain: -1, Q: 0.7, type: 'lowshelf' },
    { frequency: 150, gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 400, gain: 0, Q: 1.0, type: 'peaking' },
    { frequency: 1000, gain: 2, Q: 1.5, type: 'peaking' },
    { frequency: 2400, gain: 3, Q: 2.0, type: 'peaking' },
    { frequency: 4800, gain: 2, Q: 1.5, type: 'peaking' },
    { frequency: 9600, gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 12000, gain: -2, Q: 1.0, type: 'peaking' },
    { frequency: 14000, gain: -1, Q: 1.0, type: 'peaking' },
    { frequency: 16000, gain: 0, Q: 0.7, type: 'highshelf' }
  ],
  bypass: false
};

const vocalResponse = calculateProcessorResponse(simulatedProcessorState);

console.log('Vocal clarity response calculated:');
console.log(`- Peak boost: ${Math.max(...vocalResponse.magnitudeDb).toFixed(1)}dB`);
console.log(`- Max cut: ${Math.min(...vocalResponse.magnitudeDb).toFixed(1)}dB`);

// Find the frequency with maximum boost
const maxBoostIndex = vocalResponse.magnitudeDb.indexOf(Math.max(...vocalResponse.magnitudeDb));
const maxBoostFreq = vocalResponse.frequencies[maxBoostIndex];
console.log(`- Peak boost at: ${maxBoostFreq.toFixed(0)}Hz`);

// Example 4: Comparing different Q values
console.log('\n=== Example 4: Q Factor Comparison ===');

const centerFreq = 1000;
const gain = 6;
const testQValues = [0.5, 1.0, 2.0, 4.0];

testQValues.forEach(Q => {
  const band = { frequency: centerFreq, gain, Q, type: 'peaking' };
  const testFreqs = [500, 750, 1000, 1333, 2000]; // -1, -0.5, 0, +0.5, +1 octaves
  const responses = getResponseAtFrequencies([band], testFreqs);
  
  console.log(`Q=${Q}: [${responses.map(r => r.toFixed(1)).join(', ')}]dB at [${testFreqs.join(', ')}]Hz`);
});

console.log('\n=== Examples Complete ===');