"use strict";

var childProcess = require('child_process')
  , keyRE = /(port:\s+\d+)|(pid:\s+\d+)|(already\s+in\s+use)|(not\s+listen)|error|denied/ig
  , strRE = / /ig;

function RedisServer(configOrPort) {
    this.config = typeof configOrPort === 'number' ? { port: configOrPort } : (configOrPort || {});
    this.pid = null;
    this.port = null;
    this.process = null;
    this.isClosing = false;
    this.isRunning = false;
    this.isOpening = false;
}

RedisServer.prototype.open = function RedisServer_prototype_open(callback) {
    if (this.isOpening || this.process !== null) {
        if (callback) {
            callback(null);
        }

        return false;
    }

    var self = this;

    this.process = childProcess.spawn('redis-server', ['--port', this.config.port]);
    this.isOpening = true;

    function parse(value) {
        var t = value.split(':')
          , k = t[0].toLowerCase().replace(strRE, '')
          , err = null;

        switch (k) {
            case 'alreadyinuse':
                err = new Error('Address already in use');

                break;

            case 'denied':
                err = new Error('Permission denied');

                break;

            case 'error':
            case 'notlisten':
                err = new Error('Invalid port number');

                break;
            
            case 'pid':
            case 'port':
                self[k] = Number(t[1]);

                if (!(self.port === null || self.pid === null)) {
                    self.isRunning = true;

                    break;
                }
            
            default:
                return;
        }

        self.isOpening = false;

        if (callback) {
            callback(err);
        }
    }

    this.process.stdout.on('data', function (data) {
        var matches = data.toString().match(keyRE);

        if (matches !== null) {
            matches.forEach(parse);
        }
    });

    this.process.on('close', function () {
        self.process = null;
        self.isRunning = false;
        self.isClosing = false;
    });

    process.on('exit', function () {
        self.close();
    });

    return true;
};

RedisServer.prototype.close = function RedisServer_prototype_close(callback) {
    if (this.isClosing || this.process === null) {
        if (callback) {
            callback(null);
        }

        return false;
    }

    this.isClosing = true;

    if (callback) {
        this.process.on('close', function () {
            callback(null);
        });
    }

    this.process.kill();

    return true;
};

module.exports = RedisServer;
