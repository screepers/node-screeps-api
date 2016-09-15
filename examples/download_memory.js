'use strict'
const ScreepsAPI = require('../src/screepsAPI.js')
const auth = require('../auth')
const fs = require('fs')

let api = new ScreepsAPI(auth)

Promise.resolve()
  .then(()=>api.connect())
  .then(()=>api.memory.get())
  .then(memory=>{
    fs.writeFileSync('memory.json',JSON.stringify(memory))
  })
  .catch(err=>console.error(err))