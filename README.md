# redis-server

Start a Redis server in Node.js like a boss.

[![NPM version](https://badge.fury.io/js/redis-server.svg)](http://badge.fury.io/js/redis-server)
[![Build Status](https://travis-ci.org/BrandonZacharie/node-redis-server.svg?branch=master)](https://travis-ci.org/BrandonZacharie/node-redis-server)

## Installation

```npm install redis-server```

## Usage

The constructor exported by this module optionally accepts a single argument; a number or string that is a port or an object for configuration.

### Basic Example
```
const RedisServer = require('redis-server');

// Simply pass the port that you want a Redis server to listen on.
const server = new RedisServer(6379);

server.open((err) => {
  if (err === null) {
    // You may now connect a client to the server bound to port 6379.
  }
});
```

### Configuration

| Property | Type   | Default        | Description
|:---------|:-------|:---------------|:-----------
| port     | Number | 6379           | A port to bind a server to.
| path     | String | redis-server   | A path to a Redis server binary.

```
const RedisServer = require('redis-server');

// Provide a configuration object. All properties are optional.
const server = new RedisServer({
  port: 6379,
  path: '/opt/local/bin/redis-server'
});

server.open((err) => {
  if (err === null) {
    // You may now connect a client to the server bound to port 6379.
  }
});
```

## TODO

- Add Promises
- Custom config paths (i.e. "/etc/redis/6379.conf")
- Support "--slaveof" flag
