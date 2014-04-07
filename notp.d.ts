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
export declare function serve(options: ScaleOptions, app?: () => void): void;
