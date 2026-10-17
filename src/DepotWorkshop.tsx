import { useState } from "react";
import type { Workshop } from "../shared/contracts";
import { type Manifest, ordersCsv, uniqueOrders } from "../shared/depot";
import { downloadFile } from "./download";
import { Pip } from "./World";
export function FieldNotes({ workshop }: { workshop: Workshop }) {
  return (
    <details className="field-notes" open={workshop.memories.length > 0}>
      <summary>Previous journeys · {workshop.memories.length} verified field notes</summary>
      {workshop.memories.length ? (
        workshop.memories.map((entry) => (
          <article key={entry.runId}>
            <strong>{entry.level.title}</strong>
            <p>{entry.lesson}</p>
            <small>Verified artifact {entry.receiptHash?.slice(0, 12)} · Check against this new task.</small>
          </article>
        ))
      ) : (
        <p>No previous notes supplied. Solve this challenge from its current brief.</p>
      )}
    </details>
  );
}
export function DepotWorkshop({ workshop }: { workshop: Workshop }) {
  const [quantities, setQuantities] = useState<Record<string, { ship: number; hold: number }>>({});
  const [note, setNote] = useState("");
  const [exported, setExported] = useState(false);
  const depot = workshop.level?.depot;
  if (!depot || !workshop.level) return <p>Depot data is unavailable. Start a new journey.</p>;
  const level = workshop.level;
  const orders = uniqueOrders(depot);
  function update(id: string, field: "ship" | "hold", value: string) {
    setExported(false);
    const n = Number(value);
    setQuantities((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? { ship: 0, hold: 0 }),
        [field]: Number.isFinite(n) ? Math.max(0, Math.min(9, Math.floor(n))) : 0,
      },
    }));
  }
  function exportManifest() {
    const manifest: Manifest = {
      schemaVersion: 1,
      kind: "dispatch",
      runId: workshop.runId,
      levelId: level.id,
      note,
      entries: orders.map((order) => ({
        orderId: order.id,
        ...(quantities[order.id] ?? { ship: 0, hold: 0 }),
      })),
    };
    downloadFile(`dispatch-${workshop.runId}.json`, JSON.stringify(manifest, null, 2));
    setExported(true);
  }
  return (
    <main className="workshop-page depot-workshop">
      <header className="workshop-heading">
        <div>
          <span className="eyebrow">LITTLE LIGHT POST / DISPATCH DESK</span>
          <h1>The evening shift.</h1>
        </div>
        <Pip small />
      </header>
      <p className="workshop-brief">
        Get every available parcel to its home. Read the orders and stock, then fill in the dispatch
        worksheet. <strong>Count each order ID once, using its first occurrence.</strong> Process orders in
        that order. Ship what remaining stock allows; hold the rest.
      </p>
      {workshop.changeNotice && (
        <section className="workshop-change" aria-live="polite">
          <strong>CHANGE ORDER · REVISED STOCK</strong>
          <p>{workshop.changeNotice}</p>
        </section>
      )}
      <FieldNotes workshop={workshop} />
      <section className="inventory-shelf" aria-label="Available inventory">
        {Object.entries(depot.inventory).map(([sku, quantity]) => (
          <div key={sku}>
            <span>{sku === "lantern" ? "☼" : sku === "blanket" ? "▧" : "♧"}</span>
            <strong>{quantity}</strong>
            <small>{sku} in stock</small>
          </div>
        ))}
      </section>
      <section className="depot-paper">
        <div className="paper-top">
          <strong>01 / INCOMING ORDERS</strong>
          <button
            type="button"
            className="text-button"
            onClick={() => downloadFile(`orders-${level.seed}.csv`, ordersCsv(depot), "text/csv")}
          >
            Download orders CSV ↓
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Deliver to</th>
                <th>Item</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              {depot.orders.map((order, i) => (
                <tr key={`${order.id}-${i}`}>
                  <td>{order.id}</td>
                  <td>{order.recipient}</td>
                  <td>{order.sku}</td>
                  <td>{order.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="depot-paper">
        <div className="paper-top">
          <strong>02 / DISPATCH WORKSHEET</strong>
          <span>YOU DO THE ACCOUNTING</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Unique order</th>
                <th>Ship now</th>
                <th>Hold for stock</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                    <small>
                      {order.recipient} · {order.quantity} {order.sku}
                    </small>
                  </td>
                  <td>
                    <input
                      aria-label={`Ship quantity for ${order.id}`}
                      type="number"
                      min="0"
                      max="9"
                      value={quantities[order.id]?.ship ?? 0}
                      onChange={(e) => update(order.id, "ship", e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Hold quantity for ${order.id}`}
                      type="number"
                      min="0"
                      max="9"
                      value={quantities[order.id]?.hold ?? 0}
                      onChange={(e) => update(order.id, "hold", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <label className="note-label">
        Note for next time
        <textarea
          value={note}
          maxLength={600}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What should future Pip check on a different shift?"
        />
      </label>
      <div className="workshop-actions">
        <span className="workshop-brief">One real file brings the town to life.</span>
        <button type="button" className="primary" onClick={exportManifest}>
          Export manifest ↓
        </button>
      </div>
      <output className="workshop-message">
        {exported
          ? "Manifest downloaded. The game will independently reconcile every quantity before dispatch."
          : "The worksheet does not solve the orders for you. Check stock before exporting."}
      </output>
      {workshop.mode === "manual" && exported && (
        <p className="manual-hint">
          Return to the game, choose Import file, and select the downloaded manifest.
        </p>
      )}
    </main>
  );
}
