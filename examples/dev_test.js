'use strict'
const ScreepsAPI = require('../')
const auth = require('../auth')
const WebSocket = require('ws')

const {ScreepsAPI} = require('./screepsAPI.js')

let api = new ScreepsAPI(auth)

api.socket(()=>{})

api.on('message', (msg) => {
  console.log('MSG', msg)
  if (msg.slice(0, 7) == 'auth ok') {
    api.subscribe('/console')
    setTimeout(() => {
      api.wssend(`cmd console.log('!!!!!')`)
    }, 4000)
  }
})

api.on('console', (msg) => {
  // console.log('CONSOLE', msg)
  let [user, data] = msg
  if (data.messages) data.messages.log.forEach(l => console.log(l))
  if (data.messages) data.messages.results.forEach(l => console.log('>', l))
  if (data.error) console.log('error', data.error)
})
