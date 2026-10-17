import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "../shared/contracts";
import { type Cell, defaultScene, key, type Scene } from "../shared/domain";
import { action, importArtifact, readState } from "./api";
import { CampaignBar, Director, Journal, NextChapter } from "./Campaign";
import { DepotWorld } from "./DepotWorld";
import { Pip, World } from "./World";

const Desktop = lazy(() => import("./Desktop"));
const isRunning = (state: GameState | null) =>
  !!state?.run && ["preparing", "working", "verifying"].includes(state.run.status);
const stageLabels = ["Leave the world", "Make something real", "Bring it home"];
export function App() {
  const [state, setState] = useState<GameState | null>(null);
  const [draft, setDraft] = useState<Scene>(defaultScene());
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [arrived, setArrived] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showJournal, setShowJournal] = useState(false);
  const generation = useRef(0);
  const mutating = useRef(false);
  const [wide, setWide] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const helpDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (showHelp) helpDialog.current?.showModal();
    else helpDialog.current?.close();
  }, [showHelp]);
  const arrive = useCallback(() => setArrived(true), []);
  useEffect(() => {
    let alive = true;
    let inFlight = false;
    async function poll() {
      if (inFlight || mutating.current) return;
      const observedGeneration = generation.current;
      inFlight = true;
      try {
        const next = await readState();
        if (alive && generation.current === observedGeneration) {
          setState(next);
          setConnectionError("");
        }
      } catch {
        if (alive)
          setConnectionError(
            "The local game server is unreachable. Start it with npm start, then this page will reconnect.",
          );
      } finally {
        inFlight = false;
      }
    }
    void poll();
    const timer = setInterval(() => void poll(), 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  async function act(path: string, data: unknown) {
    generation.current++;
    mutating.current = true;
    setPending(true);
    setError("");
    try {
      const next = await action(path, data);
      setState(next);
      if (
        path === "/api/campaign" &&
        !(typeof data === "object" && data && "action" in data && data.action === "memory")
      ) {
        setEditing(false);
        setArrived(false);
        setShowReceipt(false);
      }
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      mutating.current = false;
      generation.current++;
      setPending(false);
    }
  }
  const scene = editing ? draft : state?.scene || defaultScene();
  const run = state?.run || null;
  const depot = state?.campaign.level.mission === "depot";
  const running = isRunning(state);
  const cleanupPending = run?.cleanup === "pending" && !running;
  const disabled = pending || running || !!cleanupPending || !state;
  const successful = run?.status === "succeeded";
  const arrivedHome = arrived && successful && !editing;
  const stage = successful ? 2 : run?.status === "working" || run?.status === "verifying" ? 1 : 0;
  async function start(mode: "pine" | "manual") {
    setArrived(false);
    setShowReceipt(false);
    await act("/api/run", { mode });
  }
  async function applyChallenge() {
    if (await act("/api/challenge", { rocks: draft.rocks, color: draft.color, inkBudget: draft.inkBudget })) {
      setEditing(false);
      setArrived(false);
    }
  }
  function toggleRock(cell: Cell) {
    setDraft((current) => ({
      ...current,
      rocks: current.rocks.some((c) => key(c) === key(cell))
        ? current.rocks.filter((c) => key(c) !== key(cell))
        : current.rocks.length < 14
          ? [...current.rocks, cell]
          : current.rocks,
    }));
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 16_384) {
      setError("Choose the small JSON blueprint downloaded by the workshop.");
      return;
    }
    generation.current++;
    mutating.current = true;
    setPending(true);
    setError("");
    try {
      setState(await importArtifact(file));
    } catch (error) {
      setError(error instanceof Error ? error.message : "The file could not be imported. Please retry.");
    } finally {
      mutating.current = false;
      generation.current++;
      setPending(false);
    }
    if (importInput.current) importInput.current.value = "";
  }
  const latestEvent = run?.events.at(-1);
  return (
    <div className={`app-shell ${wide ? "theater" : ""} ${run ? "has-run" : ""}`}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="NPC.exe home">
          <span className="brand-mark">
            n<span>•</span>
          </span>
          <strong>
            NPC<span>.exe</span>
          </strong>
          <span className="brand-divider" />
          <span className="edition">THE LITTLE LIGHT CHRONICLES</span>
        </a>
        <nav aria-label="Game controls">
          <span className="connection-pill">
            <i className={state?.ready.pine && state.ready.workshop ? "connected" : ""} />
            {state?.ready.pine && state.ready.workshop ? "Pine connected" : "Local world"}
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label={wide ? "Exit theater mode" : "Theater mode"}
            title="Theater mode"
            onClick={() => setWide(!wide)}
          >
            ⛶
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="How this works"
            onClick={() => setShowHelp(!showHelp)}
          >
            ?
          </button>
        </nav>
      </header>
      {state && (
        <CampaignBar state={state} disabled={disabled} act={act} openJournal={() => setShowJournal(true)} />
      )}
      <main className="game-layout">
        <section className="world-panel" aria-label="Pip’s world">
          <div className="chapter">
            <span className="eyebrow">
              {depot ? "LITTLE LIGHT / THE EVENING POST" : "A SMALL WORLD. A GROWING POSSIBILITY."}
            </span>
            <h1>
              {arrivedHome
                ? depot
                  ? "A town a little brighter."
                  : "A little more possible."
                : depot
                  ? "Every window\nis waiting for him."
                  : "He wasn’t programmed\nto get home."}
            </h1>
            <p>
              {arrivedHome
                ? "One real file. One lesson to carry forward."
                : depot
                  ? "A stack of orders. A little stock. A real computer."
                  : "So you gave him a computer. And a way to remember."}
            </p>
          </div>
          <div className="world-topline">
            <span className="world-live">
              <i />
              {state?.campaign.level.title.toUpperCase() ?? "WORLD 001"}
            </span>
            <span>REV {String(scene.revision).padStart(2, "0")}</span>
          </div>
          {depot && state ? (
            <DepotWorld
              key={run?.id || state.campaign.level.id}
              level={state.campaign.level}
              run={run}
              onArrive={arrive}
            />
          ) : (
            <World
              key={run?.id || "waiting"}
              scene={scene}
              run={run}
              editing={editing}
              onRock={toggleRock}
              onArrive={arrive}
            />
          )}
          <div className="world-bottom">
            <div className="character-card">
              <Pip small />
              <div>
                <strong>
                  Pip <span>THE COURIER</span>
                </strong>
                <p>
                  {editing
                    ? "“You decide what gets in the way.”"
                    : arrivedHome
                      ? depot
                        ? "“Every parcel mattered. Even the ones that had to wait.”"
                        : "“I’ll remember how I found my way.”"
                      : running
                        ? depot
                          ? "“Count once. Check the stock. Don’t leave anyone out.”"
                          : "“If I can draw it there… maybe I can use it here.”"
                        : depot
                          ? "“They’re counting on the evening post.”"
                          : "“There’s no bridge in my list of moves.”"}
                </p>
              </div>
            </div>
            <div className="world-stats">
              <span>
                <b>{depot ? state?.campaign.level.depot?.orders.length : scene.rocks.length}</b>{" "}
                {depot ? "order rows" : "rocks"}
              </span>
              <span>
                <b>{depot ? state?.campaign.level.tier : (scene.inkBudget ?? 12)}</b>{" "}
                {depot ? "difficulty" : "tiles of ink"}
              </span>
            </div>
          </div>
          {!depot && (
            <div className="challenge-bar">
              {editing ? (
                <>
                  <span>{draft.rocks.length} / 14 rocks · Keep a route possible</span>
                  <fieldset className="color-picker" aria-label="Bridge color">
                    {(["amber", "mint", "rose"] as const).map((color) => (
                      <button
                        type="button"
                        key={color}
                        className={`swatch ${color} ${draft.color === color ? "selected" : ""}`}
                        aria-label={`${color} bridge`}
                        aria-pressed={draft.color === color}
                        onClick={() => setDraft({ ...draft, color })}
                      />
                    ))}
                  </fieldset>
                  <button
                    type="button"
                    className="text-button"
                    disabled={pending}
                    onClick={() => setEditing(false)}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    className="small-primary"
                    disabled={pending}
                    onClick={() => void applyChallenge()}
                  >
                    Save world
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <span className="tiny-symbol">✦</span>
                    <span>
                      {successful
                        ? "Now change the problem. Let him try again."
                        : "The world is yours to change."}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="secondary small"
                    disabled={disabled}
                    onClick={() => {
                      setDraft(state?.scene || defaultScene());
                      setEditing(true);
                    }}
                  >
                    Place a rock <span>↗</span>
                  </button>
                </>
              )}
            </div>
          )}
        </section>
        <aside className="journey-panel">
          <div className="journey-heading">
            <div>
              <span className="eyebrow">BEYOND THE SCRIPT</span>
              <h2>
                {arrivedHome
                  ? "He has a story to keep."
                  : depot
                    ? "The evening shift begins."
                    : "Give him a way out."}
              </h2>
            </div>
            <span className="journey-number">01—03</span>
          </div>
          {state && (
            <Director key={run?.id ?? "settings"} state={state} disabled={disabled || editing} act={act} />
          )}
          <p className="journey-intro">
            A character leaves his game, uses real software, and brings back something his world can use.
          </p>
          <ol className="stages">
            {stageLabels.map((label, i) => (
              <li
                className={`${run && stage >= i ? "current" : ""} ${successful || stage > i ? "done" : ""}`}
                key={label}
              >
                <span>{successful || stage > i ? "✓" : `0${i + 1}`}</span>
                <div>
                  <strong>{label}</strong>
                  <small>
                    {
                      [
                        "A real Pine computer, just for Pip.",
                        depot
                          ? "Reconcile orders in a real dispatch app."
                          : "Draw a bridge in a browser workshop.",
                        depot
                          ? "Verify the manifest. Deliver the parcels."
                          : "Verify the file. Walk on the result.",
                      ][i]
                    }
                  </small>
                </div>
              </li>
            ))}
          </ol>
          {!run && !editing && (
            <div className="launch-block">
              <div className="permission-note">
                <span>↗</span>
                <p>
                  {depot
                    ? "You’re giving Pip a dispatch desk and a town to serve."
                    : "You’re giving Pip a blank workshop and one goal."}
                  <br />
                  <strong>
                    {depot ? "The accounting is his to figure out." : "The route is his to figure out."}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                className="primary launch"
                disabled={disabled || !state?.ready.pine || !state.ready.workshop}
                onClick={() => void start("pine")}
              >
                Give Pip a computer <span>↗</span>
              </button>
              {state && (!state.ready.pine || !state.ready.workshop) && (
                <p className="setup-note">
                  {!state.ready.pine ? "Add your Pine key to .env. " : ""}
                  {!state.ready.workshop ? "Run npm run tunnel to connect the workshop." : ""}
                </p>
              )}
              <button
                type="button"
                className="manual-link"
                disabled={disabled}
                onClick={() => void start("manual")}
              >
                Try the workshop yourself <span>Manual rehearsal · no AI credits</span>
              </button>
            </div>
          )}
          {editing && (
            <div className="edit-note">
              <span>✦</span>
              <h3>A twist in the story.</h3>
              <p>
                Place rocks on the water. Choose a bridge color. Pip will receive this exact world when you
                send him out.
              </p>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setDraft({
                    ...draft,
                    rocks: [
                      { x: 5, y: 4 },
                      { x: 6, y: 4 },
                      { x: 7, y: 3 },
                    ],
                  })
                }
              >
                Try a storm in the middle
              </button>
              <button
                type="button"
                className="text-button reset-world"
                onClick={() => setDraft({ ...defaultScene(), revision: draft.revision })}
              >
                Reset to the original world
              </button>
            </div>
          )}
          {run && !editing && (
            <div className="run-details">
              <div className="run-status">
                <span className={`status-dot ${running ? "pulsing" : ""}`} />
                <strong>
                  {run.mode === "manual" && running
                    ? "Manual workshop is open"
                    : {
                        preparing: "Opening Pip’s computer",
                        working: "Pip is in the workshop",
                        verifying: "Checking the real file",
                        succeeded: arrivedHome
                          ? "Delivery complete"
                          : depot
                            ? "The evening post is on its way"
                            : "A bridge enters the world",
                        failed: "The journey needs another try",
                        canceled: "Paused at the shore",
                      }[run.status]}
                </strong>
                <span className="mode-badge">{run.mode === "pine" ? "LIVE PINE" : "MANUAL"}</span>
              </div>
              {run.desktopReady && (
                <Suspense fallback={<p>Opening live screen…</p>}>
                  <Desktop />
                </Suspense>
              )}
              {run.mode === "manual" && running && (
                <>
                  <iframe className="manual-workshop" title="Manual bridge workshop" src={run.workshopUrl} />
                  <div className="manual-import">
                    <label className="primary file-button" htmlFor="blueprint-file">
                      Import file <span>↑</span>
                    </label>
                    <input
                      ref={importInput}
                      id="blueprint-file"
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => void importFile(e.target.files?.[0])}
                    />
                    <a href={run.workshopUrl} target="_blank" rel="noreferrer" className="text-button">
                      Open full workshop ↗
                    </a>
                  </div>
                </>
              )}
              {run.status === "preparing" && (
                <div className="opening-computer">
                  <div className="computer-illustration">
                    <span>▧</span>
                    <i />
                  </div>
                  <p>A real browser is waking up.</p>
                  <small>This can take a moment. No progress is being simulated.</small>
                </div>
              )}
              {run.error && (
                <p className="error-box" role="alert">
                  {run.error}
                </p>
              )}
              {successful && (
                <div className="success-card">
                  <div className="verified-seal">✓</div>
                  <div>
                    <span className="eyebrow">FILE VERIFIED • WORLD UPDATED</span>
                    <h3>
                      {depot
                        ? `${run.manifest?.entries.reduce((sum, row) => sum + row.ship, 0)} parcels. A brighter evening.`
                        : `${run.blueprint?.cells.length} tiles. A way home.`}
                    </h3>
                    <p>
                      {run.mode === "pine"
                        ? "Built by Pip in a real browser."
                        : "Built by you in the manual workshop."}
                      <br />
                      Every step is backed by the exported file.
                    </p>
                  </div>
                  <button type="button" className="text-button" onClick={() => setShowReceipt(!showReceipt)}>
                    {showReceipt ? "Hide" : "Inspect"} the proof {showReceipt ? "−" : "+"}
                  </button>
                </div>
              )}
              {showReceipt && run.receipt && (
                <div className="receipt">
                  <div className="receipt-title">
                    ARTIFACT RECEIPT <span>✓ VERIFIED</span>
                  </div>
                  <ul>
                    {run.receipt.checks.map((check) => (
                      <li key={check}>
                        <span>✓</span>
                        {check}
                      </li>
                    ))}
                  </ul>
                  <dl>
                    <dt>Source</dt>
                    <dd>{run.receipt.source === "pine" ? "Pine artifact download" : "Manual file import"}</dd>
                    <dt>File size</dt>
                    <dd>{run.receipt.bytes} bytes</dd>
                    <dt>SHA-256</dt>
                    <dd className="hash">{run.receipt.sha256}</dd>
                  </dl>
                  <a href="/api/receipt" download className="text-button">
                    Download receipt + artifact ↓
                  </a>
                </div>
              )}
              <details className="activity" open={running && run.mode === "pine"}>
                <summary>
                  <span>Activity log</span>
                  <span>{run.events.length} events</span>
                </summary>
                <ol>
                  {run.events.map((event, i) => (
                    <li key={`${event.at}-${i}`}>
                      <span className="event-source">
                        {event.source === "pine" ? "PINE" : event.source === "verifier" ? "CHECK" : "WORLD"}
                      </span>
                      <p>{event.text}</p>
                    </li>
                  ))}
                </ol>
              </details>
              <output className="sr-only" aria-live="polite">
                {latestEvent?.text}
              </output>
              {state && <NextChapter state={state} disabled={disabled} act={act} />}
              {running ? (
                <button
                  type="button"
                  className="text-button cancel-button"
                  disabled={pending}
                  onClick={() => void act("/api/cancel", {})}
                >
                  Cancel journey
                </button>
              ) : (
                <div className="retry-actions">
                  <button
                    type="button"
                    className="primary"
                    disabled={disabled || !state?.ready.pine || !state.ready.workshop}
                    onClick={() => void start("pine")}
                  >
                    {successful ? "Send Pip again" : "Try again with Pine"} <span>↗</span>
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={disabled}
                    onClick={() => void start("manual")}
                  >
                    Manual workshop
                  </button>
                  {cleanupPending && <small>Releasing the previous computer…</small>}
                </div>
              )}
            </div>
          )}
          {(error || connectionError || state?.journalError) && (
            <p className="error-box" role="alert">
              {error || connectionError || state?.journalError}
            </p>
          )}
          <div className="honesty-note">
            <span>THE STORY IS AUTHORED. THE WORK IS REAL.</span>
            <p>
              The Director selects challenges. Pip operates the software. Independent checks decide what
              enters the world. Notes persist; model weights stay unchanged.
            </p>
          </div>
        </aside>
      </main>
      <footer className="app-footer">
        <span>
          NPC.exe <span className="footer-dot">•</span> An experiment in characters with agency
        </span>
        <span>
          MADE WITH PINE COMPUTER <span>↗</span>
        </span>
      </footer>
      {state && <Journal state={state} open={showJournal} onClose={() => setShowJournal(false)} />}
      <dialog
        ref={helpDialog}
        onCancel={() => setShowHelp(false)}
        aria-labelledby="help-title"
        className="help-card"
      >
        <button
          type="button"
          className="icon-button close-help"
          aria-label="Close instructions"
          onClick={() => setShowHelp(false)}
        >
          ×
        </button>
        <span className="eyebrow">THE DEMO, IN THREE MINUTES</span>
        <h2 id="help-title">A game that reaches outside itself.</h2>
        <p>
          Choose a seed, send Pip into a real browser, and watch a verified file change his world. His
          successful field notes persist between journeys. The Director uses results to choose the next
          challenge.
        </p>
        <ol>
          <li>Send Pip into the workshop. Watch the live view and activity.</li>
          <li>Open the proof after he crosses. It contains the real artifact’s fingerprint.</li>
          <li>
            Let the Director choose, or visit the delivery depot. Open the journal to inspect lessons and
            compare the same level with and without memory.
          </li>
        </ol>
        <p>
          Manual rehearsal lets you draw and import the file yourself. It is always labeled. The depot uses
          synthetic orders and inventory. This is a reproducible test environment for computer-using agents,
          not a production logistics service.
        </p>
        <button type="button" className="primary" onClick={() => setShowHelp(false)}>
          Back to Pip
        </button>
      </dialog>
    </div>
  );
}
