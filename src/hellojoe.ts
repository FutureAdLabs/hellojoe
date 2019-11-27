
import * as os from "os"

import * as cluster from "cluster";
import merge from "merge";

import spawnChildProcess from "./childProcess"
import spawnClusterWorker from "./worker"

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
