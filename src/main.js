import "./style.css";
import { AudioEngine } from "./audio/audio-engine.js";
import { westernProfile } from "./profiles/western/index.js";
import { registerProfile, getProfile } from "./profiles/profile-registry.js";

registerProfile(westernProfile);
const activeProfile = getProfile("western");
const $=id=>document.getElementById(id),status=$("status"),enable=$("enable"),styleRoot=$("styles"),playing=$("playing"),volume=$("volume"),octave=$("octave"),tempo=$("tempo"),tempoText=$("tempoText"),leadInstrument=$("leadInstrument"),keysRoot=$("keys"),textInput=$("textInput"),delayInput=$("delay"),delayText=$("delayText");
const styles = activeProfile.rhythms.flat();
const audio = new AudioEngine({ soundFontUrl: "/soundfonts/GeneralUser-GS.sf2", workletUrl: "/spessasynth_processor.min.js", getGain: () => Number(volume.value) });
let loaded=false,activeStyle=-1;
const LEAD_CHANNEL=activeProfile.leadChannel;
const activeKeys=new Map(),letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ",noteNames=["C","C♯","D","D♯","E","F","F♯","G","G♯","A","A♯","B"],black=new Set([1,3,6,8,10]);
function setStatus(s){status.textContent=s}
function updateVolume(){audio.setGain(Number(volume.value))}
async function initialize(){
  if(loaded){await audio.resume();return true;}
  enable.disabled=true;
  setStatus("تحميل محرك الصوت...");
  try{
    await audio.initialize();
    loaded=true;
    enable.textContent="✓ الآلات جاهزة";
    setStatus("تم تحميل بنك الآلات. تقدر تعزف بالكيبورد أو تكتب نصًا.");
    return true;
  }catch(error){
    console.error("SoundFont initialization failed:",error);
    setStatus("فشل تحميل الصوت: "+(error?.message||error));
    enable.disabled=false;
    enable.textContent="إعادة محاولة تحميل الصوت";
    return false;
  }
}
enable.addEventListener("click",initialize);volume.addEventListener("input",updateVolume);
const arabicLetters=[..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];
const arabicNoteMap=new Map(arabicLetters.map((ch,i)=>[ch,i%26]));
const heldPhysicalKeys=new Set();
function charIndex(char){
  const c=char.toUpperCase();
  if(c>="A"&&c<="Z") return c.charCodeAt(0)-65;
  const normalized=char.normalize("NFC");
  if(arabicNoteMap.has(normalized)) return arabicNoteMap.get(normalized);
  const variants={"أ":"ا","إ":"ا","آ":"ا","ٱ":"ا","ى":"ي","ة":"ه","ؤ":"و","ئ":"ي","ء":"ا"};
  const base=variants[normalized]||normalized;
  if(arabicNoteMap.has(base)) return arabicNoteMap.get(base);
  return -1;
}
function playNoteByIndex(index,keyId="manual"){
  if(!loaded || !Number.isInteger(index) || index<0) return false;
  try{
    releaseKey(keyId);
    // Channel 0 is intentionally reserved for live keyboard/text notes;
    // the accompaniment MIDI files use channels 1, 2, 3 and 10.
    const note=12*(Number(octave.value)+1)+(index%12);
    audio.noteOn(LEAD_CHANNEL,note,110,Number(leadInstrument.value));
    activeKeys.set(keyId,{channel:LEAD_CHANNEL,note,index});
    const keyButton=keysRoot.children[index];
    if(keyButton) keyButton.classList.add("pressed");
    return true;
  }catch(error){
    console.error("Live note failed:",error);
    setStatus("تعذر تشغيل النغمة: "+(error?.message||error));
    return false;
  }
}
function playKey(letter){return playNoteByIndex(charIndex(letter),letter.toUpperCase())}
function releaseKey(keyId){
  const item=activeKeys.get(keyId);
  if(item&&audio.synth){
    try{audio.noteOff(item.channel,item.note);}catch(error){console.warn("Note release failed:",error);}
    activeKeys.delete(keyId);
    if(item.index>=0&&keysRoot.children[item.index]) keysRoot.children[item.index].classList.remove("pressed");
  }
}
function releaseManualNotes(){
  for(const keyId of [...activeKeys.keys()]) releaseKey(keyId);
}
letters.split("").forEach((letter,i)=>{
  const button=document.createElement("button");
  button.className="note-key"+(black.has(i%12)?" black":"");
  button.innerHTML=`<span>${letter}</span><small>${noteNames[i%12]}</small>`;
  button.addEventListener("pointerdown",async event=>{
    event.preventDefault();
    const pointerId=event.pointerId;
    // Capture while the pointer is still active (before any async loading).
    try{button.setPointerCapture(pointerId);}catch{}
    if(!loaded && !(await initialize())) return;
    if(audio.context?.state!=="running") await audio.resume();
    playNoteByIndex(i,`pointer-${pointerId}`);
  });
  const releasePointer=event=>{releaseKey(`pointer-${event.pointerId}`);button.classList.remove("pressed");};
  button.addEventListener("pointerup",releasePointer);
  button.addEventListener("pointercancel",releasePointer);
  button.addEventListener("lostpointercapture",()=>button.classList.remove("pressed"));
  keysRoot.append(button);
});

