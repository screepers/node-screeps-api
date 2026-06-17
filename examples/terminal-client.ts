import readline from 'node:readline/promises'
// If installed from npm, use:
// import { ... } from 'screeps-api'
import { Resources, RoomEvent, RoomObject, RoomObjectType, RoomObjectTypes, ScreepsHttpClient, ScreepsSocketClient, ServerAuthEvent, ServerAuthStatuses, UserConsoleEvent, UserCpuEvent, UserCpuEventData } from '../src'

const ROOM_DIM = 50
const MIN_COLS = ROOM_DIM
const MIN_ROWS = ROOM_DIM + 2

const input = process.stdin
const output = process.stdout
const rlOut = new readline.Readline(output)

// Abort if terminal is too small to render a room
if (output.columns < MIN_COLS || output.rows < MIN_ROWS) {
  console.error(`Expected terminal size to be at least ${MIN_COLS} columns by ${MIN_ROWS} rows`)
  process.exit(1)
}

// Load server/app names from env vars
const serverName = process.env.SCREEPS_SERVER ?? 'main'
const appName = process.env.SCREEPS_APP ?? 'example'
const api = await ScreepsHttpClient.fromConfig(serverName, { app: appName })

/** Additional room object properties used to render them */
interface RenderedObject extends RoomObject {
  glyph: string
  glyphOrder: number
}

let cpuData: Partial<UserCpuEventData> = {}
let gameTime: number | undefined
let terrain: string | undefined
let objects: { [_id: string]: RenderedObject } = {}
let roomName: string | undefined

const TERRAIN_GLYPHS: Readonly<{ [code: string]: string }> = {
  0: ' ', // plain
  1: '#', // wall
  2: '.' // swamp
}

/** Glyphs used to represent each {@link RoomObject} type. */
const OBJECT_GLYPHS: Readonly<{ [resType in RoomObjectType]: string }> = {
  // Assign `r` to all dropped resources
  ...Object.values(Resources).reduce(
    (glyphs, resType) => {
      glyphs[resType] = 'r'
      return glyphs
    },
    {} as { [resType in RoomObjectType]: string }
  ),
  creep: 'c',
  powerCreep: 'p',
  deposit: 'D',
  mineral: 'm',
  source: 'S',
  constructedWall: '$',
  container: 'o',
  controller: 'C',
  extension: 'e',
  extractor: 'M',
  factory: 'f',
  invaderCore: 'I',
  keeperLair: 'L',
  lab: 'l',
  link: '/',
  nuker: '%',
  observer: 'I',
  portal: '>',
  powerBank: 'B',
  powerSpawn: 'P',
  rampart: '@',
  road: '_',
  spawn: 'C',
  storage: 'O',
  terminal: 'T',
  tower: 't',
  constructionSite: '^',
  nuke: 'v',
  ruin: 'X',
  tombstone: 'x'
}

const GLYPH_RENDER_ORDER: Readonly<{ [resType in RoomObjectType]: number }> = {
  // Assign a default value
  ...Object.values(RoomObjectTypes).reduce(
    (glyphs, resType) => {
      glyphs[resType] = 50
      return glyphs
    },
    {} as { [resType in RoomObjectType]: number }
  ),
  nuke: 5,
  container: 10,
  road: 10,
  ruin: 20,
  tombstone: 20,
  rampart: 60,
  constructionSite: 65,
  constructedWall: 70,
  controller: 100,
  extension: 100,
  extractor: 100,
  factory: 100,
  invaderCore: 100,
  keeperLair: 100,
  lab: 100,
  link: 100,
  nuker: 100,
  observer: 100,
  portal: 100,
  powerBank: 100,
  powerSpawn: 100,
  spawn: 100,
  storage: 100,
  terminal: 100,
  tower: 100,
  creep: 200,
  powerCreep: 200
}

