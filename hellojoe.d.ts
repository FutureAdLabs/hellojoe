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
    * Optional path to a worker executable, in which case this Hello Joe instance
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
export declare function serve(options: ScaleOptions, app?: () => void): void;
