'use strict';

/**
 * Represents configuration options for `RedisServer`.
 * @typedef {Object} Config
 * @property {(Number|String)} [port=6379]
 * @property {String} [bin='redis-server']
 * @property {String} [conf=null]
 */

/**
 * A function invoked when an operation (i.e. `open()`) completes.
 * @typedef {Function} RedisServer~callback
 */

const childprocess = require('child_process');
const keyRE = /(port:\s+\d+)|(pid:\s+\d+)|(already\s+in\s+use)|(not\s+listen)|error|denied/ig;
const strRE = / /ig;

/**
 * Start and stop a Redis server like a boss.
 * @class
 */
module.exports = class RedisServer {
  /**
   * Construct a new `RedisServer`.
   * @argument {(Number|Config)} [configOrPort]
   */
  constructor(configOrPort) {
    /**
     * Configuration options.
     * @private
     * @type {Config}
     */
    this.config = { port: 6379, bin: 'redis-server', conf: null };

    /**
     * The current process ID.
     * @private
     * @type {Number}
     */
    this.pid = null;

    /**
     * The port the Redis server is currently bound to.
     * @private
     * @type {Number}
     */
    this.port = null;

    /**
     * The current process.
     * @private
     * @type {Object}
     */
    this.process = null;

    /**
     * Determine if the instance is closing a Redis server; true while a process
     * is being killed until the contained Redis server closes.
     * @type {Boolean}
     */
    this.isClosing = false;

    /**
     * Determine if the instance is starting a Redis server; true while a
     * process is spawning until a Redis server starts or errs.
     * @type {Boolean}
     */
    this.isRunning = false;

    /**
     * Determine if the instance is running a Redis server; true once a process
     * has spawned and the contained Redis server is ready to service requests.
     * @type {Boolean}
     */
    this.isOpening = false;

    if (configOrPort == null) {
      return;
    }

    if (typeof configOrPort === 'number') {
      this.config.port = configOrPort;

      return;
    }

    if (typeof configOrPort !== 'object') {
      return;
    }

    if (configOrPort.conf != null) {
      this.config.conf = configOrPort.conf;

      return;
    }

    if (configOrPort.port != null) {
      this.config.port = configOrPort.port;
    }

    if (configOrPort.bin != null) {
      this.config.bin = configOrPort.bin;
    }
  }

  /**
   * Start a redis server.
   * @argument {RedisServer~callback}
   * @return {Boolean}
   */
  open(callback) {
    if (this.isOpening || this.process !== null) {
      if (callback) {
        callback(null);
      }

      return false;
    }

    const flags = [];

    if (this.config.conf === null) {
      flags.push('--port', this.config.port);
    }
    else {
      flags.push(this.config.conf);
    }

    this.process = childprocess.spawn(this.config.bin, flags);
    this.isOpening = true;

    const matchHandler = (value) => {
      const t = value.split(':');
      const k = t[0].replace(strRE, '').toLowerCase();
      const v = t[1];
      let err = null;

      switch (k) {
        case 'alreadyinuse':
          err = new Error('Address already in use');
          err.code = -1;

          break;

        case 'denied':
          err = new Error('Permission denied');
          err.code = -2;

          break;

        case 'error':
        case 'notlisten':
          err = new Error('Invalid port number');
          err.code = -3;

          break;

        case 'pid':
        case 'port':
          this[k] = Number(v);

          if (!(this.port === null || this.pid === null)) {
            this.isRunning = true;

            break;
          }

          return false;

        default:
          return false;
      }

      this.isOpening = false;

      if (callback) {
        callback(err);
      }

      return true;
    };

    const dataHandler = (value) => {
      const matches = value.toString().match(keyRE);

      if (matches !== null) {
        for (let match of matches) {
          if (matchHandler(match)) {
            this.process.stdout.removeListener('data', dataHandler);

            return;
          }
        }
      }
    };

    this.process.stdout.on('data', dataHandler);
    this.process.on('close', () => {
      this.process = null;
      this.port = null;
      this.pid = null;
      this.isRunning = false;
      this.isClosing = false;
    });
    process.on('exit', () => {
      this.close();
    });

    return true;
  }

  /**
   * Stop a redis server.
   * @argument {RedisServer~callback}
   * @return {Boolean}
   */
  close(callback) {
    if (this.isClosing || this.process === null) {
      if (callback) {
        callback(null);
      }

      return false;
    }

    this.isClosing = true;

    if (callback) {
      this.process.on('close', () => {
        callback(null);
      });
    }

    this.process.kill();

    return true;
  }
};
