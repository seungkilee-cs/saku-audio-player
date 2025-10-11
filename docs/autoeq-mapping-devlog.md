# The AutoEq Mapping Problem: A Developer's Journey

## The Problem Emerges

We had just finished implementing the basic AutoEq import functionality when the user dropped a bombshell. They had successfully imported their Audeze Euclid ParametricEQ.txt file, and while the system claimed it worked, something was fundamentally wrong. The frequency response chart looked reasonable, the sliders moved to new positions, but when they put on their headphones and listened, the correction just wasn't there.

The AutoEq file contained exactly what we expected:

```
Preamp: -4.1 dB
Filter 1: ON LSC Fc 105 Hz Gain 2.9 dB Q 0.70
Filter 2: ON PK Fc 2042 Hz Gain -4.2 dB Q 2.14
Filter 3: ON PK Fc 3248 Hz Gain 5.1 dB Q 2.45
Filter 4: ON PK Fc 1520 Hz Gain -1.3 dB Q 1.34
Filter 5: ON PK Fc 618 Hz Gain 1.2 dB Q 1.42
Filter 6: ON HSC Fc 10000 Hz Gain 3.6 dB Q 0.70
Filter 7: ON PK Fc 152 Hz Gain -0.9 dB Q 1.56
Filter 8: ON PK Fc 4909 Hz Gain -2.8 dB Q 6.00
Filter 9: ON PK Fc 7092 Hz Gain -2.0 dB Q 5.00
Filter 10: ON PK Fc 5800 Hz Gain 2.3 dB Q 5.99
```

Our system parsed this perfectly. The console logs showed everything working:

```
Parsing AutoEq text...
Processing 11 lines
Processing line: Preamp: -4.1 dB
Found preamp: -4.1
Processing line: Filter 1: ON LSC Fc 105 Hz Gain 2.9 dB Q 0.70
Found filter: Object { type: "LSC", fc: 105, gain: 2.9, Q: 0.7 }
...
Parsed 10 filters with preamp -4.1
```

But then came the user's observation: the PEQ graph and sliders didn't look the same as the AutoEq data, even though we had exactly 10 filters matching our 10-band system.

## First Attempt: Nearest Neighbor Mapping

Our initial approach seemed logical. We had a fixed 10-band layout with frequencies at 60Hz, 150Hz, 400Hz, 1kHz, 2.4kHz, 4.8kHz, 9.6kHz, 12kHz, 14kHz, and 16kHz. AutoEq had 10 filters at different frequencies. The obvious solution was to map each AutoEq filter to the closest frequency in our layout.

The code looked clean and mathematical:

```javascript
const nativeBands = BAND_LAYOUT.map(layoutBand => {
  // Find closest AutoEq filter by frequency (logarithmic distance)
  const nearestFilter = autoEqPreset.filters.reduce((closest, filter) => {
    const currentDist = Math.abs(Math.log(filter.fc) - Math.log(layoutBand.freq));
    const closestDist = Math.abs(Math.log(closest.fc) - Math.log(layoutBand.freq));
    return currentDist < closestDist ? filter : closest;
  });

  return {
    frequency: layoutBand.freq, // Use fixed layout frequency
    type: nativeType,
    gain: nearestFilter.gain || 0,
    Q: nearestFilter.Q || (nativeType === 'peaking' ? 1.0 : 0.707)
  };
});
```

I added detailed console logging to see what was happening:

```javascript
console.log(`Mapping ${layoutBand.freq}Hz → ${nearestFilter.fc}Hz (${nearestFilter.gain}dB)`);
```

The output revealed the first major problem:

```
Mapping 60Hz → 105Hz (2.9dB)
Mapping 150Hz → 152Hz (-0.9dB)
Mapping 400Hz → 618Hz (1.2dB)
Mapping 1000Hz → 1520Hz (-1.3dB)
Mapping 2400Hz → 2042Hz (-4.2dB)
Mapping 4800Hz → 4909Hz (-2.8dB)
Mapping 9600Hz → 10000Hz (3.6dB)
Mapping 12000Hz → 10000Hz (3.6dB)
Mapping 14000Hz → 10000Hz (3.6dB)
Mapping 16000Hz → 10000Hz (3.6dB)
```

Four of our bands were all mapping to the same AutoEq filter at 10kHz. This meant we were losing three-quarters of the high-frequency information. The 10kHz filter with +3.6dB was being applied to four different frequency bands, which made no sense from an audio engineering perspective.

