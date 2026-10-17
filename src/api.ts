import { z } from "zod";
import { StateSchema } from "../shared/contracts";

async function responseData(response: Response) {
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(result);
    throw new Error(error.success ? error.data.error : "The connection was interrupted. Please retry.");
  }
  return result;
}
export async function request(path: string, data?: unknown) {
  return responseData(
    await fetch(path, {
      ...(data !== undefined
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-NPC-Client": "player" },
            body: JSON.stringify(data),
          }
        : {}),
      signal: AbortSignal.timeout(20_000),
    }),
  );
}
export const readState = async () => StateSchema.parse(await request("/api/state"));
export const action = async (path: string, body: unknown) => StateSchema.parse(await request(path, body));
// Preserve whitespace and encoding: receipts fingerprint the downloaded file, not reserialized JSON.
export async function importArtifact(file: File) {
  return StateSchema.parse(
    await responseData(
      await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-NPC-Client": "player" },
        body: file,
        signal: AbortSignal.timeout(20_000),
      }),
    ),
  );
}
