import { useEffect, useRef, useState } from "react";
import { chooseNext, type JournalEntry, type Mission } from "../shared/campaign";
import type { GameState } from "../shared/contracts";
import { downloadFile } from "./download";

type Act = (path: string, data: unknown) => Promise<boolean>;
export function CampaignBar({
  state,
  disabled,
  act,
  openJournal,
}: {
  state: GameState;
  disabled: boolean;
  act: Act;
  openJournal: () => void;
}) {
  const [seed, setSeed] = useState(state.campaign.level.seed);
  const level = state.campaign.level;
  useEffect(() => {
    setSeed(level.seed);
  }, [level.seed]);
  return (
    <section className="campaign-bar" aria-label="Campaign controls">
      <div className="campaign-location">
        <span className="compass-mark">✧</span>
        <div>
          <span className="eyebrow">THE LITTLE LIGHT CHRONICLES</span>
          <strong>
            Chapter {String(level.episode).padStart(2, "0")} <span>/</span>{" "}
            {level.mission === "bridge" ? "The crossing" : "The evening post"}
          </strong>
        </div>
      </div>
      <form
        className="seed-form"
        onSubmit={(e) => {
          e.preventDefault();
          void act("/api/campaign", { action: "new", seed, mission: level.mission, tier: level.tier });
        }}
      >
        <label htmlFor="world-seed">WORLD SEED</label>
        <input
          id="world-seed"
          aria-label="World seed"
          value={seed}
          maxLength={40}
          pattern="[a-zA-Z0-9_-]+"
          required
          onChange={(e) => setSeed(e.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled} title="Generate a repeatable world">
          ↻ <span className="sr-only">Generate world</span>
        </button>
      </form>
      <button type="button" className="journal-button" onClick={openJournal}>
        ▤ Pip’s journal{" "}
        <span>{state.journal.filter((e) => e.source === "pine" && e.outcome === "succeeded").length}</span>
      </button>
    </section>
  );
}
export function Director({ state, disabled, act }: { state: GameState; disabled: boolean; act: Act }) {
  const level = state.campaign.level;
  const next = chooseNext(level, state.journal);
  return (
    <section className="director-card" aria-label="The Director">
      <div className="director-heading">
        <span className="director-eye">◈</span>
        <div>
          <span className="eyebrow">THE DIRECTOR</span>
          <strong>A little beyond yesterday.</strong>
        </div>
        <span className="difficulty" role="img" aria-label={`Difficulty ${level.tier} of 3`}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={n <= level.tier ? "filled" : ""} />
          ))}
        </span>
      </div>
      <p>{state.campaign.reason}</p>
      <div className="director-twist">{level.twist}</div>
      <div className="mission-choices">
        {(["bridge", "depot"] as Mission[]).map((mission) => (
          <button
            type="button"
            disabled={disabled}
            aria-pressed={level.mission === mission}
            key={mission}
            onClick={() => void act("/api/campaign", { action: "new", mission, seed: level.seed, tier: 1 })}
          >
            {mission === "bridge" ? "01 / Crossing" : "02 / Delivery depot"}
          </button>
        ))}
      </div>
      <div className="director-controls">
        <label>
          Challenge
          <select
            aria-label="Challenge difficulty"
            value={level.tier}
            disabled={disabled}
            onChange={(e) =>
              void act("/api/campaign", {
                action: "new",
                seed: level.seed,
                mission: level.mission,
                tier: Number(e.target.value),
              })
            }
          >
            <option value="1">1 · Discover</option>
            <option value="2">2 · Adapt</option>
            <option value="3">3 · Combine</option>
          </select>
        </label>
        <label className="memory-switch">
          <input
            type="checkbox"
            checked={state.campaign.memoryEnabled}
            disabled={disabled}
            onChange={(e) => void act("/api/campaign", { action: "memory", memoryEnabled: e.target.checked })}
          />
          <span>
            Bring the journal
            <small>
              {state.campaign.memoryEnabled
                ? "Verified past notes travel with Pip"
                : "Fresh Pip · history withheld"}
            </small>
          </span>
        </label>
      </div>
      {state.run && !["preparing", "working", "verifying"].includes(state.run.status) && (
        <div className="director-next">
          <p>
            <strong>Next:</strong> {next.reason}
          </p>
          <button
            type="button"
            className="primary"
            disabled={disabled}
            onClick={() => void act("/api/campaign", { action: "next" })}
          >
            Let the Director choose <span>→</span>
          </button>
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => void act("/api/campaign", { action: "replay" })}
          >
            Replay this exact level ↺
          </button>
        </div>
      )}
    </section>
  );
}
const duration = (entry: JournalEntry) => `${(entry.durationMs / 1000).toFixed(1)}s`;
const cost = (entry: JournalEntry) =>
  entry.usage?.cost == null ? "—" : `${entry.usage.currency} ${entry.usage.cost.toFixed(4)}`;
