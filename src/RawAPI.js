const URL = require('url')
const querystring = require('querystring')
const { EventEmitter } = require('events')
const zlib = require('zlib')
const { fetch } = require('fetch-ponyfill')()

class RawAPI extends EventEmitter {
  constructor(opts={}){
    super()
    this.opts = opts
    let self = this
    this.raw = {
      version(){
        return self.req('GET','/api/version')
      },
      authmod(){
        if(this.opts.url.match(/screeps\.com/))
          return Promise.resolve({ name: 'official' })
        return self.req('GET','/authmod')
      },
      history(room,tick){
        tick = Math.round(tick/20)*20
        return self.req('GET','/room-history/${room}/${tick}.json')
      },
      auth: {
        signin(email,password){
          return self.req('POST','/api/auth/signin', { email,password })
        },
        steamTicket(ticket,useNativeAuth=false){
          return self.req('POST','/api/auth/steam-ticket', { ticket, useNativeAuth })
        },
        me(){
          return self.req('GET','/api/auth/me')
        },
      },
      register: {
        checkEmail(email){ 
          return self.req('GET','/api/register/check-email', { email })
        },
        checkUsername(username){ 
          return self.req('GET','/api/register/check-username', { username })
        },
        setUsername(username){ 
          return self.req('POST','/api/register/check-username', { username })
        },
        submit(username,email,password,modules){
          return self.req('POST','/api/register/submit', { username, email, password, modules })
        }
      },
      userMessages: {
        list(respondent){
          return self.req('GET','/api/user-messages/list', { respondent })
        },
        index(){
          return self.req('GET','/api/user-messages/index')
        },
        unreadCount(){
          return self.req('GET','/api/user-messages/unread-count')
        },
        send(respondent,text){
          return self.req('POST','/api/user-messages/send', { respondent, text })
        },
        markRead(id){
          return self.req('POST','/api/user-messages/mark-read', { id })
        },
      },
      game: {
        mapStats(rooms,statName){
          return self.req('POST','/api/game/map-stats', { rooms, statName })
        },
        genUniqueObjectName(type){
          return self.req('POST','/api/game/gen-unique-object-name', { type })
        },
        checkUniqueObjectName(type,name){
          return self.req('POST','/api/game/check-unique-object-name', { type, name })
        },
        placeSpawn(room,x,y,name){
          return self.req('POST','/api/game/place-spawn', { name, room, x, y })
        },
        createFlag(room,x,y,name,color=1,secondaryColor=1){
          return self.req('POST','/api/game/create-flag', { name, room, x, y, color, secondaryColor })
        },
        genUniqueFlagName(){
          return self.req('POST','/api/game/gen-unique-flag-name')
        },
        checkUniqueFlagName(name){
          return self.req('POST','/api/game/check-unique-flag-name', { name })
        },
        changeFlagColor(color=1,secondaryColor=1){
          return self.req('POST','/api/game/change-flag-color', { color, secondaryColor })
        },
        removeFlag(room,name){
          return self.req('POST','/api/game/remove-flag',{ name, room })
        },
        addObjectIntent(room,name,intent){
          return self.req('POST','/api/game/add-object-intent', { room, name, intent })
        },
        createConstruction(room,x,y,structureType,name){ 
          return self.req('POST','/api/game/create-construction', { room, x, y, structureType, name })
        },
        setNotifyWhenAttacked(_id, enabled=true){
          return self.req('POST','/api/game/set-notify-when-attacked', { _id, enabled })
        },
        createInvader(room,x,y,size,type,boosted=false){
          return self.req('POST','/api/game/create-invader', { room, x, y, size, type, boosted })
        },
        removeInvader(_id){
          return self.req('POST','/api/game/remove-invader',{ _id })
        },
        time(){
          return self.req('GET','/api/game/time')
        },
        worldSize(){
          return self.req('GET','/api/game/world-size')
        },
        roomTerrain(room,encoded=1){
          return self.req('GET','/api/game/room-terrain', { room, encoded })
        },
        roomStatus(room){
          return self.req('GET','/api/game/room-status', { room })      
        },
        roomOverview(room,interval=8){
          return self.req('GET','/api/game/room-overview', { room, interval })
        },        
        market: {
          ordersIndex(){
            return self.req('GET','/api/game/market/orders-index')
          },
          myOrders(){
            return self.req('GET','/api/game/market/my-orders')
          },
          orders(resourceType){
            return self.req('GET','/api/game/market/orders', { resourceType })
          },
          stats(resourceType){
            return self.req('GET','/api/game/market/stats', { resourceType })
          }
        },
      },
      leaderboard: {
        list(){
          return self.req('GET','/api/leaderboard/list')
        },
        find(username,mode='world',season=''){
          return self.req('GET','/api/leaderboard/find', { season, mode, username })
        },
        seasons(){
          return self.req('GET','/api/leaderboard/seasons')
        }
      },
      user:{
        badge(badge){
          return self.req('POST','/api/user/badge', { badge })
        },
        respawn(){ 
          return self.req('POST','/api/user/respawn')
        },
        setActiveBranch(branch,activeName){
          return self.req('POST','/api/user/set-active-branch', { branch, activeName })
        },
        cloneBranch(branch,newName,defaultModules){
          return self.req('POST','/api/user/clone-branch', { branch, newName, defaultModules })
        },
        deleteBranch(branch){
          return self.req('POST','/api/user/delete-branch', { branch })
        },
        notifyPrefs(prefs){
          // disabled,disabledOnMessages,sendOnline,interval,errorsInterval
          return self.req('POST','/api/user/notify-prefs', prefs)
        },
        tutorialDone(){
          return self.req('POST','/api/user/tutorial-done')
        },
        email(email){
          return self.req('POST','/api/user/email', { email })
        },
        worldStartRoom(){
          return self.req('GET','/api/user/world-start-room')
        },
        worldStatus(){
          return self.req('GET','/api/user/world-status')
        },
        branches(){
          return self.req('GET','/api/user/branches')
        },
        code: {
          get(branch){
            return self.req('GET','/api/user/code', { branch })
          },
          set(branch,modules,_hash){
            if(!_hash) _hash = Date.now()
            return self.req('POST','/api/user/code', { branch, modules, _hash })
          }
        },
        respawnProhibitedRooms(){
          return self.req('GET','/api/user/respawn-prohibited-rooms')
        },
        memory:{
          get(path){
            return self.req('GET','/api/user/memory', { path })
          },
          set(path,value){
            return self.req('POST','/api/user/memory', { path, value })
          },
          segment:{
            get(segment){
              return self.req('GET','/api/user/memory-segment', { segment })
            },
            set(segment,data){
              return self.req('POST','/api/user/memory-segment', { segment, data })
            },
          }
        },
        find(username){          
          return self.req('GET','/api/user/find', { username })
        },
        findById(id){          
          return self.req('GET','/api/user/find', { id })
        },
        stats(interval){
          return self.req('GET','/api/user/stats', { interval })
        },
        rooms(id){
          return self.req('GET','/api/user/rooms', { id })
        },
        overview(interval,statName){
          return self.req('GET','/api/user/overview', { interval, statName })
        },
        moneyHistory(page=0){
          return self.req('GET','/api/user/money-history', { page })
        },
        console(expression){
          return self.req('POST','/api/user/console', { expression })
        },
      }
    }
  }
  auth(email,password){
    if(!this.opts.email && !this.opts.password){
      Object.assign(this.opts,{ email, password })
    }
    return this.raw.auth.signin(email,password)
      .then(res=>{
        this.emit('token',res.token)
        this.emit('auth')
        this.__authed = true
        return res
      })
  }
  req(method,path,body={}){
    let opts = { 
      method,
      headers: {
        'X-Token':this.token,
        'X-Username':this.token
      },
    }
    let url = URL.resolve(this.opts.url,path)
    if(method == 'GET'){
      url += '?' + querystring.stringify(body)
    }
    if(method == 'POST'){
      opts.headers['content-type'] = 'application/json'
      opts.body = JSON.stringify(body)
    }
    return fetch(url,opts)
      .then(res=>{
        if(res.status == 401){
          if(this.__authed){
            this.__authed = false
            return this.auth(this.opts.email,this.opts.password)
              .then(()=>this.req(method,path,body))
          }else{
            return Promise.reject(new Error('Not Authorized'))
          }
        }
        let token = res.headers.get('x-token')
        if(token){
          this.emit('token',token)
        }
        this.emit('response',res)
        if(!res.ok)
          return res.text().then(d=>Promise.reject(d))
        return res
      })
      .then(res=>res.json())
      .then(res=>{
        if(typeof res.data == 'string' && res.data.slice(0,3) == 'gz:')
        {
          if(this.opts.url.match(/screeps\.com/))
            res.data = gz(res.data)
          else
            res.data = inflate(res.data)
        }
        return res
      })      
  }
  gz(data) {
    let buf = new Buffer(data.slice(3), 'base64')
    let ret = zlib.gunzipSync(buf).toString()
    return JSON.parse(ret)
  }
  inflate(data) {
    let buf = new Buffer(data.slice(3), 'base64')
    let ret = zlib.inflateSync(buf).toString()
    return JSON.parse(ret)
  }
}

module.exports = RawAPI