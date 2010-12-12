var http = require("http")
http.createServer(function (req, res) {
  if (req.url !== "/") {
    res.writeHead(404, {})
    return res.end("404 Not found")
  }
  if (process.env.LOGURL) {
    res.writeHead(301,{location:process.env.LOGURL})
  } else {
    res.writeHead(200, {})
  }
  res.end("hello")
}).listen(process.env.PORT || 80)


require("./ircretary")
