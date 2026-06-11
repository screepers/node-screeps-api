import { DepositResource, MineralBoostResource, MineralCompoundResource, MineralResource, Resource, Resources } from './resources'

/**
 * Defines types/constants/enums/etc related to in-game objects that exist
 * within rooms.
 * @module
 */

/**
 * Describes all possible types of {@link Structure}s that can be built
 * by a player and associated with a {@link ConstructionSite}
 * @enum
 */
export const BuildableStructureConstants = {
  Container: 'container',
  Controller: 'controller',
  Extension: 'extension',
  Extractor: 'extractor',
  Factory: 'factory',
  Lab: 'lab',
  Link: 'link',
  Nuker: 'nuker',
  Observer: 'observer',
  PowerSpawn: 'powerSpawn',
  Rampart: 'rampart',
  Road: 'road',
  Spawn: 'spawn',
  Storage: 'storage',
  Terminal: 'terminal',
  Tower: 'tower',
  Wall: 'constructedWall'
} as const

export type BuildableStructureConstant = typeof BuildableStructureConstants[keyof typeof BuildableStructureConstants]

/**
 * Describes all possible types of {@link Structure}s that can exist in the game world.
 * @enum
 */
export const StructureConstants = {
  ...BuildableStructureConstants,
  InvaderCore: 'invaderCore',
  KeeperLair: 'keeperLair',
  Portal: 'portal',
  PowerBank: 'powerBank'
} as const

export type StructureConstant = typeof StructureConstants[keyof typeof StructureConstants]

/**
 * Represents any possible entity that can physically exist in the game world.
 * @enum
 */
export const RoomObjectConstants = {
  ConstructionSite: 'constructionSite',
  Creep: 'creep',
  Deposit: 'deposit',
  Mineral: 'mineral',
  Nuke: 'nuke',
  PowerCreep: 'powerCreep',
  Source: 'source',
  Ruin: 'ruin',
  Tombstone: 'tombstone',
  ...StructureConstants,
  ...Resources
} as const

export type RoomObjectConstant = typeof RoomObjectConstants[keyof typeof RoomObjectConstants]

export interface RoomObject extends Position {
  _id: string
  type: RoomObjectConstant
  room: string
  name?: string
  /** Temporary effects that are active on this object */
  effects?: { [index: number]: Effect } | null
}

/** A temporary status effect applied to a {@link RoomObject} */
export interface Effect {
  /** An effect ID */
  effect: number
  /** A {@link PowerCreep} power ID */
  power: number
  /** Tick at which this effect will end */
  endTime: number
}

// Creeps

/** Common properties of {@link Creep}s and {@link PowerCreep}s */
export interface AnyCreep extends RoomObject, HasHits, HasOwner, HasStore {
  type: 'creep' | 'powerCreep'
  name: string
  /** Tick at which this creep will expire */
  ageTime: number
}

/**
 * Creeps are your units. Creeps can move, harvest energy, construct structures,
 * attack another creeps, and perform other actions.
 *
 * https://docs.screeps.com/api/#Creep
 */
export interface Creep extends AnyCreep {
  type: 'creep'
  actionLog: {
    attack: Position | null
    attacked: unknown
    build: Position | null
    harvest: Position | null
    heal: Position | null
    healed: unknown
    rangedAttack: Position | null
    rangedHeal: Position | null
    rangedMassAttack: unknown
    repair: Position | null
    reserveController: Position | null
    say: SayAction | null
    upgradeController: Position | null
  }
  body: {
    name: BodyPartConstant
    hits: number
    $name: string
    boost?: MineralBoostResource
  }[]
  fatigue: number
}

/**
 * Possible body part types that may be added to a {@link Creep}
 * @enum
 */
export const BodyPartConstants = {
  Attack: 'attack',
  Carry: 'carry',
  Claim: 'claim',
  Heal: 'heal',
  Move: 'move',
  RangedAttack: 'rangedAttack',
  Tough: 'tough',
  Work: 'work'
} as const

export type BodyPartConstant = typeof BodyPartConstants[keyof typeof BodyPartConstants]

