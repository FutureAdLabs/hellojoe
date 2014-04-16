var cluster = require("cluster");
var child = require("child_process");
var merge = require("merge");
var log = require("winston");

var defaultCores = require("os").cpus().length;

function serve(options, app) {
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
            log.debug("Spawning worker %s as child process: %j %j", pid(worker), options.worker, options.workerArgs);
        } else {
            worker = cluster.fork();
            log.debug("Spawning worker in cluster:", pid(worker));
        }

        startTimes[pid(worker)] = Date.now();
        if (!options.worker) {
            worker.on("listening", function (addr) {
                return log.info("Process", pid(worker), "is now listening on", addr.address + ":" + addr.port);
            });
        }

        // Enable Erlang mode
        worker.on("exit", function (code, signal) {
            var replacement, lifetime = Date.now() - startTimes[pid(worker)];
            delete startTimes[pid(worker)];

            if (worker.suicide) {
                log.info("Worker", pid(worker), "terminated voluntarily.");
                return;
            }

            log.info("Process", pid(worker), "terminated with signal", signal, "code", code + "; restarting.");

            if (lifetime < options.failureThreshold) {
                failures++;
            } else {
                failures = 0;
            }

            if (failures > options.retryThreshold) {
                log.warn(failures + " consecutive failures; pausing for", options.retryDelay + "ms before respawning.");
            }

            setTimeout(function () {
                replacement = spawnMore();
                replacement.on("online", function () {
                    return log.info("Process", replacement.process.pid, "has successfully replaced", pid(worker));
                });
            }, (failures > options.retryThreshold) ? options.retryDelay : 0);
        });

        return worker;
    }

    if (cluster.isMaster) {
        for (i = 0; i < options.cores; i++) {
            spawnMore();
        }

        log.info("Spawned", options.cores, options.worker ? "worker processes." : "server instances.");
    } else {
        log.handleExceptions();
        options.worker || app();
    }
}
exports.serve = serve;
//# sourceMappingURL=hellojoe.js.map
