const WebSocket = window.WebSocket ?? import('ws')
export default WebSocket

declare global {
  interface WebSocket {
    on: (event: string, callback: (this: globalThis.WebSocket, ev: unknown) => unknown) => void
    off: (event: string, callback: (this: globalThis.WebSocket, ev: unknown) => unknown) => void
    once: (event: string, callback: (this: globalThis.WebSocket, ev: unknown) => unknown) => void
  }
}

WebSocket.prototype.on = function (event: string, callback: (this: globalThis.WebSocket, ev: unknown) => unknown): void {
  this.addEventListener(event, callback)
}

WebSocket.prototype.off = function (event: string, callback: (this: globalThis.WebSocket, ev: unknown) => unknown): void {
  this.removeEventListener(event, callback)
}

WebSocket.prototype.once = function (
  this: globalThis.WebSocket,
  event: string,
  callback: (this: globalThis.WebSocket, ...args: unknown[]) => unknown,
  ...args: unknown[]
): void {
  const self = this
  this.addEventListener(event, function handler () {
    callback.apply(self, args)
    self.removeEventListener(event, handler)
  })
}
