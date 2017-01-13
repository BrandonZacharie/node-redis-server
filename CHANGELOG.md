# Change Log

This project adheres to [Semantic Versioning](http://semver.org/). Notable changes to this project will be documented in this file for which the format
is based on [Keep a Changelog](http://keepachangelog.com/).

---

## [Unreleased][]

### <sub>Added

- Change log entries for releases prior to 1.0.0

### <sub>Changed

- Change log format based on [http://keepachangelog.com/en/0.3.0/]()

### <sub>Fixed

- `UnhandledPromiseRejectionWarning` errors appear when some tests fail

---

## [1.1.0][] — 2017-01-07

### <sub>Added

- Change log
- “opening” and “closing” events

### <sub>Changed

- Update dev dependencies
  - eslint 3.13.0

### <sub>Fixed

- `#isClosing` not set when a server is closing due to a start-up error

---

## [1.0.0][] — 2017-01-05

### <sub>Added

- Code coverage: 100% ✨

### <sub>Changed

- Lint JavaScript with eslint

### <sub>Fixed

- `RedisServer~Config#bin` not working with `RedisServer~Config#conf`
- `#open()` and `#close()` race conditions
- Callbacks not receiving arguments
- `UnhandledPromiseRejectionWarning` when an error is thrown in a callback

---

## [0.4.0][] — 2016-12-05

### <sub>Added

- Support for `--slaveof` (`RedisServer~Config#slaveof`)
- Lint markdown with remark

---

## [0.3.0][] — 2016-12-02

### <sub>Added

- `#open()` and `#close()` return a `Promise`

### <sub>Changed

- Accept port as a string or number

### <sub>Fixed

- Process EventEmitter memory leak
- Errors when calling `#open()` or `#close()` repetitiously

---

## [0.2.0][] — 2016-11-26

### <sub>Added

- MIT License
- Code coverage report
- Support for a Redis server binary path (`RedisServer~Config#bin`)
- Support for a Redis configuration file path (`RedisServer~Config#conf`)
- Lint JavaScript with jshint
- “open”, “close”, and “stdout” events

---

## [0.1.0][] — 2016-11-26

### <sub>Added

- CI build testing and status report

### <sub>Changed

- Refactor ES5 to ES6

### <sub>Deprecated

- Support for Node.js versions below 4.0.0

---

## [0.0.3][] — 2016-04-30

### <sub>Added

- Use port number 6379 when the constructor argument `configOrPort` is undefined

## [0.0.2][] — 2016-04-25

### <sub>Added

- Support for Node.js >= 0.10.0

---

## [0.0.1][] — 2014-05-06

### <sub>Added

- Initial release

---

[Unreleased]: https://github.com/BrandonZacharie/node-redis-server/compare/1.1.0...HEAD
[1.1.0]: https://github.com/BrandonZacharie/node-redis-server/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.4.0...1.0.0
[0.4.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.3.0...0.4.0
[0.3.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.2.0...0.3.0
[0.2.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.1.0...0.2.0
[0.1.0]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.3...0.1.0
[0.0.3]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.2...0.0.3
[0.0.2]: https://github.com/BrandonZacharie/node-redis-server/compare/0.0.1...0.0.2
[0.0.1]: https://github.com/BrandonZacharie/node-redis-server/compare/47c1d...0.0.1
