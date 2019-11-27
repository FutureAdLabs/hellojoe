import { ServeContext } from "./hellojoe";
import { handleExit, pid } from "./shared";
import * as cluster from "cluster";

export default function spawn(this: ServeContext): cluster.Worker {
  const worker = cluster.fork()
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
