'use strict';

const childprocess = require('child_process');
const chai = require('chai');
const mocha = require('mocha');
const RedisServer = require('./RedisServer');
const expect = chai.expect;
const before = mocha.before;
const describe = mocha.describe;
const it = mocha.it;

describe('RedisServer', () => {
  let port = Math.floor(Math.random() * 10000) + 9000;
  let server1, server2, server3, server4, server5;
  let bin = null;

  const expectIdle = (server) => {
    expect(server.isOpening).to.equal(false);
    expect(server.isRunning).to.equal(false);
    expect(server.isClosing).to.equal(false);
  };

  const expectEmpty = (server) => {
    expect(server.pid).to.equal(null);
    expect(server.port).to.equal(null);
    expect(server.process).to.equal(null);
    expectIdle(server);
  };

  const expectRunning = (server, port) => {
    expect(server.isOpening).to.equal(false);
    expect(server.isRunning).to.equal(true);
    expect(server.isClosing).to.equal(false);
    expect(server.process).to.not.equal(null);

    if (port) {
      expect(server.port).to.equal(port);
    }

    expect(server.pid).to.be.a('number');
  };

  const expectOpening = (server, done) => {
    let promise = null;

    if (done) {
      expect(server.open(done)).to.equal(true);
    }
    else {
      promise = server.open();
    }

    expect(server.isOpening).to.equal(true);

    return promise;
  };

  const expectClosing = (server, done) => {
    let promise = null;

    if (done) {
      expect(server.close(done)).to.equal(true);
    }
    else {
      promise = server.close();
    }

    expect(server.isClosing).to.equal(true);

    return promise;
  };

  before((done) => {
    childprocess.exec('which redis-server', (err, stdout) => {
      bin = stdout.trim();

      done(err);
    });
  });
  describe('#open()', () => {
    it('should start a server (server1)', (done) => {
      server1 = new RedisServer({ port });

      expectEmpty(server1);
      expectOpening(server1, done);
    });
    it('should have started a server (server1)', () => {
      expectRunning(server1, port);
    });
    it('should fail to start a server more than once', (done) => {
      expect(server1.open(done)).to.equal(false);
      expectRunning(server1, port);
    });
    it('should fail to start a server with a bad port', (done) => {
      server2 = new RedisServer({ port: 'fubar' });

      expectEmpty(server2);
      server2.open((err) => {
        expect(err).to.be.an('error');
        expectIdle(server2);
        done();
      });
      expect(server2.isOpening).to.equal(true);
    });
    it('should fail to start a server with a privileged port', (done) => {
      server2 = new RedisServer({ port: 1 });

      expectEmpty(server2);
      server2.open((err) => {
        expect(err).to.be.an('error');
        expectIdle(server2);
        done();
      });
      expect(server2.isOpening).to.equal(true);
    });
    it('should fail to start a server on the same port as another server', (done) => {
      server2 = new RedisServer({ port: server1.port });

      expectEmpty(server2);
      server2.open((err) => {
        expect(err).to.be.an('error');
        expectIdle(server2);
        done();
      });
      expect(server2.isOpening).to.equal(true);
    });
    it('should start a server while another is running (server2)', (done) => {
      server2 = new RedisServer({ port: ++port });

      expectEmpty(server2);
      expectOpening(server2, done);
    });
    it('should have started a server (server2)', () => {
      expectRunning(server2, port);
    });
    it('should start a server with no config provided (server3)', (done) => {
      server3 = new RedisServer();

      expectEmpty(server3);
      expectOpening(server3, done);
    });
    it('should have started a server (server3)', () => {
      expectRunning(server3, 6379);
    });
    it('should start a server with `bin` provided (server4)', (done) => {
      server4 = new RedisServer({ bin, port: ++port });

      expectEmpty(server4);
      expect(server4.config.bin).to.equal(bin);
      expectOpening(server4, done);
    });
    it('should have started a server (server4)', () => {
      expectRunning(server4, port);
    });
    it('should start a server with `conf` provided (server5)', (done) => {
      server5 = new RedisServer({ conf: 'test.conf' });

      expectEmpty(server5);
      expectOpening(server5, done);
    });
  });
  describe('#close()', () => {
    it('should stop a server (server1)', (done) => {
      expectRunning(server1);
      expectClosing(server1, done);
    });
    it('should have stopped a server (server1)', () => {
      expectEmpty(server1);
    });
    it('should stop a server (server2)', (done) => {
      expectRunning(server2);
      expectClosing(server2, done);
    });
    it('should have stopped a server (server2)', () => {
      expectEmpty(server2);
    });
    it('should stop a server (server3)', (done) => {
      expectRunning(server3);
      expectClosing(server3, done);
    });
    it('should have stopped a server (server3)', () => {
      expectEmpty(server3);
    });
    it('should stop a server (server4)', (done) => {
      expectRunning(server4);
      expectClosing(server4, done);
    });
    it('should have stopped a server (server4)', () => {
      expectEmpty(server4);
    });
    it('should stop a server (server5)', (done) => {
      expectRunning(server5);
      expectClosing(server5, done);
    });
    it('should have stopped a server (server5)', () => {
      expectEmpty(server5);
    });
  });
});
