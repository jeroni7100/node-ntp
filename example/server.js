const ntp = require('..');

const server = ntp.createServer(function(msg, response){
  console.log(msg);
  response();
}).listen(4567, function(err){
  console.log('server is running at %s', server.address().port);
});