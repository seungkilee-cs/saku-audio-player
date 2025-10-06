# UX Revamp Playbook

## Theme Direction
- **Pastel Aurora Palette**: Use a restrained set of soft gradient pairs (e.g., periwinkle → peach, mint → lilac) applied to backgrounds and key surfaces. Rotate pairings per screen state to keep things fresh without overwhelming users.
- **Glassmorphic Panels**: Introduce translucent, frosted containers around the player and playlist, with subtle inner glows. Maintain strong hierarchy by pairing these with thin pastel border strokes.
- **Ambient Lighting**: Add a low-contrast radial glow behind the album art that shifts hue with the active track’s dominant color (fallback to default “U” gradient when color data is missing).
- **Sakura Bloom Language**: Anchor the palette around cherry blossom gradients (soft blush → dusk violet) and layer in petal-shaped masks and curves on section dividers. Use speckled grain overlays to echo watercolor paper and keep the interface tactile.

## Motion & Micro-Interactions
- **Dynamic Gradient Wash**: Animate a slow, looping gradient across the hero background tied to playback state (paused = static, playing = gentle drift, fast-forward = quick pulse).
- **Control Micro-Feedback**: Give the transport buttons elastic scaling, soft highlight rings, and haptic-simulating vibrations (via Web Animations API) on interaction. Ensure disabled states stay calm.
- **Playlist Reveal**: Convert the playlist collapse into a slide-and-fade motion that begins at the player’s right edge, reinforcing the connection between the two panels.
- **Vinyl Spin & Progress Arc**: Overlay an animated vinyl record behind the album art. Sync a thin pastel progress arc around the art to the current playback time for an at-a-glance cue.
- **Petal Drift Layer**: Introduce a subtle particle system that releases translucent sakura petals when music plays. The petals should respond to beat intensity (faster tracks = livelier drift) while gently settling when paused.

## Audio Visualization Enhancements
- **Pastel Waveform Canvas**: Render a responsive waveform using the Web Audio API beneath the progress bar. Use layered pastel strokes with slight parallax to deliver a premium feel.
- **Particle Burst on Track Change**: Trigger a quick burst of pastel particles emanating from the album art when a new track starts, fading within 300ms to avoid distraction.
- **Volume Ripple**: Replace the static volume bar with concentric ripples that expand/contract to reflect volume level and fade to the background hue.
- **Bloom Meter**: Replace or augment the progress bar with a blooming branch illustration where blossoms open as playback advances. Completed tracks could leave a trail of fully bloomed flowers, conveying “let your music bloom.”

## Playlist Experience
- **Stacked Card View**: Present upcoming tracks as a stacked card carousel with a light parallax tilt on hover. Keep typography consistent with `Space Grotesk` and `IBM Plex Mono` for metadata.
- **Inline Quick Actions**: Surface mini icons for favorite/download/remove on hover, enclosed in soft pill buttons that inherit the pastel gradient from the player.
- **Contextual Empty State**: Introduce illustrated drop targets (pastel outlined icons) plus rotating tips or shortcuts. Lean on subtle motion to imply droppable areas.
- **Seasonal Stories**: When the playlist is empty or a new session begins, show a progressive illustration of a sakura tree sprouting leaves as tracks are added. The tree becomes denser with each playlist addition, visually reinforcing growth.

## Feedback & Status
- **Upload Timeline**: Convert the upload status text into a slim timeline chip that advances through “Queued → Parsing → Ready.” Each stage uses a distinct pastel hue progression.
- **Toast Notifications**: Replace alert-style messaging with floating toasts that emerge from the top-right, sporting translucent backgrounds and blur to match the glass aesthetic.
- **Long-running Tasks**: For metadata parsing, show a circular progress indicator incorporated into the playlist toggle button so users see activity even when the panel is collapsed.
- **Bloom Cycle Indicator**: Reflect session momentum with a perimeter halo around the player card that fills with color over time; once full, emit a brief petal shimmer animation to celebrate the listening streak.

