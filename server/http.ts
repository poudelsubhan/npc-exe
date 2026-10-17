import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { z } from "zod";
import { CampaignCommandSchema } from "../shared/campaign";
import { ChallengeSchema, ChangeCommandSchema } from "../shared/contracts";
import type { Configuration } from "./config";
import type { Game } from "./game";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".json": "application/json",
};
function json(res: ServerResponse, value: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(value));
}
async function body(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size > 16_384) throw new Error("Request is too large.");
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}
async function serveFile(pathname: string, res: ServerResponse, config: Configuration) {
  const relative =
    pathname.startsWith("/assets/") || pathname === "/favicon.svg" ? pathname.slice(1) : "index.html";
  const file = resolve(config.distDir, relative);
  if (!file.startsWith(`${config.distDir}${sep}`)) {
    json(res, { error: "Not found" }, 404);
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error("Not a file");
    res.writeHead(200, {
      "Content-Type": contentTypes[extname(file)] || "application/octet-stream",
      "Cache-Control": relative.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    createReadStream(file).pipe(res);
  } catch {
    json(res, { error: "App files missing. Run npm run build first." }, 404);
  }
}
export function handler(publicWorkshop: boolean, game: Game, config: Configuration) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    try {
      const url = new URL(req.url || "/", "http://localhost");
      if (
        !publicWorkshop &&
        !new Set([`localhost:${config.port}`, `127.0.0.1:${config.port}`]).has(req.headers.host || "")
      ) {
        json(res, { error: "Local access only" }, 403);
        return;
      }
      if (req.method === "GET" && url.pathname === "/api/workshop") {
        const workshop = game.workshop(url.searchParams.get("ticket"));
        json(
          res,
          workshop || { error: "This workshop has expired. Start a new journey in the game." },
          workshop ? 200 : 404,
        );
        return;
      }
      if (publicWorkshop) {
        if (
          req.method !== "GET" ||
          (url.pathname !== "/workshop" &&
            url.pathname !== "/favicon.svg" &&
            !url.pathname.startsWith("/assets/"))
        ) {
          json(res, { error: "Not found" }, 404);
          return;
        }
        await serveFile(url.pathname, res, config);
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        if (req.method !== "GET") {
          const origin = req.headers.origin;
          if (
            req.headers["x-npc-client"] !== "player" ||
            (origin &&
              ![`http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`].includes(origin))
          ) {
            json(res, { error: "Player access required" }, 403);
            return;
          }
        }
        if (req.method === "GET" && url.pathname === "/api/state") {
          json(res, game.state());
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/change-order") {
          game.queueChange(ChangeCommandSchema.parse(JSON.parse((await body(req)).toString())));
          json(res, game.state());
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/replay") {
          json(res, await game.replay(z.string().uuid().parse(url.searchParams.get("id"))));
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/challenge") {
          await game.changeScene(ChallengeSchema.parse(JSON.parse((await body(req)).toString())));
          json(res, game.state());
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/campaign") {
          await game.campaign(CampaignCommandSchema.parse(JSON.parse((await body(req)).toString())));
          json(res, game.state());
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/run") {
          const input = z
            .object({ mode: z.enum(["pine", "manual"]) })
            .strict()
            .parse(JSON.parse((await body(req)).toString()));
          game.start(input.mode);
          json(res, game.state(), 202);
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/cancel") {
          game.cancel();
          json(res, game.state());
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/import") {
          const accepted = await game.import(await body(req), "manual.json");
          json(
            res,
            accepted ? game.state() : { error: game.run?.events.at(-1)?.text || "Invalid blueprint" },
            accepted ? 200 : 422,
          );
          return;
        }
        if (req.method === "POST" && url.pathname === "/api/desktop") {
          json(res, await game.delegation());
          return;
        }
        if (req.method === "GET" && url.pathname === "/api/receipt" && game.run?.receipt) {
          res.setHeader("Content-Disposition", 'attachment; filename="npc-receipt.json"');
          json(res, {
            receipt: game.run.receipt,
            blueprint: game.run.blueprint,
            manifest: game.run.manifest,
            level: game.run.level,
          });
          return;
        }
        json(res, { error: "Not found" }, 404);
        return;
      }
      if (req.method !== "GET") {
        json(res, { error: "Not found" }, 404);
        return;
      }
      await serveFile(url.pathname, res, config);
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        json(res, { error: "Invalid request. Check the blueprint or challenge and try again." }, 400);
      else
        json(
          res,
          {
            error:
              error instanceof Error && !/https?:|token|pk_|ct_|ps_/i.test(error.message)
                ? error.message
                : "The request could not be completed. Please retry.",
          },
          409,
        );
    }
  };
}
