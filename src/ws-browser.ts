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
  event: string,
  callback: (...args: unknown[]) => unknown,
  ...args: unknown[]
): void {
  this.addEventListener(event, function handler(this: globalThis.WebSocket) {
    callback.apply(this, args)
    self.removeEventListener(event, handler)
  })
}