/**
 * Power Creeps are immortal "heroes" that are tied to your account and
 * can be respawned in any {@link StructurePowerSpawn | PowerSpawn} after death.
 *
 * https://docs.screeps.com/api/#PowerCreep
 */
export interface PowerCreep extends AnyCreep {
  type: 'powerCreep'
  actionLog: {
    attack: Position | null
    attacked: unknown
    healed: unknown
    power: unknown
    say: SayAction | null
    spawned: unknown
  }
  className: PowerCreepClass
  /** UNIX timestamp after which this power creep will be deleted */
  deleteTime: number | null
  /** UNIX timestamp after which this dead power creep may be spawned again */
  spawnCooldownTime: number | null
  level: number
  powers: {
    [powerId: number]: {
      level: number
      /** Earliest tick at which this power can be used next */
      cooldownTime: number
    }
  }
  shard: string
}

/**
 * A {@link PowerCreep} archetype. Each has a unique set of powers.
 * @enum
 */
export const PowerCreepClasses = {
  Operator: 'operator'
} as const

/** A {@link PowerCreepClasses} value */
export type PowerCreepClass = typeof PowerCreepClasses[keyof typeof PowerCreepClasses]

// Structures

/**
 * The base prototype object of all structures.
 *
 * https://docs.screeps.com/api/#Structure
 */
export interface Structure extends RoomObject {
  type: StructureConstant
  _isDisabled: boolean
}

/**
 * A small container that can be used to store resources.
 *
 * https://docs.screeps.com/api/#StructureContainer
 */
export interface StructureContainer extends Structure, HasHits, HasStore {
  type: 'container'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

/**
 * Claim this structure to take control over the room.
 *
 * https://docs.screeps.com/api/#StructureController
 */
export interface StructureController extends Structure, HasOwner {
  type: 'controller'
  downgradeTime?: number | null
  level: number
  isPowerEnabled?: boolean
  progress?: number
  progressTotal?: number
  reservation?: {
    /** Tick at which this reservation will end */
    endTime?: number
    /** ID of the user who reserved this controller */
    user: string
  } | null
  safeMode?: number | null
  safeModeAvailable?: number
  safeModeCooldown?: number | null
  sign?: {
    /** UNIX timestamp at which this controller was signed */
    datetime: number
    /** Sign message */
    text: string
    /** Tick at which this controller was signed */
    time: number
    /** ID of the user who signed this controller */
    user: string
  }
  upgradeBlocked?: number | null
}

/**
 * Contains energy which can be spent on spawning bigger creeps.
 *
 * https://docs.screeps.com/api/#StructureExtension
 */
export interface StructureExtension extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy'> {
  type: 'extension'
  off: boolean
}

/**
 * Allows creeps to harvest a mineral deposit.
 *
 * https://docs.screeps.com/api/#StructureExtractor
 */
export interface StructureExtractor extends Structure, HasHits, HasOwner {
  type: 'extractor'
  cooldown: number
}

/**
 * Produces trade commodities from base minerals and other commodities.
 *
 * https://docs.screeps.com/api/#StructureFactory
 */
export interface StructureFactory extends Structure, HasHits, HasOwner, HasStore {
  type: 'extractor'
  actionLog: {
    produce: unknown
  }
  cooldown: number
  cooldownTime: number
}

/**
 * This NPC structure is a control center of NPC Strongholds, and also rules all invaders in the sector.
 *
 * https://docs.screeps.com/api/#StructureInvaderCore
 */
export interface StructureInvaderCore extends Structure, HasHits, HasOwner {
  type: 'invaderCore'
  actionLog: {
    attackController: Position | null
    reserveController: Position | null
    transferEnergy: unknown
    upgradeController: Position | null
  }
  /** Tick at which this L1+ core and its stronghold will disappear */
  decayTime?: number
  /** Tick at which this L1+ core and its stronghold will activate */
  deployTime?: number | null
  depositType?: DepositResource
  level: number
  /** Tick at which this L1+ core will deploy another L0 core */
  nextExpandTime?: number
  population?: {
    [index: number]: {
      body: string
      behavior: string
    }
  }
  spawning?: unknown
  strongholdBehavior?: string
  strongholdId: string
  templateName?: string
}