export function Journal({ state, open, onClose }: { state: GameState; open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<"notes" | "compare">("notes");
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  const entries = [...state.journal].reverse();
  const sameLevel = entries.filter(
    (entry) => entry.level.id === state.campaign.level.id && entry.source === "pine",
  );
  const fresh = sameLevel.find((entry) => !entry.memoryEnabled);
  const experienced = sameLevel.find((entry) => entry.memoryEnabled && entry.memoryIds.length > 0);
  return (
    <dialog ref={dialog} className="journal-dialog" aria-labelledby="journal-title" onCancel={onClose}>
      <button type="button" className="icon-button close-help" aria-label="Close journal" onClick={onClose}>
        ×
      </button>
      <span className="eyebrow">WHAT PIP CARRIES FORWARD</span>
      <h2 id="journal-title">Some things stay with you.</h2>
      <p className="journal-intro">
        Field notes survive restarts. Verified live notes are available on future journeys of the same kind. A
        verified file proves the task outcome; a written lesson still needs testing.
      </p>
      <div className="journal-tabs">
        <button type="button" aria-pressed={tab === "notes"} onClick={() => setTab("notes")}>
          Field journal
        </button>
        <button type="button" aria-pressed={tab === "compare"} onClick={() => setTab("compare")}>
          Same world, different experience
        </button>
      </div>
      {tab === "notes" ? (
        <div className="journal-entries">
          {entries.length ? (
            entries.map((entry) => (
              <article className={`journal-entry ${entry.outcome}`} key={entry.runId}>
                <div className="entry-meta">
                  <span>
                    {entry.source === "manual"
                      ? "MANUAL REHEARSAL"
                      : entry.outcome === "succeeded"
                        ? "VERIFIED JOURNEY"
                        : "UNFINISHED JOURNEY"}
                  </span>
                  <span>
                    {duration(entry)} · {cost(entry)}
                  </span>
                </div>
                <h3>
                  {entry.level.title} <small>Chapter {entry.level.episode}</small>
                </h3>
                <p>{entry.lesson}</p>
                <div className="entry-footer">
                  <span>
                    {entry.level.seed} · difficulty {entry.level.tier}
                  </span>
                  <span>
                    {entry.memoryIds.length} notes supplied · {entry.rejections} rejected exports
                  </span>
                </div>
                {entry.receiptHash && <code>Artifact {entry.receiptHash.slice(0, 24)}…</code>}
              </article>
            ))
          ) : (
            <div className="journal-empty">
              <span>▤</span>
              <h3>The first page is still blank.</h3>
              <p>
                Finish a journey to leave a trace. Pip’s successful live field notes will travel with him next
                time.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="comparison">
          <p>
            Current level: <strong>{state.campaign.level.id}</strong>. Compare the latest live trial in each
            condition. Memory-on needs at least one supplied note.
          </p>
          <table>
            <thead>
              <tr>
                <th>Observed</th>
                <th>Fresh Pip</th>
                <th>With journal</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Result", fresh?.outcome ?? "Not run", experienced?.outcome ?? "Not run"],
                ["Time to outcome", fresh ? duration(fresh) : "—", experienced ? duration(experienced) : "—"],
                ["Provider cost", fresh ? cost(fresh) : "—", experienced ? cost(experienced) : "—"],
                ["Rejected exports", fresh?.rejections ?? "—", experienced?.rejections ?? "—"],
                ["Notes supplied", fresh?.memoryIds.length ?? "—", experienced?.memoryIds.length ?? "—"],
              ].map(([label, a, b]) => (
                <tr key={label}>
                  <th>{label}</th>
                  <td>{a}</td>
                  <td>{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Turn “Bring the journal” off for a fresh trial, then on for an experienced trial. Replay preserves
            the challenge. Each live attempt starts only when you send Pip.
          </p>
          <small>
            One pair is an observation, not proof of improvement. Use unseen seeds and repeated trials for a
            generalization claim. Model decisions and browser timing may vary.
          </small>
        </div>
      )}
      <footer>
        <button
          type="button"
          className="text-button"
          onClick={() => downloadFile("pip-journal.json", JSON.stringify(state.journal, null, 2))}
        >
          Export journal & measurements ↓
        </button>
        <span>Stored locally · last 200 journeys</span>
      </footer>
    </dialog>
  );
}
