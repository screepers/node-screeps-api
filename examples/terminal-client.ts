import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
// If installed from npm, use:
// import { ... } from 'screeps-api'
import { Resources, RoomEvent, RoomObject, RoomObjectType, RoomObjectTypes, UserConsoleEvent, UserCpuEvent, UserCpuEventData } from '../src'

// Borrow API client instance and terminal I/O from the Console example
import { api, output, rl, stripTags, quit } from './console'

const ROOM_DIM = 50
const MIN_COLS = ROOM_DIM
const MIN_ROWS = ROOM_DIM + 5

// Abort if terminal is too small to render a room
if (output.columns < MIN_COLS || output.rows < MIN_ROWS) {
  console.error(`Expected terminal size to be at least ${MIN_COLS} columns by ${MIN_ROWS} rows`)
  process.exit(1)
}

const rlOut = new readline.Readline(output)

/** Additional room object properties used to render them */
interface RenderedObject extends RoomObject {
  glyph: string
  glyphOrder: number
}

let cpuData: Partial<UserCpuEventData> = {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let gameTime: number | undefined
let roomName: string | undefined
let terrain = ''
let objects: { [_id: string]: RenderedObject } = {}

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

async function changeRoom(newRoomName: string) {
  // If on an official server, normalize room names by prepending shard names
  let newFullRoomName = newRoomName
  if (api.isOfficialServer && !newRoomName.includes('/')) {
    const shardName = api.appConfig.defaultShard
    if (!shardName) {
      console.error(`Room name must be prefixed with a shard name because api.appConfig.defaultShard is not set`)
      return
    }
    newFullRoomName = `${api.appConfig.defaultShard}/${newRoomName}`
  }

  if (roomName === newFullRoomName) {
    console.info(`${newFullRoomName} is already being shown`)
    return
  }

  if (roomName) {
    void api.socket.unsubscribe(`room:${roomName}`, updateRoomObjects)
  }

  roomName = newFullRoomName
  terrain = (await api.gameRoomTerrain(newRoomName)).terrain[0].terrain
  objects = {}

  void api.socket.subscribe(`room:${roomName}`, updateRoomObjects)

  await renderPrompt()
}

async function updateRoomObjects(event: RoomEvent) {
  const fullRoomName = event.path ? `${event.id}/${event.path}` : event.id
  if (fullRoomName !== roomName) {
    console.warn(`Ignoring room event for ${fullRoomName}; expected ${roomName}`)
    return
  }

  gameTime = event.data.gameTime

  // Add/update objects
  for (const id in event.data.objects) {
    // Assign RoomObject properties
    const updated = event.data.objects[id]
    objects[id] ??= updated as RenderedObject
    Object.assign(objects[id], updated)

    // Assign RenderedObject properties
    const obj = objects[id]
    obj.glyph = OBJECT_GLYPHS[obj.type]
    obj.glyphOrder = GLYPH_RENDER_ORDER[obj.type]
  }

  // // Clear old objects:
  // for (const id in objects) {
  //   // TODO:
  //   // - Remove creeps/powerCreeps if gameTime >= obj.gameTime
  //   // - Check if the value of event.data.objects[id] is null
  //   //   to indicate a missing object
  // }

  await render()
  await renderPrompt()
}

async function clearScreen() {
  rlOut.cursorTo(0, 0)
  rlOut.clearScreenDown()
  await rlOut.commit()
}

async function render() {
  await clearScreen()
  await renderStats()

  // Top-left coordinate of the room display
  const roomX = 0
  const roomY = 1

  // Render room terrain
  rlOut.cursorTo(roomX, roomY)
  await rlOut.commit()
  for (let y = 0; y < ROOM_DIM; y++) {
    const i = y * ROOM_DIM
    const terrainStr = terrain.substring(i, i + ROOM_DIM)
      .split('')
      .map(c => TERRAIN_GLYPHS[c])
      .join('')
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

async function renderStats() {
  // Render basic stats
  rlOut.cursorTo(0, 0)
  rlOut.clearLine(0)
  await rlOut.commit()
  output.write(roomName ? `Room: ${roomName}` : 'Enter a room name')
  rlOut.cursorTo(26, 0)
  await rlOut.commit()
  output.write(`CPU: ${cpuData.cpu ?? '---'}`)
  rlOut.cursorTo(35, 0)
  await rlOut.commit()
  const memKibUsed = cpuData.memory !== undefined
    ? `${(cpuData.memory / 1024).toFixed(1)} KiB`
    : '---'
  output.write(`Memory: ${memKibUsed}`)
  // TODO: Render game time
}

const consoleLines: string[] = []

async function renderConsole() {
  // Remove oldest messages if log has overflowed
  const consoleRows = output.rows - ROOM_DIM - 2
  if (consoleLines.length > consoleRows) {
    consoleLines.splice(0, consoleLines.length - consoleRows)
  }

  // Render console output
  rlOut.cursorTo(0, ROOM_DIM + 1)
  for (const line of consoleLines) {
    rlOut.clearLine(0)
    await rlOut.commit()
    output.write(line.substring(0, output.columns) + '\n')
  }
}

async function renderPrompt() {
  rlOut.cursorTo(0, output.rows - 1)
  rlOut.clearLine(0)
  await rlOut.commit()
  rl.prompt(true)
}

export async function startClient() {
  void api.socket.subscribe('console', async (event: UserConsoleEvent) => {
    const { messages, error, shard } = event.data
    const shardTag = shard ? `[${shard}] ` : ''

    if (!messages) return

    // Add newest console messages
    const consoleRows = output.rows - ROOM_DIM - 2
    const newMessages = [
      ...(error ? `${shardTag}${error}`.split('\n') : []),
      ...messages.results.flatMap(msg => `< ${msg}`.split('\n')),
      ...messages.log.flatMap(msg => `${shardTag}${stripTags(msg)}`.split('\n'))
    ].slice(-consoleRows)
    consoleLines.push(...newMessages)

    await renderConsole()
    await renderPrompt()
  })

  void api.socket.subscribe('cpu', async (event: UserCpuEvent) => {
    cpuData = event.data
    await renderStats()
    await renderPrompt()
  })

  rl.on('close', () => quit('I/O closed. Bye!'))
  rl.on('SIGINT', () => quit('Keyboard interrupt. Bye!'))

  rl.on('line', async (line) => {
    line = line.trim()

    if (line == 'exit') {
      quit()
    }

    if (/^(?:(\w+)\/)?(E|W)(\d+)(N|S)(\d+)$/.exec(line)) {
      await changeRoom(line)
      return
    }

    api.userConsole(line).catch(console.error)
  })

  await api.socket.connect()
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  void startClient()
}
