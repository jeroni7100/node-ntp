const NTP = require('../');


var ntp = new NTP({
  // server: 'time.nist.gov'
});

ntp.time(function(err, time){
  console.log('The network time is :', time);
});