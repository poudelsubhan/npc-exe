import { useEffect, useState } from "react";
import {
  type Blueprint,
  type Cell,
  grid,
  INK_BUDGET,
  isLand,
  key,
  type Workshop as WorkshopData,
  WorkshopSchema,
} from "../shared/domain";
import { request } from "./api";
import { Pip } from "./World";
export function Workshop() {
  const [workshop, setWorkshop] = useState<WorkshopData | null>(null);
  const [cells, setCells] = useState<Cell[]>([]);
  const [error, setError] = useState("");
  const [exported, setExported] = useState(false);
  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("ticket") || "";
    request(`/api/workshop?ticket=${encodeURIComponent(ticket)}`)
      .then((value) => setWorkshop(WorkshopSchema.parse(value)))
      .catch((error) => setError(error.message));
  }, []);
  if (!workshop)
    return (
      <main className="workshop-page">
        <h1>Pip’s workshop</h1>
        <output>{error || "Opening the drawing desk…"}</output>
      </main>
    );
  const rocks = new Set(workshop.scene.rocks.map(key));
  const painted = new Set(cells.map(key));
  function paint(cell: Cell) {
    setExported(false);
    setError("");
    if (painted.has(key(cell))) setCells(cells.filter((c) => key(c) !== key(cell)));
    else if (cells.length < INK_BUDGET) setCells([...cells, cell]);
    else setError("All 12 tiles are used. Remove a tile before adding another.");
  }
  function download() {
    if (!workshop) return;
    const blueprint: Blueprint = {
      schemaVersion: 1,
      runId: workshop.runId,
      sceneRevision: workshop.scene.revision,
      color: workshop.scene.color,
      cells,
    };
    const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bridge-${workshop.runId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setExported(true);
  }
  return (
    <main className={`workshop-page color-${workshop.scene.color}`}>
      <header className="workshop-heading">
        <div>
          <span className="eyebrow">NPC.EXE / EXTERNAL WORKSHOP</span>
          <h1>A bridge, from scratch.</h1>
        </div>
        <Pip small />
      </header>
      <p className="workshop-brief">
        Paint a path from the left shore to the right. Connect tiles along their edges, avoid rocks, and use
        at most <strong>12 tiles</strong>.
      </p>
      <div className="workshop-meta">
        <span>
          <i className="color-dot" />
          Requested color: <strong>{workshop.scene.color}</strong>
        </span>
        <span>World revision {workshop.scene.revision}</span>
        <span>{workshop.mode === "manual" ? "Manual rehearsal" : "Pine agent workspace"}</span>
      </div>
      <div className="drawing-paper">
        <div className="paper-top">
          <span>BRIDGE BLUEPRINT</span>
          <span>{cells.length} / 12 TILES</span>
        </div>
        <div className="blueprint-grid">
          {grid.map((cell) => {
            const land = isLand(cell);
            const rock = rocks.has(key(cell));
            const selected = painted.has(key(cell));
            return (
              <button
                type="button"
                key={key(cell)}
                className={`drawing-cell ${land ? "land" : rock ? "rock" : selected ? "painted" : "water"}`}
                disabled={land || rock}
                aria-label={`${selected ? "Painted" : land ? "Shore" : rock ? "Rock" : "Water"} column ${cell.x} row ${cell.y}`}
                aria-pressed={selected}
                onClick={() => paint(cell)}
              >
                <small>
                  {cell.x},{cell.y}
                </small>
                <span aria-hidden="true">
                  {land
                    ? cell.x === 1 && cell.y === 4
                      ? "→"
                      : cell.x === 10 && cell.y === 4
                        ? "⌂"
                        : "·"
                    : rock
                      ? "◆"
                      : selected
                        ? "▰"
                        : "+"}
                </span>
              </button>
            );
          })}
        </div>
        <div className="paper-bottom">
          <span>← PIP’S SHORE</span>
          <span>HOME →</span>
        </div>
      </div>
      <div className="workshop-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setCells([]);
            setExported(false);
            setError("");
          }}
        >
          Clear drawing
        </button>
        <button type="button" className="primary" disabled={!cells.length} onClick={download}>
          Export blueprint <span>↓</span>
        </button>
      </div>
      <output className="workshop-message">
        {error ||
          (exported
            ? "Blueprint downloaded. The game will verify the file before the bridge appears."
            : "Click a tile to paint it. Click again to erase. There is no automatic route.")}
      </output>
      {workshop.mode === "manual" && exported && (
        <p className="manual-hint">
          Return to the game and choose <strong>Import blueprint</strong>, then select the file you just
          downloaded.
        </p>
      )}
      <footer className="workshop-footer">
        A real drawing tool. A real exported file. The game decides whether it works.
      </footer>
    </main>
  );
}
