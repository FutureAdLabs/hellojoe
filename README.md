Hello Joe
=========

Hello Joe is built on top of Node's `cluster` module to manage worker
processes. It allows you to write your application in a vaguely Erlang
like style, where if something goes wrong, crashing the whole process
is the acceptable and preferred way of handling it.

## Usage

Call `hellojoe.serve` with a configuration object (can be null, the
defaults are OK) and a function containing your main application code.
It should be the first and only thing your application does. Do *not*
initialise any resources before calling this function. The worker
processes will run your function, and anything outside of it gets run
by both worker processes and the master process. You don't want the
master process to do any work other than starting worker processes.

Thanks to the `cluster` module, any network sockets your subprocesses
initialise will be shared between them.

```js
var hellojoe = require("hellojoe");

hellojoe.serve({}, function app() {
   /// my application code goes here
});
```

Hello Joe will launch a number of subprocesses running the provided
function, and the master process will be left in charge of monitoring
them and restarting them as necessary.

The configuration object you provide is merged with these default
values:

```js
{
  // n == the physical number of cores on the running machine
  cores: n,
  // minimum lifetime (ms) of a process not considered a failure
  failureThreshold: 5000,
  // amount of consecutive failures before retryDelay is triggered
  retryThreshold: 23,
  // delay (ms) before spawning processes after consecutive failures
  retryDelay: 10000,
  // optional filename to execute as worker process, replacing the function
  worker: null,
  // if worker is specified, command line arguments can be provided
  workerArgs: []
}
```

Please note that if you specify a worker script, it will be executed
using the `child_process` module, not the `cluster` module, meaning
that sockets won't be automatically shared between worker processes.

# License

Copyright 2014 Future Ad Labs Ltd

Licensed under the Apache License, Version 2.0 (the "License"); you
may not use this file except in compliance with the License. You may
obtain a copy of the License at
[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0).

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
implied. See the License for the specific language governing
permissions and limitations under the License.
