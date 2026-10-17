import { useEffect, useState } from "react";
import type { Level } from "../shared/campaign";
import type { Run } from "../shared/contracts";
import { uniqueOrders } from "../shared/depot";
import { Pip } from "./World";

const homes = [
  { x: 520, y: 155 },
  { x: 725, y: 245 },
  { x: 540, y: 365 },
  { x: 320, y: 405 },
  { x: 790, y: 430 },
];
export function DepotWorld({
  level,
  run,
  onArrive,
}: {
  level: Level;
  run: Run | null;
  onArrive: () => void;
}) {
  const [stop, setStop] = useState(-1);
  const success = run?.status === "succeeded" && !!run.manifest;
  const orders = level.depot ? uniqueOrders(level.depot) : [];
  const deliveries = success ? (run.manifest?.entries ?? []) : [];
  useEffect(() => {
    if (!success) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStop(deliveries.length);
      onArrive();
      return;
    }
    const timer = setInterval(() => setStop((current) => Math.min(current + 1, deliveries.length)), 1400);
    return () => clearInterval(timer);
  }, [success, deliveries.length, onArrive]);
  useEffect(() => {
    if (success && stop >= deliveries.length) onArrive();
  }, [success, stop, deliveries.length, onArrive]);
  const current = deliveries[stop];
  const index = orders.findIndex((order) => order.id === current?.orderId);
  const position = homes[index] ?? { x: 190, y: 265 };
  const shipped = deliveries.slice(0, Math.max(0, stop + 1)).reduce((sum, d) => sum + d.ship, 0);
  const held = deliveries.reduce((sum, d) => sum + d.hold, 0);
  return (
    <div className="world depot-world">
      <svg
        viewBox="0 0 960 610"
        role="img"
        aria-label={
          success
            ? `${shipped} parcels delivered, ${held} held for stock`
            : "Little Light village waits for its evening deliveries"
        }
      >
        <title>Little Light, the evening post</title>
        <defs>
          <radialGradient id="town-glow">
            <stop stopColor="#2b4850" />
            <stop offset="1" stopColor="#111e2c" />
          </radialGradient>
          <radialGradient id="lamp-glow">
            <stop stopColor="#ffdb86" stopOpacity=".35" />
            <stop offset="1" stopColor="#ffdb86" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="480" cy="320" rx="465" ry="270" fill="url(#town-glow)" />
        {Array.from({ length: 26 }, (_, i) => (
          <circle
            key={`star-x-${70 + ((i * 137) % 830)}`}
            cx={70 + ((i * 137) % 830)}
            cy={70 + ((i * 71) % 420)}
            r={i % 3 === 0 ? 2 : 1}
            fill="#a9c6bc"
            opacity=".23"
          />
        ))}
        <path
          d="M120 287Q300 205 520 195T744 280Q720 380 540 400T320 438Q580 515 802 461"
          fill="none"
          stroke="#496463"
          strokeWidth="23"
          strokeLinecap="round"
        />
        <path
          d="M120 287Q300 205 520 195T744 280Q720 380 540 400T320 438Q580 515 802 461"
          fill="none"
          stroke="#809087"
          strokeOpacity=".45"
          strokeWidth="2"
          strokeDasharray="3 12"
        />
        {[
          { x: 110, y: 400 },
          { x: 390, y: 170 },
          { x: 830, y: 170 },
          { x: 650, y: 475 },
          { x: 215, y: 150 },
        ].map((p) => (
          <g key={p.x} transform={`translate(${p.x} ${p.y})`}>
            <path d="M0 22v-40" stroke="#5b6356" strokeWidth="7" />
            <path d="M-28 5L0-58 29 5Z" fill="#466d62" />
            <path d="M-23-18L0-72 24-18Z" fill="#6d917a" />
          </g>
        ))}
        <g transform="translate(190 230)">
          <ellipse cy="-10" rx="110" ry="90" fill="url(#lamp-glow)" />
          <path d="M-62-20v85h124v-85" fill="#997858" />
          <path d="M-75-20L0-80l75 60Z" fill="#59777b" />
          <path d="M-60-25L0-70 62-25" fill="none" stroke="#91aaa2" strokeWidth="4" />
          <rect x="-15" y="15" width="30" height="50" rx="3" fill="#263e45" />
          <rect x="-48" y="0" width="23" height="25" fill="#ffe1a0" />
          <rect x="25" y="0" width="23" height="25" fill="#ffe1a0" />
          <rect x="-54" y="-15" width="108" height="22" rx="3" fill="#e8d7a9" />
          <text textAnchor="middle" y="0" fill="#4a5147" fontSize="10" letterSpacing="2">
            LITTLE LIGHT POST
          </text>
        </g>
        {orders.map((order, i) => {
          const p = homes[i];
          if (!p) return null;
          const deliveryIndex = deliveries.findIndex((d) => d.orderId === order.id);
          const delivery = deliveries[deliveryIndex];
          const visited = success && deliveryIndex >= 0 && deliveryIndex <= stop;
          const lit = visited && !!delivery?.ship;
          return (
            <g key={order.id} transform={`translate(${p.x} ${p.y})`}>
              {lit && <ellipse cy="-20" rx="85" ry="80" fill="url(#lamp-glow)" />}
              <path d="M-36-12v55l39 18 32-18v-55L0-39Z" fill={lit ? "#b3a487" : "#6c7e78"} />
              <path d="M3-12v73l32-18v-55Z" fill="#526b66" />
              <path d="M-47-10L-5-61 46-15 5 4Z" fill={i % 2 ? "#826f74" : "#62828a"} />
              <rect x="-23" y="3" width="17" height="23" rx="2" fill={lit ? "#ffe3a2" : "#354f58"} />
              <path d="M13 17v29l12-6V11Z" fill={lit ? "#f6cd85" : "#304b52"} />
              <text textAnchor="middle" y="85" className="town-house-label">
                {order.recipient}
              </text>
              {visited && (
                <g transform="translate(0 -83)">
                  <rect x="-49" y="-16" width="98" height="24" rx="12" fill={lit ? "#d5e5c7" : "#ead7b7"} />
                  <text textAnchor="middle" y="0" fill="#314d49" fontSize="10">
                    {delivery?.ship} delivered{delivery?.hold ? ` · ${delivery.hold} held` : " ✓"}
                  </text>
                </g>
              )}
            </g>
          );
        })}
        <g
          className="courier depot-courier"
          style={{ transform: `translate(${position.x - 28}px, ${position.y + 48}px)` }}
        >
          <foreignObject x="-24" y="-57" width="48" height="64">
            <Pip small />
          </foreignObject>
        </g>
        <text x="96" y="532" className="map-label">
          LITTLE LIGHT / EVENING SHIFT
        </text>
        <text x="96" y="556" className="town-caption">
          {success
            ? `${shipped} parcels delivered${held ? ` · ${held} waiting safely for stock` : " · every parcel accounted for"}`
            : "The windows are waiting for a little light."}
        </text>
      </svg>
      <div className="world-caption">
        <span className="coordinate">DEPOT {String(level.episode).padStart(3, "0")}</span>
        <span>
          {success
            ? "Deliveries follow the verified manifest."
            : "Real orders. Real accounting. A town that feels it."}
        </span>
      </div>
    </div>
  );
}
