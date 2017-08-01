import { format } from 'url'
import Promise from 'bluebird'
import URL from 'url'
import querystring from 'querystring'
import { EventEmitter } from 'events'
import zlib from 'zlib'

Promise.promisifyAll(zlib)
import fetch from 'node-fetch'

export class RawAPI extends EventEmitter {
  constructor(opts={}){
    super()
    this.setServer(opts)
    let self = this
    this.raw = {
      version(){
        return self.req('GET',`${self.opts.apiPath}/version`)
      },
      authmod(){
        if(self.opts.url.match(/screeps\.com/))
          return Promise.resolve({ name: 'official' })
        return self.req('GET','/authmod')
      },
      history(room,tick){
        tick = Math.round(tick/20)*20
        return self.req('GET','/room-history/${room}/${tick}.json')
      },
      auth: {
        signin(email,password){
          return self.req('POST',`${self.opts.apiPath}/auth/signin`, { email,password })
        },
        steamTicket(ticket,useNativeAuth=false){
          return self.req('POST',`${self.opts.apiPath}/auth/steam-ticket`, { ticket, useNativeAuth })
        },
        me(){
          return self.req('GET',`${self.opts.apiPath}/auth/me`)
        },
      },
      register: {
        checkEmail(email){
          return self.req('GET',`${self.opts.apiPath}/register/check-email`, { email })
        },
        checkUsername(username){
          return self.req('GET',`${self.opts.apiPath}/register/check-username`, { username })
        },
        setUsername(username){
          return self.req('POST',`${self.opts.apiPath}/register/set-username`, { username })
        },
        submit(username,email,password,modules){
          return self.req('POST',`${self.opts.apiPath}/register/submit`, { username, email, password, modules })
        }
      },
      userMessages: {
        list(respondent){
          return self.req('GET',`${self.opts.apiPath}/user-messages/list`, { respondent })
        },
        index(){
          return self.req('GET',`${self.opts.apiPath}/user-messages/index`)
        },
        unreadCount(){
          return self.req('GET',`${self.opts.apiPath}/user-messages/unread-count`)
        },
        send(respondent,text){
          return self.req('POST',`${self.opts.apiPath}/user-messages/send`, { respondent, text })
        },
        markRead(id){
          return self.req('POST',`${self.opts.apiPath}/user-messages/mark-read`, { id })
        },
      },
      game: {
        mapStats(rooms,statName){
          return self.req('POST',`${self.opts.apiPath}/game/map-stats`, { rooms, statName })
        },
        genUniqueObjectName(type){
          return self.req('POST',`${self.opts.apiPath}/game/gen-unique-object-name`, { type })
        },
        checkUniqueObjectName(type,name){
          return self.req('POST',`${self.opts.apiPath}/game/check-unique-object-name`, { type, name })
        },
        placeSpawn(room,x,y,name){
          return self.req('POST',`${self.opts.apiPath}/game/place-spawn`, { name, room, x, y })
        },
        createFlag(room,x,y,name,color=1,secondaryColor=1){
          return self.req('POST',`${self.opts.apiPath}/game/create-flag`, { name, room, x, y, color, secondaryColor })
        },
        genUniqueFlagName(){
          return self.req('POST',`${self.opts.apiPath}/game/gen-unique-flag-name`)
        },
        checkUniqueFlagName(name){
          return self.req('POST',`${self.opts.apiPath}/game/check-unique-flag-name`, { name })
        },
        changeFlagColor(color=1,secondaryColor=1){
          return self.req('POST',`${self.opts.apiPath}/game/change-flag-color`, { color, secondaryColor })
        },
        removeFlag(room,name){
          return self.req('POST',`${self.opts.apiPath}/game/remove-flag`,{ name, room })
        },
        addObjectIntent(room,name,intent){
          return self.req('POST',`${self.opts.apiPath}/game/add-object-intent`, { room, name, intent })
        },
        createConstruction(room,x,y,structureType,name){
          return self.req('POST',`${self.opts.apiPath}/game/create-construction`, { room, x, y, structureType, name })
        },
        setNotifyWhenAttacked(_id, enabled=true){
          return self.req('POST',`${self.opts.apiPath}/game/set-notify-when-attacked`, { _id, enabled })
        },
        createInvader(room,x,y,size,type,boosted=false){
          return self.req('POST',`${self.opts.apiPath}/game/create-invader`, { room, x, y, size, type, boosted })
        },
        removeInvader(_id){
          return self.req('POST',`${self.opts.apiPath}/game/remove-invader`,{ _id })
        },
        time(){
          return self.req('GET',`${self.opts.apiPath}/game/time`)
        },
        worldSize(){
          return self.req('GET',`${self.opts.apiPath}/game/world-size`)
        },
        roomTerrain(room,encoded=1){
          return self.req('GET',`${self.opts.apiPath}/game/room-terrain`, { room, encoded })
        },
        roomStatus(room){
          return self.req('GET',`${self.opts.apiPath}/game/room-status`, { room })
        },
        roomOverview(room,interval=8){
          return self.req('GET',`${self.opts.apiPath}/game/room-overview`, { room, interval })
        },
        market: {
          ordersIndex(){
            return self.req('GET',`${self.opts.apiPath}/game/market/orders-index`)
          },
          myOrders(){
            return self.req('GET',`${self.opts.apiPath}/game/market/my-orders`)
          },
          orders(resourceType){
            return self.req('GET',`${self.opts.apiPath}/game/market/orders`, { resourceType })
          },
          stats(resourceType){
            return self.req('GET',`${self.opts.apiPath}/game/market/stats`, { resourceType })
          }
        },
      },
      leaderboard: {
        list(){
          return self.req('GET',`${self.opts.apiPath}/leaderboard/list`)
        },
        find(username,mode='world',season=''){
          return self.req('GET',`${self.opts.apiPath}/leaderboard/find`, { season, mode, username })
        },
        seasons(){
          return self.req('GET',`${self.opts.apiPath}/leaderboard/seasons`)
        }
      },
      user:{
        badge(badge){
          return self.req('POST',`${self.opts.apiPath}/user/badge`, { badge })
        },
        respawn(){
          return self.req('POST',`${self.opts.apiPath}/user/respawn`)
        },
        setActiveBranch(branch,activeName){
          return self.req('POST',`${self.opts.apiPath}/user/set-active-branch`, { branch, activeName })
        },
        cloneBranch(branch,newName,defaultModules){
          return self.req('POST',`${self.opts.apiPath}/user/clone-branch`, { branch, newName, defaultModules })
        },
        deleteBranch(branch){
          return self.req('POST',`${self.opts.apiPath}/user/delete-branch`, { branch })
        },
        notifyPrefs(prefs){
          // disabled,disabledOnMessages,sendOnline,interval,errorsInterval
          return self.req('POST',`${self.opts.apiPath}/user/notify-prefs`, prefs)
        },
        tutorialDone(){
          return self.req('POST',`${self.opts.apiPath}/user/tutorial-done`)
        },
        email(email){
          return self.req('POST',`${self.opts.apiPath}/user/email`, { email })
        },
        worldStartRoom(){
          return self.req('GET',`${self.opts.apiPath}/user/world-start-room`)
        },
        worldStatus(){
          return self.req('GET',`${self.opts.apiPath}/user/world-status`)
        },
        branches(){
          return self.req('GET',`${self.opts.apiPath}/user/branches`)
        },
        code: {
          get(branch){
            return self.req('GET',`${self.opts.apiPath}/api/user/code`, { branch })
          },
          set(branch,modules,_hash){
            if(!_hash) _hash = Date.now()
            else return self.req('POST',`${self.opts.apiPath}/user/code`, { branch, modules, _hash })
          }
        },
        respawnProhibitedRooms(){
          return self.req('GET',`${self.opts.apiPath}/user/respawn-prohibited-rooms`)
        },
        memory:{
          get(path){
            return self.req('GET',`${self.opts.apiPath}/user/memory`, { path })
          },
          set(path,value){
            return self.req('POST',`${self.opts.apiPath}/user/memory`, { path, value })
          },
          segment:{
            get(segment){
              return self.req('GET',`${self.opts.apiPath}/user/memory-segment`, { segment })
            },
            set(segment,data){
              return self.req('POST',`${self.opts.apiPath}/user/memory-segment`, { segment, data })
            },
          }
        },
        find(username){
          return self.req('GET',`${self.opts.apiPath}/user/find`, { username })
        },
        findById(id){
          return self.req('GET',`${self.opts.apiPath}/user/find`, { id })
        },
        stats(interval){
          return self.req('GET',`${self.opts.apiPath}/user/stats`, { interval })
        },
        rooms(id){
          return self.req('GET',`${self.opts.apiPath}/user/rooms`, { id })
        },
        overview(interval,statName){
          return self.req('GET',`${self.opts.apiPath}/user/overview`, { interval, statName })
        },
        moneyHistory(page=0){
          return self.req('GET',`${self.opts.apiPath}/user/money-history`, { page })
        },
        console(expression){
          return self.req('POST',`${self.opts.apiPath}/user/console`, { expression })
        },
      }
    }
  }
  setServer(opts){
    if(!this.opts) {
      this.opts = {}
    }
    Object.assign(this.opts,opts)
    if(!opts.url){
      this.opts.pathname = this.opts.pathname || this.opts.path
      this.opts.url = format(this.opts)
    }
    this.opts.apiPath = this.opts.ptr ? "/ptr/api" : "/api"
  }
  async auth(email,password,opts={}){
    this.setServer(opts)
    if(email && password){
      Object.assign(this.opts,{ email, password })
    }
    let res = await this.raw.auth.signin(email,password)
    this.emit('token',res.token)
    this.emit('auth')
    this.__authed = true
    return res
  }
  async req(method,path,body={}) {
    let opts = {
      method,
      headers: {
        'X-Token':this.token,
        'X-Username':this.token
      },
    }
    let url = URL.resolve(this.opts.url,path)
    if(method == 'GET') {
      url += '?' + querystring.stringify(body)
    }
    if(method == 'POST'){
      opts.headers['content-type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    let res = await fetch(url,opts)
    if(res.status == 401){
      if(this.__authed){
        this.__authed = false
        await this.auth(this.opts.email,this.opts.password)
      }else{
        throw new Error('Not Authorized')
      }
    }
    let token = res.headers.get('x-token')
    if(token){
      this.emit('token',token)
    }
    this.emit('response',res)
    if (!res.ok){
      throw new Error(await res.text())
    }
    res = await res.json()
    if (typeof res.data == 'string' && res.data.slice(0,3) == 'gz:') {
      if(this.opts.url.match(/screeps\.com/))
        res.data = await this.gz(res.data)
      else
        res.data = await this.inflate(res.data)
    }
    return res
  }
  async gz(data) {
    let buf = new Buffer(data.slice(3), 'base64')
    let ret = await zlib.gunzipAsync(buf)
    return JSON.parse(ret.toString())
  }
  async inflate(data) {
    let buf = new Buffer(data.slice(3), 'base64')
    let ret = await zlib.inflateAsync(buf)
    return JSON.parse(ret.toString())
  }
}
