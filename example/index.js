const ntp = require('..');

ntp({ port: 4567, server: '127.0.0.1' }, function(err, time){
  console.log('The network time is :', time);
});