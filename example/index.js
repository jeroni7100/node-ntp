const ntp = require('../');

ntp(function(err, time){
  console.log('The network time is :', time);
});