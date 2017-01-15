'use strict';
const udp = require('dgram');

/**
 * [NTPClient description]
 * @docs https://tools.ietf.org/html/rfc2030
 */
function NTP(options, callback){
  if(!(this instanceof NTP))
    return new NTP(options, callback);
  var defaults = {
    server: 'pool.ntp.org', port: 123
  };
  if(typeof options === 'function'){
    callback = options;
    options = {};
  }
  for(var k in options)
    defaults[ k ] = options[ k ];
  this.options = defaults;
  this.socket = new udp.createSocket('udp4');
  if(typeof callback === 'function')
    this.time(callback);
  return this;
};

/**
 * [time description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
NTP.time = function(options, callback){
  return new NTP(options, callback);
};

/**
 * [time description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
NTP.prototype.time = function (callback){
  var self = this, respond = false;
  var packet = this.createPacket();
  var timeout = setTimeout(function(){
    if(!respond) {
      respond = true;
      callback(new Error('ntp network timeout'));
    }
  }, this.options.timeout || 1000);
  this.socket.send(packet, 0, packet.length,
    this.options.port, this.options.server, function(err){
    if(err) return callback(err);
    self.socket.once('message', function(msg){
      if(!respond) {
        respond = true;
        clearTimeout(timeout);
        callback(null, self.parse(msg));
      }
    });
  });
  return this;
};

/**
 * [createPacket description]
 * @return {[type]} [description]
 */
NTP.prototype.createPacket = function(){
  // NTP time stamp is in the first 48 bytes of the message
  var buffer = new Buffer(48).fill(0x00);
  buffer[0] = 0b11100011; // LI, Version, Mode
  buffer[1] = 0;          // Stratum, or type of clock
  buffer[2] = 6;          // Polling Interval
  buffer[3] = 0xec;       // Peer Clock Precision
  // 8 bytes of zero for Root Delay & Root Dispersion
  buffer[12] = 49;
  buffer[13] = 0x4e;
  buffer[14] = 49;
  buffer[15] = 52;
  return buffer;
};

/**
 * [parse description]
 * @param  {Function} callback [description]
 * @param  {[type]}   msg      [description]
 * @return {[type]}            [description]
 */
NTP.prototype.parse = function(msg){
  this.socket.close();
  const SEVENTY_YEARS = 2208988800;
  var secsSince1900 = msg.readUIntBE(40, 4);
  var epoch = secsSince1900 - SEVENTY_YEARS;
  var date = new Date(0);
  date.setUTCSeconds(epoch);
  return date;
};

NTP.Client = NTP;
NTP.Server = require('./server');

/**
 * [createServer description]
 * @return {[type]} [description]
 */
NTP.createServer = function(options){
  return new NTP.Server(options);
};

module.exports = NTP;