// Computer keyboard: physical KeyA..KeyZ works regardless of the active language layout.
function isTextEntry(target){
  return target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT","TEXTAREA","SELECT"].includes(target.tagName));
}
window.addEventListener("keydown",async event=>{
  if(isTextEntry(event.target)||event.ctrlKey||event.altKey||event.metaKey||event.repeat) return;
  if(!/^Key[A-Z]$/.test(event.code)) return;
  event.preventDefault();
  const letter=event.code.slice(3);
  heldPhysicalKeys.add(letter);
  if(!loaded && !(await initialize())) return;
  if(audio.context?.state!=="running") await audio.resume();
  playKey(letter);
});
window.addEventListener("keyup",event=>{
  if(!/^Key[A-Z]$/.test(event.code)) return;
  const letter=event.code.slice(3);
  heldPhysicalKeys.delete(letter);
  releaseKey(letter);
});
window.addEventListener("blur",()=>{
  for(const letter of heldPhysicalKeys) releaseKey(letter);
  heldPhysicalKeys.clear();
});

styles.forEach((s, i) => {
    const b = document.createElement("button");

    b.type = "button";
    b.className = "style-key";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", "false");
    b.setAttribute("aria-label", `${s.ar} - ${s.en}`);
    b.title = `${s.ar} | ${s.en}`;

    b.innerHTML = `
        <span class="radio-key">
            <span class="radio-light"></span>
        </span>
        <span class="radio-number">${String(i + 1).padStart(2, "0")}</span>
    `;

    b.addEventListener("click", async () => {
        if (!loaded) await initialize();
        if (!loaded) return;

        if (activeStyle === i) {
            stopStyle();
            return;
        }

        await startStyle(i);
    });

    styleRoot.append(b);
});

styleRoot.setAttribute("role", "radiogroup");
styleRoot.setAttribute("aria-label", "Accompaniment Styles");

async function startStyle(i) {
    stopStyle();

    const s = styles[i];

    try {
        await audio.playMidi(s.file, Number(tempo.value) / 120);

        activeStyle = i;

        [...styleRoot.children].forEach((b, n) => {
            const selected = n === i;

            b.classList.toggle("active", selected);
            b.setAttribute("aria-checked", String(selected));
        });

        playing.textContent = "شغال: " + s.ar;

        setStatus(
            `الإيقاع ${s.ar} شغال: طبول + باص + هارموني + لحن.`
        );

    } catch (e) {
        console.error(e);
        setStatus("تعذر تشغيل الإيقاع: " + e.message);
    }
}

function stopStyle() {
    audio.pauseSequencer();

    activeStyle = -1;

    [...styleRoot.children].forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-checked", "false");
    });

    playing.textContent = "متوقف";
}

$("stopStyle").addEventListener("click", stopStyle);

$("panic").addEventListener("click", () => {
    stopStyle();

    audio.stopAll();

    activeKeys.clear();
});

tempo.addEventListener("input", () => {
    tempoText.textContent = tempo.value + " BPM";

    if (activeStyle >= 0) audio.setPlaybackRate(Number(tempo.value) / 120);
});

