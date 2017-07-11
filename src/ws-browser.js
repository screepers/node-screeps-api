export import WebSocket from 'ws'

WebSocket.prototype.on = function (event, callback) {
  this.addEventListener(event, callback);
};

WebSocket.prototype.off = function (event, callback) {
  this.removeEventListener(event, callback);
};

WebSocket.prototype.once = function (event, callback) {
  var self = this;
  this.addEventListener(event, function handler() {
    callback.apply(callback, arguments);
    self.removeEventListener(event, handler);
  });
};
