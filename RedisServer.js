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

/**
 * Emitted when a Redis server prints to stdout.
 * @event RedisServer#stdout
 */

/**
 * Emitted when attempting to start a Redis server.
 * @event RedisServer#opening
 */

/**
 * Emitted when a Redis server becomes ready to service requests.
 * @event RedisServer#open
 */

/**
 * Emitted when attempting to stop a Redis server.
 * @event RedisServer#closing
 */

/**
 * Emitted once a Redis server has stopped.
 * @event RedisServer#close
 */

const childprocess = require('child_process');
const events = require('events');
const PromiseQueue = require('promise-queue');
const regExp = {
  terminalMessages: [
    /ready\s+to\s+accept/im,
    /can't\s+set\s+maximum\s+open\s+files\s+to\s+\d+\s+because\s+of\s+OS\s+error/im,
    /already\s+in\s+use|not\s+listen|error|denied|can't/im
  ],
  errorMessage: /#\s+(.*error|can't.*)/im,
  comma: /,/g,
  digit: /\d+/g,
  quoteMark: /'/g,
  whiteSpace: /\s/g,
  multipleWhiteSpace: /\s\s+/g
};

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
   * Parse Redis server output for terminal messages.
   * @protected
   * @argument {String} string
   * @return {Object}
   */
  static parseData(string) {
    const matches = regExp.terminalMessages
      .map((re) => re.exec(string))
      .find((m) => m !== null);

    if (matches == null) {
      return null;
    }

    const match = matches.pop();
    const result = {
      err: null,
      key: match
        .replace(regExp.whiteSpace, '')
        .replace(regExp.quoteMark, '')
        .replace(regExp.comma, '')
        .replace(regExp.digit, '')
        .toLowerCase()
    };

    switch (result.key) {
      case 'readytoaccept':
        break;

      case 'alreadyinuse':
        result.err = new Error('Address already in use');
        result.err.code = -1;

        break;

      case 'denied':
        result.err = new Error('Permission denied');
        result.err.code = -2;

        break;

      case 'notlisten':
        result.err = new Error('Invalid port number');
        result.err.code = -3;

        break;

      case 'cant':
      case 'error':
        result.err = new Error(
          regExp.errorMessage
            .exec(string)
            .pop()
            .replace(regExp.multipleWhiteSpace, ' ')
        );
        result.err.code = -3;

        break;

      case 'cantsetmaximumopenfilestobecauseofoserror':
        return this.parseData(string.replace(match, ''));
    }

    return result;
  }

  /**
   * Start a given {@linkcode server}.
   * @protected
   * @fires RedisServer#stdout
   * @fires RedisServer#opening
   * @fires RedisServer#open
   * @fires RedisServer#closing
   * @fires RedisServer#close
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
        /**
         * A listener for the current server process' stdout that resolves or
         * rejects the current {@link Promise} when done.
         * @see RedisServer.parseData
         * @argument {Buffer} buffer
         * @return {undefined}
         */
        const dataListener = (buffer) => {
          const result = RedisServer.parseData(buffer.toString());

          if (result === null) {
            return;
          }

          server.process.stdout.removeListener('data', dataListener);

          server.isOpening = false;

          if (result.err === null) {
            server.isRunning = true;

            server.emit('open');
            resolve(null);
          }
          else {
            server.isClosing = true;

            server.emit('closing');
            server.process.once('close', () => reject(result.err));
          }
        };

        /**
         * A listener to close the server when the current process exits.
         * @return {undefined}
         */
        const exitListener = () => {
          // istanbul ignore next
          server.close();
        };

        server.emit('opening');

        server.process = childprocess.spawn(
          server.config.bin,
          RedisServer.parseFlags(server.config)
        );

        server.process.stdout.on('data', dataListener);
        server.process.on('close', () => {
          server.process = null;
          server.isRunning = false;
          server.isClosing = false;

          process.removeListener('exit', exitListener);
          server.emit('close');
        });
        server.process.stdout.on('data', (data) => {
          server.emit('stdout', data.toString());
        });
        process.on('exit', exitListener);
      });
    });

    return server.openPromise;
  }

  /**
   * Stop a given {@linkcode server}.
   * @protected
   * @fires RedisServer#closing
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

    if (typeof callback === 'function') {
      return promise
        .then((v) => callback(null, v))
        .catch((e) => callback(e, null));
    }

    return promise;
  }

  /**
   * Close the server.
   * @argument {RedisServer~callback} [callback]
   * @return {Promise}
   */
  close(callback) {
    const promise = RedisServer.close(this);

    if (typeof callback === 'function') {
      return promise
        .then((v) => callback(null, v))
        .catch((e) => callback(e, null));
    }

    return promise;
  }
}

module.exports = exports = RedisServer;