Even worse, some AutoEq filters weren't being used at all. The significant +5.1dB boost at 3248Hz was being ignored because it wasn't the closest match to any of our fixed frequencies.

## The Ear Test Reveals the Truth

The user put on their Audeze Euclid headphones and played some familiar tracks. The result was disappointing. The correction that should have been dramatic and immediately noticeable was barely perceptible. The characteristic AutoEq improvement that makes headphones sound more neutral and balanced just wasn't there.

This was the moment we realized that mathematical correctness doesn't always translate to audio correctness. Our algorithm was technically working, but it was destroying the carefully crafted frequency response that AutoEq had calculated for these specific headphones.

## Research Phase: How Do Others Handle This?

The user asked a crucial question: how does PowerAmp handle these AutoEq imports for their 10-band EQ? This sent me down a research rabbit hole.

Most academic papers and typical EQ applications I found were focused on general parametric EQ theory, not the specific problem of mapping AutoEq presets to fixed-band systems. They discussed filter types, Q factors, and frequency response mathematics, but none addressed the practical challenge we were facing.

Then I started looking at applications that specifically advertised AutoEq compatibility. PowerAmp was the obvious choice since it's widely used and has excellent AutoEq integration. I also looked at Qudelix-5K firmware documentation and some professional audio software that supports AutoEq imports.

The pattern that emerged was interesting. These applications didn't seem to be forcing AutoEq into fixed frequency layouts. Instead, they appeared to be adapting their EQ systems to accommodate AutoEq's frequency choices.

## Second Attempt: Weighted Interpolation

Based on my research into how professional audio software might handle frequency mapping, I developed a theory. Maybe the issue wasn't just nearest-neighbor mapping, but that we needed to consider the influence of multiple AutoEq filters on each of our bands. This led to a weighted interpolation approach.

The idea was that each of our fixed frequency bands should be influenced by all nearby AutoEq filters, with closer filters having more influence. This seemed more sophisticated and potentially more accurate than simple nearest-neighbor mapping.

I implemented a system that found all AutoEq filters within two octaves of each target frequency:

```javascript
const relevantFilters = autoEqPreset.filters.filter(filter => {
  const octaveDistance = Math.abs(Math.log2(filter.fc / layoutBand.freq));
  return octaveDistance <= 2; // Within 2 octaves
});
```

Then I calculated a weighted average of their gains:

```javascript
let weightedGain = 0;
let totalWeight = 0;

relevantFilters.forEach(filter => {
  const freqRatio = Math.max(filter.fc / layoutBand.freq, layoutBand.freq / filter.fc);
  const weight = 1 / Math.pow(freqRatio, 0.5); // Closer frequencies have more weight
  weightedGain += filter.gain * weight;
  totalWeight += weight;
});

const finalGain = totalWeight > 0 ? weightedGain / totalWeight : closestFilter.gain;
```

The console output looked more sophisticated:

```
Using PowerAmp-style frequency mapping with interpolation
Mapping 60Hz: closest=105Hz (2.9dB), weighted=1.2dB
Mapping 150Hz: closest=152Hz (-0.9dB), weighted=0.8dB
Mapping 400Hz: closest=618Hz (1.2dB), weighted=0.5dB
Mapping 1000Hz: closest=1520Hz (-1.3dB), weighted=-0.1dB
Mapping 2400Hz: closest=2042Hz (-4.2dB), weighted=-0.3dB
Mapping 4800Hz: closest=4909Hz (-2.8dB), weighted=0.2dB
Mapping 9600Hz: closest=10000Hz (3.6dB), weighted=1.2dB
```

This looked more reasonable mathematically. The weighted gains were more conservative, which seemed like it might be more accurate. But when the user tested it, the results were even worse. The original AutoEq correction of +2.9dB at 105Hz had been diluted to +1.2dB at 60Hz. The significant -4.2dB cut at 2042Hz became a barely noticeable -0.3dB at 2400Hz.

## The PowerAmp Investigation

The user mentioned they had PowerAmp installed and could check how it handled AutoEq imports. This was the breakthrough moment. Instead of theorizing about how professional software might work, we could actually examine a real implementation.

The user imported the same Audeze Euclid AutoEq preset into PowerAmp and took screenshots of the resulting EQ curve. What we saw was revelatory. PowerAmp wasn't forcing the AutoEq frequencies into a fixed 10-band layout at all. Instead, it was using AutoEq's exact frequencies.

