import type { Run } from "./contracts";

export const duration = (run: Run) =>
  Math.max(
    1,
    Date.parse(run.events.at(-1)?.at ?? run.finishedAt ?? run.startedAt) - Date.parse(run.startedAt),
  );

// Historical presentation only. No commands, provider calls or live state updates.
export function projectReplay(saved: Run, elapsedMs: number): Run {
  const at = Date.parse(saved.startedAt) + Math.max(0, elapsedMs);
  const completed = !!saved.finishedAt && at >= Date.parse(saved.finishedAt);
  const changed = !!saved.changeOrder?.appliedAt && at >= Date.parse(saved.changeOrder.appliedAt);
  const attempts = saved.attempts
    .filter((a) => Date.parse(a.receivedAt) <= at)
    .map((a) =>
      a.checkedAt && Date.parse(a.checkedAt) <= at
        ? a
        : { ...a, checkedAt: null, accepted: null, reason: "Checking the received file." },
    );
  return {
    ...saved,
    level: changed ? saved.level : (saved.originalLevel ?? saved.level),
    changeOrder:
      saved.changeOrder && Date.parse(saved.changeOrder.queuedAt) <= at
        ? { ...saved.changeOrder, appliedAt: changed ? saved.changeOrder.appliedAt : null }
        : null,
    events: saved.events.filter((e) => Date.parse(e.at) <= at),
    attempts,
    rejections: attempts.filter((a) => a.accepted === false).length,
    status: completed ? saved.status : "working",
    finishedAt: completed ? saved.finishedAt : null,
    manifest: completed ? saved.manifest : null,
    blueprint: completed ? saved.blueprint : null,
    path: completed ? saved.path : [],
    receipt: completed ? saved.receipt : null,
    usage: completed ? saved.usage : null,
    error: completed ? saved.error : null,
    desktopReady: false,
    workshopUrl: "[replay]",
  };
}
