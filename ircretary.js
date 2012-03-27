
var irc = require("./node_modules/irc")

// it'd be badass to be able to do
// npm config set ircretary.server='irc.whatever.com'
  , nick = "ircretary"
  , options = { server : "irc.freenode.net"
              , nick : nick
              , channels : ["#node.js", "#isaacs-testing", "#node", "#nodejs"
                           ,"#joyent", "#libuv", "#travis", "#travis-ci"
                           ,"#nodejitsu", "#stackvm"
                           ,"#thenodefirm", "#nerdtracker", "#isaacs"]
              , userName : "ircretary"
              , realName : "ircretary"
              }
  , path = require("path")
  , client = new irc.Client(options.server, options.nick, options)
  , fs = require("fs")
  , Script = process.binding("evals").Script

client.notes = {}
client.admins = [ "isaacs" ]
client.watches = {}
client.lastSeen = {}
client.redirects =
  {"#nodejs" : "#node.js"
  ,"#node" : "#node.js"
  ,"#travis-ci": "#travis"
  }

try {
  var mem = JSON.parse(""+fs.readFileSync(process.env.HOME+"/memory.json"))
  ;["notes","watches","admins","lastSeen","redirects"].forEach(function (m) {
    client[m] = mem[m] || client[m]
  })
} catch (ex) {}

client.on("raw", function (m) {
  client.atMe = client.atMe || new RegExp("^"+client.nick+"\\b")
  client.brains(m)
})

client.on("error", function (m) {
  console.error(["error", m])
})

process.on("uncaughtException", reload)
// keep behavior in sync if the file changes.
client.brains = require("./brains")
brains.reload = reload
var hadError = null
function reload (ex) {
  delete module.moduleCache[ path.join(__dirname, "brains.js") ]
  // check to see if it's valid
  if (ex) return logError(ex)
  try {
    new Script(fs.readFileSync("./brains.js"), "./brains.js").runInNewContext()
    if (hadError) console.error((new Date).toISOString() + " fixed now")
    client.brains = require("./brains")
    hadError = null
  } catch (ex) {
    logError(ex)
  }
}
function logError (ex) {
  console.error((new Date).toISOString() +
                "Error reading ./brains.js\n", ex.stack)
  hadError = ex
}

fs.watchFile("./brains.js", function (o, n) {
  if (o.mtime.toString() === n.mtime.toString()) return
  reload()
})
