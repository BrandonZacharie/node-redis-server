"use strict";

var expect = require('expect.js')
  , RedisServer = require('./redis-server');

describe('redis-server', function () {
    var port = Math.floor(Math.random() * 10000) + 9000
      , server1, server2;

    it('should start a server', function (done) {
        server1 = new RedisServer(port);

        expect(server1.pid).to.be(null);
        expect(server1.port).to.be(null);
        expect(server1.process).to.be(null);
        expect(server1.isOpening).to.be(false);
        expect(server1.isClosing).to.be(false);
        expect(server1.open(done)).to.be(true);
        expect(server1.isOpening).to.be(true);
    });
    it('should have started a server on the port provided', function () {
        expect(server1.isOpening).to.be(false);
        expect(server1.isRunning).to.be(true);
        expect(server1.isClosing).to.be(false);
        expect(server1.pid).to.be.a('number');
        expect(server1.port).to.be(port);
        expect(server1.process).to.not.be(null);
    });
    it('should fail to start a server more than once', function (done) {
        expect(server1.open(done)).to.be(false);
        expect(server1.isOpening).to.be(false);
        expect(server1.isRunning).to.be(true);
        expect(server1.isClosing).to.be(false);
    });
    it('should fail to start a server with a bad port', function (done) {
        server2 = new RedisServer({ port: 'fubar' });

        expect(server2.isOpening).to.be(false);
        expect(server2.isClosing).to.be(false);
        server2.open(function (err) {
            expect(err).to.be.an(Error);
            expect(server2.isOpening).to.be(false);
            expect(server2.isRunning).to.be(false);
            expect(server2.isClosing).to.be(false);
            done();
        });
        expect(server2.isOpening).to.be(true);
    });
    it('should fail to start a server with a privileged port', function (done) {
        server2 = new RedisServer({ port: 1 });

        expect(server2.isOpening).to.be(false);
        expect(server2.isClosing).to.be(false);
        server2.open(function (err) {
            expect(err).to.be.an(Error);
            expect(server2.isOpening).to.be(false);
            expect(server2.isRunning).to.be(false);
            expect(server2.isClosing).to.be(false);
            done();
        });
        expect(server2.isOpening).to.be(true);
    });
    it('should fail to start a server on the same port as another server', function (done) {
        server2 = new RedisServer({ port: server1.port });

        expect(server2.isOpening).to.be(false);
        expect(server2.isClosing).to.be(false);
        server2.open(function (err) {
            expect(err).to.be.an(Error);
            expect(server2.isOpening).to.be(false);
            expect(server2.isRunning).to.be(false);
            expect(server2.isClosing).to.be(false);
            done();
        });
        expect(server2.isOpening).to.be(true);
    });
    it('should start a server while another is running', function (done) {
        server2 = new RedisServer({ port: ++port });

        expect(server1.isOpening).to.be(false);
        expect(server1.isRunning).to.be(true);
        expect(server1.isClosing).to.be(false);
        expect(server2.open(done)).to.be(true);
        expect(server2.isOpening).to.be(true);
    });
    it('should have started a second server', function () {
        expect(server2.isOpening).to.be(false);
        expect(server2.isRunning).to.be(true);
        expect(server2.isClosing).to.be(false);
        expect(server2.pid).to.be.a('number');
        expect(server2.port).to.be(port);
        expect(server2.process).to.not.be(null);
    });
    it('should stop the first server', function (done) {
        expect(server1.isOpening).to.be(false);
        expect(server1.isRunning).to.be(true);
        expect(server1.isClosing).to.be(false);
        expect(server1.close(done)).to.be(true);
        expect(server1.isClosing).to.be(true);
        expect(server2.isClosing).to.be(false);
    });
    it('should have stopped the first server', function () {
        expect(server2.isRunning).to.be(true);
        expect(server1.isOpening).to.be(false);
        expect(server1.isRunning).to.be(false);
        expect(server1.isClosing).to.be(false);
        expect(server1.process).to.be(null);
    });
    it('should stop the second server', function (done) {
        expect(server2.isOpening).to.be(false);
        expect(server2.isRunning).to.be(true);
        expect(server2.isClosing).to.be(false);
        expect(server2.close(done)).to.be(true);
        expect(server2.isClosing).to.be(true);
    });
    it('should have stopped the second server', function () {
        expect(server2.isOpening).to.be(false);
        expect(server2.isRunning).to.be(false);
        expect(server2.isClosing).to.be(false);
        expect(server2.process).to.be(null);
    });
});