leadInstrument.addEventListener("change", () => {
    audio.programChange(LEAD_CHANNEL, Number(leadInstrument.value));
});

octave.addEventListener("change", () => releaseManualNotes());

delayInput.addEventListener("input", () => {
    delayText.textContent = delayInput.value + " ms";
});

let replayRunId = 0;

// Letters are notes; a space is a quarter-rest; "-" extends the previous
// event by one unit; "." adds a half-unit; "|" or a newline marks a bar line.
function parseMusicSequence(value) {
  const events = [];
  for (const char of value) {
    if (char === " " || char === "\t") {
      events.push({ type: "rest", duration: 1 });
    } else if (char === "|" || char === "\n" || char === "\r") {
      if (char !== "\r") events.push({ type: "bar" });
    } else if (char === "-" || char === ".") {
      const previous = [...events].reverse().find(event => event.type === "note" || event.type === "rest");
      if (previous) previous.duration += char === "-" ? 1 : 0.5;
    } else {
      const index = charIndex(char);
      if (index >= 0) events.push({ type: "note", char, index, duration: 1 });
    }
  }
  return events;
}

const scoreRoot = $("scorePreview");
const pitchLetters = ["C", "C", "D", "D", "E", "F", "F", "G", "G", "A", "A", "B"];
const pitchAccidentals = ["", "♯", "", "♯", "", "", "♯", "", "♯", "", "♯", ""];

let activeScoreEvent = -1;
const scoreFontSize = $("scoreFontSize");
const scoreFontValue = $("scoreFontValue");

function setActiveScoreEvent(index) {
  activeScoreEvent = index;
  if (!scoreRoot) return;
  scoreRoot.querySelectorAll(".score-note").forEach(node => {
    node.classList.toggle("playing", Number(node.dataset.eventIndex) === index);
  });
}

function renderScore() {
  if (!scoreRoot) return;
  const events = parseMusicSequence(textInput.value);
  const fontSize = Number(scoreFontSize?.value || 20);
  if (scoreFontValue) scoreFontValue.textContent = String(fontSize);

  const lineGap = Math.round(fontSize * 0.9);
  const top = Math.max(30, Math.round(fontSize * 1.6));
  const staffBottom = top + lineGap * 4;
  const spacing = Math.round(fontSize * 3.2);
  const barCount = events.filter(event => event.type === "bar").length;
  const musicalEvents = events.filter(event => event.type !== "bar");
  const width = Math.max(380, 100 + musicalEvents.length * spacing + barCount * 15);
  const height = Math.max(190, staffBottom + fontSize * 4.5);
  const staffLines = Array.from({ length: 5 }, (_, i) =>
    `<line x1="58" y1="${top + i * lineGap}" x2="${width - 18}" y2="${top + i * lineGap}" class="staff-line"/>`
  ).join("");

  let x = 92;
  let body = "";
  let noteCount = 0;
  let restCount = 0;
  let eventIndex = 0;

  for (const event of events) {
    if (event.type === "bar") {
      body += `<line x1="${x - spacing * 0.35}" y1="${top - 7}" x2="${x - spacing * 0.35}" y2="${staffBottom + 9}" class="bar-line"/>`;
      x += Math.round(spacing * 0.35);
      eventIndex++;
      continue;
    }
    if (event.type === "rest") {
      body += `<g class="score-rest" data-event-index="${eventIndex}"><text x="${x}" y="${top + lineGap * 2.8}" class="rest-symbol" text-anchor="middle">𝄽</text></g>`;
      x += spacing * event.duration;
      restCount++;
      eventIndex++;
      continue;
    }

    const pitchClass = event.index % 12;
    const pitchLetter = pitchLetters[pitchClass];
    const accidental = pitchAccidentals[pitchClass];
    const octaveNumber = Number(octave.value) + Math.floor(event.index / 12);
    const diatonic = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 }[pitchLetter];
    const absoluteStep = octaveNumber * 7 + diatonic;
    const e4Step = 4 * 7 + 2;
    const y = staffBottom - (absoluteStep - e4Step) * (lineGap / 2);
    const stemUp = y > top + lineGap * 2;
    const stemX = x + (stemUp ? fontSize * 0.55 : -fontSize * 0.55);
    const stemEnd = y + (stemUp ? -lineGap * 2.8 : lineGap * 2.8);
    const headRx = Math.max(8, fontSize * 0.48);
    const headRy = Math.max(6, fontSize * 0.34);
    const ledger = y < top - 1 || y > staffBottom + 1
      ? `<line x1="${x - headRx * 1.5}" y1="${y}" x2="${x + headRx * 1.5}" y2="${y}" class="ledger-line"/>`
      : "";
    body += `<g class="score-note${activeScoreEvent === eventIndex ? " playing" : ""}" data-event-index="${eventIndex}">
      ${ledger}
      ${accidental ? `<text x="${x - headRx * 1.8}" y="${y + fontSize * 0.25}" class="accidental">${accidental}</text>` : ""}
      <ellipse cx="${x}" cy="${y}" rx="${headRx}" ry="${headRy}" class="note-head" transform="rotate(-18 ${x} ${y})"/>
      <line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemEnd}" class="note-stem"/>
      <text x="${x}" y="${staffBottom + fontSize * 2.1}" class="note-label" text-anchor="middle">${event.char}</text>
    </g>`;
    x += spacing * event.duration;
    noteCount++;
    eventIndex++;
  }

  scoreRoot.innerHTML = `
    <div class="score-heading">
      <strong>النوتة الموسيقية</strong>
      <span>${noteCount} نغمة · ${restCount} وقفة</span>
    </div>
    <div class="score-scroll">
      <svg class="music-score" style="--score-font:${fontSize}px;width:${width}px;max-width:none;height:auto" viewBox="0 0 ${width} ${height}" role="img" aria-label="معاينة النوتة الموسيقية">
        ${staffLines}
        <text x="12" y="${top + lineGap * 3.2}" class="clef">𝄞</text>
        ${body}
      </svg>
    </div>
    <div class="score-legend">الحروف = نغمات · المسافة = وقفة · - = إطالة · . = إطالة منقوطة · | = خط مازورة</div>
  `;
  setActiveScoreEvent(activeScoreEvent);
}