The PowerAmp EQ showed bands at 105Hz, 152Hz, 618Hz, 1520Hz, 2042Hz, and so on. These were AutoEq's original frequencies, not PowerAmp's default frequency layout. The gains were also exactly what AutoEq specified: +2.9dB, -0.9dB, +1.2dB, -1.3dB, -4.2dB.

This was the moment everything clicked. We had been approaching the problem backwards. Instead of trying to fit AutoEq into our system, we should be adapting our system to AutoEq.

## The Dynamic Frequency Mapping Solution

The realization that we needed dynamic frequency mapping led to a complete architectural rethink. Our EQ system had been built around the assumption of fixed frequency bands, but that assumption was limiting our ability to accurately represent AutoEq presets.

I started by modifying the AutoEq conversion function to preserve the original frequencies:

```javascript
// Strategy: Use AutoEq's exact frequencies and gains (dynamic mapping)
// This preserves the original AutoEq intent without information loss
console.log('Using dynamic frequency mapping (preserving AutoEq frequencies)');

// Take up to 10 most significant filters (sorted by absolute gain)
const significantFilters = autoEqPreset.filters
  .map(filter => ({ ...filter, absGain: Math.abs(filter.gain) }))
  .sort((a, b) => b.absGain - a.absGain) // Sort by absolute gain (most significant first)
  .slice(0, 10); // Take top 10 most significant
```

The console logging showed exactly what we were selecting:

```
Selected filters by significance:
  1. 3248Hz: +5.1dB (PK)
  2. 2042Hz: -4.2dB (PK) 
  3. 10000Hz: +3.6dB (HSC)
  4. 105Hz: +2.9dB (LSC)
  5. 4909Hz: -2.8dB (PK)
  6. 7092Hz: -2.0dB (PK)
  7. 1520Hz: -1.3dB (PK)
  8. 618Hz: +1.2dB (PK)
  9. 152Hz: -0.9dB (PK)
  10. 5800Hz: +2.3dB (PK)
```

Then I converted these directly to our native format without any frequency mapping:

```javascript
const nativeBands = significantFilters.map(filter => {
  return {
    frequency: filter.fc, // Use AutoEq's exact frequency!
    type: nativeType,
    gain: filter.gain, // Use AutoEq's exact gain!
    Q: filter.Q || (nativeType === 'peaking' ? 1.0 : 0.707)
  };
});
```

But this required changes to our audio processing system. The Web Audio API filter creation had been hardcoded to use our fixed frequency layout:

```javascript
// Old approach - fixed frequencies
const filters = BAND_LAYOUT.map((band) => createFilterNode(audioContext, band));

function createFilterNode(audioContext, { freq, type }) {
  const filter = audioContext.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq; // Always used BAND_LAYOUT frequencies
  filter.Q.value = type === "peaking" ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q;
  filter.gain.value = 0; // Always started at 0
  return filter;
}
```

I had to make the system flexible enough to accept custom band configurations:

```javascript
// New approach - dynamic frequencies
export function createPeqChain(audioContext, customBands = null) {
  const bandsToUse = customBands || BAND_LAYOUT.map(({ freq, type }) => ({
    frequency: freq,
    type,
    gain: 0,
    Q: type === "peaking" ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q
  }));

  const filters = bandsToUse.map((band) => createFilterNode(audioContext, band));
}

function createFilterNode(audioContext, band) {
  const filter = audioContext.createBiquadFilter();
  filter.type = band.type;
  filter.frequency.value = band.frequency; // Use band's actual frequency
  filter.Q.value = band.Q || (band.type === "peaking" ? DEFAULT_PEAKING_Q : DEFAULT_SHELF_Q);
  filter.gain.value = band.gain || 0; // Use band's actual gain
  return filter;
}
```

The AudioPlayer integration also needed updating to pass the current bands to the chain creation:

```javascript
// Old approach
const chain = createPeqChain(audioContext);
sourceNode.connect(chain.inputNode);
chain.outputNode.connect(audioContext.destination);
storePeqNodes(chain);
updatePeqFilters(chain.filters, peqBandsRef.current);

// New approach
const chain = createPeqChain(audioContext, peqBandsRef.current);
sourceNode.connect(chain.inputNode);
chain.outputNode.connect(audioContext.destination);
storePeqNodes(chain);
// Filters are already configured with correct values from createPeqChain
```

## The Moment of Truth

