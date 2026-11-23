import { WorkletSynthesizer, Sequencer } from "spessasynth_lib";

/** Shared audio runtime. Musical profiles provide configuration; this engine
 * remains unaware of genre-specific scales, layouts, and instrument choices.
 */
export class AudioEngine {
  constructor({ soundFontUrl, workletUrl, getGain }) {
    this.soundFontUrl = soundFontUrl;
    this.workletUrl = workletUrl;
    this.getGain = getGain;
    this.context = null;
    this.synth = null;
    this.sequencer = null;
    this.ready = false;
    this.initializing = null;
  }

  async initialize() {
    if (this.ready) {
      await this.resume();
      return true;
    }
    if (this.initializing) return this.initializing;

    this.initializing = this.#initializeOnce();
    try {
      return await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  async #initializeOnce() {
    try {
      this.context = new AudioContext();
      await this.context.audioWorklet.addModule(this.workletUrl);
      this.synth = new WorkletSynthesizer(this.context);
      this.synth.connect(this.context.destination);

      const response = await fetch(this.soundFontUrl);
      if (!response.ok) throw new Error("ملف بنك الأصوات غير موجود");
      const soundFontBuffer = await response.arrayBuffer();
      await this.synth.soundBankManager.addSoundBank(soundFontBuffer, "generaluser-gs");
      await this.synth.isReady;
      await this.context.resume();

      this.setGain(this.getGain());
      this.sequencer = new Sequencer(this.synth);
      this.sequencer.loopCount = Infinity;
      this.ready = true;
      return true;
    } catch (error) {
      console.error("SoundFont initialization failed:", error);
      this.context?.close?.();
      this.context = null;
      this.synth = null;
      this.sequencer = null;
      this.ready = false;
      throw error;
    }
  }

  async resume() {
    if (this.context?.state !== "running") await this.context?.resume();
  }

  setGain(value) {
    if (this.synth) this.synth.setSystemParameter("gain", Number(value));
  }

  noteOn(channel, note, velocity = 110, program) {
    if (!this.ready || !this.synth) return false;
    if (Number.isInteger(program)) this.synth.programChange(channel, program);
    this.synth.noteOn(channel, note, velocity);
    return true;
  }

  noteOff(channel, note) {
    if (this.synth) this.synth.noteOff(channel, note);
  }

  programChange(channel, program) {
    if (this.synth) this.synth.programChange(channel, Number(program));
  }

  stopAll() {
    if (this.synth) this.synth.stopAll(true);
  }

  async playMidi(url, playbackRate = 1) {
    if (!this.ready || !this.sequencer) throw new Error("محرك الصوت غير جاهز");
    const response = await fetch(url);
    if (!response.ok) throw new Error("ملف الإيقاع غير موجود");
    const binary = await response.arrayBuffer();
    this.sequencer.loadNewSongList([{ binary }]);
    this.sequencer.loopCount = Infinity;
    this.sequencer.playbackRate = Number(playbackRate);
    this.sequencer.play();
  }

  pauseSequencer() {
    this.sequencer?.pause();
  }

  setPlaybackRate(rate) {
    if (this.sequencer) this.sequencer.playbackRate = Number(rate);
  }
}