/**
 * Non-player structure. Spawns NPC Source Keepers that guards energy sources and minerals in some rooms.
 *
 * https://docs.screeps.com/api/#StructureKeeperLair
 */
export interface StructureKeeperLair extends Structure {
  type: 'keeperLair'
  /** Tick at which the next source keeper creep will be spawned from here */
  nextSpawnTime: number | null
}

/**
 * Produces mineral compounds from base minerals, boosts and unboosts creeps.
 *
 * https://docs.screeps.com/api/#StructureLab
 */
export interface StructureLab extends
  Structure,
  HasHits,
  HasOwner,
  HasRestrictedStore<'energy' | MineralResource | MineralCompoundResource>
{
  type: 'lab'
  actionLog: {
    reverseReaction: StartEndPositions | null
    runReaction: StartEndPositions | null
  }
  cooldown: number
  cooldownTime: number
  mineralAmount: number
}

/**
 * Remotely transfers energy to another Link in the same room.
 *
 * https://docs.screeps.com/api/#StructureLink
 */
export interface StructureLink extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy'> {
  type: 'link'
  actionLog: {
    transferEnergy: unknown
  }
  cooldown: number
}

/**
 * Launches a nuke to another room dealing huge damage to the landing area.
 *
 * https://docs.screeps.com/api/#StructureNuker
 */
export interface StructureNuker extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy' | 'G'> {
  type: 'nuker'
  cooldownTime: number
}

/**
 * Provides visibility into a distant room from your script.
 *
 * https://docs.screeps.com/api/#StructureObserver
 */
export interface StructureObserver extends Structure, HasHits, HasOwner {
  type: 'observer'
  observeRoom: string | null
}

/**
 * A non-player structure. Instantly teleports your creeps to a distant room acting as a room exit tile.
 *
 * https://docs.screeps.com/api/#StructurePortal
 */
export interface StructurePortal extends Structure {
  type: 'portal'
  destination: IntershardDestination | IntrashardDestination
  /**
   * UNIX timestamp at which this portal will begin to decay;
   * undefined for intershard portals; null if portal is already decaying
   */
  unstableDate?: number | null
  /**
   * Number of ticks before this portal disappears;
   * undefined if {@link unstableDate} is undefined or null
   */
  decayTime?: number
}

/** Destination of an intershard {@link StructurePortal} */
export interface IntershardDestination {
  room: string
  shard: string
}

/** Destination of an intrashard {@link StructurePortal} */
export interface IntrashardDestination {
  room: string
  x: number
  y: number
}

/**
 * Non-player structure. Contains power resource which can be obtained by destroying the structure.
 *
 * https://docs.screeps.com/api/#StructurePowerBank
 */
export interface StructurePowerBank extends Structure, HasHits {
  type: 'powerBank'
  /** Tick at which this object will disappear */
  decayTime: number
  store: {
    power: number
  }
}

/**
 * Processes power into your account, and spawns power creeps with special unique powers.
 *
 * https://docs.screeps.com/api/#StructurePowerSpawn
 */
export interface StructurePowerSpawn extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy' | 'power'> {
  type: 'powerSpawn'
}

/**
 * Blocks movement of hostile creeps, and defends your creeps and structures on the same tile.
 *
 * https://docs.screeps.com/api/#StructureRampart
 */