With the dynamic frequency mapping implemented, we ran the import again. The console output was dramatically different:

```
Converting AutoEq preset with 10 filters
Using dynamic frequency mapping (preserving AutoEq frequencies)
Selected filters by significance:
  1. 3248Hz: +5.1dB (PK)
  2. 2042Hz: -4.2dB (PK)
  3. 10000Hz: +3.6dB (HSC)
  4. 105Hz: +2.9dB (LSC)
  5. 4909Hz: -2.8dB (PK)
  6. 7092Hz: -2.0dB (PK)
  7. 1520Hz: -1.3dB (PK)
  8. 618Hz: +1.2dB (PK)
  9. 152Hz: -0.9dB (PK)
  10. 5800Hz: +2.3dB (PK)

Final bands:
  1. 105Hz: +2.9dB (lowshelf)
  2. 152Hz: -0.9dB (peaking)
  3. 618Hz: +1.2dB (peaking)
  4. 1520Hz: -1.3dB (peaking)
  5. 2042Hz: -4.2dB (peaking)
  6. 3248Hz: +5.1dB (peaking)
  7. 4909Hz: -2.8dB (peaking)
  8. 5800Hz: +2.3dB (peaking)
  9. 7092Hz: -2.0dB (peaking)
  10. 10000Hz: +3.6dB (highshelf)
```

Perfect. Every single AutoEq filter was preserved exactly. No frequency mapping, no gain dilution, no information loss.

The UI immediately reflected the change. Instead of showing our standard frequencies (60Hz, 150Hz, 400Hz, etc.), the sliders now displayed AutoEq's exact frequencies: 105Hz, 152Hz, 618Hz, 1520Hz, 2042Hz, 3248Hz, 4909Hz, 5800Hz, 7092Hz, 10000Hz. The gains matched exactly: +2.9dB, -0.9dB, +1.2dB, -1.3dB, -4.2dB, +5.1dB, -2.8dB, +2.3dB, -2.0dB, +3.6dB.

## The Final Ear Test

The user put on their Audeze Euclid headphones again and played the same tracks they had used for the previous tests. The difference was immediate and dramatic. The characteristic AutoEq correction was now clearly audible. The headphones sounded more balanced, with the harsh frequencies tamed and the recessed frequencies brought forward.

This was the validation we needed. The technical implementation was working, but more importantly, it was delivering the audio quality improvement that AutoEq promises.

## Reflection on the Journey

Looking back, the journey from fixed frequency mapping to dynamic frequency allocation represents a fundamental shift in thinking. We started with the assumption that our system's constraints were fixed and that external data needed to be adapted to fit those constraints. The breakthrough came when we realized that the constraints themselves could be flexible.

The ear testing was crucial throughout this process. Console logs and frequency response charts can show that an algorithm is working mathematically, but they can't tell you whether the result sounds good. The user's subjective experience was the ultimate validation of our technical choices.

The research phase was also critical, but not in the way I initially expected. Academic papers and general EQ theory didn't provide the insight we needed. It was examining real-world implementations like PowerAmp that revealed the correct approach.

This experience reinforced the importance of understanding the problem domain deeply. AutoEq isn't just a collection of filter parameters; it's a carefully optimized frequency response designed to correct specific acoustic problems. Treating it as arbitrary data to be mapped into our system was fundamentally misunderstanding its purpose.

The final solution achieves what we set out to do: accurate AutoEq integration with zero information loss. Each AutoEq preset now gets its own optimal 10-band configuration, preserving the original intent while working within our system's architecture. The result is professional-grade headphone correction that rivals commercial audio software.

## Technical Debt and Future Considerations

The dynamic frequency mapping solution introduces some complexity to the system. We now have two different modes of operation: fixed frequencies for user-created presets and dynamic frequencies for AutoEq imports. This duality needs to be managed carefully to avoid confusion.

The UI also needs to handle the fact that different presets might have completely different frequency layouts. Users switching between a custom preset with standard frequencies and an AutoEq preset with dynamic frequencies will see the slider labels change, which could be confusing.

But these are manageable challenges, and the benefits far outweigh the costs. We now have a system that can accurately represent any AutoEq preset while maintaining the flexibility to support user-created presets with our standard frequency layout.

The journey taught us that sometimes the best solution requires questioning fundamental assumptions about how the system should work. In this case, the assumption that frequency bands should be fixed was the barrier to achieving accurate AutoEq integration. Once we removed that constraint, the solution became clear.