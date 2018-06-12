'use strict';

const childprocess = require('child_process');
const fs = require('fs');
const chai = require('chai');
const mocha = require('mocha');
const RedisServer = require('./RedisServer');
const expect = chai.expect;
const after = mocha.after;
const before = mocha.before;
const describe = mocha.describe;
const it = mocha.it;

/**
 * Create a Redis configuration file for a given object.
 * @argument {Object} dict
 * @argument {String} name
 * @return {Promise}
 */
const createConf = (dict, name) => {
  let data = Object.keys(dict).reduce((s, k) => s += `${k} ${dict[k]}\n`, '');

  return promisify((done) => fs.writeFile(name, data, done));
};

/**
 * Get a random port number.
 * @return {Number}
 */
const generateRandomPort = () =>
  Math.floor(Math.random() * 10000) + 9000;

/**
 * Get a {@link Promise} that is resolved or rejected when the given
 * {@linkcode delegate} invokes the callback it is provided.
 * @argument {Function} delegate
 * @return {Promise}
 */
const promisify = (delegate) =>
  new Promise((resolve, reject) => {
    delegate((err, value) => {
      if (err == null) {
        resolve(value);
      }
      else {
        reject(err);
      }
    });
  });

/**
 * Expect a given {@linkcode server} to not be opening, closing, or running.
 * @argument {RedisServer} server
 * @return {undefined}
 */
const expectIdle = (server) => {
  expect(server.isOpening).to.equal(false);
  expect(server.isRunning).to.equal(false);
  expect(server.isClosing).to.equal(false);
};

/**
 * Expect a given {@linkcode server} to be running.
 * @argument {RedisServer} server
 * @return {undefined}
 */
const expectRunning = (server) => {
  expect(server.isOpening).to.equal(false);
  expect(server.isRunning).to.equal(true);
  expect(server.isClosing).to.equal(false);
  expect(server.process).to.not.equal(null);
};

/**
 * Attempt to start a given {@linkcode server} and expect it to be opening.
 * Passes {linkcode done} to {@link RedisServer#open}.
 * @argument {RedisServer} server
 * @argument {RedisServer~callback} [done]
 * @return {undefined}
 */
const expectToOpen = (server, done) => {
  const oldPromise = server.openPromise;
  const newPromise = server.open(done);

  expect(newPromise).to.be.a('promise');
  expect(newPromise).to.not.equal(oldPromise);
  expect(server.isOpening).to.equal(true);

  return newPromise;
};

/**
 * Attempt to stop a given {@linkcode server} and expect it be closing.
 * Passes {linkcode done} to {@link RedisServer#close}.
 * @argument {RedisServer} server
 * @argument {RedisServer~callback} [done]
 * @return {undefined}
 */
const expectToClose = (server, done) => {
  const oldPromise = server.openPromise;
  const newPromise = server.close(done);

  expect(newPromise).to.be.a('promise');
  expect(newPromise).to.not.equal(oldPromise);
  expect(server.isClosing).to.equal(true);

  return newPromise;
};

/**
 * Parse the port number from the stdout of a given {@linkcode server}.
 * @argument {RedisServer} server
 * @argument {Function} callback
 * @return {undefined}
 */
const parsePort = (server, callback) => {
  const portRegExp = /port(:|=)\s*\d+/ig;

  /**
   * A listener for stdout of the current server. Invokes {@linkcode callback}
   * with the first parsed {@linkcode portRegExp} match.
   * @argument {String} value
   * @return {undefined}
   */
  const listener = (value) => {
    const matches = value.match(portRegExp);

    if (matches !== null) {
      server.removeListener('stdout', listener);

      const value = matches[0]
        .split(':')
        .pop()
        .split('=')
        .pop();

      return callback(Number(value));
    }
  };

  server.on('stdout', listener);
};

