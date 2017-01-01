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

const generateRandomPort = () =>
  Math.floor(Math.random() * 10000) + 9000;

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

const expectIdle = (server) => {
  expect(server.isOpening).to.equal(false);
  expect(server.isRunning).to.equal(false);
  expect(server.isClosing).to.equal(false);
};

const expectEmpty = (server) => {
  expect(server.process).to.equal(null);
  expectIdle(server);
};

const expectRunning = (server) => {
  expect(server.isOpening).to.equal(false);
  expect(server.isRunning).to.equal(true);
  expect(server.isClosing).to.equal(false);
  expect(server.process).to.not.equal(null);
};

const expectToOpen = (server, done) => {
  const oldPromise = server.openPromise;
  const newPromise = server.open(done);

  expect(newPromise).to.be.a('promise');
  expect(newPromise).to.not.equal(oldPromise);
  expect(server.isOpening).to.equal(true);

  return newPromise;
};

const expectToClose = (server, done) => {
  const oldPromise = server.openPromise;
  const newPromise = server.close(done);

  expect(newPromise).to.be.a('promise');
  expect(newPromise).to.not.equal(oldPromise);
  expect(server.isClosing).to.equal(true);

  return newPromise;
};

const parsePort = (server, callback) => {
  const portRegExp = /port:\s+\d+/ig;
  const listener = (value) => {
    const matches = value.match(portRegExp);

    if (matches !== null) {
      server.removeListener('stdout', listener);

      return callback(Number(matches[0].split(':').pop()));
    }
  };

  server.on('stdout', listener);
};

