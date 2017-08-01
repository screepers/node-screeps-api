# Screeps API
![npm](https://nodei.co/npm/screeps-api.png "NPM")

This is a nodejs API for the game Screeps

## Basic usage

As of 1.0, all functions return Promises

```javascript
const { ScreepsAPI } = require('screeps-api');
const fs = require('fs');

// All options are optional
const api = new ScreepsAPI({
  email: 'screeps@email.com',
  password: 'notMyPass',
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443,
  ptr: false,
  path: '/' // Do no include '/api', it will be added automatically
});

// You can overwrite parameters if needed
api.auth('screeps@email.com','notMyPass',{
  protocol: 'https',
  hostname: 'screeps.com',
  port: 443,
  ptr: false,
  path: '/' // Do no include '/api', it will be added automatically
})

// Dump Memory
api.memory.get()
  .then(memory => {
    fs.writeFileSync('memory.json', JSON.stringify(memory))
  })
  .catch(err => console.error(err));


// Dump Memory Path
api.memory.get('rooms.W0N0')
  .then(memory => {
    fs.writeFileSync('memory.rooms.W0N0.json', JSON.stringify(memory))
  })
  .catch(err => console.error(err));

// Get user info
api.me().then((user)=>console.log(user))

// Socket API

api.socket.connect()
// Events have the structure of:
// {
//   channel: 'room',
//   id: 'E3N3', // Only on certain events
//   data: { ... }
// }
api.socket.on('connected',()=>{
	// Do stuff after conntected
})
api.socket.on('auth',(event)=>{
	event.data.status contains either 'ok' or 'failed'
	// Do stuff after auth
})

// Events: (Not a complete list)
// connected disconnected message auth time protocol package subscribe unsubscribe console

// Subscribtions can be queued even before the socket connects or auths,
// although you may want to subscribe from the connected or auth callback to better handle reconnects

api.socket.subscribe('console')
api.socket.on('console',(event)=>{
	event.data.messages.log // List of console.log output for tick
})


// Starting in 1.0, you can also pass a handler straight to subscribe!
api.socket.subscribe('console', (event)=>{
	event.data.messages.log // List of console.log output for tick
})

// More common examples
api.socket.subscribe('cpu',(event)=>console.log('cpu',event.data))
api.code.get('default').then(data=>console.log('code',data))
api.code.set('default',{
	main: 'module.exports.loop = function(){ ... }'
})
api.socket.subscribe('memory/stats',(event)=>{
	console.log('stats',event.data)
})
api.socket.subscribe('memory/rooms.E0N0',(event)=>{
	console.log('E0N0 Memory',event.data)
})
```

## Endpoint documentation

Server endpoints are listed in the `docs` folder:
 * [Endpoints.md](/docs/Endpoints.md) for direct access
 * [Websocket_endpoints.md](/docs/Websocket_endpoints.md) for web socket endpoints
Those lists are currently not exhaustive.
