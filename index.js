const udp = require('dgram');

/**
 * [NTPClient description]
 * @docs https://tools.ietf.org/html/rfc2030
 */
function NTP(options){
  this.options = options || {
    server: 'pool.ntp.org',
    port  : 123
  };
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
    this.options.port, this.options.server, function(){
    this.socket.once('message', this.parse.bind(this, callback));
  }.bind(this));
  return this;
};

/**
 * [createPacket description]
 * @return {[type]} [description]
 */
NTP.prototype.createPacket = function(){
  var buffer = new Buffer(48).fill(0x00);
  // LI, Version, Mode
  // buffer[0] = 0x1b;
  buffer[0] = 0b11100011;
  
  return buffer;
};

/**
 * [parse description]
 * @param  {Function} callback [description]
 * @param  {[type]}   msg      [description]
 * @return {[type]}            [description]
 */
NTP.prototype.parse = function(callback, msg){
  var offsetTransmitTime = 40, intpart = 0, fractpart = 0;

  for (var i = 0; i <= 3; i++) 
    intpart = 256 * intpart + msg[offsetTransmitTime + i];

  for (i = 4; i <= 7; i++)
    fractpart = 256 * fractpart + msg[offsetTransmitTime + i];

  var milliseconds = (intpart * 1000 + (fractpart * 1000) / 0x100000000);

  var date = new Date("Jan 01 1900 GMT");
  date.setUTCMilliseconds(date.getUTCMilliseconds() + milliseconds);
  callback && callback(null, date);
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