## Accessibility Considerations
- **Contrast Safety Nets**: Provide an accessible mode toggle that increases pastel saturation and adds dark outlines to key controls while retaining the overall aesthetic.
- **Motion Preferences**: Respect `prefers-reduced-motion` by freezing gradient loops, disabling particle bursts, and simplifying button transitions.
- **Keyboard Focus States**: Use high-contrast focus rings (e.g., navy outline with pastel glow) consistent across player and playlist.
- **Petal-Free Mode**: Allow users to disable decorative petal effects independently of other motion settings so the “bloom” story remains optional for distraction-sensitive listeners.

## Implementation Notes
- **Reusable Motion Tokens**: Define timing curves (`--ease-soft-snap`, `--ease-glide`) and durations in `:root` for consistent animation behavior.
- **Component Hooks**: Extend `AudioPlayer.jsx` and `Playlist.jsx` with optional props for visualizers and status chips to keep core logic decoupled.
- **Asset Strategy**: Centralize gradient definitions and pastel palettes in `styles/theme.css`, enabling quick theme swaps or seasonal variants.

## Implementation Roadmap
- **Phase 1 · Foundations**
  - Set up `styles/theme.css` with pastel palette variables, gradient tokens, and motion easing variables.
  - Refactor `AudioPlayer.jsx` and `Playlist.jsx` to accept optional visual props (e.g., `showVisualizer`, `statusChip`) without toggling features on yet.
  - Introduce a lightweight animation utility (GSAP or the Web Animations API wrapper) and establish a `hooks/useMotionPreferences.js` helper to respect reduced-motion settings.
- **Phase 2 · Visual Identity**
  - Apply glassmorphic backgrounds and bloom-inspired gradients to player + playlist surfaces; ensure contrast pass with accessible palette toggle.
  - Implement the ambient art glow and petal particle layer tied to playback state; encapsulate logic inside `components/PetalField.jsx` for reuse.
  - Add the bloom meter progress arc around the album art, synchronizing with existing progress state.
- **Phase 3 · Enhanced Feedback**
  - Replace the progress bar with pastel waveform visualization (`components/WaveformCanvas.jsx`) using the Web Audio API.
  - Introduce the upload timeline chip and toast notifications using a centralized `<ToastProvider>`.
  - Wire in the bloom cycle indicator halo, connecting it to listening streak state (persist via context or local storage).
- **Phase 4 · Playlist Flourish**
  - Convert the playlist list into stacked cards with parallax tilt and quick-action pills.
  - Integrate the seasonal sakura tree empty-state, progressively animating as tracks are added.
  - Animate the playlist collapse/expand sequence with slide-fade motion while keeping interactions responsive across breakpoints.
- **Phase 5 · Polish & Accessibility**
  - Audit focus states, keyboard flows, and color contrast in both standard and high-contrast/petal-free modes.
  - Optimize animation performance (GPU-accelerated transforms, throttled particle counts) and ensure lazy loading for optional heavy visualizers.
  - Document configuration toggles (e.g., enable bloom meter, disable petals) in `README` and surface them in an in-app settings sheet.

## Phase 2 Progress Snapshot (2025-10-06)
- **Ambient Glow**: `AudioPlayer.jsx` and `AudioPlayer.css` now render a radial pastel glow behind the card, using glassmorphic blurs and theme gradients.
- **Petal Field Overlay**: Added `components/PetalField.jsx` with drift animations gated by `useMotionPreferences`, rendered via the new `renderOverlay` hook.
- **Bloom Meter**: `FluxStudio.jsx` integrates the bloom meter output with animated progress and play-state glow; styling lives in `FluxStudio.css`.
- **Glass Surfaces**: Both the player and playlist panel cards rely on translucent backgrounds, blur, and subtle borders to reinforce the sakura aesthetic.
- **Next Focus**: Prototype waveform canvas visualization and refine playlist stacked-card parallax to continue Phase 2 rollout.
