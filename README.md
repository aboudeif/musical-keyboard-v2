# Musical Keyboard — SoundFont Arranger

This rebuild uses SpessaSynth (`spessasynth_lib`) and the supplied GeneralUser GS v2.0.3 SF2 bank. The 30 arranger keys each load a separate four-track MIDI arrangement: percussion, bass, chord accompaniment, and lead melody. MIDI patterns include different rhythmic vocabularies, syncopations, instrument programs and phrase variations.

## First-time setup
Requires Node.js 20+ and internet for the one-time dependency installation:
```bash
npm install
npm run dev
```
Open the local URL printed by Vite. Click **تفعيل الصوت وتحميل الآلات** once; the local SF2 bank is about 32 MB.

## Offline build
```bash
npm run build
```
The `dist/` folder includes the app, SF2, MIDI files and AudioWorklet. It can be served locally without internet. Do not open `index.html` directly with `file://`; use the Vite server or another local HTTP server.

## Important
- The Shanai preset is a reed-like approximation, not an actual Egyptian mizmar recording.
- Regional styles are represented by dedicated programmed MIDI patterns and available General MIDI presets; they are not claimed to be authentic field recordings.
- `spessasynth_lib` / `spessasynth_core`: Apache-2.0.
- GeneralUser GS: see `SOUNDFONT-LICENSE.txt`. The license allows use in software projects, while noting some sample provenance uncertainty.
