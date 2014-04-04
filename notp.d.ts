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
}
export declare function serve(options: ScaleOptions, app: () => void): void;
