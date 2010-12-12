var http = require("http")
http.createServer(function (req, res) {
  if (req.url !== "/") {
    res.writeHead(404, {})
    return res.end("404 Not found")
  }
  res.writeHead(200, {})
  res.end("Hello")
}).listen(80)


require("./ircretary")
