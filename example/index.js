const NTP = require('../');


var ntp = new NTP();

ntp.time(function(err, time){
  console.log('The network time is :', time);
});