textInput.addEventListener("input", renderScore);
octave.addEventListener("change", renderScore);
scoreFontSize?.addEventListener("input", renderScore);
renderScore();
/////////////////////////////////////////
let replayTimeout=null;
function stopReplay(){
  replayRunId++;
  if(replayTimeout!==null){clearTimeout(replayTimeout);replayTimeout=null;}
  releaseManualNotes();
  setActiveScoreEvent(-1);
}
$("stopReplay").addEventListener("click",stopReplay);
$("replay").addEventListener("click",async()=>{
  if(!loaded && !(await initialize())) return;
  if(audio.context?.state!=="running") await audio.resume();
  stopReplay();
  const runId=replayRunId;
  const sequence = parseMusicSequence(textInput.value);
  if (!sequence.some(item => item.type === "note")) {
    setStatus("اكتب حروفًا للنغمات، واستخدم المسافة للوقفة.");
    return;
  }
  let position = 0;
  let scoreEventIndex = 0;
  const unitMs = Number(delayInput.value);
  setStatus("جاري عزف النوتة...");
  const next = () => {
    if (runId !== replayRunId) return;
    releaseKey("text-playback");
    if (position >= sequence.length) {
      replayTimeout = null;
      setActiveScoreEvent(-1);
      setStatus("انتهى عزف النوتة.");
      return;
    }
    const item = sequence[position++];
    const currentScoreIndex = scoreEventIndex++;
    if (item.type === "bar") {
      replayTimeout = setTimeout(next, 40);
      return;
    }
    const duration = Math.max(60, Math.round(unitMs * item.duration));
    if (item.type === "rest") setActiveScoreEvent(-1);
    if (item.type === "note") {
      setActiveScoreEvent(currentScoreIndex);
      playNoteByIndex(item.index, "text-playback");
      replayTimeout = setTimeout(() => {
        if (runId !== replayRunId) return;
        releaseKey("text-playback");
        next();
      }, duration);
    } else {
      replayTimeout = setTimeout(next, duration);
    }
  };
  next();
});
window.addEventListener("blur",()=>{
  stopReplay();
  stopStyle();
  releaseManualNotes();
});
