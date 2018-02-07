# redis-server

This project adheres to [Semantic Versioning](http://semver.org/). Notable
changes to this project will be documented in this file for which the format
is based on [Keep a Changelog](http://keepachangelog.com/).

---

### [1.2.0][] — 2018-02-07

#### Added

- Change log entries for releases prior to 1.0.0
- Add support for Redis 4.0

#### Changed

- Change log format based on [http://keepachangelog.com/en/0.3.0/]()
- Update dependencies
  - promise-queue 2.2.5
- Update dev dependencies
  - chai 4.1.2
  - coveralls 3.0.0
  - eslint 4.17.0
  - mocha 5.0.0
  - remark-cli 5.0.0
  - remark-preset-lint-recommended 3.0.1
- Change test framework from istanbul to nyc
- Update test matrix; remove Node.js v5 and v7; add Node.js v9

#### Fixed

- `UnhandledPromiseRejectionWarning` errors appear when some tests fail
-  `#open()` returning an unresolved promise due to "Can't chdir to '...': No
such file or directory" errors

---

### [1.1.0][] — 2017-01-07

#### Added

- Change log
- “opening” and “closing” events

#### Changed

- Update dev dependencies
  - eslint 3.13.0

#### Fixed

- `#isClosing` not set to `true` when a server is closing due to a
start-up error

---

### [1.0.0][] — 2017-01-05

#### Added

- Code coverage: 100% ✨

#### Changed

- Lint JavaScript with eslint

#### Fixed

- `RedisServer~Config#bin` not working with `RedisServer~Config#conf`
- `#open()` and `#close()` race conditions
- Callbacks not receiving arguments
- `UnhandledPromiseRejectionWarning` when an error is thrown in a callback

---

### [0.4.0][] — 2016-12-05

#### Added

- Support for `--slaveof` (`RedisServer~Config#slaveof`)
- Lint markdown with remark

---

### [0.3.0][] — 2016-12-02

#### Added

- `#open()` and `#close()` return a `Promise`

#### Changed

- Accept port as a string or number

#### Fixed

- Process EventEmitter memory leak
- Errors when calling `#open()` or `#close()` repetitiously

---

### [0.2.0][] — 2016-11-26

#### Added

- MIT License
- Code coverage report
- Support for a Redis server binary path (`RedisServer~Config#bin`)
- Support for a Redis configuration file path (`RedisServer~Config#conf`)
- Lint JavaScript with jshint
- “open”, “close”, and “stdout” events

---

### [0.1.0][] — 2016-11-26

#### Added

- CI build testing and status report

#### Changed

- Refactor ES5 to ES6

#### Deprecated

- Support for Node.js versions below 4.0.0

---

### [0.0.3][] — 2016-04-30

#### Added

- Use port number 6379 when the constructor argument `configOrPort` is undefined

---

### [0.0.2][] — 2016-04-25

#### Added

- Support for Node.js >= 0.10.0

---

### [0.0.1][] — 2014-05-06

#### Added

- Initial release

[Unreleased]: https://github.com/BrandonZacharie/node-redis-server/compare/1.2.0...HEAD
[1.2.0]: https://github.com/BrandonZacharie/node-redis-server/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/BrandonZacharie/node-redis-server/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.4.0...1.0.0
[0.4.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.3...0.1.0
[0.0.3]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.2...0.0.3
[0.0.2]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.1...0.0.2
[0.0.1]: https://github.com/BrandonZacharie/node-redis-server/compare/47c1d...0.0.1
