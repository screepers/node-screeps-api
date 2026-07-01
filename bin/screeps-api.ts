#!/usr/bin/env node
import { Command } from 'commander'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { ScreepsHttpClient } from '../src'
import { UserCodeSetRequest } from './http'

interface CommandOptions {
  server?: string
}

type RawApiFn = (...args: unknown[]) => Promise<unknown>

function init(opts?: CommandOptions): Promise<ScreepsHttpClient> {
  return ScreepsHttpClient.fromConfig(opts?.server ?? 'main')
}

function json(data: unknown) {
  process.stdout.write(JSON.stringify(data))
}

async function out(data: unknown) {
  data = await data
  data = (data as { data?: unknown } | undefined)?.data ?? data
  if (process.stdout.isTTY) {
    console.log(data)
  } else {
    json(data)
  }
}

const program = new Command()

const commandBase = (name: string, args?: string) => {
  const command = new Command(name)
  if (args) command.arguments(args)
  command.option('--server <server>', 'Server config to use', 'main')
  program.addCommand(command)
  return command
}

const pkgUrl = new URL('../package.json', import.meta.url)
const pkg = JSON.parse(await readFile(pkgUrl, 'utf8')) as { version: string }

program
  .version(pkg.version)

commandBase('call', '<cmd> [args...]')
  .summary('Call a method on ScreepsHttpClient')
  .description(`Call a method on ScreepsHttpClient.

<cmd> is the name of the method.
[args...] are passed directly to the named method.
  `)
  .addHelpText('after', `
Examples:
# Run 'GET /api/auth/me' on the "ptr" server from your credentials file
screeps-api --server ptr call authMe
# Run 'GET /api/scoreboards/list?limit=20&offset=50' on "main" server from your credentials file
screeps-api call scoreboardList 20 50
# Fetch entire Memory object from shard0 on "mmo" server from your credentials file
screeps-api call userMemoryGet "" "shard0"
  `)
  .action(async function (endpoint: string, args: unknown[], opts?: CommandOptions) {
    const api = await init(opts)
    const fn = api[endpoint as unknown as keyof typeof api]
    if (!fn || typeof fn !== 'function') {
      console.error(`Endpoint method '${endpoint}' not found on ScreepsHttpClient`)
      this.help({ error: true }) // prints to stderr and exits with error code
    }
    await out(await (fn as RawApiFn).apply(api, args))
  })

interface MemoryOptions extends CommandOptions {
  allowRoot?: boolean
  file?: string
  set?: string
  shard?: string
  pretty: boolean
}

commandBase('memory', '[path]')
  .summary(`Read from or write to Memory`)
  .description(`Get Memory contents at [path] and emit either emit them to stdout or save them to a file. If Memory at [path] is undefined, no output is emitted.

If --set <file> is used, this command will instead set the value of [path] to the contents of the specified file.

[path] is a dot-delimited sequence of Memory keys. For example, "creeps.myCreep" would be equivalent to calling "Memory.creeps.myCreep" from a bot.
  `)
  .option('--set <file>', 'Sets the memory path to the contents of file')
  .option('--allow-root', 'Allows writing without path')
  .option('-s --shard <shard>', 'Shard to read from')
  .option('-f --file <file>', 'File to write data to')
  .option('-p --pretty', 'Pretty print JSON output')
  .action(async function (memPath: string, opts: MemoryOptions) {
    const api = await init(opts)

    if (opts.set) {
      if (!memPath && !opts.allowRoot) {
        console.error('Refusing to write to root! Use --allow-root if you really want this.')
        this.help({ error: true }) // prints to stderr and exits with error code
      }
      const data = await readFile(opts.set, 'utf8')
      await api.userMemorySet(memPath, data, opts.shard)
      await out('Memory written')
      return
    }

    const res = await api.userMemoryGet(memPath, opts.shard)
    if (!res.data) {
      return
    }
    const data = opts.pretty
      ? JSON.stringify(res.data, undefined, 2)
      : JSON.stringify(res.data)
    if (opts.file) {
      await writeFile(opts.file, data)
    } else {
      await out(data)
    }
  })