describe('RedisServer', () => {
  let bin = null;
  const conf = `./${new Date().toISOString()}.conf`;
  const port = generateRandomPort();
  const slaveof = `::1 ${port}`;

  before((done) => {
    childprocess.exec('pkill redis-server', () => {
      done();
    });
  });
  before((done) => {
    childprocess.exec('which redis-server', (err, stdout) => {
      bin = stdout.trim();

      done(err);
    });
  });
  before((done) => {
    fs.writeFile(conf, `port ${port}\nbind ::1 127.0.0.1`, done);
  });
  after((done) => {
    fs.unlink(conf, done);
  });
  describe('.parseConfig()', () => {
    it('should parse bin, port, and slaveof', () => {
      const expectedObject = { bin, port, slaveof };
      const expectedKeys = Object.keys(expectedObject).sort();

      expectedObject.foo = 'bar';

      const actualObject = RedisServer.parseConfig(expectedObject);

      for (let key of expectedKeys) {
        expect(actualObject).to.have.property(key).equal(expectedObject[key]);
      }

      expect(Object.keys(actualObject).sort()).to.eql(expectedKeys);
    });
    it('should parse bin and conf only', () => {
      const expectedObject = { bin, conf, port, slaveof };
      const actualObject = RedisServer.parseConfig(expectedObject);

      expect(actualObject).to.have.property('bin').equal(expectedObject.bin);
      expect(actualObject).to.have.property('conf').equal(expectedObject.conf);
      expect(Object.keys(actualObject)).to.have.length(2);
    });
    it('should work without arguments', () => {
      expect(RedisServer.parseConfig()).to.be.an('object');
      expect(RedisServer.parseConfig(null)).to.be.an('object');
    });
  });
  describe('.parseFlags()', () => {
    it('should return an empty array when given an empty object', () => {
      expect(RedisServer.parseFlags({})).to.have.length(0);
    });
    it('should return port, and slaveof', () => {
      const config = { bin, port, slaveof };
      const actualFlags = RedisServer.parseFlags(config);
      const expectedFlags = [
        `--port ${config.port}`,
        `--slaveof ${config.slaveof}`
      ];

      expect(actualFlags).to.eql(expectedFlags);
    });
    it('should return conf', () => {
      const config = { bin, conf, port, slaveof };

      expect(RedisServer.parseFlags(config)).to.eql([config.conf]);
    });
  });
  describe('#constructor()', () => {
    it('constructs a new instance', () => {
      const server = new RedisServer();

      expectEmpty(server);
    });
    it('throws when invoked without the `new` keyword', () => {
      expect(RedisServer).to.throw();
    });
    it('accepts a port as a string', () => {
      const server = new RedisServer('1234');

      expectEmpty(server);
      expect(server.config.port).to.equal('1234');
    });
    it('accepts a port as a number', () => {
      const server = new RedisServer(1234);

      expectEmpty(server);
      expect(server.config.port).to.equal(1234);
    });
    it('accepts a configuration object', () => {
      const config = { bin, port, slaveof };
      const server = new RedisServer(config);

      expectEmpty(server);

      for (let key of Object.keys(config)) {
        expect(server.config).to.have.property(key).equal(config[key]);
      }
    });
  });
  describe('#open()', () => {
    it('should start a server and execute a callback', (done) => {
      const server = new RedisServer(generateRandomPort());

      expectToOpen(server, (err, res) => {
        expect(err, 'err').to.equal(null);
        expect(res, 'res').to.equal(null);
        expectRunning(server);
        server.close(done);
      })
      .catch(done);
    });
    it('should pass an error and null result to a callback on failure', (done) => {
      const server = new RedisServer('badport');

      server.open((err, res) => {
        expect(err).to.be.an('error');
        expect(res).to.equal(null);
        done();
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
    it('should do nothing when a server is already started', () => {
      const server = new RedisServer(generateRandomPort());

      return server.open().then(() => {
        server.open();
        expect(server.isOpening).to.equal(false);
        expectRunning(server);

        return server.close();
      });
    });
    it('should fail to start a server with a bad port', (done) => {
      const server = new RedisServer({ port: 'fubar' });

      server.open((err) => {
        expect(err).to.be.an('error');
        expectIdle(server);
        done();
      });
      expect(server.isOpening).to.equal(true);
    });
    it('should fail to start a server with a privileged port', (done) => {
      const server = new RedisServer({ port: 1 });

      server.open((err) => {
        expect(err).to.be.an('error');
        expectIdle(server);
        done();
      });
      expect(server.isOpening).to.equal(true);
    });
    it('should fail to start a server on an in-use port', (done) => {
      const port = generateRandomPort();
      const server1 = new RedisServer(port);
      const server2 = new RedisServer(port);

      server1.open(() => {
        server2.open((err) => {
          expect(err).to.be.an('error');
          expectIdle(server2);
          server1.close(done);
        });
        expect(server2.isOpening).to.equal(true);
      });
    });
    it('should start a server with a given slaveof address', () => {
      const server1 = new RedisServer(port);
      const server2 = new RedisServer({ port: generateRandomPort(), slaveof });
      let isSlaveOf = false;

      server2.on('stdout', (value) => {
        if (value.indexOf('MASTER <-> SLAVE sync started') !== -1) {
          isSlaveOf = true;
        }
      });

      return server1.open()
      .then(() => expectToOpen(server2))
      .then(() => new Promise((resolve) => setTimeout(resolve, 10)))
      .then(() => Promise.all([server2.close(), server1.close()]))
      .then(() => {
        expect(isSlaveOf).to.equal(true);
      });
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
        server3.open(),
      ])
      .then(() => {
        expectRunning(server1);
        expectRunning(server2);
        expectRunning(server3);

        return Promise.all([
          server1.close(),
          server2.close(),
          server3.close()
        ]);
      });
    });
  });
  describe('#close()', () => {
    it('should close a server and execute a callback', (done) => {
      const server = new RedisServer(generateRandomPort());

      server.open((err) => {
        expect(err).to.equal(null);
        expectRunning(server);
        expectToClose(server, (err) => {
          expect(err).to.equal(null);
          expectIdle(server);
          done();
        });
      });
    });
    it('should close a server and resolve a promise', () => {
      const server = new RedisServer(generateRandomPort());

      return server.open()
      .then(() => expectToClose(server))
      .then(() => expectIdle(server));
    });
    it('should do nothing when a server is already stopped', () => {
      const server = new RedisServer(generateRandomPort());

      return server.open()
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
  });
});
