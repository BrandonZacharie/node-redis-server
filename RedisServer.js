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
const PromiseQueue = require('promise-queue');
const keyRE = /now\sready|already\sin\suse|not\slisten|error|denied/ig;
const whiteSpaceRE = / /ig;

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

    if (typeof source === 'number' || typeof source === 'string') {
      target.port = source;

      return target;
    }

    if (source == null || typeof source !== 'object') {
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
   * @return {Promise}
   */
  static open(server) {
    if (server.isOpening) {
      return server.openPromise;
    }

    server.isOpening = true;
    server.isClosing = false;
    server.openPromise = server.promiseQueue.add(() => {
      if (server.isClosing || server.isRunning) {
        server.isOpening = false;

        return Promise.resolve(null);
      }

      return new Promise((resolve, reject) => {
        server.emit('opening');

        server.process = childprocess.spawn(
          server.config.bin,
          RedisServer.parseFlags(server.config)
        );

        /**
         * Parse a given {@linkcode match} and return a {@linkcode Boolean}
         * indicating if more are expected. Returns {@linkcode true} when a
         * given {@linkcode match} results in the current {@link Promise}
         * being resolved or rejected.
         * @argument {String} match
         * @return {Boolean}
         */
        const matchHandler = (match) => {
          let err = null;

          switch (match.replace(whiteSpaceRE, '').toLowerCase()) {
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

            case 'nowready':
              server.isRunning = true;

              server.emit('open');

              break;

            default:
              // istanbul ignore next
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

        /**
         * A handler to parse data from the server's stdout and forward
         * {@link keyRE} matches to {@link matchHandler} until resolves
         * or rejects the current {@link Promise}.
         * @argument {Buffer} data
         * @return {undefined}
         */
        const dataHandler = (data) => {
          const matches = data.toString().match(keyRE);

          if (matches !== null) {
            for (let match of matches) {
              if (matchHandler(match)) {
                server.process.stdout.removeListener('data', dataHandler);

                return;
              }
            }
          }
        };

        /**
         * A handler to close the server when the current process exits.
         * @return {undefined}
         */
        const exitHandler = () => {
          // istanbul ignore next
          server.close();
        };

        server.process.stdout.on('data', dataHandler);
        server.process.on('close', () => {
          server.process = null;
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
    });

    return server.openPromise;
  }

  /**
   * Stop a given {@link RedisServer}.
   * @protected
   * @argument {RedisServer} server
   * @return {Promise}
   */
  static close(server) {
    if (server.isClosing) {
      return server.closePromise;
    }

    server.isClosing = true;
    server.isOpening = false;
    server.closePromise = server.promiseQueue.add(() => {
      if (server.isOpening || !server.isRunning) {
        server.isClosing = false;

        return Promise.resolve(null);
      }

      return new Promise((resolve) => {
        server.emit('closing');
        server.process.once('close', () => resolve(null));
        server.process.kill();
      });
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
    this.config = RedisServer.parseConfig(configOrPort, {
      bin: 'redis-server',
      conf: null,
      port: 6379,
      slaveof: null
    });

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
     * A serial queue of open and close promises.
     * @protected
     * @type {PromiseQueue}
     */
    this.promiseQueue = new PromiseQueue(1);

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
  }

  /**
   * Open the server.
   * @argument {RedisServer~callback} [callback]
   * @return {Promise}
   */
  open(callback) {
    const promise = RedisServer.open(this);

    return typeof callback === 'function'
    ? promise
      .then((v) => callback(null, v))
      .catch((e) => callback(e, null))
    : promise;
  }

  /**
   * Close the server.
   * @argument {RedisServer~callback} [callback]
   * @return {Promise}
   */
  close(callback) {
    const promise = RedisServer.close(this);

    return typeof callback === 'function'
    ? promise
      .then((v) => callback(null, v))
      .catch((e) => callback(e, null))
    : promise;
  }
}

module.exports = exports = RedisServer;