export interface StructureRampart extends Structure, HasHits, HasOwner {
  type: 'rampart'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

/**
 * Decreases movement cost to 1. Using roads allows creating creeps with less MOVE body parts.
 *
 * https://docs.screeps.com/api/#StructureRoad
 */
export interface StructureRoad extends Structure, HasHits {
  type: 'road'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

/**
 * Spawn is your colony center. This structure can create, renew, and recycle creeps.
 *
 * https://docs.screeps.com/api/#StructureSpawn
 */
export interface StructureSpawn extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy'> {
  type: 'spawn'
  off: boolean
  name: string
  spawning?: {
    name: string
    /** Total number of ticks required to spawn this creep */
    needTime: number
    /** Tick at which this creep will finish spawning */
    spawnTime: number
  }
}

/**
 * A structure that can store huge amount of resource units.
 *
 * https://docs.screeps.com/api/#StructureStorage
 */
export interface StructureStorage extends Structure, HasHits, HasOwner, HasStore {
  type: 'storage'
}

/**
 * Sends any resources to a Terminal in another room.
 *
 * https://docs.screeps.com/api/#StructureTerminal
 */
export interface StructureTerminal extends Structure, HasHits, HasOwner, HasStore {
  type: 'terminal'
  cooldownTime: number
}

/**
 * Remotely attacks or heals creeps, or repairs structures. Can be targeted to any object in the room.
 *
 * https://docs.screeps.com/api/#StructureTower
 */
export interface StructureTower extends Structure, HasHits, HasOwner, HasRestrictedStore<'energy'> {
  type: 'tower'
  actionLog: {
    attack: Position | null
    heal: Position | null
    repair: Position | null
  }
}

// Other Objects

/**
 * A site of a structure which is currently under construction.
 *
 * https://docs.screeps.com/api/#ConstructionSite
 */
export interface ConstructionSite extends RoomObject {
  type: 'constructionSite'
  name?: string
  progress: number
  progressTotal: number
  structureType: StructureConstant
}

/**
 * A rare resource deposit needed for producing commodities.
 * Can be harvested by creeps with a WORK body part.
 *
 * https://docs.screeps.com/api/#Deposit
 */
export interface Deposit extends RoomObject {
  type: 'deposit'
  /** Tick at which this deposit can be harvested again */
  cooldownTime: number
  /** Tick at which this object will disappear */
  decayTime: number
  depositType: DepositResource
  /** Amount harvested from this deposit */
  harvested: number
}

/**
 * A mineral deposit. Can be harvested by creeps with a WORK body part using
 * the {@link StructureExtractor | extractor} structure.
 *
 * https://docs.screeps.com/api/#Mineral
 */
export interface Mineral extends RoomObject {
  type: 'mineral'
  density: 1 | 2 | 3 | 4
  mineralAmount: number
  mineralType: MineralResource
  /** Tick at which this resource will be refilled */
  nextRegenerationTime: number
}

/**
 * A nuke landing position. This object cannot be removed or modified.
 *
 * https://docs.screeps.com/api/#Nuke
 */
export interface Nuke extends RoomObject {
  type: 'nuke'
  /** Game time at which this nuke will land */
  landTime: number
  /** Name of the room that launched this nuke */
  launchRoomName: string
}

/**
 * An energy source object. Can be harvested by creeps with a `WORK` body part.
 *
 * https://docs.screeps.com/api/#Source
 */
export interface Source extends RoomObject {
  type: 'source'
  energy: number
  energyCapacity: number
  invaderHarvested: number
  /** Tick at which this resource will be refilled */
  nextRegenerationTime: number
  /** @deprecated always set to 300 use {@link nextRegenerationTime} */
  ticksToRegeneration: number
}

/**
 * A destroyed structure. This is a walkable object.
 *
 * https://docs.screeps.com/api/#Ruin
 */
export interface Ruin extends RoomObject, HasOwner {
  type: 'ruin'
  /** Tick at which this object will disappear */
  decayTime: number
  /** Tick at which the associated structure was destroyed */
  destroyTime: number
  store: Store
  structure: {
    id: string
    hits: number
    hitsMax: number
    type: StructureConstant
    user: null
  }
}

/**
 * A remnant of dead creeps. This is a walkable object.
 *
 * https://docs.screeps.com/api/#Tombstone
 */
export interface Tombstone extends RoomObject, HasOwner {
  type: 'tombstone'
  creepBody: BodyPartConstant[]
  creepId: string
  creepName: string
  creepSaying: SayAction | null
  creepTicksToLive: number
  /** Tick at which the associated creep died */
  deathTime: number
  /** Tick at which this object will disappear */
  decayTime: number
  store: Store
}

/**
 * A say action performed by a {@link Creep} or {@link PowerCreep}
 */
export interface SayAction {
  isPublic: boolean
  message: string
}

/** A {@link RoomObject} that can be damaged/destroyed */
export interface HasHits {
  hits: number
  hitsMax: number
  notifyWhenAttacked: boolean
}

/** A {@link RoomObject} with an owner. The owner could be an NPC. */
export interface HasOwner {
  /**
   * ID of the user who owns this object.
   *
   * Note: NPCs do not have long-form hex ID strings like normal players:
   * - Invader: "2"
   * - SourceKeeper: "3"
   */
  user: string
}

/**
 * An object that can contain resources in its cargo.
 *
 * https://docs.screeps.com/api/#Store
 */
export interface Store {
  [resType: string]: number | undefined
}

/** A {@link RoomObject} with a general-purpose {@link Store}. */
export interface HasStore {
  store: { [resType in Resource]: number | undefined }
  storeCapacity: number
}

/** A {@link RoomObject} with a limited {@link Store} */
export interface HasRestrictedStore<R extends Resource> {
  store: { [resType in R]: number }
  /**
   * Capacities should not be null, except on minerals in a lab
   * when another mineral type is already being stored.
   */
  storeCapacityResource: { [resType in R]: number | null }
}

/**
 * Indicates the position of an object within a known room
 * (which is why a room name field isn't included).
 */
export interface Position {
  x: number
  y: number
}

/**
 * Indicates a start and end position within the same known room
 * (which is why a room name field isn't included).
 */
export interface StartEndPositions {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Represents a {@link https://docs.screeps.com/api/#Flag | flag} owned
 * by the authenticated user.
 *
 * While this interface seems to conform to {@link RoomObject}, it is not
 * included in results from {@link ScreepsHttpClient.gameRoomObjects}.
 */
export interface Flag {
  /** Unlike other `_id` fields, values are formatted as `flag_${name}` */
  _id: string
  type: 'flag'
  color: FlagColor
  secondaryColor: FlagColor
  x: number
  y: number
}

/**
 * {@link Flag} colors
 * @enum
 */
export const FlagColors = {
  Red: 1,
  Purple: 2,
  Blue: 3,
  Cyan: 4,
  Green: 5,
  Yellow: 6,
  Orange: 7,
  Brown: 8,
  Grey: 9,
  White: 10
} as const

/** A {@link FlagColors} value */
export type FlagColor = typeof FlagColors[keyof typeof FlagColors]

/**
 * @see https://docs.screeps.com/api/#Game.map.getRoomStatus
 * @enum
 */
export const RoomStatuses = {
  Closed: 'closed',
  Normal: 'normal',
  Novice: 'novice',
  Respawn: 'respawn'
} as const

/** A {@link RoomStatuses} value */
export type RoomStatus = typeof RoomStatuses[keyof typeof RoomStatuses]

/**
 * Stats that are tracked for each user on a room-level basis
 * @enum
 */
export const RoomStats = {
  /**
   * Total body part count of a user's creeps that died violently.
   *
   * Creeps that expired, were recycled, or called `Creep.suicide()`
   * are not counted.
   */
  CreepsLost: 'creepsLost',
  /** Total body part count of creeps spawned by a user */
  CreepsProduced: 'creepsProduced',
  /** Total energy a user spent on `Creep.build()` and `Creep.repair()` actions */
  EnergyConstruction: 'energyConstruction',
  /**
   * Global Control Level (GCL) progress a user gained via `Creep.upgrade()`
   * actions. This includes the effects of any upgrade boosts.
   */
  EnergyControl: 'energyControl',
  /** Total energy a user spent spawning and renewing creeps */
  EnergyCreeps: 'energyCreeps',
  /**
   * Total energy removed from a {@link Source} via `Creep.harvest()`
   * (includes boosts)
   */
  EnergyHarvested: 'energyHarvested',
  /**
   * Global Power Level (GPL) progress earned by a user via
   * `PowerSpawn.processPower()`
   */
  PowerProcessed: 'powerProcessed'
} as const

/** A {@link RoomStats} value */
export type RoomStat = typeof RoomStats[keyof typeof RoomStats]

/**
 * A time interval (in minutes) that can be used to query room stats
 * @enum
 */
export const RoomStatIntervals = {
  Hour: 8,
  Day: 180,
  Week: 1440
} as const

/** A {@link RoomStatIntervals} value */
export type RoomStatInterval = typeof RoomStatIntervals[keyof typeof RoomStatIntervals]
