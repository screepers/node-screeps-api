# Screeps API
![npm](https://nodei.co/npm/screeps-api.png "NPM")

This is a nodejs API for the game Screeps

## Basic usage
```
const ScreepsAPI = require('screeps-api')
const fs = require('fs')

let api = new ScreepsAPI({
  email: 'screeps@email.com',
  password: 'notMyPass'
})

Promise.resolve()
  .then(()=>api.connect())
  .then(()=>api.memory.get())
  .then(memory=>{
    fs.writeFileSync('memory.json',JSON.stringify(memory))
  })
  .catch(err=>console.error(err))
```