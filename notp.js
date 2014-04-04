var cluster = require("cluster");
var merge = require("merge");

var defaultCores = require("os").cpus().length;

function serve(options, app) {
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
        worker.on("listening", function (addr) {
            return console.log("Process", worker.process.pid, "is now listening on", addr.address + ":" + addr.port);
        });
        return worker;
    }

    if (cluster.isMaster) {
        for (i = 0; i < options.cores; i++) {
            spawnMore();
        }

        // Enable Erlang mode
        cluster.on("exit", function (worker, code, signal) {
            var replacement, lifetime = Date.now() - startTimes[worker.id];
            delete startTimes[worker.id];

            if (worker.suicide) {
                console.log("Worker", worker.process.pid, "terminated voluntarily.");
                return;
            }

            console.log("Process", worker.process.pid, "terminated with signal", signal, "code", code + "; restarting.");

            if (lifetime < options.failureThreshold) {
                failures++;
            } else {
                failures = 0;
            }

            if (failures > options.retryThreshold) {
                console.log(failures + " consecutive failures; pausing for", options.retryDelay + "ms before respawning.");
            }

            setTimeout(function () {
                replacement = spawnMore();
                replacement.on("online", function () {
                    return console.log("Process", replacement.process.pid, "has successfully replaced", worker.process.pid);
                });
            }, (failures > options.retryThreshold) ? options.retryDelay : 0);
        });

        console.log("Spawned", options.cores, "instances.");
    } else {
        app();
    }
}
exports.serve = serve;
//# sourceMappingURL=notp.js.map
