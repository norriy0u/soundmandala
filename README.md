# 🪷 Sound Mandala — Sacred Geometry Audio Synth

A generative, interactive audio-visual experience. Click to drop sound pebbles onto the canvas. Each pebble triggers a procedurally generated instrument (via the Web Audio API) based on its angular position, and is mirrored across 8 axes of symmetry to draw a beautiful, evolving sacred geometry pattern.

## ✨ Features

- **Procedural Audio Synthesis**: 8 distinct instruments generated entirely via the Web Audio API (no external sound files):
  - 🔴 Tabla (Noise + Bandpass)
  - 🟠 Sitar (Sawtooth + Vibrato LFO)
  - 🟡 Flute (Sine + Noise)
  - 🟢 Tanpura (Deep Sine)
  - 🔵 Temple Bell (High Sine + Exponential Decay)
  - 🟣 Sarangi (Sawtooth + Slow Attack)
  - 🩷 Mridangam (Low Bandpass Noise)
  - ⚪ Harmonium (Multisine)
- **8-Axis Symmetry Rendering**: Every pebble you drop is mirrored 8 times (45° intervals).
- **Polyrhythmic Sequencing**: Instruments loop at different intervals synced to a master BPM.
- **Glassmorphism UI**: Minimalist floating control panels with blur filters.
- **Export Capabilities**:
  - Save the mandala as a PNG image.
  - Record and export a 10-second snippet of the Web Audio output.
- **Snap to Grid**: Align pebbles to perfect sacred geometric intersections.

## 🛠️ Tech Stack

- **HTML5 Canvas** (for drawing the mandala, ripples, and connecting lines)
- **CSS3** (for layout, typography, animations, and glassmorphism)
- **Vanilla JavaScript** (for logic and input handling)
- **Web Audio API** (for synthesizers and scheduling)
- **MediaRecorder API** (for audio export)

## 🚀 Getting Started

No build tools needed! Just open `index.html` in any modern web browser or serve it locally:

```bash
python -m http.server 8080
```

## 🎨 Visual Theme
- Deep midnight blue (`#0f0a2e`) background.
- Jewel tones for the instruments (emerald, sapphire, ruby, topaz, amethyst).
- Typography: Cormorant Garamond (elegant) + JetBrains Mono (technical).
- Subtle, continuous 0.5 RPM rotation of the entire canvas.

## 📜 License
MIT

---
*Built for the VishwaNova Weboreel Hackathon*
