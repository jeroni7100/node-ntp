const ntp = require('..');

ntp(function(err, time){
  if(err) return console.error(err);
  console.log('The network time is :', time);
});