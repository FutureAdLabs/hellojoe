declare var require: (module: string) => any;

var cluster = require("cluster");
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
   * Path to worker executable; defaults to same as master.
   *
   * If different from master, nOTP is not guaranteed to call the
   * worker function you pass in. Presumably, this is desired.
   */
  worker?: string;
  /**
   * Command line arguments for worker executable; defaults to same as master.
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

  function spawnMore() {
    var worker = cluster.fork();
    startTimes[worker.id] = Date.now();
    worker.on("listening", (addr) =>
              console.log("Process", worker.process.pid, "is now listening on",
                          addr.address + ":" + addr.port));
    return worker;
  }

  if (cluster.isMaster) {
    var masterOpts: any = {};
    if (options.worker) masterOpts.exec = options.worker;
    if (options.workerArgs) masterOpts.args = options.workerArgs;
    cluster.setupMaster(masterOpts);

    // Spawn more overlords
    for (i = 0; i < options.cores; i++) {
      spawnMore();
    }
    // Enable Erlang mode
    cluster.on("exit", (worker, code, signal) => {
      var replacement, lifetime = Date.now() - startTimes[worker.id];
      delete startTimes[worker.id];

      if (worker.suicide) {
        console.log("Worker", worker.process.pid, "terminated voluntarily.");
        return;
      }

      console.log("Process", worker.process.pid, "terminated with signal", signal,
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
                                   "has successfully replaced", worker.process.pid));
      }, (failures > options.retryThreshold) ? options.retryDelay : 0);
    });

    console.log("Spawned", options.cores, "instances.");
  } else {
    app();
  }
}