describe('RedisServer', () => {
  let bin = null;
  const conf = `${new Date().toISOString()}.conf`;
  const port = generateRandomPort();
  const slaveof = `127.0.0.1 ${port}`;
  const bind = '127.0.0.1';

  before(() => Promise.all([
    promisify((done) => childprocess.exec('rm -rf *.rdb', done)),
    promisify((done) => childprocess.exec('rm -rf *.log', done)),
    promisify((done) => childprocess.exec('rm -rf *.conf', done))
  ]));
  before((done) => {
    childprocess.exec('pkill redis-server', () => done());
  });
  before((done) => {
    childprocess.exec('which redis-server', (err, stdout) => {
      bin = stdout.trim();

      done(err);
    });
  });
  before(() => createConf({ port, bind }, conf));
  after((done) => {
    fs.unlink(conf, done);
  });
  describe('.parseConfig()', () => {
    it('parses valid properties only', () => {
      const expectedObject = { bin, port, slaveof };
      const actualObject = RedisServer.parseConfig(
        Object.assign({ fu: 'bar' }, expectedObject)
      );

      expect(actualObject).to.eql(expectedObject);
    });
    it('parses bin and conf only when conf is given', () => {
      const expectedObject = { bin, conf, port, slaveof };
      const actualObject = RedisServer.parseConfig(expectedObject);

      expect(actualObject).to.have.property('bin').equal(expectedObject.bin);
      expect(actualObject).to.have.property('conf').equal(expectedObject.conf);
      expect(Object.keys(actualObject)).to.have.length(2);
    });
    it('works without arguments', () => {
      expect(RedisServer.parseConfig()).to.be.an('object');
      expect(RedisServer.parseConfig(null)).to.be.an('object');
      expect(RedisServer.parseConfig({ port: null })).to.be.an('object');
    });
    it('accepts a port as a string', () => {
      const port = '1234';
      const config = RedisServer.parseConfig(port);

      expect(config).to.have.property('port').equal(port);
    });
    it('accepts a port as a number', () => {
      const port = 1234;
      const config = RedisServer.parseConfig(port);

      expect(config).to.be.an('object').and.have.property('port').equal(port);
    });
    it('accepts a configuration object', () => {
      const expectedObject = { bin, port, slaveof };
      const actualObject = RedisServer.parseConfig(expectedObject);

      expect(actualObject).to.eql(expectedObject);
    });
  });
  describe('.parseFlags()', () => {
    it('returns an empty array when given an empty object', () => {
      expect(RedisServer.parseFlags({})).to.have.length(0);
    });
    it('parses all flags', () => {
      const config = { bin, port, slaveof };
      const actualFlags = RedisServer.parseFlags(config);
      const expectedFlags = [
        `--port ${config.port}`,
        `--slaveof ${config.slaveof}`
      ];

      expect(actualFlags).to.eql(expectedFlags);
    });
    it('returns only conf when present', () => {
      const config = { bin, conf, port, slaveof };

      expect(RedisServer.parseFlags(config)).to.eql([config.conf]);
    });
  });
  describe('.parseData()', () => {
    it('parses a "ready to accept connections" message', () => {
      const messages = [
        '25683:M 06 Jan 11:53:05.426 * The server is now ready \
        to accept connections on port 6379',
        '3792:M 07 Feb 01:14:17.079 * Ready to accept connections'
      ];

      for (let message of messages) {
        const result = RedisServer.parseData(message);

        expect(result).to.be.an('object').and.have.property('err');
        expect(result.err).to.equal(null);
      }
    });
    it('parses a "Address already in use" error', () => {
      const result = RedisServer.parseData(
        '26513:M 06 Jan 11:59:10.308 # Creating Server TCP \
        listening socket *:6379: bind: Address already in use'
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-1);
    });
    it('parses a "Permission denied" error', () => {
      const result = RedisServer.parseData(
        '26637:M 06 Jan 12:09:39.470 # Creating Server TCP \
        listening socket *:1: bind: Permission denied'
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-2);
    });
    it('parses a "Configured to not listen" error', () => {
      const result = RedisServer.parseData(
        '26559:M 06 Jan 12:05:09.961 # Configured to not listen \
        anywhere, exiting.'
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-3);
    });
    it('parses a "Fatal" error', () => {
      const result = RedisServer.parseData(
        '26939:C 06 Jan 12:15:11.241 # Fatal error, can\'t open \
        config file \'node_databases\''
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-3);
    });
    it('parses a "Unrecoverable" error', () => {
      const result = RedisServer.parseData(
        '27785:M 06 Jan 12:45:17.671 # Short read or OOM loading \
        DB. Unrecoverable error, aborting now.'
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-3);
    });
    it('returns `null` when given an unrecognized value', () => {
      const values = ['invalid', '', null, undefined, {}, 1234];

      for (let value of values) {
        expect(RedisServer.parseData(value)).to.equal(null);
      }
    });
    it('ignores errors when Redis starts successfully', () => {
      const result = RedisServer.parseData(
        '5443:C 07 Jun 08:14:15.149 # oO0OoO0OoO0Oo Redis is \
        starting oO0OoO0OoO0Oo \
        5443: C 07 Jun 08: 14: 15.149 # Redis version = 4.0.9, \
        bits = 64, commit = 00000000, modified = 0, pid = 5443, just started \
        5443: C 07 Jun 08: 14: 15.149 # Configuration loaded \
        5443: M 07 Jun 08: 14: 15.149 # You requested maxclients of 10000 \
        requiring at least 10032 max file descriptors. \
        5443: M 07 Jun 08: 14: 15.149 # Server can\'t set maximum open files \
        to 10032 because of OS error: Operation not permitted. \
        5443: M 07 Jun 08: 14: 15.149 # Current maximum open files is 4096. \
        maxclients has been reduced to 4064 to compensate for low ulimit. \
        If you need higher maxclients increase \'ulimit -n\'. \
        5443: M 07 Jun 08: 14: 15.149 * Running mode = standalone, \
        port = 6381. \
        5443: M 07 Jun 08: 14: 15.149 # WARNING: The TCP backlog setting of \
        511 cannot be enforced because / proc / sys / net / core / somaxconn \
        is set to the lower value of 128. \
        5443: M 07 Jun 08: 14: 15.149 # Server initialized \
        5443: M 07 Jun 08: 14: 15.149 # WARNING overcommit_memory is set to 0! \
        Background save may fail under low memory condition.To fix this issue \
        add \'vm.overcommit_memory = 1\' to / etc / sysctl.conf and then \
        reboot or run the command \'sysctl vm.overcommit_memory=1\' for this \
        to take effect. \
        5443: M 07 Jun 08: 14: 15.149 # WARNING you have Transparent Huge \
        Pages(THP) support enabled in your kernel.This will create latency \
        and memory usage issues with Redis.To fix this issue run the \
        command \'echo never > /sys/kernel/mm/transparent_hugepage/enabled\' \
        as root, and add it to your / etc / rc.local in order to retain the \
        setting after a reboot.Redis must be restarted after THP is disabled. \
        5443: M 07 Jun 08: 14: 15.149 * Ready to accept connections'
      );

      expect(result).to.be.an('object');
      expect(result).to.have.property('err').equal(null);
      expect(result).to.have.property('key').equal('readytoaccept');
    });
    it('does not parse a "Server can\'t set maximum open files" error', () => {
      const result = RedisServer.parseData(
        '3105:M 30 May 17:46:28.529 # Server can\'t set maximum open \
        files to 10032 because of OS error: Operation not permitted.'
      );

      expect(result).to.equal(null);
    });
    it('parses other errors ignoring any warning errors', () => {
      const result = RedisServer.parseData(
        '3105:M 30 May 17:46:28.529 # Server can\'t set maximum open \
        files to 10032 because of OS error: Operation not permitted. \
        26939: C 06 Jan 12: 15: 11.241 # Fatal error, can\'t open \
        config file \'node_databases\''
      );

      expect(result).to.be.an('object').and.have.property('err');
      expect(result.err).be.an('error').with.property('code').equal(-3);
    });
  });
  describe('#constructor()', () => {
    it('constructs a new instance', () => {
      const server = new RedisServer();

      expectIdle(server);
      expect(server.process).to.equal(null);
    });
    it('throws when invoked without the `new` keyword', () => {
      expect(RedisServer).to.throw();
    });
    it('calls .parseConfig', () => {
      const parseConfig = RedisServer.parseConfig;
      let expectedObject = { port };
      let actualObject = null;

      RedisServer.parseConfig = (source, target) => {
        actualObject = source;

        return parseConfig(source, target);
      };

      const server = new RedisServer(expectedObject);

      RedisServer.parseConfig = parseConfig;

      expect(actualObject).to.equal(expectedObject);
      expect(server.config.port).to.equal(expectedObject.port);
    });
  });
  describe('#open()', () => {
    it('should start a server and execute a callback', () => {
      const server = new RedisServer(generateRandomPort());

      return expectToOpen(server, (err, res) => {
        expect(err).to.equal(null);
        expect(res).to.equal(null);
        expectRunning(server);

        return server.close();
      });
    });
    it('should pass proper arguments to a callback on failure', () => {
      const server = new RedisServer('badport');

      return server.open((err, res) => {
        expect(err).to.be.an('error');
        expect(res).to.equal(null);
      });
    });
    it('should start a server and resolve a promise', () => {
      const server = new RedisServer(generateRandomPort());

      return expectToOpen(server).then((res) => {
        expectRunning(server);
        expect(res).to.equal(null);

        return server.close();
      });
    });
    it('should do nothing when a server is already starting', () => {
      const server = new RedisServer(generateRandomPort());
      let openingCount = 0;
      let openCount = 0;

      server.on('opening', () => ++openingCount);
      server.on('open', () => ++openCount);

      const expectedPromise = server.open();
      const actualPromise = server.open();

      return Promise
        .all([
          expectedPromise,
          actualPromise
        ])
        .then(() => {
          expect(actualPromise).to.equal(expectedPromise);
          expect(openingCount).to.equal(1);
          expect(openCount).to.equal(1);

          return server.close();
        });
    });
    it('should do nothing when a server is already started', () => {
      const server = new RedisServer(generateRandomPort());
      let openingCount = 0;
      let openCount = 0;

      server.on('opening', () => ++openingCount);
      server.on('open', () => ++openCount);

      return server
        .open()
        .then(() => server.open())
        .then(() => {
          expectRunning(server);
          expect(openingCount).to.equal(1);
          expect(openCount).to.equal(1);

          return server.close();
        });
    });
    it('should fail to start a server with a bad port', () => {
      const server = new RedisServer({ port: 'fubar' });

      return server.open((err) => {
        expect(err).to.be.an('error').to.have.property('code').equal(-3);
      });
    });
    it('should fail to start a server with a privileged port', (done) => {
      const server = new RedisServer({ port: 1 });

      server
        .open((err) => {
          expect(err).to.be.an('error');
          done();
        })
        .catch(done);
    });
    it('should fail to start a server on an in-use port', () => {
      const port = generateRandomPort();
      const server1 = new RedisServer(port);
      const server2 = new RedisServer(port);

      return server1
        .open()
        .then(() => server2.open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-1);

          return server1.close();
        }));
    });
    it('should start a server with a given slaveof address', () => {
      const server1 = new RedisServer(port);
      const server2 = new RedisServer({ port: generateRandomPort(), slaveof });
      const promise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 1000);
        /**
         * A listener for the 'MASTER <-> SLAVE sync started' message from
         * the stdout of {@linkcode server2} that resolves the current
         * {@link Promise} when found.
         * @argument {String} value
         * @return {undefined}
         */
        const listener = (value) => {
          if (value.indexOf('MASTER <-> SLAVE sync started') !== -1) {
            clearTimeout(timeout);
            server2.removeListener('stdout', listener);
            resolve(null);
          }
        };

        server2.on('stdout', listener);
      });

      return Promise
        .all([
          server1.open(),
          server2.open(),
          promise
        ])
        .then(() => Promise.all([
          server2.close(),
          server1.close()
        ]));
    });
    it('should start a server with a given port', () => {
      const expectedPort = generateRandomPort();
      const server = new RedisServer(expectedPort);
      let actualPort = null;

      parsePort(server, (port) => actualPort = port);

      return expectToOpen(server).then(() => {
        expect(actualPort).to.equal(expectedPort);

        return server.close();
      });
    });
    it('should start a server with a given Redis conf', () => {
      const server = new RedisServer({ conf });
      let actualPort = null;

      parsePort(server, (port) => actualPort = port);

      return expectToOpen(server).then(() => {
        expect(actualPort).to.equal(port);

        return server.close();
      });
    });
    it('fails to start a server with a bad "dir" line Redis conf', () => {
      const port = generateRandomPort();
      const conf = `${port}.conf`;
      const server = new RedisServer({ conf });

      return createConf({ port, bind, dir: 'bad/dir/path' }, conf)
        .then(() => server.open((err) => {
          expect(err).to.be.an('error').to.have.property('code').equal(-3);
        }))
        .then(() => server.close());
    });
    it('should start a server with a given Redis binary', () => {
      const server = new RedisServer({ bin, port });

      return expectToOpen(server).then(() => server.close());
    });
    it('should start a server after #close() finishes', () => {
      const server = new RedisServer(generateRandomPort());

      return Promise
        .all([
          server.open(),
          promisify((done) => setTimeout(() => server.close(done), 10)),
          promisify((done) => setTimeout(() => server.open(done), 15)),
          promisify((done) => setTimeout(() => server.close(done), 20)),
          promisify((done) => setTimeout(() => server.open(done), 25))
        ])
        .then(() => {
          expectRunning(server);

          return server.close();
        });
    });
    it('should start a server while others run on different ports', () => {
      const server1 = new RedisServer(generateRandomPort());
      const server2 = new RedisServer(generateRandomPort());
      const server3 = new RedisServer(generateRandomPort());

      return Promise
        .all([
          server1.open(),
          server2.open(),
          server3.open()
        ])
        .then(() => {
          expectRunning(server1);
          expectRunning(server2);
          expectRunning(server3);
        })
        .then(() => Promise.all([
          server1.close(),
          server2.close(),
          server3.close()
        ]));
    });
    it('emits "opening" and "open" when starting a server', () => {
      const server = new RedisServer(generateRandomPort());
      let openingCount = 0;
      let openCount = 0;

      server.on('opening', () => ++openingCount);
      server.on('open', () => ++openCount);

      return server
        .open()
        .then(() => server.close())
        .then(() => server.open())
        .then(() => server.open())
        .then(() => server.close())
        .then(() => {
          expect(openingCount).to.equal(2);
          expect(openCount).to.equal(2);
        });
    });
    it('emits "closing" and "close" when failing to start a server', () => {
      const server = new RedisServer('badport');
      let closingCount = 0;
      let closeCount = 0;

      server.on('closing', () => ++closingCount);
      server.on('close', () => ++closeCount);

      return server
        .open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-3);
        })
        .then(() => server.open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-3);
        }))
        .then(() => {
          expect(closingCount).to.equal(2);
          expect(closeCount).to.equal(2);

          return server.close();
        });
    });
  });
  describe('#close()', () => {
    it('should close a server and execute a callback', () => {
      const server = new RedisServer(generateRandomPort());

      return server
        .open()
        .then(() => promisify((done) => expectToClose(server, done)));
    });
    it('should close a server and resolve a promise', () => {
      const server = new RedisServer(generateRandomPort());

      return server.open().then(() => expectToClose(server));
    });
    it('should report any error when applicable', () => {
      const server = new RedisServer(generateRandomPort());
      const close = RedisServer.close;

      RedisServer.close = () =>
        Promise.reject(new Error());

      return server
        .open()
        .then(() => server.close((err, res) => {
          RedisServer.close = close;

          expect(err).to.be.an('error');
          expect(res).to.equal(null);

          return server.close();
        }));
    });
    it('should do nothing when a server is already stopping', () => {
      const server = new RedisServer(generateRandomPort());

      return server.open().then(() => {
        expect(server.close()).to.equal(server.close());

        return server.close();
      });
    });
    it('should do nothing when a server is already stopped', () => {
      const server = new RedisServer(generateRandomPort());

      return server
        .open()
        .then(() => server.close())
        .then(() => {
          server.close();
          expect(server.isClosing).to.equal(false);
          expectIdle(server);
        });
    });
    it('should do nothing when a server was never started', () => {
      const server = new RedisServer();

      server.close();
      expect(server.isClosing).to.equal(false);
      expectIdle(server);
    });
    it('should stop a server after #open() finishes', () => {
      const server = new RedisServer(generateRandomPort());

      return Promise
        .all([
          server.open(),
          promisify((done) => setTimeout(() => server.close(done), 10)),
          promisify((done) => setTimeout(() => server.open(done), 15)),
          promisify((done) => setTimeout(() => server.close(done), 20))
        ])
        .then(() => {
          expectIdle(server);
        });
    });
    it('emits "closing" and "close" when stopping a server', () => {
      const server = new RedisServer(generateRandomPort());
      let closingCount = 0;
      let closeCount = 0;

      server.on('closing', () => ++closingCount);
      server.on('close', () => ++closeCount);

      return server
        .open()
        .then(() => server.close())
        .then(() => server.open())
        .then(() => server.close())
        .then(() => server.close())
        .then(() => {
          expect(closingCount).to.equal(2);
          expect(closeCount).to.equal(2);
        });
    });
  });
  describe('#isOpening', () => {
    it('is `true` while a server is starting', () => {
      const server = new RedisServer(generateRandomPort());

      expect(server.isOpening).to.equal(false);
      server.open();
      expect(server.isOpening).to.equal(true);

      return server
        .open()
        .then(() => {
          expect(server.isOpening).to.equal(false);
          server.close();
          expect(server.isOpening).to.equal(false);

          return server.close();
        })
        .then(() => {
          expect(server.isOpening).to.equal(false);
        });
    });
    it('is `true` while a misconfigured server is starting', () => {
      const server = new RedisServer('badport');

      expect(server.isOpening).to.equal(false);
      server.open();
      expect(server.isOpening).to.equal(true);

      return server
        .open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-3);
          expect(server.isOpening).to.equal(false);
          server.close();
          expect(server.isOpening).to.equal(false);

          return server.close();
        })
        .then(() => {
          expect(server.isOpening).to.equal(false);
        });
    });
  });
  describe('#isClosing', () => {
    it('is `true` while a server is stopping', () => {
      const server = new RedisServer(generateRandomPort());

      expect(server.isClosing).to.equal(false);
      server.open();
      expect(server.isClosing).to.equal(false);

      return server
        .open()
        .then(() => {
          expect(server.isClosing).to.equal(false);
          server.close();
          expect(server.isClosing).to.equal(true);

          return server.close();
        })
        .then(() => {
          expect(server.isClosing).to.equal(false);
        });
    });
    it('is `true` when a server fails to start', () => {
      const server = new RedisServer('badport');
      let isClosing = false;

      server.on('closing', () => isClosing = server.isClosing);
      expect(server.isClosing).to.equal(false);
      server.open();
      expect(server.isClosing).to.equal(false);

      return server
        .open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-3);
          expect(server.isClosing).to.equal(false);
          expect(isClosing).to.equal(true);
          server.close();
          expect(server.isClosing).to.equal(false);

          return server.close();
        })
        .then(() => {
          expect(server.isClosing).to.equal(false);
        });
    });
  });
  describe('#isRunning', () => {
    it('is `true` while a server accepts connections', () => {
      const server = new RedisServer(generateRandomPort());

      expect(server.isRunning).to.equal(false);
      server.open();
      expect(server.isRunning).to.equal(false);

      return server
        .open()
        .then(() => {
          expect(server.isRunning).to.equal(true);
          server.close();
          expect(server.isRunning).to.equal(true);

          return server.close();
        })
        .then(() => {
          expect(server.isRunning).to.equal(false);
        });
    });
    it('is `false` after a misconfigured server starts', () => {
      const server = new RedisServer('badport');

      expect(server.isRunning).to.equal(false);
      server.open();
      expect(server.isRunning).to.equal(false);

      return server
        .open((err) => {
          expect(err).to.be.an('error').and.have.property('code').equal(-3);
          expect(server.isRunning).to.equal(false);
          server.close();
          expect(server.isRunning).to.equal(false);

          return server.close();
        })
        .then(() => {
          expect(server.isRunning).to.equal(false);
        });
    });
  });
});
