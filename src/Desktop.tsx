import { connectionFromDelegation } from "@pinesandbox/computer-web";
import { PineDesktop } from "@pinesandbox/computer-web/react";
import { useCallback, useEffect, useState } from "react";
import { DelegationSchema } from "../shared/contracts";
import { request } from "./api";

const fresh = async () => connectionFromDelegation(DelegationSchema.parse(await request("/api/desktop", {})));
export default function Desktop() {
  const [connection, setConnection] = useState<Awaited<ReturnType<typeof fresh>> | null>(null);
  const [status, setStatus] = useState("Connecting to Pip’s screen…");
  const [retry, setRetry] = useState(0);
  const token = useCallback(async () => (await fresh()).token, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: an explicit retry remints the short-lived connection.
  useEffect(() => {
    let mounted = true;
    fresh()
      .then((value) => {
        if (mounted) setConnection(value);
      })
      .catch(() => {
        if (mounted) setStatus("The live view could not connect. Pip can keep working.");
      });
    return () => {
      mounted = false;
    };
  }, [retry]);
  return (
    <div className="desktop-container">
      <output className="desktop-status">{status}</output>
      {connection && (
        <PineDesktop
          key={retry}
          url={connection.url}
          token={token}
          tokenTransport={connection.tokenTransport}
          control="view"
          toolbar="off"
          clipboard={[]}
          reconnectMaxAttempts={3}
          className="pine-screen"
          onConnected={() => setStatus("Live • view only")}
          onReconnecting={() => setStatus("Reconnecting to the live screen…")}
          onReconnectExhausted={() => setStatus("Screen disconnected. Pip’s work continues.")}
          onError={() => setStatus("The live screen is unavailable. Pip’s work continues.")}
        />
      )}
      <button
        type="button"
        className="text-button desktop-retry"
        onClick={() => setRetry((value) => value + 1)}
      >
        Reconnect view
      </button>
    </div>
  );
}