async function changeRoom(roomNameInput: string) {
  // Pull shard and room name from input and config
  // eslint-disable-next-line prefer-const
  let [newShardName, newRoomName] = roomNameInput.includes('/')
    ? roomNameInput.split('/')
    : [undefined, roomNameInput]
  newShardName ??= api.appConfig.defaultShard

  // If on an official server, reject inputs without shard names
  if (api.isOfficialServer && !newShardName) {
    console.error(`Room name must be prefixed with a shard name because api.appConfig.defaultShard is not set`)
    return
  }

  const newFullRoomName = api.isOfficialServer
    ? `${newShardName}/${newRoomName}`
    : newRoomName
  if (roomName === newFullRoomName) {
    console.info(`${newFullRoomName} is already being shown`)
    return
  }

  terrain = (await api.gameRoomTerrain(newRoomName, newShardName)).terrain[0].terrain
  objects = {}
  roomName = newFullRoomName

  if (roomName) {
    void api.socket.unsubscribeRoom(newRoomName, newShardName, updateRoomObjects)
  }

  void api.socket.subscribeRoom(newRoomName, newShardName, updateRoomObjects)

  await renderStats()
  await renderPrompt()
}

async function updateRoomObjects(event: RoomEvent) {
  const fullRoomName = event.path ? `${event.id}/${event.path}` : event.id
  if (fullRoomName !== roomName) {
    console.warn(`Ignoring room event for ${fullRoomName}; expected ${roomName}`)
    return
  }

  gameTime = event.data.gameTime

  // Add/update/remove objects
  for (const id in event.data.objects) {
    // Delete removed objects
    if (event.data.objects[id] === null) {
      delete objects[id]
      continue
    }

    // Assign RoomObject properties
    const updated = event.data.objects[id]
    objects[id] ??= updated as RenderedObject
    Object.assign(objects[id], updated)

    // Assign RenderedObject properties
    const obj = objects[id]
    obj.glyph = OBJECT_GLYPHS[obj.type]
    obj.glyphOrder = GLYPH_RENDER_ORDER[obj.type]
  }

  await renderRoom()
  await renderPrompt()
}

/** Clear the screen */
async function clearScreen() {
  rlOut.cursorTo(0, 0)
  rlOut.clearScreenDown()
  await rlOut.commit()
}

/** Render entire client UI */
async function render() {
  await clearScreen()
  await renderStats()
  await renderRoom()
  await renderConsole()
  await renderPrompt()
}

async function renderStats() {
  // Clear line and display current room name
  rlOut.cursorTo(0, 0)
  rlOut.clearLine(0)
  await rlOut.commit()
  output.write(roomName ? `Room: ${roomName}` : 'Enter a room name')

  // Display CPU usage
  rlOut.cursorTo(26, 0)
  await rlOut.commit()
  output.write(`CPU: ${cpuData.cpu ?? '---'}`)

  // Display memory usage
  rlOut.cursorTo(35, 0)
  await rlOut.commit()
  const memKibUsed = cpuData.memory !== undefined
    ? `${(cpuData.memory / 1024).toFixed(1)} KiB`
    : '---'
  output.write(`Memory: ${memKibUsed}`)

  // Display game time
  rlOut.cursorTo(55, 0)
  await rlOut.commit()
  output.write(`Time: ${gameTime?.toLocaleString() ?? '---'}`)
}

async function renderRoom() {
  // Top-left coordinate of the room display
  const roomX = 0
  const roomY = 1

  // Render room terrain
  for (let y = 0; y < ROOM_DIM; y++) {
    rlOut.cursorTo(roomX, roomY + y)
    await rlOut.commit()

    const i = y * ROOM_DIM
    const terrainStr = terrain?.substring(i, i + ROOM_DIM)
      .split('')
      .map(c => TERRAIN_GLYPHS[c])
      .join('') ?? ' '.repeat(ROOM_DIM)
    output.write(terrainStr + '\n')
  }

  // Render objects from lowest to highest priority to ensure glyphs
  // for higher-priority objects obscure those of lower-priority objects.
  const objs = Object.values(objects)
    .sort((a, b) => a.glyphOrder - b.glyphOrder)
  for (const obj of objs) {
    rlOut.cursorTo(obj.x + roomX, obj.y + roomY)
    await rlOut.commit()
    output.write(obj.glyph)
  }
}

const consoleBuffer: string[] = []
const CONSOLE_BUFFER_SIZE = 1_000

function logToConsole(...messages: string[]) {
  consoleBuffer.push(...(messages.flatMap(msg => msg.split('\n'))))

  if (consoleBuffer.length > CONSOLE_BUFFER_SIZE) {
    consoleBuffer.splice(0, CONSOLE_BUFFER_SIZE - consoleBuffer.length)
  }

  void renderConsole()
  void renderPrompt()
}

