var RC = require('ringcentral')
var fs = require('fs')
var async = require("async");

require('dotenv').load()

var rcsdk = new RC({
  server: RC.server.production, // RC.server.sandbox if running in sandbox environment
  appKey: process.env.CLIENT_ID,
  appSecret: process.env.CLIENT_SECRET
})

var platform = rcsdk.platform()

login()
function login() {
  platform.login({
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  })
  .then(function(resp){
    readVoicemail()
  })
  .catch(function(e){
    throw e
  })
}
function readVoicemail(){
  var date = new Date()
  var time = date.getTime()
  var less60Days = time - (86400 * 60 * 1000)
  var from = new Date(less60Days)
  var dateFrom = from.toISOString()
  var dateTo = date.toISOString()

  platform.get('/account/~/extension/~/message-store', {
    messageType: "VoiceMail",
    dateFrom: dateFrom.replace('/', ':'),
    dateTo: dateTo.replace('/', ':')
  })
  .then(function(resp){
    var json = resp.json()
    async.each(json.records,
      function(record, callback){
        var recordingId = record.id
        if (record.attachments != undefined) {
          async.each(record.attachments,
            function(item, loopBack){
              var extension = ".mp3"
              if (item.contentType == "audio/wav")
                extension = ".wav"
              else if(item.contentType == "text/plain")
                extension = ".txt"
              platform.get(item.uri)
                .then(function(res) {
                  return res.response().buffer();
                })
                .then(function(buffer) {
                  fs.writeFileSync(item.id + extension, buffer);
                })
                .catch(function(e){
                  throw e
                })
            }
          );
        }
      }
    );
  })
  .catch(function(e){
    throw e
  })
}
