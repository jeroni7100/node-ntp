const Server = require('./server');

exports.Server = Server;
exports.Client = require('./Client');

exports.createServer = function(){
  const server = new Server();
  return server;
};