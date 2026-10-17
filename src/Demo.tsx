import { useEffect, useRef, useState } from "react";
import type { GameState, Run } from "../shared/contracts";
import { duration, projectReplay } from "../shared/demo";
import { downloadFile } from "./download";

export function usePlayback(saved: Run | null) {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [generation, setGeneration] = useState(0);
  const total = saved ? duration(saved) : 1;
  useEffect(() => {
    if (saved) {
      setElapsed(0);
      setPlaying(true);
      setGeneration((n) => n + 1);
    }
  }, [saved]);
  useEffect(() => {
    if (!saved || !playing) return;
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const delta = (now - last) * speed;
      last = now;
      setElapsed((t) => Math.min(total, t + delta));
    }, 100);
    return () => clearInterval(timer);
  }, [saved, playing, speed, total]);
  function seek(value: number) {
    setElapsed(value);
    setGeneration((n) => n + 1);
  }
  return {
    frame: saved ? projectReplay(saved, elapsed) : null,
    elapsed,
    total,
    playing: playing && elapsed < total,
    speed,
    generation,
    toggle: () => {
      if (elapsed >= total) seek(0);
      setPlaying((p) => elapsed >= total || !p);
    },
    seek,
    setSpeed,
  };
}
type Playback = ReturnType<typeof usePlayback>;
const seconds = (n: number) =>
  `${Math.floor(n / 60000)}:${String(Math.floor(n / 1000) % 60).padStart(2, "0")}`;
