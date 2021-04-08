const WebSocket = module.exports = window.WebSocket || require('ws')

WebSocket.prototype.on = function (event, callback) {
  this.addEventListener(event, callback)
}

WebSocket.prototype.off = function (event, callback) {
  this.removeEventListener(event, callback)
}

WebSocket.prototype.once = function (event, callback) {
  const self = this
  this.addEventListener(event, function handler () {
    callback.apply(callback, arguments)
    self.removeEventListener(event, handler)
  })
}
