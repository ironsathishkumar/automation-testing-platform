import { spawn } from "node:child_process";

export function runCommand(command: "k6" | "appium", args: string[], timeoutMs: number, signal: AbortSignal) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    const onAbort = () => child.kill("SIGTERM");
    signal.addEventListener("abort", onAbort);
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      callback();
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = `${stdout}${chunk.toString()}`.slice(0, 20_000);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = `${stderr}${chunk.toString()}`.slice(0, 20_000);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(() => {
        if (error.code === "ENOENT") reject(new Error(`${command} is not installed`));
        else reject(error);
      });
    });
    child.on("close", (code) => {
      finish(() => resolve({ code, stdout, stderr }));
    });
  });
}
