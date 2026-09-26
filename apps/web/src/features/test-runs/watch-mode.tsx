"use client";

import { FormControlLabel, Switch, Tooltip } from "@mui/material";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "atp.watchRuns";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read() {
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function useWatchMode(): [boolean, (value: boolean) => void] {
  const watching = useSyncExternalStore(subscribe, read, () => false);
  const setWatching = (value: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    listeners.forEach((listener) => listener());
  };
  return [watching, setWatching];
}

export function WatchToggle() {
  const [watching, setWatching] = useWatchMode();
  return (
    <Tooltip title="Opens a real browser window on this machine and slows each step down so you can watch the app being tested. Screenshots and a video are saved either way.">
      <FormControlLabel
        control={<Switch checked={watching} onChange={(event) => setWatching(event.target.checked)} />}
        label="Show browser while running"
        sx={{ mr: 1, whiteSpace: "nowrap" }}
      />
    </Tooltip>
  );
}
