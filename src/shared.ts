import { ServeContext } from "./hellojoe";
import { ChildProcess } from "child_process";
import { Worker } from "cluster";

type W = ChildProcess | Worker

export function handleExit(this: ServeContext, worker: W, spawnMore: (this: ServeContext) => W, code: number, signal: string) {
  let replacement: W;
  const lifetime = Date.now() - this.startTimes[pid(worker)];
  delete this.startTimes[pid(worker)];

  this.log.info(
    "Process",
    pid(worker),
    "terminated with signal",
    signal,
    "code",
    code + "; restarting."
  );

  if("suicide" in worker) {
    this.log.info("Worker", pid(worker), "terminated voluntarily.");
    return;
  }

  if (lifetime < this.options.failureThreshold) {
    this.failures++;
  } else {
    this.failures = 0;
  }

  if (this.failures > this.options.retryThreshold) {
    this.log.warn(
      this.failures + " consecutive failures; pausing for",
      this.options.retryDelay + "ms before respawning."
    );
  }

  setTimeout(
    () => {
      replacement = spawnMore.call(this);
      replacement.on("online", () =>
        this.log.info(
          "Process",
          pid(replacement),
          "has successfully replaced",
          pid(worker)
        )
      );
    },
    this.failures > this.options.retryThreshold ? this.options.retryDelay : 0
  );
}

export function pid(worker: ChildProcess | Worker): number {
  return "pid" in worker ? worker.pid : worker.process.pid
}
