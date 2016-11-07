'use strict';
const udp = require('dgram');

/**
 * [NTPServer description]
 * @param {[type]} options [description]
 */
function NTPServer(options){
  this.options = options;
  this.socket = udp.createSocket('udp4');
  return this;
}

/**
 * [listen description]
 * @param  {[type]} port    [description]
 * @param  {[type]} address [description]
 * @return {[type]}         [description]
 */
NTPServer.prototype.listen = function (port, address) {
  this.socket.bind(port || this.options.port, address);
  return this;
};

module.exports = NTPServer;