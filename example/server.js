const ntp = require('..');

const server = ntp.createServer().listen(4567, function(err){
  console.log('server is running at %s', server.address().port);
});

server.on('request', function(msg, response){
  console.log(msg);
  response();
});