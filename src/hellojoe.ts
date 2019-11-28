
import * as os from "os"

import merge = require("merge")

import * as children from "child_process";
import * as cluster from "cluster";

const defaultCores = os.cpus().length

export interface ScaleOptions {
  /**
   * Custom logger. Defaults to an implementation using `console.log`.
   */
  logger: Logger;
  /**
   * Number of worker processes to spawn.
   */
  cores: number;
  /**
   * Number of failures permitted before retryDelay activates.
   */
  retryThreshold: number;
  /**
   * After a certain number of failures, delay this many milliseconds before restarting workers.
   */
  retryDelay: number;
  /**
   * If a process runs for less than this time, it's considered a failure.
   */
  failureThreshold: number;
  /**
   * Optional path to a worker executable, in which case this Hello Joe instance
   * will spawn workers using the `child_process` module, as opposed to the
   * `cluster` module, and the passed `app` function will be ignored, implying
   * that sockets will not be automatically shared among processes.
   */
  worker: string;
  /**
   * Command line arguments for worker executable. Must be specified if
   * `worker` is present.
   */
  workerArgs: string[];
}

const defaultLogger = {
  info: console.log,
  debug: console.log,
  warn: console.error,
  handleExceptions: () => { }
};

export interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  handleExceptions: () => void;
}


export interface ServeContext {
  log: Logger,
  startTimes: {[pid: number]: number},
  failures: number,
  options: ScaleOptions
}

const noApp = () => { throw new Error("No App supplied in serve!") }

export default function serve(options: Partial<ScaleOptions>, app: () => void = noApp): void {
  let i: number;

  const opts =  options = merge(
    {
      cores: defaultCores,
      logger: defaultLogger,
      retryThreshold: 23,
      retryDelay: 10000,
      failureThreshold: 5000
    },
    options
  ) as ScaleOptions

  const log = options.logger;

  const ctx: ServeContext = {
    log: opts.logger,
    startTimes: {}, // When a chi_pro was started
    failures: 0, // keeping track of retries
    options: opts
  }

  // Passing down a servecontext as local this when spawning
  const spawnMore = opts.worker ? spawnChildProcess.bind(ctx) : spawnClusterWorker.bind(ctx);

  if (cluster.isMaster) {
    // Spawn more overlords
    for (i = 0; i < opts.cores; i++) {
      spawnMore();
    }

    ctx.log.info(
      "Spawned",
      opts.cores,
      opts.worker ? "worker processes." : "server instances."
    );
  } else {
    ctx.log.handleExceptions();
    opts.worker || app();
  }
}

type W = children.ChildProcess | cluster.Worker

function spawnChildProcess(this: ServeContext): children.ChildProcess {
  const worker = children.fork(this.options.worker, this.options.workerArgs);
  this.log.debug(
    "Spawning worker %s as child process: %j %j",
    pid(worker),
    this.options.worker,
    this.options.workerArgs
  );

  this.startTimes[pid(worker)] = Date.now();

  worker.on("exit", handleExit.bind(this, worker));
  return worker;
}

function spawnClusterWorker(this: ServeContext): cluster.Worker {
  const worker = cluster.fork();
  this.log.debug(
    "Spawning worker %s as child process: %j %j",
    pid(worker),
    this.options.worker,
    this.options.workerArgs
  );

  this.startTimes[pid(worker)] = Date.now();

  worker.on("listening", addr =>
    this.log.info(
      "Process",
      pid(worker),
      "is now listening on",
      addr.address + ":" + addr.port
    )
  );

  worker.on("exit", handleExit.bind(this, worker));
  return worker;
}



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

export function pid(worker: children.ChildProcess | cluster.Worker): number {
  return "pid" in worker ? worker.pid : worker.process.pid
}

