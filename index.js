const udp = require('dgram');

/**
 * [NTPClient description]
 * @docs https://tools.ietf.org/html/rfc2030
 */
function NTP(options){
  var defaults = {
    server: 'pool.ntp.org',
    port  : 123
  };
  for(var k in options)
    defaults[ k ] = options[ k ];
  this.options = defaults;
  this.socket = new udp.createSocket('udp4');
  return this;
};

/**
 * [time description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
NTP.prototype.time = function (callback){
  var self = this;
  var packet = this.createPacket();
  this.socket.send(packet, 0, packet.length,
    this.options.port, this.options.server, function(err, length){
    this.socket.once('message', this.parse.bind(this, callback));
  }.bind(this));
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
NTP.prototype.parse = function(callback, msg){
  this.socket.close();
  const SEVENTY_YEARS = 2208988800;
  var secsSince1900 = msg.readUIntBE(40, 4);
  var epoch = secsSince1900 - SEVENTY_YEARS;
  var date = new Date(0);
  date.setUTCSeconds(epoch);
  callback && callback(null, date, secsSince1900);
};

NTP.Client = NTP;
NTP.Server = require('./server');

NTP.time = function(callback){
  return new NTP().time(callback);
};

NTP.createServer = function(){
  return new NTP.Server();
};

module.exports = NTP;