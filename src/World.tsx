import { useEffect, useState } from "react";
import type { Run } from "../shared/contracts";
import { type Cell, grid, isLand, key, type Scene, START } from "../shared/domain";

const point = (c: Cell) => ({ x: 410 + (c.x - c.y) * 33, y: 118 + (c.x + c.y) * 17 });
const diamond = (x: number, y: number) => `${x},${y - 17} ${x + 33},${y} ${x},${y + 17} ${x - 33},${y}`;
export function Pip({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? "pip-icon" : "pip-portrait"}
      viewBox="-30 -63 60 78"
      aria-label="Pip, a courier in an amber raincoat"
      role="img"
    >
      <title>Pip the courier</title>
      <ellipse cy="7" rx="20" ry="6" fill="#0b1422" opacity=".35" />
      <path d="M-15-8l-4 17h9l7-16M6-8l2 17h9L15-9" fill="#273744" />
      <path d="M-20-6Q-17-32 0-34Q18-32 21-6Z" fill="#d99055" />
      <path d="M-21-24Q-21-59 0-60Q23-57 22-23Z" fill="#ffc875" />
      <path d="M-13-23Q-18-44 0-44Q17-43 14-23Z" fill="#283949" />
      <path d="M-8-33v4M7-33v4" stroke="#fff4cc" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M-19-16l-9 8M18-16l8 5" stroke="#f5b267" strokeWidth="8" strokeLinecap="round" />
      <path d="M-12-19l22 16" stroke="#754d3b" strokeWidth="4" />
      <rect x="7" y="-12" width="15" height="13" rx="3" fill="#f4dc9c" />
      <path d="M8-10l6 5 7-5" fill="none" stroke="#bc8a59" strokeWidth="1.5" />
    </svg>
  );
}
export function World({
  scene,
  run,
  editing,
  onRock,
  onArrive,
}: {
  scene: Scene;
  run: Run | null;
  editing: boolean;
  onRock: (cell: Cell) => void;
  onArrive: () => void;
}) {
  const [step, setStep] = useState(0);
  const success = run?.status === "succeeded" && !editing;
  const path = success ? run.path : [];
  useEffect(() => {
    if (!success || !path.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(path.length - 1);
      onArrive();
      return;
    }
    const timer = setInterval(
      () =>
        setStep((current) => {
          if (current >= path.length - 1) {
            clearInterval(timer);
            return current;
          }
          return current + 1;
        }),
      480,
    );
    return () => clearInterval(timer);
  }, [success, path.length, onArrive]);
  useEffect(() => {
    if (success && step === path.length - 1) onArrive();
  }, [success, step, path.length, onArrive]);
  const position = point(path[step] || START);
  const rocks = new Set(scene.rocks.map(key));
  const bridge = new Set(run?.status === "succeeded" ? run.blueprint?.cells.map(key) : []);
  const palette = {
    amber: ["#f2c178", "#997150"],
    mint: ["#9dd9c5", "#558f84"],
    rose: ["#eeb5b6", "#a56e80"],
  }[scene.color];
  return (
    <div className={`world ${editing ? "world-editing" : ""}`}>
      <svg
        viewBox="0 0 960 610"
        role={editing ? "group" : "img"}
        aria-label="Two islands separated by water. Pip is waiting for a way home."
      >
        <title>Pip’s world</title>
        <defs>
          <radialGradient id="water">
            <stop stopColor="#243e52" />
            <stop offset="1" stopColor="#111e2c" />
          </radialGradient>
          <linearGradient id="island" x2="0" y2="1">
            <stop stopColor="#769184" />
            <stop offset="1" stopColor="#4e736c" />
          </linearGradient>
          <linearGradient id="cliff" x2="0" y2="1">
            <stop stopColor="#3f565c" />
            <stop offset="1" stopColor="#233844" />
          </linearGradient>
          <radialGradient id="glow">
            <stop stopColor="#ffdc91" stopOpacity=".4" />
            <stop offset="1" stopColor="#ffdc91" stopOpacity="0" />
          </radialGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        <ellipse cx="480" cy="320" rx="470" ry="268" fill="url(#water)" />
        <g className="water-lines" fill="none" stroke="#65929d" strokeOpacity=".13">
          {Array.from({ length: 16 }, (_, i) => (
            <path
              key={`wave-y-${130 + i * 24}`}
              d={`M${100 + (i % 4) * 65} ${130 + i * 24}q35 12 70 0m${180 + (i % 3) * 40} 0q25 8 50 0`}
            />
          ))}
        </g>
        <ellipse cx="275" cy="270" rx="125" ry="45" fill="#080f1c" opacity=".3" filter="url(#soft)" />
        <ellipse cx="640" cy="440" rx="130" ry="48" fill="#080f1c" opacity=".3" filter="url(#soft)" />
        {[...grid]
          .sort((a, b) => a.x + a.y - (b.x + b.y))
          .map((cell) => {
            const p = point(cell);
            const land = isLand(cell);
            const rock = rocks.has(key(cell));
            const built = bridge.has(key(cell));
            return (
              <g key={key(cell)}>
                {land && (
                  <>
                    <path
                      d={`M${p.x - 33} ${p.y}v35l33 17 33-17v-35l-33 17Z`}
                      fill="url(#cliff)"
                      stroke="#253b46"
                      strokeWidth=".7"
                    />
                    <polygon
                      points={diamond(p.x, p.y - 4)}
                      fill="url(#island)"
                      stroke="#87a394"
                      strokeOpacity=".3"
                    />
                    {(cell.x + cell.y) % 3 === 0 && (
                      <path
                        d={`M${p.x - 9} ${p.y - 6}l-3-5m6 4l2-6m6 9l3-4`}
                        stroke="#a7b69a"
                        strokeOpacity=".7"
                        strokeWidth="2"
                      />
                    )}
                  </>
                )}
                {!land && (
                  <polygon
                    points={diamond(p.x, p.y)}
                    fill={editing ? "#365462" : "#3c626d"}
                    fillOpacity={editing ? 0.3 : 0.06}
                    stroke="#84b5bc"
                    strokeOpacity={editing ? 0.22 : 0.07}
                  />
                )}
                {built && (
                  <g opacity={editing ? 0.35 : 1}>
                    <path d={`M${p.x - 31} ${p.y}v8l31 16 31-16v-8Z`} fill={palette[1]} />
                    <polygon
                      points={diamond(p.x, p.y - 3)}
                      fill={palette[0]}
                      stroke="#fff0cb"
                      strokeOpacity=".3"
                    />
                    <path
                      d={`M${p.x - 18} ${p.y - 10}l31 16m-44-9l31 16`}
                      stroke={palette[1]}
                      strokeWidth="1.5"
                    />
                  </g>
                )}
                {rock && (
                  <g>
                    <ellipse cx={p.x} cy={p.y + 5} rx="22" ry="10" fill="#12222d" />
                    <path d={`M${p.x - 23} ${p.y}l8-24 23-4 17 25-20 13Z`} fill="#637786" />
                    <path d={`M${p.x - 15} ${p.y - 24}l18 12 5-16Z`} fill="#9badb3" />
                    <path d={`M${p.x + 3} ${p.y - 12}l22 9-20 13Z`} fill="#425767" />
                    <path d={`M${p.x - 23} ${p.y}l26-12 2 22Z`} fill="#758a96" />
                  </g>
                )}
                {editing && !land && (
                  // biome-ignore lint/a11y/useSemanticElements: SVG grid targets support keyboard activation and cannot be HTML buttons.
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={`${rock ? "Remove" : "Place"} rock column ${cell.x} row ${cell.y}`}
                    aria-pressed={rock}
                    className="rock-target"
                    onClick={() => onRock(cell)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRock(cell);
                      }
                    }}
                  >
                    <polygon points={diamond(p.x, p.y)} fill="transparent" />
                    <title>
                      Column {cell.x}, row {cell.y}
                    </title>
                  </g>
                )}
              </g>
            );
          })}
        <g transform="translate(269 155)">
          <path d="M-6 30V-25" stroke="#544e4a" strokeWidth="8" />
          <path d="M-40 4l34-64 35 64Z" fill="#4d7d72" />
          <path d="M-34-16l28-56 29 56Z" fill="#638b7a" />
          <path d="M-27-36l21-44 23 44Z" fill="#81a28b" />
        </g>
        <g transform="translate(325 133)">
          <path d="M0 20V-13" stroke="#544e4a" strokeWidth="5" />
          <path d="M-23 3L0-48 25 3Z" fill="#537e70" />
          <path d="M-17-18L0-55 18-18Z" fill="#7c9b82" />
        </g>
        <g transform="translate(683 312)">
          <ellipse cy="-10" rx="90" ry="90" fill="url(#glow)" />
          <path d="M-38-15v47l43 23 36-21v-51L0-43Z" fill="#c2ac8e" />
          <path d="M5-15v70l36-21v-51Z" fill="#9d8e7c" />
          <path d="M-49-11L-5-67 50-18 9 4Z" fill="#617986" />
          <path d="M-49-11L-5-67 9-8Z" fill="#829b9f" />
          <path d="M-20 3v24l17 9V12Z" fill="#ffe4a2" />
          <path d="M16 18v27l14-8V10Z" fill="#5d655d" />
          <path d="M-31-55v-28l10 5v34" fill="#ad9f92" />
          <path
            className="chimney-smoke"
            d="M-26-88q-18-12 0-25t-2-22"
            fill="none"
            stroke="#bac9c7"
            strokeWidth="8"
            strokeLinecap="round"
            opacity=".18"
          />
          <path d="M-12 7v25m-8-15l17 9" stroke="#c69a64" strokeWidth="2" />
        </g>
        <g transform="translate(190 293)">
          <path d="M0 8v-43" stroke="#8b795d" strokeWidth="4" />
          <path d="M-2-35h22l-7 8 7 8H-2" fill="#e7b86d" />
        </g>
        <g className="courier" style={{ transform: `translate(${position.x}px, ${position.y - 6}px)` }}>
          <foreignObject x="-24" y="-57" width="48" height="64">
            <Pip small />
          </foreignObject>
        </g>
        {!success && (
          <g transform={`translate(${point(START).x - 4} ${point(START).y - 85})`}>
            <rect x="-39" y="-19" width="78" height="26" rx="13" fill="#e9e5d7" />
            <path d="M-4 6l6 8 4-8" fill="#e9e5d7" />
            <text textAnchor="middle" y="-2" fill="#344452" fontSize="11" fontFamily="monospace">
              …a way home?
            </text>
          </g>
        )}
        <text x="175" y="420" className="map-label">
          THE NEAR SHORE
        </text>
        <text x="698" y="468" className="map-label">
          HOME
        </text>
        <g transform="translate(840 490)" opacity=".4">
          <path d="M0-22v44m-22-22h44M0-22l-5 9h10Z" fill="none" stroke="#b5c4c6" />
          <text x="-4" y="-30" fill="#b5c4c6" fontSize="10">
            N
          </text>
        </g>
      </svg>
      <div className="world-caption">
        <span className="coordinate">ISLAND 001</span>
        <span>
          {editing
            ? "Click the water to place or remove rocks."
            : success
              ? "Built from the exported blueprint."
              : "A small world with one missing piece."}
        </span>
      </div>
    </div>
  );
}