export function ReplayBar({ saved, playback, close }: { saved: Run; playback: Playback; close: () => void }) {
  return (
    <section className="replay-bar" aria-label="Replay controls">
      <div>
        <span className="eyebrow">REPLAY OF A VERIFIED RUN</span>
        <strong>{new Date(saved.startedAt).toLocaleString()}</strong>
        <small>Saved events & artifacts · no browser video recorded</small>
      </div>
      <div className="playback-controls">
        <button className="secondary small" type="button" onClick={playback.toggle}>
          {playback.playing ? "Pause" : "Play"}
        </button>
        <button className="text-button" type="button" onClick={() => playback.seek(0)}>
          Restart
        </button>
        <label className="sr-only" htmlFor="replay-position">
          Replay position
        </label>
        <input
          id="replay-position"
          type="range"
          min="0"
          max={playback.total}
          value={playback.elapsed}
          onChange={(e) => playback.seek(Number(e.target.value))}
        />
        <span>
          {seconds(playback.elapsed)} / {seconds(playback.total)}
        </span>
        <select
          aria-label="Replay speed"
          value={playback.speed}
          onChange={(e) => playback.setSpeed(Number(e.target.value))}
        >
          <option value="1">1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
        <button type="button" className="secondary small" onClick={close}>
          Back to live world
        </button>
      </div>
    </section>
  );
}
export function ReplayPicker({
  state,
  disabled,
  choose,
}: {
  state: GameState;
  disabled: boolean;
  choose: (id: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const entries = state.journal
    .filter((e) => e.source === "pine" && e.outcome === "succeeded" && e.receiptHash)
    .slice(-8)
    .reverse();
  return (
    <>
      <button
        type="button"
        className="text-button"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
      >
        Replay a journey ↺
      </button>
      <dialog ref={dialog} className="help-card replay-picker" aria-labelledby="replay-title">
        <span className="eyebrow">THE JOURNEYS WE CAN PROVE</span>
        <h2 id="replay-title">A story worth keeping.</h2>
        <p>
          Replay saved events and verified exports. This does not start a computer or play recorded browser
          video.
        </p>
        {!entries.length && <p>Finish a verified Pine journey to save your first replay.</p>}
        <div className="replay-list">
          {entries.map((e) => (
            <button
              className="replay-choice"
              type="button"
              key={e.runId}
              onClick={() => {
                dialog.current?.close();
                void choose(e.runId);
              }}
            >
              <span>
                <strong>{e.level.title}</strong>
                <small>
                  {new Date(e.at).toLocaleString()} ·{" "}
                  {e.rejections ? `${e.rejections} returned export(s)` : "Verified first export"}
                </small>
              </span>
              <span>↗</span>
            </button>
          ))}
        </div>
        <button type="button" className="secondary" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </dialog>
    </>
  );
}
export function ChangeOrder({
  run,
  pending,
  act,
  replay = false,
}: {
  run: Run;
  pending: boolean;
  act: (path: string, data: unknown) => Promise<boolean>;
  replay?: boolean;
}) {
  const inventory = run.level?.depot?.inventory;
  const [selected, setSelected] = useState("blanket");
  if (!inventory) return null;
  const options = Object.entries(inventory).filter(([, count]) => count >= 1);
  const sku = options.some(([name]) => name === selected) ? selected : options[0]?.[0];
  const quantity = sku ? Math.min(2, inventory[sku as keyof typeof inventory]) : 0;
  const change = run.changeOrder;
  const active = ["preparing", "working", "verifying"].includes(run.status);
  if (!change && (!active || run.attempts.length || replay)) return null;
  return (
    <section className={`change-order ${change?.appliedAt ? "applied" : ""}`} aria-label="Change order">
      <div className="change-title">
        <span>✦</span>
        <span className="eyebrow">
          {change
            ? change.appliedAt
              ? "THE WORLD CHANGED"
              : "A TWIST, WAITING AT INSPECTION"
            : "GIVE THE STORY A TWIST"}
        </span>
      </div>
      {change ? (
        <>
          <strong>
            {change.quantity}{" "}
            {change.sku === "tea" ? "tea packs" : `${change.sku}${change.quantity === 1 ? "" : "s"}`} damaged
            {change.appliedAt ? "." : " at inspection."}
          </strong>
          <p>
            {change.appliedAt
              ? `Stock changed from ${change.before} to ${change.after}. ${run.status === "succeeded" ? "Pip’s revised file passed every check." : run.status === "failed" ? "The repair did not pass. No parcels were delivered." : run.status === "canceled" ? "The journey was canceled. No parcels were delivered." : "The original file must pass the new stock checks. Pip gets one repair attempt."}`
              : "Queued by you. When the first export arrives, stock changes before the file is checked."}
          </p>
        </>
      ) : (
        <>
          <p>Let Pip prepare the shipment. Then change what’s available when his file reaches inspection.</p>
          <div className="change-controls">
            <select
              aria-label="Item damaged at inspection"
              value={sku ?? ""}
              onChange={(e) => setSelected(e.target.value)}
            >
              {options.map(([name]) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="secondary small"
              disabled={pending || !sku}
              onClick={() => void act("/api/change-order", { runId: run.id, sku, quantity })}
            >
              Damage {quantity} at inspection ↗
            </button>
          </div>
        </>
      )}
    </section>
  );
}
export function ArtifactHandoff({ run }: { run: Run }) {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const latest = run.attempts.at(-1);
  const inspected = selected === null ? null : run.attempts.find((a) => a.number === selected);
  if (!latest) return null;
  const status = latest.accepted === true ? "accepted" : latest.accepted === false ? "returned" : "checking";
  return (
    <section className={`artifact-handoff ${status}`} aria-label="Real artifact handoff">
      <div className="handoff-heading">
        <span className="eyebrow">ONE REAL FILE CROSSES THE BOUNDARY</span>
        <span>EXPORT {String(latest.number).padStart(2, "0")}</span>
      </div>
      <div className="handoff-route" aria-hidden="true">
        <span>
          ▣<small>Pip’s computer</small>
        </span>
        <i />
        <span className="inspection-stamp">
          {status === "accepted" ? "✓" : status === "returned" ? "↶" : "⋯"}
          <small>Independent check</small>
        </span>
        <i />
        <span>
          ⌂<small>Little Light</small>
        </span>
        <div key={`${latest.number}-${status}`} className={`traveling-envelope ${status}`}>
          ✉
        </div>
      </div>
      <output className="handoff-verdict">
        <strong>
          {status === "accepted"
            ? "Checked. Accepted. Coming home."
            : status === "returned"
              ? "Returned to Pip. The world stays unchanged."
              : "File received. Checking the actual contents."}
        </strong>
        <small>
          {latest.bytes} bytes · SHA-256 {latest.sha256.slice(0, 12)}
        </small>
      </output>
      <div className="attempt-links">
        {run.attempts.map((a) => (
          <button
            key={a.number}
            className="text-button"
            type="button"
            onClick={() => {
              setSelected(a.number);
              dialog.current?.showModal();
            }}
          >
            Open export {a.number} ·{" "}
            {a.accepted === true ? "accepted ✓" : a.accepted === false ? "returned ↶" : "checking"}
          </button>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="help-card artifact-dialog"
        aria-labelledby="artifact-title"
        onClose={() => setSelected(null)}
      >
        <span className="eyebrow">ACTUAL DOWNLOADED FILE</span>
        <h2 id="artifact-title">
          Export {inspected?.number} ·{" "}
          {inspected?.accepted ? "Accepted" : inspected?.accepted === false ? "Returned" : "Checking"}
        </h2>
        <p>{inspected?.reason}</p>
        <code className="hash">{inspected?.sha256}</code>
        <pre>{inspected?.text}</pre>
        <div className="artifact-dialog-actions">
          <button className="secondary" type="button" onClick={() => dialog.current?.close()}>
            Close
          </button>
          <button
            className="text-button"
            type="button"
            disabled={!inspected}
            onClick={() =>
              inspected && downloadFile(`export-${run.id}-${inspected.number}.json`, inspected.text)
            }
          >
            Download exact file ↓
          </button>
        </div>
      </dialog>
    </section>
  );
}
export function RecordedDesk({ run }: { run: Run }) {
  const event = run.events.at(-1);
  return (
    <div className="recorded-desk">
      <span className="eyebrow">SAVED EVENT TIMELINE · REPLAY</span>
      <div className="recorded-symbol">
        ▣<span>↺</span>
      </div>
      <p>{event?.text ?? "The recorded journey is about to begin."}</p>
      <small>Original browser video was not recorded. Events and exported files were retained.</small>
    </div>
  );
}