/** Render console output */
async function renderConsole() {
  // Remove oldest messages if log has overflowed
  const consoleRows = output.rows - ROOM_DIM - 2
  if (consoleBuffer.length > consoleRows) {
    consoleBuffer.splice(0, consoleBuffer.length - consoleRows)
  }

  // Render console output
  for (let dy = 0; dy < consoleRows; dy++) {
    rlOut.cursorTo(0, ROOM_DIM + 1 + dy)
    rlOut.clearLine(0)
    await rlOut.commit()

    if (dy < consoleBuffer.length) {
      output.write(consoleBuffer[dy].substring(0, output.columns))
    }
  }
}

/** Render the input prompt */
async function renderPrompt() {
  rlOut.cursorTo(0, output.rows - 1)
  rlOut.clearLine(0)
  await rlOut.commit()
  rlInterface.prompt(true)
}

api.socket.on(ScreepsSocketClient.CONNECTED, () => {
  console.info('Connected to WebSocket API')
})
api.socket.on(ScreepsSocketClient.AUTH, (event: ServerAuthEvent) => {
  if (event.data.status === ServerAuthStatuses.Failed) {
    console.error('WebSocket API authentication failed')
    process.exit(1)
  }
  console.info('Authenticated to WebSocket API')
})
api.socket.on(ScreepsSocketClient.DISCONNECTED, () => {
  console.info('Disconnected from WebSocket API')
})
api.socket.on(ScreepsSocketClient.ERROR, (err: unknown) => {
  console.error('WebSocket API error:', err)
})

console.debug('Connecting to WebSocket API')
await api.socket.connect()

function quit(message: string, code = 0) {
  console.log(message)
  process.exit(code)
}

const rlInterface = readline.createInterface({
  input,
  output,
  prompt: `${api.appConfig.defaultShard ?? ''}> `
})

rlInterface.on('close', () => quit('I/O closed. Bye!'))
rlInterface.on('SIGINT', () => quit('Keyboard interrupt. Bye!', 1))

rlInterface.on('line', async (line) => {
  line = line.trim()

  if (line === 'exit') {
    quit('Bye!')
  }

  if (/^(?:(\w+)\/)?(E|W)(\d+)(N|S)(\d+)$/.exec(line)) {
    await changeRoom(line)
    return
  }

  api.userConsole(line).catch(console.error)
})

// Monkeypatch console methods to display output in the console area
function logToConsoleMonkeypatch(...args: unknown[]) {
  logToConsole('<<< ' + args.map(arg => String(arg)).join(' '))
}

console.log = logToConsoleMonkeypatch
console.debug = logToConsoleMonkeypatch
console.info = logToConsoleMonkeypatch
console.warn = logToConsoleMonkeypatch
console.error = logToConsoleMonkeypatch

void render()

/**
 * Strip HTML tags from a string to make it more readable.
 * This is not suitable for sanitizing untrusted input.
 */
function stripTags(text: string): string {
  return text.replaceAll(/<\s*?\/?\s*?\w+?(?:[\w\s=]+?'[^>]*'?|[\w\s=]+?"[^>]*"?|[\w\s=]+?`[^>]*`?|[\w\s]+?)*>/g, '')
}

void api.socket.subscribeUserConsole((event: UserConsoleEvent) => {
  const { messages, error, shard } = event.data
  const shardTag = shard ? `[${shard}] ` : ''

  // Add newest console messages
  const newMessages = messages
    ? [
        ...messages.results.flatMap(msg => `< ${msg}`),
        ...messages.log.flatMap(msg => `${shardTag}${stripTags(msg)}`)
      ]
    : []
  if (error) newMessages.push(`${shardTag}${error}`)

  logToConsole(...newMessages)
})

void api.socket.subscribeUserCpu(async (event: UserCpuEvent) => {
  cpuData = event.data
  await renderStats()
  await renderPrompt()
})

// Pick an initial room to load
const startRoomRes = await api.userWorldStartRoom()
const startRoom = startRoomRes.room[0]
if (startRoom) {
  await changeRoom(startRoom)
}
