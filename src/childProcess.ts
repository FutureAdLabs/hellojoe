import { ServeContext } from "./hellojoe";
import * as children from "child_process";
import { handleExit, pid } from "./shared";

export default function spawn(this: ServeContext): children.ChildProcess {
  const worker = children.fork(this.options.worker, this.options.workerArgs)
  this.log.debug(
    "Spawning worker %s as child process: %j %j",
    pid(worker),
    this.options.worker,
    this.options.workerArgs
  );

  this.startTimes[pid(worker)] = Date.now();
  
  worker.on("exit", handleExit.bind(this, worker))
  return worker
}

