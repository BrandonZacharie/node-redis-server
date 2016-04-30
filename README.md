# redis-server

Start a Redis server in Node.js like a boss.

## Installation

```npm install redis-server```

## Usage

Most basic usage is to simply pass the port that you want to run the server. It
is important to not forget to construct the server without the ```new```
keyword, unless global access to the redis-server properties is required.

```javascript

var RedisServer = require('redis-server');
var redisServerInstance = new RedisServer(6379);

redisServerInstance.open(function (error) {

  if (error) {
    throw new Error(error);
  }

  // The server is now up and running on port 6379,
  // you can now create a client to connect to the
  // server

});

```

## TODO

more tests/documentation!