declare var require: (module: string) => any;

var cluster = require("cluster");
var child = require("child_process");
var merge = require("merge");

var defaultCores = require("os").cpus().length;

export interface ScaleOptions {
  /**
   * Number of worker processes to spawn.
   */
  cores?: number;
  /**
   * Number of failures permitted before retryDelay activates.
   */
  retryThreshold?: number;
  /**
   * After a certain number of failures, delay this long before restarting workers.
   */
  retryDelay?: number;
  /**
   * If a process runs for less than this time, it's considered a failure.
   */
  failureThreshold?: number;
  /**
   * Optional path to a worker executable, in which case this nOTP instance
   * will spawn workers using the `child_process` module, as opposed to the
   * `cluster` module, and the passed `app` function will be ignored, implying
   * that sockets will not be automatically shared among processes.
   */
  worker?: string;
  /**
   * Command line arguments for worker executable. Must be specified if
   * `worker` is present.
   */
  workerArgs?: string[];
}

export function serve(options: ScaleOptions, app?: () => void): void {
  var i, startTimes = {}, failures = 0;
  options = merge({
    cores: defaultCores,
    retryThreshold: 23,
    retryDelay: 10000,
    failureThreshold: 5000
  }, options);

  function pid(worker) {
    return options.worker ? worker.pid : worker.process.pid;
  }

  function spawnMore() {
    var worker;
    if (options.worker) {
      worker = child.fork(options.worker, options.workerArgs);
      // console.log("Spawning worker as child process:", options.worker, options.workerArgs);
    } else {
      worker = cluster.fork();
      // console.log("Spawning worker in cluster.");
    }

    startTimes[pid(worker)] = Date.now();
    if (!options.worker) {
      worker.on("listening", (addr) =>
                console.log("Process", pid(worker), "is now listening on",
                            addr.address + ":" + addr.port));
    }

    // Enable Erlang mode
    worker.on("exit", (code, signal) => {
      var replacement, lifetime = Date.now() - startTimes[pid(worker)];
      delete startTimes[pid(worker)];

      if (worker.suicide) {
        console.log("Worker", pid(worker), "terminated voluntarily.");
        return;
      }

      console.log("Process", pid(worker), "terminated with signal", signal,
                  "code", code + "; restarting.");

      if (lifetime < options.failureThreshold) {
        failures++;
      } else {
        failures = 0;
      }

      if (failures > options.retryThreshold) {
        console.log(failures + " consecutive failures; pausing for",
                    options.retryDelay + "ms before respawning.");
      }

      setTimeout(() => {
        replacement = spawnMore();
        replacement.on("online", () =>
                       console.log("Process", replacement.process.pid,
                                   "has successfully replaced", pid(worker)));
      }, (failures > options.retryThreshold) ? options.retryDelay : 0);
    });

    return worker;
  }

  if (cluster.isMaster) {
    // Spawn more overlords
    for (i = 0; i < options.cores; i++) {
      spawnMore();
    }

    console.log("Spawned", options.cores, options.worker ? "worker processes."
                : "server instances.");
  } else {
    options.worker || app();
  }
}
