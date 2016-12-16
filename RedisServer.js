'use strict';

/**
 * Configuration options for a {@link RedisServer}.
 * @typedef {Object} RedisServer~Config
 * @property {String} [bin=redis-server]
 * @property {String} [conf]
 * @property {(Number|String)} [port=6379]
 * @property {(String)} [slaveof]
 */

/**
 * Invoked when an operation (i.e. {@link RedisServer#open}) completes.
 * @callback RedisServer~callback
 * @argument {Error} err
 */

const childprocess = require('child_process');
const events = require('events');
const keyRE = /(port:\s+\d+)|(pid:\s+\d+)|(already\s+in\s+use)|(not\s+listen)|error|denied/ig;
const strRE = / /ig;

/**
 * Start and stop a local Redis server like a boss.
 * @class
 */
class RedisServer extends events.EventEmitter {

  /**
   * Populate a given {@link RedisServer~Config} with values from a
   * given {@link RedisServer~Config}.
   * @protected
   * @argument {RedisServer~Config} source
   * @argument {RedisServer~Config} target
   * @return {RedisServer~Config}
   */
  static parseConfig(source, target) {
    if (target == null) {
      target = Object.create(null);
    }

    if (source == null) {
      return target;
    }

    if (source.bin != null) {
      target.bin = source.bin;
    }

    if (source.conf != null) {
      target.conf = source.conf;

      return target;
    }

    if (source.slaveof != null) {
      target.slaveof = source.slaveof;
    }

    if (source.port != null) {
      target.port = source.port;
    }

    return target;
  }

  /**
   * Parse process flags for Redis from a given {@link RedisServer~Config}.
   * @protected
   * @argument {RedisServer~Config} config
   * @return {Array.<String>}
   */
  static parseFlags(config) {
    if (config.conf != null) {
      return [config.conf];
    }

    const flags = [];

    if (config.port != null) {
      flags.push(`--port ${config.port}`);
    }

    if (config.slaveof != null) {
      flags.push(`--slaveof ${config.slaveof}`);
    }

    return flags;
  }

  /**
   * Start a given {@link RedisServer}.
   * @protected
   * @argument {RedisServer} server
   * @argument {Boolean} isCallback
   * @return {Promise}
   */
  static open(server, isCallback) {
    if (server.isClosing) {
      server.openPromise = new Promise((resolve, reject) => {
        const open = () =>
          RedisServer.open(server, true).then(resolve).catch(reject);

        server.isClosing = false;
        server.isOpening = true;

        server.closePromise.then(open).catch(open);
      });

      return server.openPromise;
    }

    if (server.isOpening && !isCallback || server.isRunning) {
      return server.openPromise;
    }

    server.openPromise = new Promise((resolve, reject) => {
      server.isOpening = true;

      server.emit('opening');

      server.process = childprocess.spawn(
        server.config.bin,
        RedisServer.parseFlags(server.config)
      );

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
            server[k] = Number(v);

            if (!(server.port === null || server.pid === null)) {
              server.isRunning = true;

              server.emit('open');

              break;
            }

            return false;

          default:
            return false;
        }

        server.isOpening = false;

        if (err === null) {
          resolve(null);
        }
        else {
          reject(err);
        }

        return true;
      };

      const dataHandler = (value) => {
        const matches = value.toString().match(keyRE);

        if (matches !== null) {
          for (let match of matches) {
            if (matchHandler(match)) {
              return server.process.stdout.removeListener('data', dataHandler);
            }
          }
        }
      };

      const exitHandler = () => {
        server.close();
      };

      server.process.stdout.on('data', dataHandler);
      server.process.on('close', () => {
        server.process = null;
        server.port = null;
        server.pid = null;
        server.isRunning = false;
        server.isClosing = false;

        process.removeListener('exit', exitHandler);
        server.emit('close');
      });
      server.process.stdout.on('data', (data) => {
        server.emit('stdout', data.toString());
      });
      process.on('exit', exitHandler);
    });

    return server.openPromise;
  }

  /**
   * Stop a given {@link RedisServer}.
   * @protected
   * @argument {RedisServer} server
   * @argument {Boolean} isCallback
   * @return {Promise}
   */
  static close(server, isCallback) {
    if (server.isOpening) {
      server.closePromise = new Promise((resolve, reject) => {
        const close = () =>
          exports.close(server, true).then(resolve).catch(reject);

        server.isOpening = false;
        server.isClosing = true;

        server.openPromise.then(close).catch(close);
      });

      return server.closePromise;
    }

    if (server.isClosing && !isCallback || !server.isRunning) {
      return server.closePromise;
    }

    server.closePromise = new Promise((resolve) => {
      server.isClosing = true;

      server.emit('closing');
      server.process.once('close', () => resolve(null));
      server.process.kill();
    });

    return server.closePromise;
  }

  /**
   * Construct a new {@link RedisServer}.
   * @argument {(Number|String|RedisServer~Config)} [configOrPort]
   * A number or string that is a port or an object for configuration.
   */
  constructor(configOrPort) {
    super();

    /**
     * Configuration options.
     * @protected
     * @type {RedisServer~Config}
     */
    this.config = {
      bin: 'redis-server',
      conf: null,
      port: 6379,
      slaveof: null,
    };

    /**
     * The current {@link RedisServer#process} identifier.
     * @protected
     * @type {Number}
     */
    this.pid = null;

    /**
     * The port the Redis server is currently bound to.
     * @protected
     * @type {Number}
     */
    this.port = null;

    /**
     * The current process.
     * @protected
     * @type {ChildProcess}
     */
    this.process = null;

    /**
     * The last {@link Promise} returned by {@link RedisServer#open}.
     * @protected
     * @type {Promise}
     */
    this.openPromise = Promise.resolve(null);

    /**
     * The last {@link Promise} returned by {@link RedisServer#close}.
     * @protected
     * @type {Promise}
     */
    this.closePromise = Promise.resolve(null);

    /**
     * Determine if the instance is closing a Redis server; {@linkcode true}
     * while a process is being, or about to be, killed until the
     * contained Redis server either closes or errs.
     * @readonly
     * @type {Boolean}
     */
    this.isClosing = false;

    /**
     * Determine if the instance is starting a Redis server; {@linkcode true}
     * while a process is spawning, or about tobe spawned, until the
     * contained Redis server either starts or errs.
     * @readonly
     * @type {Boolean}
     */
    this.isRunning = false;

    /**
     * Determine if the instance is running a Redis server; {@linkcode true}
     * once a process has spawned and the contained Redis server is ready
     * to service requests.
     * @readonly
     * @type {Boolean}
     */
    this.isOpening = false;

    // Parse the given {RedisServer~Config}.
    if (typeof configOrPort === 'number' || typeof configOrPort === 'string') {
      this.config.port = configOrPort;
    }
    else if (typeof configOrPort === 'object') {
      RedisServer.parseConfig(configOrPort, this.config);
    }
  }

  /**
   * Open the server.
   * @argument {RedisServer~callback} [callback]
   * @return {Promise}
   */
  open(callback) {
    const promise = RedisServer.open(this, false);

    if (typeof callback === 'function') {
      promise.then(callback).catch(callback);
    }

    return promise;
  }

  /**
   * Close the server.
   * @argument {RedisServer~callback} [callback]
   * @return {Promise}
   */
  close(callback) {
    const promise = RedisServer.close(this, false);

    if (typeof callback === 'function') {
      promise.then(callback).catch(callback);
    }

    return promise;
  }
}

module.exports = exports = RedisServer;
