'use strict';

const childprocess = require('child_process');
const chai = require('chai');
const mocha = require('mocha');
const RedisServer = require('./redis-server');
const expect = chai.expect;
const before = mocha.before;
const describe = mocha.describe;
const it = mocha.it;

describe('redis-server', () => {
  let port = Math.floor(Math.random() * 10000) + 9000;
  let server1, server2, server3, server4, server5;
  let bin = null;

  before((done) => {
    childprocess.exec('which redis-server', (err, stdout) => {
      bin = stdout.trim();

      done(err);
    });
  });
  it('should start a server', (done) => {
    server1 = new RedisServer({ port });

    expect(server1.pid).to.equal(null);
    expect(server1.port).to.equal(null);
    expect(server1.process).to.equal(null);
    expect(server1.isOpening).to.equal(false);
    expect(server1.isClosing).to.equal(false);
    expect(server1.open(done)).to.equal(true);
    expect(server1.isOpening).to.equal(true);
  });
  it('should have started a server on the port provided', () => {
    expect(server1.isOpening).to.equal(false);
    expect(server1.isRunning).to.equal(true);
    expect(server1.isClosing).to.equal(false);
    expect(server1.pid).to.be.a('number');
    expect(server1.port).to.equal(port);
    expect(server1.process).to.not.equal(null);
  });
  it('should fail to start a server more than once', (done) => {
    expect(server1.open(done)).to.equal(false);
    expect(server1.isOpening).to.equal(false);
    expect(server1.isRunning).to.equal(true);
    expect(server1.isClosing).to.equal(false);
  });
  it('should fail to start a server with a bad port', (done) => {
    server2 = new RedisServer({ port: 'fubar' });

    expect(server2.isOpening).to.equal(false);
    expect(server2.isClosing).to.equal(false);
    server2.open((err) => {
      expect(err).to.be.an('error');
      expect(server2.isOpening).to.equal(false);
      expect(server2.isRunning).to.equal(false);
      expect(server2.isClosing).to.equal(false);
      done();
    });
    expect(server2.isOpening).to.equal(true);
  });
  it('should fail to start a server with a privileged port', (done) => {
    server2 = new RedisServer({ port: 1 });

    expect(server2.isOpening).to.equal(false);
    expect(server2.isClosing).to.equal(false);
    server2.open((err) => {
      expect(err).to.be.an('error');
      expect(server2.isOpening).to.equal(false);
      expect(server2.isRunning).to.equal(false);
      expect(server2.isClosing).to.equal(false);
      done();
    });
    expect(server2.isOpening).to.equal(true);
  });
  it('should fail to start a server on the same port as another server', (done) => {
    server2 = new RedisServer({ port: server1.port });

    expect(server2.isOpening).to.equal(false);
    expect(server2.isClosing).to.equal(false);
    server2.open((err) => {
      expect(err).to.be.an('error');
      expect(server2.isOpening).to.equal(false);
      expect(server2.isRunning).to.equal(false);
      expect(server2.isClosing).to.equal(false);
      done();
    });
    expect(server2.isOpening).to.equal(true);
  });
  it('should start a server while another is running', (done) => {
    server2 = new RedisServer({ port: ++port });

    expect(server1.isOpening).to.equal(false);
    expect(server1.isRunning).to.equal(true);
    expect(server1.isClosing).to.equal(false);
    expect(server2.open(done)).to.equal(true);
    expect(server2.isOpening).to.equal(true);
  });
  it('should have started a second server', () => {
    expect(server2.isOpening).to.equal(false);
    expect(server2.isRunning).to.equal(true);
    expect(server2.isClosing).to.equal(false);
    expect(server2.pid).to.be.a('number');
    expect(server2.port).to.equal(port);
    expect(server2.process).to.not.equal(null);
  });
  it('should stop the first server', (done) => {
    expect(server1.isOpening).to.equal(false);
    expect(server1.isRunning).to.equal(true);
    expect(server1.isClosing).to.equal(false);
    expect(server1.close(done)).to.equal(true);
    expect(server1.isClosing).to.equal(true);
    expect(server2.isClosing).to.equal(false);
  });
  it('should have stopped the first server', () => {
    expect(server2.isRunning).to.equal(true);
    expect(server1.isOpening).to.equal(false);
    expect(server1.isRunning).to.equal(false);
    expect(server1.isClosing).to.equal(false);
    expect(server1.process).to.equal(null);
  });
  it('should stop the second server', (done) => {
    expect(server2.isOpening).to.equal(false);
    expect(server2.isRunning).to.equal(true);
    expect(server2.isClosing).to.equal(false);
    expect(server2.close(done)).to.equal(true);
    expect(server2.isClosing).to.equal(true);
  });
  it('should have stopped the second server', () => {
    expect(server2.isOpening).to.equal(false);
    expect(server2.isRunning).to.equal(false);
    expect(server2.isClosing).to.equal(false);
    expect(server2.process).to.equal(null);
  });
  it('should start a server with no config provided', (done) => {
    server3 = new RedisServer();

    expect(server3.pid).to.equal(null);
    expect(server3.port).to.equal(null);
    expect(server3.process).to.equal(null);
    expect(server3.isOpening).to.equal(false);
    expect(server3.isClosing).to.equal(false);
    expect(server3.open(done)).to.equal(true);
    expect(server3.isOpening).to.equal(true);
  });
  it('should use port 6379 when no config is provided', () => {
    expect(server3.isOpening).to.equal(false);
    expect(server3.isRunning).to.equal(true);
    expect(server3.isClosing).to.equal(false);
    expect(server3.pid).to.be.a('number');
    expect(server3.port).to.equal(6379);
    expect(server3.process).to.not.equal(null);
  });
  it('should stop a server with no config', (done) => {
    expect(server3.isOpening).to.equal(false);
    expect(server3.isRunning).to.equal(true);
    expect(server3.isClosing).to.equal(false);
    expect(server3.close(done)).to.equal(true);
    expect(server3.isClosing).to.equal(true);
  });
  it('should start a server with a binary path provided', (done) => {
    server4 = new RedisServer({ bin });

    expect(server4.config.bin).to.equal(bin);
    expect(server4.pid).to.equal(null);
    expect(server4.port).to.equal(null);
    expect(server4.process).to.equal(null);
    expect(server4.isOpening).to.equal(false);
    expect(server4.isClosing).to.equal(false);
    expect(server4.open(done)).to.equal(true);
    expect(server4.isOpening).to.equal(true);
  });
  it('should stop a server with a binary path provided', (done) => {
    expect(server4.isOpening).to.equal(false);
    expect(server4.isRunning).to.equal(true);
    expect(server4.isClosing).to.equal(false);
    expect(server4.close(done)).to.equal(true);
    expect(server4.isClosing).to.equal(true);
  });
  it('should start a server with a conf path provided', (done) => {
    server5 = new RedisServer({ conf: 'test.conf' });

    expect(server5.pid).to.equal(null);
    expect(server5.port).to.equal(null);
    expect(server5.process).to.equal(null);
    expect(server5.isOpening).to.equal(false);
    expect(server5.isClosing).to.equal(false);
    expect(server5.open(done)).to.equal(true);
    expect(server5.isOpening).to.equal(true);
  });
  it('should stop a server with a conf path provided', (done) => {
    expect(server5.isOpening).to.equal(false);
    expect(server5.isRunning).to.equal(true);
    expect(server5.isClosing).to.equal(false);
    expect(server5.port).to.equal(6400);
    expect(server5.close(done)).to.equal(true);
    expect(server5.isClosing).to.equal(true);
  });
});
