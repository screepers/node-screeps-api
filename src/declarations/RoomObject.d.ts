interface RoomObject extends _HasPosition {
  _id: string
  type: RoomObjectConstant
  room: string
  name?: string
}

type RoomObjectConstant =
  | 'constructionSite'
  | 'creep'
  | 'deposit'
  | 'mineral'
  | 'nuke'
  | 'powerCreep'
  | 'source'
  | 'ruin'
  | 'tombstone'
  | StructureConstant
  | ResourceConstant

type BuildableStructureConstant =
  | 'constructedWall'
  | 'container'
  | 'controller'
  | 'extension'
  | 'extractor'
  | 'factory'
  | 'lab'
  | 'link'
  | 'nuker'
  | 'observer'
  | 'powerSpawn'
  | 'rampart'
  | 'road'
  | 'spawn'
  | 'storage'
  | 'terminal'
  | 'tower'

type StructureConstant =
  | BuildableStructureConstant
  | 'invaderCore'
  | 'keeperLair'
  | 'portal'
  | 'powerBank'

// Creeps

interface AnyCreep extends RoomObject, _HasHits, _HasOwner, _HasStore {
  type: 'creep' | 'powerCreep'
  name: string
  /** Tick at which this creep will expire */
  ageTime: number
}

interface Creep extends AnyCreep {
  type: 'creep'
  actionLog: {
    attack: _HasPosition | null
    attacked: unknown
    build: _HasPosition | null
    harvest: _HasPosition | null
    heal: _HasPosition | null
    healed: unknown
    rangedAttack: _HasPosition | null
    rangedHeal: _HasPosition | null
    rangedMassAttack: unknown
    repair: _HasPosition | null
    reserveController: _HasPosition | null
    say: SayAction | null
    upgradeController: _HasPosition | null
  }
  body: Array<{
    name: BodyPartConstant
    hits: number
    '$name': string
    boost?: MineralBoostConstant
  }>
  fatigue: number
}

type BodyPartConstant =
  | 'attack'
  | 'carry'
  | 'claim'
  | 'heal'
  | 'move'
  | 'rangedAttack'
  | 'tough'
  | 'work'

