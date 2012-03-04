
// !!WARNING!!
// This file gets dynamically loaded.
// The brains function can't save a reference to "this"
// or else the brains will take up all the memory.

// for the syntax error check before reloading.
if (typeof module !== "undefined") module.exports = brains

var commands = {}

commands.hi = commands.hello = function (m, who, what, where) {
  respond.call(this, who, where, "Hello :)")
}

commands.inst = commands.install = function (m, who, what, where, words) {
  var tellWho = words[1] || ""
  respond.call(this, tellWho, where,
               "`curl http://npmjs.org/install.sh | sh` "+
               "(or, if there are permission issues, you can try: "+
               "`curl http://npmjs.org/install.sh | sudo sh`)")
}

commands.log = commands.logs = function (m, who, what, where) {
  var u = process.env.LOGURL
  if (u.substr(-1) !== "/") {
    u += "/"
    process.env.LOGURL += "/"
  }
  if (where !== who) u += where.replace(/#/g,'').toLowerCase()
  respond.call(this, who, where, "Logs can be found at: "+u)
}


commands.thanks = commands.thank = function (m, who, what, where, words) {
  var tellWho = words[1]
  if (!tellWho || tellWho.toLowerCase() === "you") {
    respond.call(this, who, where, "You're welcome :)")
  } else {

    leaveNote.call(this, tellWho, who, what, where)
    respond.call(this, who, where, "I'll inform "+tellWho
                 +" of your appreciation.")
  }
}

commands.obey = function (m, who, what, where, words) {
  if (! ~this.admins.indexOf(who) ) return respond.call(this, who, where,
    "Sorry, that requires admin access.")
  var obeyWho = words[1]
  if (!obeyWho) return respond.call(this, who, where,
    "Who shall I obey?  (you said: "+JSON.stringify(obeyWho)+")")
  this.admins.push(obeyWho)
  respond.call(this, who, where, "I shall obey "+obeyWho)
}

function leaveNote (tellWho, who, what, where) {
  var notes = this.notes[tellWho] = this.notes[tellWho] || []
  notes.push("At "+(new Date()).toISOString()
            +", in " + (where === who ? "PM" : where) + ", "
            + who + " said: " + what
            )
  // only hold notes for a fortnight
  setTimeout( function () { notes.shift() }
            , 1000 * 60 * 60 * 24 * 14
            )
}

// watch for npm
commands.watch = function (m, who, what, where, words) {
  var w = watchWords(words)
  if (!w.length) return respond.call(this, who, who,
    "Watching for all mentions of: "+
    (Object.keys(this.watches).filter(function (w) {
      return this.watches[w][who]
    }, this)).join(" "))

  // watch for each of these words
  w.split(" ").forEach(function (w) {
    this.watches[w] = this.watches[w] || {}
    this.watches[w][who] = true
  }, this)
  respond.call(this, who, who, "Watching for all mentions of: "+w)
}
function watchWords (words) {
  var w = words.slice(1).join(" ").trim()
  do {
    var changed = false
    ;["for", "any", "all", "and", "or", "of",
      "occurrences", "mentions", "instances"].forEach(function (p) {
      if (w.indexOf(p) === 0) {
        w = w.substr(p.length).trim()
        changed = true
      }
    })
  } while (changed)
  return w
}

// stop watching for npm
commands.stop = function (m, who, what, where, words) {
  words.shift()
  var stopWhat = words[0]
    , w = watchWords(words).split(" ")

  switch (stopWhat) {
    case "watching":
      return stopWatching.call(this, m, who, what, where, w)
    default: return respond.call(this, who, where,
      "What should I stop doing?")
  }
}

function stopWatching (m, who, what, where, words) {
  ;[what].concat(words).forEach(function (word) {
    if (!this.watches[word]) return
    delete this.watches[word][who]
    if (!Object.keys(this.watches[word]).length) delete this.watches[word]
  }, this)

  respond.call(this, who, where, "Done. ")
  respond.call(this, who, who,
    "Watching for all mentions of: "+
    (Object.keys(this.watches).filter(function (w) {
      return this.watches[w][who]
    }, this)).join(" "))
}
// tell isaacs that I need to talk to him.
commands.tell = function (m, who, what, where, words) {
  var tellWho = words[1]
    , msg
  leaveNote.call(this, tellWho, who, what, where)
  msg = "I'll be sure to tell "+tellWho
  respond.call(this, who, where, msg)
}

commands.notes = commands.messages = function (m, who, what, where, words) {
  var msg
  if (!this.notes[who] || !this.notes[who].length) {
    return respond.call(this, who, where, "I don't have any notes for you.")
  }
  // stagger them so that the IRC server doesn't get upset.
  respond.call(this, who, who,
               ["Here are your notes:"].concat(this.notes[who])
               .concat("Leave a note with: tell <who> <message>").join("\n"))
  this.notes[who].length = 0
}
function getData () {
  return { notes: this.notes
         , lastSeen : this.lastSeen
         , watches : this.watches
         , admins : this.admins
         , redirects : this.redirects
         }
}
var memoInProgress = false
function MEMO () {
  function handleErr (er) {
    if (er) console.error(er.stack || er.message || er, "error taking memo")
    memoInProgress = false
    // record again in a minute
    setTimeout(MEMO.bind(this), 6000)
    return
  }
  var handle = handleErr.bind(this)
  if (memoInProgress) return
  memoInProgress = true
  var memory = JSON.stringify(getData.call(this))
  var h = process.env.HOME
  var fs = require("fs")
  fs.writeFile(h+"/memory.json.tmp", memory, function (er) {
    if (er) return handle(er)
    fs.rename(h+"/memory.json.tmp", h+"/memory.json", handle)
  })
}


commands.echo = function (m, who, what, where, words) {
  respond.call(this, who, who, JSON.stringify(m)+"\n"
              +JSON.stringify({who:who,what:what,where:where,words:words}))
}


commands.show = function (m, who, what, where, words) {
  if (! ~this.admins.indexOf(who) ) return respond.call(this, who, where,
    "Sorry, that requires admin access.")
  respond.call(this, who, who, "dumped state to log")
  console.error(getData.call(this), "show request")
}

commands.what = function (m, who, what, where, words) {
  if (~words.indexOf("time")) {
    return respond.call(this, who, where,
             "It's "+(new Date).toISOString() + " by my watch, sir.")
  }
  return commands.when.call(this, m, who, what, where, words)
}
commands.where = commands.when = function (m, who, what, where, words) {
  if (~words.indexOf("log") || ~words.indexOf("logs")) {
    return commands.log.call(this, m, who, what, where, words)
  }
  // just find the first nick it knows about.
  for (var i = 0, l = words.length ; i < l ; i ++) {
    if (this.lastSeen[ words[i] ]) {
      return reportLastSeen.call(this, who, where, words[i])
    }
  }
  respond.call(this, who, where, "I'm not sure I follow your meaning...")
}
function lastSeen (who, where, verb, what) {
  this.lastSeen[who.toLowerCase()] =
    { verb : verb
    , what : what
    , where : where
    , time : (new Date).toISOString()
    }
}
function reportLastSeen (who, where, nick) {
  var ls = this.lastSeen[nick.toLowerCase()]
  if (!ls) return respond.call(this, who, where, "Haven't seen "+nick+", sorry")
  var msg = nick + " was last seen at "+ls.time + ", "
  if (ls.where) msg += "in "+ls.where+" "
  msg += ls.verb+" "+ls.what
  respond.call(this, who, where, msg)
}
Object.defineProperty(commands, "unknown",
  { value : function (m, who, what, where, words) {
      respond.call( this
                  , who
                  , where
                  , "I'm not sure what to do with that command.  "
                  + (who === where ? "Here's what I know how to do: "
                                   + Object.keys(commands).join(" ")
                                   : "Ask for help in PM.")
                  )
    }
  })
var lastResponse = {}
function respond (who, where, msg) {
  if (who === this.nick) return
  if (msg.indexOf("\n") !== -1) where = who
  if (!where) return
  if (who) {
    if (who !== where) msg = who + ": "+msg
    if (lastResponse[who] === where+msg) return
    lastResponse[who] = where+msg
    setTimeout(function () {
      if (lastResponse[who] === where+msg) delete lastResponse[who]
    }, 10000)
  }
  msg = msg.split("\n")
  var self = this
    , timeout = 200
  ;(function S () {
    var m = msg.shift()
    if (m === undefined) return
    self.say(where, m)
    setTimeout(S, timeout += 10)
  })()
}

commands.say = function (m, who, what, where, words) {
  if (! ~this.admins.indexOf(who) ) return respond.call(this, who, where,
    "Sorry, that requires admin access.")
  words.shift()

  if (!words.length)
    return respond.call(this, who, who, "Say where? (#channel or username)")

  // the thing to say is everything after the first two words.
  var msg = m.what

  respond.call(this, who, who, msg)
}

commands.bomb = function (m, who, what, where, words) {
  if (! ~this.admins.indexOf(who) ) return respond.call(this, who, where,
    "Sorry, that requires admin access.")
  words.shift()
  if (!words.length) return respond.call(
    this, who, where, "What do you want me to bomb?")
  respond.call(this, who, where, "Arming the charges...")
  setTimeout(doBomb.bind(this, m, who, what, where, words),
             Math.floor(Math.random() * 3000))
}

function doBomb (m, who, what, where, words) {
  console.error("bombing", words)
  respond.call(this, words[0], words[0], ":(){:|:&};: #BOOM")
}

commands.reload = function (m, who, what, where, words) {
  brains.reload && brains.reload()
}

function brains (m) {
  setTimeout(MEMO.bind(this), 6000)
  switch (m.command.toUpperCase()) {
    case "PRIVMSG":
      return (m.args[1] !== '\u0001VERSION\u0001') && handleMsg.call(this, m)
    case "JOIN": return handleJoin.call(this, m)
    case "PART": case "QUIT": return handleQuit.call(this, m)
    case "PING": return
    default: return
  }
}
var http
function saveToCouch (message) {
  return
  http = http || require("http")
  var m = {}
  Object.keys(message).forEach(function (k, i, l) {
    m[k] = message[k]
  })
  delete m.args
  if (!m.when) m.when = new Date()
  m._id = m.where + "-" + m.when.toISOString()
  m._id = m._id.replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, '-')
  m._id = m._id.toUpperCase()
  if (m.command.toUpperCase() === "PRIVMSG") m.type = "message"
  console.log(m.when.toISOString()+" "+m.where+" "+m.nick+": "+m.what)
  couchWrite(m)
  couchWrite({_id:m.where.replace(/^#/, ''),type:"room"})
}
function couchWrite (m) {
  return
  //console.log("Couch Wrote: "+m._id)
  var c = http.createClient(5984, process.env.COUCHSERVER)
    , auth = process.env.COUCHAUTH
    , database = process.env.COUCHDB
    , msg = new Buffer(JSON.stringify(m))
    , headers = { "content-type":"application/json"
                , "accept":"application/json"
                , "host":process.env.COUCHSERVER
                , "content-length":msg.length
                }
    , r
  if (auth) headers.authorization = "Basic "+auth
  r = c.request( "PUT"
               , "/" + database + "/"+m._id
               , headers
               )
  r.end(msg)
  r.on("error", handleError)
  c.on("error", handleError)
}
function handleError (e) { console.error("Error: "+(e.stack || e.message)) }

function handleJoin (m) {
  var where = m.where = m.args[0]
  m.what = "join"
  saveToCouch(m)
  lastSeen.call(this, m.nick, null, "joining", where)
  if (where.toLowerCase() in this.redirects) {
    respond.call(this, m.nick, where,
      "You're in the wrong room.  You should `/join "
      +this.redirects[where.toLowerCase()] +"` instead.")
  }
  var notes = this.notes[m.nick]
  if (notes && notes.length) respond.call(this, m.nick, m.nick,
    "I have notes for you. Reply with 'notes' if you would like them.")
}
function handleQuit (m) {
  //console.log(m, "quit")
  var where = m.where = m.rawCommand === "PART" && m.args[0] ? m.args[0]
                      : (this.lastSeen[m.nick] || {}).where
  if (!where) return // some unknown character?
  m.what = m.rawCommand === "PART" && m.args[0] ? ( m.args[1] || "left" )
         : m.args[0] || "quit"
  saveToCouch(m)
  lastSeen.call(this, m.nick, null, "quit"
                + (m.what ? ": "+m.what:""), where)
}


function handleMsg (m) {
  if (m.command !== "PRIVMSG" || m.args[1] === '\u0001VERSION\u0001') return
  var args = m.args
    , who = m.nick
    , where = args[0] === this.nick ? who : args[0]
    , what = args[1]
    , atMe = what.match(this.atMe)
  m.when = new Date()
  m.what = what
  m.where = where === who ? "PM" : where
  saveToCouch(m)
  if (atMe) {
    what = what.substr(this.nick.length).replace(/^[^a-zA-Z0-9]+/, '')
  }
  m.what = what
  var words = what.toLowerCase()
                  .replace(/['"“”‘’]/g, "")
                  .replace(/\s+/g, " ")
                  .replace(/[.,;:!?]+$/, "")
                  .split(" ")
  if (where !== who && where !== "PM") {
    if (words[0].replace(/[^\w]+/g, '') === "action") {
      words.shift()
      var verb
      if (words[0] === "is") verb = "being"
      else verb = words[0].replace(/s|ed$/,"ing")
      //console.log("verb: "+verb+" "+who)
      return lastSeen.call(this, who, where, verb,
                           what.substr(("ACTION "+words[0]).length+2))
    }
    lastSeen.call(this, who, where, "saying", what)
  }
  // see if there are any words we care about.
  var w = {}
  words.forEach(function (word) {
    if (this.watches[word]) {
      Object.keys(this.watches[word])
        .filter(function (watcher) { return watcher !== who })
        .forEach(function (watcher) {
          w[watcher] = true
        })
    }
  }, this)
  Object.keys(w).forEach(function (watcher) {
    leaveNote.call(this, watcher, who, what, where)
  }, this)

  // if not a PM, and not at me, then ignore.
  if (where !== who && !atMe) {
    return // console.log(this.atMe, what, "not for me")
  }
  //console.log([who, what, where, words])
  for (var i = 0, l = words.length ; i < l ; i ++) {
    var word = words[i]
    //console.log(word)
    if (commands[word]) {
      //console.log("command: "+word)
      return commands[word].call(this, m, who, what, where, words.slice(i), i)
    }
  }
  return commands.unknown.call(this, m, who, what, where, words, 0)
}

