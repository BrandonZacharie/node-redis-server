'use strict';

const chai = require('chai');
const mocha = require('mocha');
const RedisServer = require('./redis-server');
const expect = chai.expect;
const describe = mocha.describe;
const it = mocha.it;

describe('redis-server', () => {
  let port = Math.floor(Math.random() * 10000) + 9000;
  let server1, server2, server3;

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
});