interface PowerCreep extends AnyCreep {
  type: 'powerCreep'
  actionLog: {
    attack: _HasPosition | null
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

type PowerCreepClass = 'operator'

// Structures

interface Structure extends RoomObject {
  type: StructureConstant
  _isDisabled: boolean
}

interface StructureContainer extends Structure, _HasHits, _HasStore {
  type: 'container'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

interface StructureController extends Structure, _HasEffects, _HasOwner {
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

interface StructureExtension extends Structure, _HasHits, _HasOwner, _HasRestrictedStore<'energy'> {
  type: 'extension'
  off: boolean
}

interface StructureExtractor extends Structure, _HasHits, _HasOwner {
  type: 'extractor'
  cooldown: number
}

interface StructureFactory extends Structure, _HasEffects, _HasHits, _HasOwner, _HasStore {
  type: 'extractor'
  actionLog: {
    produce: unknown
  }
  cooldown: number
  cooldownTime: number
}

interface StructureInvaderCore extends Structure, _HasEffects, _HasHits, _HasOwner {
  type: 'invaderCore'
  actionLog: {
    attackController: _HasPosition | null
    reserveController: _HasPosition | null
    transferEnergy: unknown
    upgradeController: _HasPosition | null
  }
  /** Tick at which this L1+ core and its stronghold will disappear */
  decayTime?: number
  /** Tick at which this L1+ core and its stronghold will activate */
  deployTime?: number | null
  depositType?: DepositResourceConstant
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

interface StructureKeeperLair extends Structure {
  type: 'keeperLair'
  /** Tick at which the next source keeper creep will be spawned from here */
  nextSpawnTime: number | null
}

interface StructureLab extends Structure, _HasEffects, _HasHits, _HasOwner, _HasRestrictedStore<'energy' | MineralResourceConstant | MineralCompoundConstant> {
  type: 'lab'
  actionLog: {
    reverseReaction: _HasTwoPositions | null
    runReaction: _HasTwoPositions | null
  }
  cooldown: number
  cooldownTime: number
  mineralAmount: number
}

interface StructureLink extends Structure, _HasHits, _HasOwner, _HasRestrictedStore<'energy'> {
  type: 'link'
  actionLog: {
    transferEnergy: unknown
  }
  cooldown: number
}

interface StructureNuker extends Structure, _HasHits, _HasOwner, _HasRestrictedStore<'energy' | 'G'> {
  type: 'nuker'
  cooldownTime: number
}

interface StructureObserver extends Structure, _HasEffects, _HasHits, _HasOwner {
  type: 'observer'
  observeRoom: string | null
}

interface StructurePortal extends Structure {
  type: 'portal'
  destination: {
    room: string
    shard: string
  } | {
    room: string
    x: number
    y: number
  }
  /** UNIX timestamp at which this portal will disappear */
  unstableDate?: number
}

interface StructurePowerBank extends Structure, _HasHits {
  type: 'powerBank'
  /** Tick at which this object will disappear */
  decayTime: number
  store: {
    power: number
  }
}

interface StructurePowerSpawn extends Structure, _HasEffects, _HasHits, _HasOwner, _HasRestrictedStore<'energy' | 'power'> {
  type: 'powerSpawn'
}

interface StructureRampart extends Structure, _HasHits, _HasOwner {
  type: 'rampart'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

interface StructureRoad extends Structure, _HasHits {
  type: 'road'
  /** Tick at which the structure will next take decay damage */
  nextDecayTime: number
}

interface StructureSpawn extends Structure, _HasEffects, _HasHits, _HasOwner, _HasRestrictedStore<'energy'> {
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

interface StructureStorage extends Structure, _HasEffects, _HasHits, _HasOwner, _HasStore {
  type: 'storage'
}

interface StructureTerminal extends Structure, _HasEffects, _HasHits, _HasOwner, _HasStore {
  type: 'terminal'
  cooldownTime: number
}

interface StructureTower extends Structure, _HasEffects, _HasHits, _HasOwner, _HasRestrictedStore<'energy'> {
  type: 'tower'
  actionLog: {
    attack: _HasPosition | null
    heal: _HasPosition | null
    repair: _HasPosition | null
  }
}

// Other Objects

interface ConstructionSite extends RoomObject {
  type: 'constructionSite'
  name?: string
  progress: number
  progressTotal: number
  structureType: StructureConstant
}

interface Deposit extends RoomObject {
  type: 'deposit'
  /** Tick at which this deposit can be harvested again */
  cooldownTime: number
  /** Tick at which this object will disappear */
  decayTime: number
  depositType: DepositResourceConstant
  /** Amount harvested from this deposit */
  harvested: number
}

interface Mineral extends RoomObject, _HasEffects {
  type: 'mineral'
  density: 1 | 2 | 3 | 4
  mineralAmount: number
  mineralType: MineralResourceConstant
  /** Tick at which this resource will be refilled */
  nextRegenerationTime: number
}

interface Nuke extends RoomObject {
  type: 'nuke'
  /** Game time at which this nuke will land */
  landTime: number
  /** Name of the room that launched this nuke */
  launchRoomName: string
}

interface Source extends RoomObject, _HasEffects {
  type: 'source'
  energy: number
  energyCapacity: number
  invaderHarvested: number
  /** Tick at which this resource will be refilled */
  nextRegenerationTime: number
  /** @deprecated always set to 300 use {@link nextRegenerationTime} */
  ticksToRegeneration: number
}

interface Ruin extends RoomObject, _HasOwner {
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

interface Tombstone extends RoomObject, _HasOwner {
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

// Common Properties

interface _HasEffects {
  effects?: {
    [index: number]: {
      effect: number
      power: number
      /** Tick at which this effect will end */
      endTime: number
    }
  } | null
}

interface _HasHits {
  hits: number
  hitsMax: number
  notifyWhenAttacked: boolean
}

interface _HasOwner {
  /**
   * ID of the user who owns this object;
   * NPCs do not have long-form hex ID strings like normal players:
   * - Invader: "2"
   * - SourceKeeper: "3"
   */
  user: string
}

interface _HasPosition {
  x: number
  y: number
}

interface _HasTwoPositions {
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Object with a `store` that can hold any resource type
 * with a limited total capacity
 */
interface _HasStore {
  store: { [resType in ResourceConstant]: number | undefined }
  storeCapacity: number
}

/**
 * A room object with a store that can only hold specific resource types;
 * capacities are resource-specific
 */
interface _HasRestrictedStore<R extends ResourceConstant> {
  store: { [resType in R]: number }
  /**
   * Capacities should not be null, except on minerals in a lab
   * when another mineral type is already being stored.
   */
  storeCapacityResource: { [resType in R]: number | null }
}

interface Store {
  [resType: string]: number | undefined
}

type DepositResourceConstant =
  | 'biomass'
  | 'metal'
  | 'silicon'
  | 'mist'

type MineralResourceConstant =
  | 'H'
  | 'K'
  | 'L'
  | 'O'
  | 'U'
  | 'X'
  | 'Z'

type MineralBoostConstant =
  | 'UH'
  | 'UO'
  | 'KH'
  | 'KO'
  | 'LH'
  | 'LO'
  | 'ZH'
  | 'ZO'
  | 'GH'
  | 'GO'
  | 'UH2O'
  | 'UHO2'
  | 'KH2O'
  | 'KHO2'
  | 'LH2O'
  | 'LHO2'
  | 'ZH2O'
  | 'ZHO2'
  | 'GH2O'
  | 'GHO2'
  | 'XUH2O'
  | 'XUHO2'
  | 'XKH2O'
  | 'XKHO2'
  | 'XLH2O'
  | 'XLHO2'
  | 'XZH2O'
  | 'XZHO2'
  | 'XGH2O'
  | 'XGHO2'

type MineralCompoundConstant =
  | 'G'
  | 'OH'
  | 'ZK'
  | 'UL'
  | MineralBoostConstant

type ResourceConstant =
  | 'energy'
  | 'power'
  | DepositResourceConstant
  | MineralResourceConstant
  | MineralCompoundConstant
  | 'ops'
  | 'utrium_bar'
  | 'lemergium_bar'
  | 'zynthium_bar'
  | 'keanium_bar'
  | 'ghodium_melt'
  | 'oxidant'
  | 'reductant'
  | 'purifier'
  | 'battery'
  | 'composite'
  | 'crystal'
  | 'liquid'
  | 'wire'
  | 'switch'
  | 'transistor'
  | 'microchip'
  | 'circuit'
  | 'device'
  | 'cell'
  | 'phlegm'
  | 'tissue'
  | 'muscle'
  | 'organoid'
  | 'organism'
  | 'alloy'
  | 'tube'
  | 'fixtures'
  | 'frame'
  | 'hydraulics'
  | 'machine'
  | 'condensate'
  | 'concentrate'
  | 'extract'
  | 'spirit'
  | 'emanation'
  | 'essence'

interface SayAction {
  isPublic: boolean
  message: string
}
