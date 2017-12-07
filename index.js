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
      self.socket.close();
      callback(new Error('ntp network timeout'));
    }
  }, this.options.timeout || 1000);
  this.socket.send(packet, 0, packet.length,
    this.options.port, this.options.server, function(err){
    if(err) return callback(err);
    self.socket.once('message', function(buffer){
      if(!respond) {
        respond = true;
        self.socket.close();
        clearTimeout(timeout);
        const message = NTP.parse(buffer);
        if(!message.isValid){
          const error = new Error('Invalid server response');
          error.time = packet;
          return self.emit('error', error);
        }
        const received = Date.now();
        const T1 = message.originateTimestamp;
        const T2 = message.receiveTimestamp;
        const T3 = message.transmitTimestamp;
        const T4 = received;
        message.d = (T4 - T1) - (T3 - T2);
        message.t = ((T2 - T1) + (T3 - T4)) / 2;
        message.receivedLocally = received;
        callback(null, message);
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
NTP.parse = function(buffer){
  const packet = {};
  if(buffer.length !== 48) throw new Error('Validate'); 
  this.isValid = false;
  // Validate
  if (buffer.length !== 48) {
      return;
  }
  // Leap indicator
  const li = (buffer[0] >> 6);
  switch (li) {
    case 0: packet.leapIndicator = 'no-warning'; break;
    case 1: packet.leapIndicator = 'last-minute-61'; break;
    case 2: packet.leapIndicator = 'last-minute-59'; break;
    case 3: packet.leapIndicator = 'alarm'; break;
  }
  // Version
  packet.version = ((buffer[0] & 0x38) >> 3);
  // Mode
  const mode = (buffer[0] & 0x7);
  switch (mode) {
    case 1: packet.mode = 'symmetric-active'; break;
    case 2: packet.mode = 'symmetric-passive'; break;
    case 3: packet.mode = 'client'; break;
    case 4: packet.mode = 'server'; break;
    case 5: packet.mode = 'broadcast'; break;
    case 0:
    case 6:
    case 7: packet.mode = 'reserved'; break;
  }
  // Stratum
  const stratum = buffer[1];
  if (stratum === 0) {
    packet.stratum = 'death';
  } else if (stratum === 1) {
    packet.stratum = 'primary';
  } else if (stratum <= 15) {
    packet.stratum = 'secondary';
  } else {
    packet.stratum = 'reserved';
  }
  // Poll interval (msec)
  packet.pollInterval = Math.round(Math.pow(2, buffer[2])) * 1000;
  // Precision (msecs)
  packet.precision = Math.pow(2, buffer[3]) * 1000;
  // Root delay (msecs)
  const rootDelay = 256 * (256 * (256 * buffer[4] + buffer[5]) + buffer[6]) + buffer[7];
  packet.rootDelay = 1000 * (rootDelay / 0x10000);
  // Root dispersion (msecs)
  packet.rootDispersion = ((buffer[8] << 8) + buffer[9] + ((buffer[10] << 8) + buffer[11]) / Math.pow(2, 16)) * 1000;
  // Reference identifier
  packet.referenceId = '';
  switch (packet.stratum) {
    case 'death':
    case 'primary':
      packet.referenceId = String.fromCharCode(buffer[12]) + String.fromCharCode(buffer[13]) + String.fromCharCode(buffer[14]) + String.fromCharCode(buffer[15]);
      break;
    case 'secondary':
      packet.referenceId = [ buffer[12], buffer[13], buffer[14], buffer[15] ].join('.');
      break;
  }
  function toMsecs(buffer, offset) {
    let seconds = 0;
    let fraction = 0;
    for (let i = 0; i < 4; ++i) {
      seconds = (seconds * 256) + buffer[offset + i];
    }
    for (let i = 4; i < 8; ++i) {
      fraction = (fraction * 256) + buffer[offset + i];
    }
    return ((seconds - 2208988800 + (fraction / Math.pow(2, 32))) * 1000);
  };
  // Reference timestamp
  packet.referenceTimestamp = toMsecs(buffer, 16);
  // Originate timestamp
  packet.originateTimestamp = toMsecs(buffer, 24);
  // Receive timestamp
  packet.receiveTimestamp = toMsecs(buffer, 32);
  // Transmit timestamp
  packet.transmitTimestamp = toMsecs(buffer, 40);
  // Validate
  if (packet.version === 4 &&
    packet.stratum !== 'reserved' &&
    packet.mode === 'server' &&
    packet.originateTimestamp &&
    packet.receiveTimestamp &&
    packet.transmitTimestamp) {
    packet.isValid = true;
  }
  return packet;
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