import { useCallback, useEffect, useRef, useState } from 'react';
import { HamsterMark, Icon, SeedIcon, Wheel } from './Icons';
import { CAPACITY, createGame, DURATION, stepGame, WORLD, type Direction, type GameState } from './game/engine';
import { drawGame, makeScenery } from './game/render';
import { getRhythm, parseTelemetry, POLL_MS, REQUEST_TIMEOUT_MS, STATUS_URL, type Connection, type Mode } from './game/telemetry';

const STORAGE_KEY = 'squeek-courier.records.v1';
type Records = Record<Mode, number>;
function readRecords(): Records {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return Object.fromEntries(['live', 'practice-rest', 'practice-run'].map(mode =>
      [mode, Number.isSafeInteger(stored[mode]) && stored[mode] >= 0 ? stored[mode] : 0])) as Records;
  } catch { return { live: 0, 'practice-rest': 0, 'practice-run': 0 }; }
}
const modeNames: Record<Mode, string> = { live: 'Live hamster', 'practice-rest': 'Practice · resting', 'practice-run': 'Practice · running' };
const keyMap: Record<string, Direction> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' };
const copySnapshot = (game: GameState) => ({ phase: game.phase, score: game.score, cargo: game.cargo,
  time: Math.ceil(game.time), deliveries: game.deliveries, event: game.event, eventId: game.eventId });

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef(createGame(76));
  const inputRef = useRef(new Set<Direction>());
  const dialogRef = useRef<HTMLDialogElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const [snapshot, setSnapshot] = useState(() => copySnapshot(gameRef.current));
  const [mode, setMode] = useState<Mode>('live');
  const [connection, setConnection] = useState<Connection>({ data: null, state: 'connecting' });
  const [now, setNow] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const [records, setRecords] = useState(readRecords);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [sound, setSound] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [touchActive, setTouchActive] = useState<Direction | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const fetchRef = useRef<() => void>(() => {});
  const valuesRef = useRef({ mode, connection, paused, sound });
  valuesRef.current = { mode, connection, paused, sound };
  const rhythm = getRhythm(mode, connection, now);
  const isPlaying = snapshot.phase === 'playing';
  const waiting = isPlaying && !rhythm.valid;
  const showOverlay = !isPlaying || paused || waiting;

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let controller: AbortController | null = null;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    async function refresh() {
      if (pending || disposed) return;
      pending = true; setRetrying(true);
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(STATUS_URL, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const data = parseTelemetry(await response.json());
        if (!disposed) { setConnection({ data, state: 'ready' }); setNow(Date.now()); }
      } catch {
        if (!disposed) setConnection(previous => ({ ...previous, state: 'error' }));
      } finally {
        clearTimeout(timeout); pending = false;
        if (!disposed) setRetrying(false);
      }
    }
    fetchRef.current = () => { void refresh(); };
    void refresh();
    const poll = setInterval(() => { void refresh(); }, POLL_MS);
    const age = setInterval(() => setNow(Date.now()), 250);
    const online = () => { void refresh(); };
    const offline = () => setConnection(previous => ({ ...previous, state: 'error' }));
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => {
      disposed = true; clearInterval(poll); clearInterval(age); clearTimeout(timeout); controller?.abort();
      window.removeEventListener('online', online); window.removeEventListener('offline', offline);
    };
  }, []);

  const playTone = useCallback((delivery = false) => {
    const context = audioRef.current;
    if (!valuesRef.current.sound || !context || context.state !== 'running') return;
    const oscillator = context.createOscillator(); const volume = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(delivery ? 660 : 440, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(delivery ? 990 : 600, context.currentTime + .12);
    volume.gain.setValueAtTime(.035, context.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, context.currentTime + .16);
    oscillator.connect(volume); volume.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .17);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    let scenery = makeScenery(); let cancelled = false;
    void document.fonts.ready.then(() => { if (!cancelled) scenery = makeScenery(); });
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const observer = new ResizeObserver(() => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
    });
    observer.observe(canvas);
    let frame = 0, previous = 0, lastUpdate = 0, lastEvent = 0;
    function animate(timestamp: number) {
      const dt = previous ? (timestamp - previous) / 1000 : 0; previous = timestamp;
      const values = valuesRef.current;
      const current = getRhythm(values.mode, values.connection, Date.now());
      const game = gameRef.current;
      stepGame(game, inputRef.current, dt, current.rhythm, !values.paused && current.valid && !document.hidden);
      drawGame(ctx!, game, scenery, reducedMotion.matches);
      if (game.eventId !== lastEvent) {
        lastEvent = game.eventId;
        setAnnouncement(game.event);
        playTone(game.event.includes('delivered'));
      }
      if (timestamp - lastUpdate > 75 || game.phase === 'finished') {
        lastUpdate = timestamp;
        setSnapshot(old => {
          const next = copySnapshot(game);
          return Object.keys(next).every(key => next[key as keyof typeof next] === old[key as keyof typeof old]) ? old : next;
        });
      }
      frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => { cancelled = true; cancelAnimationFrame(frame); observer.disconnect(); };
  }, [playTone]);

  useEffect(() => {
    if (snapshot.phase !== 'finished') return;
    inputRef.current.clear(); setTouchActive(null);
    setRecords(previous => {
      const next = { ...previous, [mode]: Math.max(previous[mode], snapshot.score) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setStorageAvailable(false); }
      return next;
    });
    startRef.current?.focus({ preventScroll: true });
  }, [snapshot.phase, snapshot.score, mode]);

  const togglePause = useCallback(() => {
    if (gameRef.current.phase !== 'playing' || dialogRef.current?.open) return;
    inputRef.current.clear(); setTouchActive(null); setPaused(value => !value);
  }, []);
  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (gameRef.current.phase !== 'playing' || dialogRef.current?.open ||
        event.target instanceof HTMLSelectElement || event.ctrlKey || event.altKey || event.metaKey) return;
      const direction = keyMap[event.key] ?? keyMap[event.key.toLowerCase()];
      if (direction) { event.preventDefault(); if (!valuesRef.current.paused) inputRef.current.add(direction); }
      if ((event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) || event.key === 'Escape') {
        event.preventDefault(); if (!event.repeat) togglePause();
      }
    }
    function keyUp(event: KeyboardEvent) {
      const direction = keyMap[event.key] ?? keyMap[event.key.toLowerCase()];
      if (direction) inputRef.current.delete(direction);
    }
    const release = () => {
      inputRef.current.clear(); setTouchActive(null);
      if (gameRef.current.phase === 'playing') setPaused(true);
    };
    const visibility = () => { if (document.hidden) release(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', release); document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', release); document.removeEventListener('visibilitychange', visibility);
    };
  }, [togglePause]);

  function startRun(nextMode = mode) {
    if (!getRhythm(nextMode, valuesRef.current.connection).valid) return;
    if (nextMode !== mode) { setMode(nextMode); valuesRef.current.mode = nextMode; }
    const next = createGame(); next.phase = 'playing'; gameRef.current = next;
    inputRef.current.clear(); setPaused(false); valuesRef.current.paused = false;
    setSnapshot(copySnapshot(next)); setAnnouncement(`${modeNames[nextMode]} run started. Collect seeds and return home.`);
    canvasRef.current?.focus({ preventScroll: true });
    if (sound) void audioRef.current?.resume();
  }
  function resetRoute() {
    gameRef.current = createGame(76); setSnapshot(copySnapshot(gameRef.current)); setPaused(false);
    inputRef.current.clear(); setTouchActive(null); setAnnouncement('Route ended. Choose a mode and start a new run.');
  }
  function openHelp() {
    inputRef.current.clear(); if (isPlaying) setPaused(true);
    dialogRef.current?.showModal();
  }
  function toggleSound() {
    if (!sound) {
      try { audioRef.current ??= new AudioContext(); void audioRef.current.resume(); } catch { return; }
    }
    setSound(value => !value);
  }
  const signalTitle = rhythm.practice ? `Practice: ${rhythm.rhythm}` : !rhythm.valid ?
    (rhythm.reason === 'connecting' ? 'Finding the wheel…' : 'Live signal paused') : `Squeektoshi is ${rhythm.rhythm}`;
  const overlayTitle = snapshot.phase === 'finished' ? (snapshot.score > 0 ? 'A little delivery, delivered.' : 'Every courier starts somewhere.') :
    waiting ? 'Waiting for the wheel.' : paused ? 'Take a little breather.' : 'The garden is calling.';
  const overlayDescription = snapshot.phase === 'finished' ? `${snapshot.score} seeds home. ${snapshot.cargo} still in your basket.` :
    waiting ? 'Your route and timer are safe. Live play resumes when fresh data returns.' : paused ? 'Your basket and the clock can wait.' :
    'Gather seeds. Dodge rocks. Bring it home.';

  return <>
    <a className="skip-link" href="#courier-game">Skip to game</a>
    <div className="site-wrap">
      <header className="site-header">
        <a className="brand" href="./" aria-label="Squeek Courier home"><HamsterMark/><span>Squeek Courier<span className="brand-note">A little game for Squeekchain</span></span></a>
        <nav className="header-tools" aria-label="Game utilities">
          <button className="utility sound-button" onClick={toggleSound} aria-pressed={sound} aria-label={`Sound ${sound ? 'on' : 'off'}`}><Icon name={sound ? 'sound' : 'muted'}/><span>Sound {sound ? 'on' : 'off'}</span></button>
          <button className="utility help-button" onClick={openHelp} aria-label="How to play"><Icon name="help"/><span>How to play</span></button>
        </nav>
      </header>
      <main id="courier-game">
        <section className="intro" aria-labelledby="page-title">
          <div><h1 id="page-title">Small paws. Big deliveries.</h1><p>A tiny seed delivery game, in rhythm with a real hamster.</p></div>
          <div className="free-note"><span className="tiny-sun" aria-hidden="true">✳</span><span>Free to play.<br/>Just for the joy of it.</span></div>
        </section>
        <div className="play-layout">
          <section className="game-section" aria-label="Courier game">
            <div className="game-toolbar">
              <label className="mode-field"><span>Play mode</span><select id="play-mode" aria-label="Play mode" value={mode} disabled={isPlaying} onChange={event => { resetRoute(); setMode(event.target.value as Mode); setAnnouncement(''); }}>
                <option value="live">Live hamster</option><option value="practice-rest">Practice · resting</option><option value="practice-run">Practice · running</option>
              </select></label>
              <span className={`connection-indicator ${rhythm.valid ? 'connected' : ''}`}><span className="status-dot"/>{rhythm.practice ? 'Practice mode' : rhythm.valid ? 'Live rhythm' : 'Awaiting signal'}</span>
            </div>
            <div className="game-surface">
              <div className="scoreboard">
                <div className="stat"><Icon name="home"/><span>Delivered<strong data-testid="score">{snapshot.score}</strong></span></div>
                <div className={`stat time-stat ${snapshot.time <= 10 && isPlaying ? 'time-low' : ''}`}><Icon name="clock"/><span>Time left<strong data-testid="timer">{snapshot.time}<small>s</small></strong></span></div>
                <div className="stat basket-stat"><Icon name="basket"/><span>Basket<strong data-testid="cargo">{snapshot.cargo}<small> / {CAPACITY}</small></strong></span><div className="basket-slots" aria-hidden="true">{Array.from({ length: CAPACITY }, (_, index) => <SeedIcon key={index} size={12} className={index < snapshot.cargo ? 'filled' : ''}/>)}</div></div>
                <button className="pause-button" disabled={!isPlaying} aria-label={paused ? 'Resume game' : 'Pause game'} onClick={togglePause}><Icon name={paused ? 'play' : 'pause'}/></button>
              </div>
              <div className="field-wrap">
                <canvas ref={canvasRef} width={WORLD.width * 2} height={WORLD.height * 2} tabIndex={0} aria-label="Sunflower garden. Move your hamster with arrow keys or W A S D. Collect up to five seeds and return to the central home." aria-describedby="game-instructions"/>
                {!showOverlay && <div className="garden-caption" aria-hidden="true"><Icon name="leaf" size={16}/><span>Sunflower garden</span></div>}
                {rhythm.practice && !showOverlay && <span className="practice-ribbon">Practice · {rhythm.rhythm}</span>}
                {showOverlay && <div className="scene-overlay">
                  <div className="start-panel">
                    <div className="panel-art" aria-hidden="true">{snapshot.phase === 'finished' ? <Icon name="home" size={30}/> : waiting ? <Icon name="refresh" size={30}/> : paused ? <Icon name="pause" size={30}/> : <SeedIcon size={32}/>}</div>
                    <h2>{overlayTitle}</h2><p>{overlayDescription}</p>
                    {snapshot.phase === 'finished' && <p className="result-mode">{modeNames[mode]} · {snapshot.deliveries} {snapshot.deliveries === 1 ? 'delivery' : 'deliveries'}</p>}
                    {(!isPlaying || paused) && !waiting && <button ref={startRef} className="primary-button" disabled={!rhythm.valid} onClick={() => isPlaying ? togglePause() : startRun()}>
                      {isPlaying ? 'Resume delivery' : snapshot.phase === 'finished' ? 'Play again' : rhythm.practice ? 'Start practice run' : 'Start delivering'}<Icon name={isPlaying ? 'play' : 'arrow'}/>
                    </button>}
                    {waiting && <button className="primary-button" disabled={retrying} onClick={() => fetchRef.current()}><Icon name="refresh"/>{retrying ? 'Checking signal…' : 'Retry live signal'}</button>}
                    {!rhythm.valid && !isPlaying && <button className="text-button" onClick={() => startRun('practice-rest')}>Try resting practice <Icon name="arrow" size={16}/></button>}
                    {isPlaying && (paused || waiting) && <button className="text-button" onClick={resetRoute}>End run and choose mode</button>}
                    {!isPlaying && snapshot.phase !== 'finished' && <span className="start-note">{rhythm.practice ? 'Simulated rhythm · separate practice best' : rhythm.valid ? '60 seconds · carry up to 5 seeds' : 'Waiting for fresh live telemetry'}</span>}
                  </div>
                </div>}
              </div>
              <div className="game-bottom">
                <p className="keyboard-hint"><kbd>W A S D</kbd><span>or</span><kbd>↑ ↓ ← →</kbd><span>to move</span><span className="pause-hint">· <kbd>Space</kbd> to pause</span></p>
                <span className="device-best">{rhythm.practice ? 'Practice best' : 'Live best'} <SeedIcon size={15}/><strong>{records[mode]}</strong></span>
              </div>
            </div>
            <div className="touch-controls" aria-label="Touch movement controls">
              <div className="touch-note"><Icon name="basket" size={24}/><span>Hold a direction<br/>to move your courier.</span></div>
              <div className="dpad">{(['up','left','down','right'] as const).map(direction => <button key={direction} className={`direction direction-${direction} ${touchActive === direction ? 'is-held' : ''}`} aria-label={`Move ${direction}`} disabled={!isPlaying || paused || waiting}
                onPointerDown={event => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); inputRef.current.add(direction); setTouchActive(direction); }}
                onPointerUp={() => { inputRef.current.delete(direction); setTouchActive(null); }}
                onPointerCancel={() => { inputRef.current.delete(direction); setTouchActive(null); }}
                onLostPointerCapture={() => { inputRef.current.delete(direction); setTouchActive(null); }}
                onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); inputRef.current.add(direction); setTouchActive(direction); } }}
                onKeyUp={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); inputRef.current.delete(direction); setTouchActive(null); } }}
                onBlur={() => { inputRef.current.delete(direction); setTouchActive(null); }}><Icon name="arrow"/></button>)}</div>
            </div>
            <div className="route-feedback" role="status" aria-live="polite">{announcement || (rhythm.practice ? 'Practice uses a simulated rhythm. Your live best stays separate.' : 'A little route. A basket of seeds. One minute on the clock.')}</div>
          </section>
          <aside className="rhythm-panel" aria-labelledby="rhythm-title">
            <div className="rhythm-heading"><h2 id="rhythm-title">{rhythm.practice ? 'Practice rhythm' : 'Powered by tiny paws'}</h2><Icon name="leaf"/></div>
            <Wheel running={rhythm.rhythm === 'running' && rhythm.valid && !paused} practice={rhythm.practice}/>
            <div className="hamster-status"><span className={`status-dot ${rhythm.valid ? 'good' : ''}`}/><h3>{signalTitle}</h3></div>
            <p className="rhythm-description">{rhythm.practice ? 'A simulated hamster sets this route’s pace. No live data is used for gameplay.' : !rhythm.valid ? 'Live play waits for fresh telemetry. Try practice while the wheel reconnects.' : rhythm.rhythm === 'running' ? 'The wheel is turning. Your courier is quicker, and the rocks are on the move.' : 'A well-earned rest. Your courier takes it slow, and the rocks stay still.'}</p>
            <div className="telemetry-readings"><div><span>{rhythm.practice ? 'Courier pace' : 'Wheel speed'}</span><strong>{rhythm.practice ? (rhythm.rhythm === 'running' ? 'Express' : 'Easy') : rhythm.rpm === null ? 'Unavailable' : <>{rhythm.rpm.toFixed(1)} <small>rpm</small></>}</strong></div><div><span>{rhythm.practice ? 'Rhythm source' : 'Last observed'}</span><strong>{rhythm.practice ? 'Simulation' : rhythm.valid && rhythm.ageSeconds !== null ? `${rhythm.ageSeconds}s ago` : 'Awaiting data'}</strong></div></div>
            <div className="signal-note"><Icon name={rhythm.valid ? 'check' : 'refresh'} size={16}/><span>{rhythm.practice ? 'Practice runs work offline.' : rhythm.valid ? 'Live from the Squeekchain wheel.' : 'Timer pauses until the signal returns.'}</span></div>
            {!rhythm.practice && <button className="text-button retry-button" onClick={() => fetchRef.current()} disabled={retrying}><Icon name="refresh" size={16}/>{retrying ? 'Checking signal…' : 'Refresh live signal'}</button>}
            <div className="rhythm-footer"><span className="mini-seed"><SeedIcon size={16}/></span><p>Real hamster. Real breaks.<br/>A little fun in between.</p></div>
          </aside>
        </div>
        <section className="how-it-works" id="game-instructions" aria-label="How deliveries work">
          <article><span className="instruction-icon"><SeedIcon size={28}/></span><div><h2>Gather a little goodness.</h2><p>Drive over sunflower seeds. Your basket holds five, so make every trip count.</p></div></article>
          <article><span className="instruction-icon"><svg width="32" height="32" viewBox="0 0 40 40" aria-hidden="true"><path d="m4 29 5-18 11-6 13 9 4 15-17 6Z" fill="#9ba18c"/><path d="m9 11 11-6 13 9-14 5Z" fill="#bdc1ab"/></svg></span><div><h2>Mind the rocky bits.</h2><p>A bump drops one seed and briefly slows you. Running hamster? Rocks move, too.</p></div></article>
          <article><span className="instruction-icon"><Icon name="home" size={28}/></span><div><h2>Home is where you score.</h2><p>Return to the house to deliver. Only seeds brought home before time runs out count.</p></div></article>
        </section>
      </main>
      <footer><div className="site-footer"><span><HamsterMark size={24}/>Made for the small joys.</span><p>Free fan game. No wallet, payments, or token rewards.</p><a href="https://squeekchain.com/" target="_blank" rel="noreferrer">Meet Squeekchain <Icon name="external" size={16}/></a></div>
      <p className="storage-note">{storageAvailable ? 'Best scores are saved only in this browser. Practice modes have separate records.' : 'Browser storage is unavailable. Best scores last for this visit only.'} <a href={STATUS_URL} target="_blank" rel="noreferrer">Telemetry source<Icon name="external" size={14}/></a></p></footer>
    </div>
    <dialog ref={dialogRef} className="help-dialog" aria-labelledby="help-title" onClick={event => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}>
      <div className="dialog-top"><h2 id="help-title">A courier’s field guide</h2><button className="utility icon-button" aria-label="Close how to play" onClick={() => dialogRef.current?.close()}><Icon name="close"/></button></div>
      <p>Bring as many sunflower seeds home as you can in {DURATION} seconds.</p>
      <ol><li><strong>Collect.</strong> Move over seeds to pick them up. Carry up to five.</li><li><strong>Deliver.</strong> Return to the house in the center to bank your basket.</li><li><strong>Dodge.</strong> Rocks drop one carried seed and briefly slow you.</li></ol>
      <h3>Follow the real wheel</h3><p>When Squeektoshi runs, you move faster and rocks move. When he rests, you slow down and rocks stop. If live telemetry fails or is stale, your courier and timer wait for fresh data.</p>
      <h3>Make yourself comfortable</h3><p>Use arrow keys or W A S D. On touchscreens, hold the direction buttons below the garden. Press Space or Escape to pause, or use the pause button.</p>
      <p>Practice · resting and Practice · running simulate each rhythm, work offline, and keep separate best scores. You can change mode between runs.</p>
      <button className="primary-button" onClick={() => dialogRef.current?.close()}>Back to the garden<Icon name="arrow"/></button>
    </dialog>
  </>;
}
