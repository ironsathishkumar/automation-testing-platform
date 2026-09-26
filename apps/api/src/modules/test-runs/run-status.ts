import { ResultStatus, RunStatus } from "@atp/shared-types";

export function summarizeResults(statuses: ResultStatus[], pending: number): {
  status: RunStatus;
  passed: number;
  failed: number;
  skipped: number;
  cancelled: number;
} {
  const passed = statuses.filter((status) => status === "passed").length;
  const failed = statuses.filter((status) => status === "failed").length;
  const skipped = statuses.filter((status) => status === "skipped").length;
  const cancelled = statuses.filter((status) => status === "cancelled").length;
  let status: RunStatus = "queued";
  if (pending > 0) {
    status = statuses.length > 0 ? "running" : "queued";
  } else if (failed > 0) {
    status = "failed";
  } else if (statuses.length > 0 && cancelled === statuses.length) {
    status = "cancelled";
  } else if (statuses.length > 0) {
    status = "passed";
  }
  return { status, passed, failed, skipped, cancelled };
}
