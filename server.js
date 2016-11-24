'use strict';
const udp          = require('dgram');
const util         = require('util');
const EventEmitter = require('events');

/**
 * [NTPServer description]
 * @param {[type]} options [description]
 */
function NTPServer(options, onRequest){
  EventEmitter.call(this);
  if(typeof options === 'function'){
    onRequest = options;
    options = {};
  }
  var defaults = { port: 123 };
  for(var k in options) 
    defaults[k] = options[k];
  this.options = defaults;
  this.socket = udp.createSocket('udp4');
  this.socket.on('message', this.parse.bind(this));
  return this;
}

util.inherits(NTPServer, EventEmitter);

/**
 * [parse description]
 * @param  {[type]} data  [description]
 * @param  {[type]} rinfo [description]
 * @return {[type]}       [description]
 */
NTPServer.prototype.parse = function(data, rinfo){
  var message = data;
  this.emit('request', message, this.send.bind(this, rinfo));
  return this;
};

/**
 * [send description]
 * @param  {[type]}   rinfo    [description]
 * @param  {[type]}   data     [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
NTPServer.prototype.send = function(rinfo, message, callback){
  var data = new Buffer(48);
  this.socket.send(data, rinfo.port, rinfo.server, callback);
  return this;
};

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

NTPServer.prototype.address = function(){
  return this.socket.address();
};

module.exports = NTPServer;