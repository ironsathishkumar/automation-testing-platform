export type StatusColor = "success" | "error" | "warning" | "info" | "default";

export function statusColor(status: string): StatusColor {
  if (status === "passed" || status === "completed") return "success";
  if (status === "failed") return "error";
  if (status === "cancelled" || status === "skipped") return "warning";
  if (status === "running" || status === "queued") return "info";
  return "default";
}

export function variantLabel(variant?: string) {
  return (variant ?? "").split("|").slice(1).filter(Boolean).join(" · ");
}

export function formatDuration(ms?: number) {
  if (ms === undefined) return "—";
  if (ms < 1000) return `${ms} ms`;
  const seconds = ms / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
}
