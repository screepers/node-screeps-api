import WebSocket from 'ws'
import url from 'url'
import { EventEmitter } from 'events'

export class Socket extends EventEmitter {
  constructor(ScreepsAPI){
    super()
    this.api = ScreepsAPI
    this.__queue = []
    this.__subQueue = []
  }
  async connect(){
    return new Promise((resolve,reject)=>{
      if(!this.api.token){
        reject(new Error('No token! Call api.auth() before connecting the socket!'))
      }
      let baseURL = this.api.opts.url.replace('http','ws')
      let wsurl = url.resolve(baseURL,'socket/websocket')
      this.ws = new WebSocket(wsurl)
      this.ws.on('open',async ()=>{
        this.connected = true
        await resolve(this.auth(this.api.token))
        this.emit('connected')
        while(this.__queue.length)
          this.emit(this.__queue.shift())
      })
      this.ws.on('close',()=>{
        this.authed = false
        this.connected = false
        this.emit('disconnected')
        this.removeAllListeners()
      })
      this.ws.on('message',(data)=>this.handleMessage(data))
    })
  }
  handleMessage(msg){
    msg = msg.data || msg // Handle ws/browser difference
    if(msg.slice(0, 3) == 'gz:')
      msg = inflate(msg)
    if(msg[0] == '['){
      msg = JSON.parse(msg)
      let [,type,id,channel] = msg[0].match(/^(.+):(.+?)(?:\/(.+))?$/)
      channel = channel || type
      let event = { channel, id, type, data: msg[1] }
      this.emit(msg[0],event)
      this.emit(event.channel,event)
      this.emit('message', event)
    }else{
      let [channel,...data] = msg.split(' ')
      let event = { type: 'server', channel, data }
      if(channel == 'auth')
        event.data = { status: data[0], token: data[1] }
      if(['protocol','time','package'].includes(channel))
        event.data = { [channel]: data[0] }
      this.emit(channel, event)
      this.emit('message', event)
    }
  }
  async gzip(bool){
    this.send(`gzip ${bool?'on':'off'}`)
  }
  async send(data){
    if(!this.connected){
      this.__queue.push(data)
    }else{
      this.ws.send(data)      
    }
  }
  auth(token){
    return new Promise((resolve,reject)=>{
      this.send(`auth ${token}`)
      this.once('auth',(ev)=>{
        let { data } = ev
        if(data.status == 'ok'){
          this.authed = true
          this.emit('token',data.token)
          while(this.__subQueue.length)
            this.send(this.__subQueue.shift())
          resolve()
        }else{
          reject('socket auth failed')
        }
      })
    })
  }
  async subscribe(path,cb){
    if (!path) return
    if (!this.api.user)
      await this.api.me()
    if (!path.match(/^([a-z]+):(.+?)$/))
      path = `user:${this.api.user._id}/${path}`
    if(this.authed){
      this.send(`subscribe ${path}`)
    }else{
      this.__subQueue.push(`subscribe ${path}`)
    }
    this.emit('subscribe',path)
    if(cb) this.on(path,cb)
  }
  async unsubscribe(path){
    if (!path) return
    if (!this.api.user)
      await this.api.me()
    if (!path.match(/^([a-z]+):(.+?)$/))
      path = `user:${this.api.user._id}/${path}`
    this.send(`unsubscribe ${path}`)
    this.emit('unsubscribe',path)
  }
  async reconnect(){
    return this.connect()
  }
}