interface SegmentOptions extends CommandOptions {
  dir?: string
  set?: string
  shard?: string
}

commandBase('segment', '<segments>')
  .summary('Read or write RawMemory segments')
  .description(`Reads/downloads segment data by default. <segments> should be a comma-delimited
list of all segment IDs that should be fetched (or 'all' to get all segments).

If --set <file> is used, <segments> must be the ID of a single segment.
  `)
  .option('--set <file>', 'Sets the segment content to the contents of file')
  .option('-s --shard <shard>', 'Shard to read from')
  .option('-d --dir <dir>', 'Directory to save in. Empty files are not written. (defaults to outputing in console)')
  .action(async function (segment: number | string, opts: SegmentOptions) {
    const api = await init(opts)
    if (opts.set) {
      if (segment === 'all' || segment.toString().includes(',')) {
        console.error('Cannot set multiple segments at once')
        this.help({ error: true }) // prints to stderr and exits with error code
      }
      const data = await readFile(opts.set, 'utf8')
      await api.userMemorySegmentSet(segment, JSON.parse(data), opts.shard)
      await out('Segment uploaded')
    } else {
      if (segment === 'all') {
        segment = Array.from({ length: 100 }, (_v, k) => k).join(',')
      }
      const { data } = await api.userMemorySegmentGet(segment, opts.shard)
      const dir = opts.dir
      const segments = data
      if (dir) {
        if (Array.isArray(segments)) {
          await Promise.all(segments.map(async (d: string | null, i: number) => {
            return d && await writeFile(path.join(dir, `segment_${i}`), d)
          }))
          await out(`Segments ${segment} downloaded`)
        } else if (segments) {
          await writeFile(path.join(dir, `segment_${segment}`), segments)
          await out(`Segment ${segment} downloaded`)
        } else {
          await out(`Segment ${segment} was null`)
        }
      } else {
        await out(segments)
      }
    }
  })

interface DownloadOptions extends CommandOptions {
  branch: string
  dir?: string
}

commandBase('download')
  .description(`Download code and WASM binaries`)
  .option('-b --branch <branch>', 'Code branch', 'default')
  .option('-d --dir <dir>', 'Directory to save in (emits to stdout by default)')
  .action(async function (opts: DownloadOptions) {
    const api = await init(opts)
    const dir = opts.dir
    const { modules } = await api.userCodeGet(opts.branch)
    if (dir) {
      await Promise.all(Object.keys(modules).map(async (fn) => {
        const data = modules[fn]
        if (typeof data === 'object') {
          await writeFile(path.join(dir, `${fn}.wasm`), Buffer.from(data.binary, 'base64'))
        } else {
          await writeFile(path.join(dir, `${fn}.js`), data)
        }
        console.log(`Saved ${fn}`)
      }))
    } else {
      await out(modules)
    }
  })

interface UploadOptions extends CommandOptions {
  branch: string
}

commandBase('upload', '<files...>')
  .description(`Upload code and WASM binaries`)
  .option('-b --branch <branch>', 'Code branch', 'default')
  .action(async function (files: string[], opts: UploadOptions) {
    const api = await init(opts)
    const modules: UserCodeSetRequest['modules'] = {}
    const ps = []
    for (const file of files) {
      ps.push((async (file) => {
        const { name, ext } = path.parse(file)
        const data = await readFile(file)
        if (ext === '.js') {
          modules[name] = data.toString('utf8')
        }
        if (ext === '.wasm') {
          modules[name] = { binary: data.toString('base64') }
        }
      })(file))
    }
    await Promise.all(ps)
    await out(api.userCodeSet({ branch: opts.branch, modules }))
  })

function run() {
  if (!process.argv.slice(2).length) {
    program.outputHelp()
    process.exit(1)
  }

  try {
    program.parse()
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

run()
