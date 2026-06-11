/**
 * Defines types/constants/enums/etc related to resources
 * (including account-bound resources)
 * @module
 */

/**
 * Resources that can be combined in a {@link StructureFactory} to create
 * commodities, which can then be sold to NPCs for a high price.
 * @enum
 */
export const DepositResources = {
  Biomass: 'Biomass',
  Metal: 'Metal',
  Silicon: 'Silicon',
  Mist: 'Mist'
} as const

/** A {@link DepositResources} value */
export type DepositResource = typeof DepositResources[keyof typeof DepositResources]

/**
 * Resources that can be combined in a {@link StructureLab} to create
 * {@link MineralBoostResource}s.
 * @enum
 */
export const MineralResources = {
  Hydrogen: 'Hydrogen',
  Keanium: 'Keanium',
  Lemergium: 'Lemergium',
  Oxygen: 'Oxygen',
  Utrium: 'Utrium',
  Catalyst: 'Catalyst',
  Zynthium: 'Zynthium'
} as const

/** A {@link MineralResources} value */
export type MineralResource = typeof MineralResources[keyof typeof MineralResources]

/**
 * Resources created in a {@link StructureLab} that can be used to improve
 * the performance of {@link Creep} parts.
 * @enum
 */
export const MineralBoostResources = {
  UtriumHydride: 'UH',
  UtriumOxide: 'UO',
  KeaniumHydride: 'KH',
  KeaniumOxide: 'KO',
  LemergiumHydride: 'LH',
  LemergiumOxide: 'LO',
  ZynthiumHydride: 'ZH',
  ZynthiumOxide: 'ZO',
  GhodiumHydride: 'GH',
  GhodiumOxide: 'GO',
  UtriumAcid: 'UH2O',
  UtriumAlkalide: 'UHO2',
  KeaniumAcid: 'KH2O',
  KeaniumAlkalide: 'KHO2',
  LemergiumAcid: 'LH2O',
  LemergiumAlkalide: 'LHO2',
  ZynthiumAcid: 'ZH2O',
  ZynthiumAlkalide: 'ZHO2',
  GhodiumAcid: 'GH2O',
  GhodiumAlkalide: 'GHO2',
  CatalyzedUtriumAcid: 'XUH2O',
  CatalyzedUtriumAlkalide: 'XUHO2',
  CatalyzedKeaniumAcid: 'XKH2O',
  CatalyzedKeaniumAlkalide: 'XKHO2',
  CatalyzedLemergiumAcid: 'XLH2O',
  CatalyzedLemergiumAlkalide: 'XLHO2',
  CatalyzedZynthiumAcid: 'XZH2O',
  CatalyzedZynthiumAlkalide: 'XZHO2',
  CatalyzedGhodiumAcid: 'XGH2O',
  CatalyzedGhodiumAlkalide: 'XGHO2'
} as const

/** A {@link MineralBoostResources} value */
export type MineralBoostResource = typeof MineralBoostResources[keyof typeof MineralBoostResources]

/**
 * A {@link MineralCompoundResource} that cannot be used as a boost.
 * @enum
 */
export const MineralBaseCompoundResources = {
  Ghodium: 'G',
  Hydroxide: 'OH',
  ZynthiumKeanite: 'ZK',
  UtriumLemergite: 'UL'
} as const

/** A {@link MineralBaseCompoundResources} value */
export type MineralBaseCompoundResource = typeof MineralBaseCompoundResources[keyof typeof MineralBaseCompoundResources]

/**
 * A resource that was formed from the combination of two or more
 * {@link MineralResource}s in a {@link StructureLab}.
 */
export type MineralCompoundResource = MineralBaseCompoundResource | MineralBoostResource

/**
 * Any non-compressed mineral-based resource type.
 *
 * {@link MineralResources}, {@link MineralBaseCompoundResources}, and {@link MineralBoostResources}
 * @enum
 */
export const MineralBasedResources = {
  ...MineralResources,
  ...MineralBaseCompoundResources,
  ...MineralBoostResources
}

/** A {@link MineralBasedResources} value */
export type MineralBasedResource = typeof MineralBasedResources[keyof typeof MineralBasedResources]

/**
 * A non-account bound resource that must be manifested somewhere in the
 * game world in order to exist.
 * @enum
 */
export const Resources = {
  Energy: 'energy',
  Power: 'power',
  Ops: 'ops',
  UtriumBar: 'utrium_bar',
  LemergiumBar: 'lemergium_bar',
  ZynthiumBar: 'zynthium_bar',
  KeaniumBar: 'keanium_bar',
  GhodiumMelt: 'ghodium_melt',
  Oxidant: 'oxidant',
  Reductant: 'reductant',
  Purifier: 'purifier',
  Battery: 'battery',
  Composite: 'composite',
  Crystal: 'crystal',
  Liquid: 'liquid',
  Wire: 'wire',
  Switch: 'switch',
  Transistor: 'transistor',
  Microchip: 'microchip',
  Circuit: 'circuit',
  Device: 'device',
  Cell: 'cell',
  Phlegm: 'phlegm',
  Tissue: 'tissue',
  Muscle: 'muscle',
  Organoid: 'organoid',
  Organism: 'organism',
  Alloy: 'alloy',
  Tube: 'tube',
  Fixtures: 'fixtures',
  Frame: 'frame',
  Hydraulics: 'hydraulics',
  Machine: 'machine',
  Condensate: 'condensate',
  Concentrate: 'concentrate',
  Extract: 'extract',
  Spirit: 'spirit',
  Emanation: 'emanation',
  Essence: 'essence',
  ...DepositResources,
  ...MineralResources,
  ...MineralBaseCompoundResources,
  ...MineralBoostResources
} as const

/** A {@link Resources} value */
export type Resource = typeof Resources[keyof typeof Resources]

/**
 * An account-bound resource.
 *
 * They are not tied to any particular in-game room/position,
 * and they may be traded or consumed anywhere.
 * @enum
 */
export const IntershardResources = {
  AccessKey: 'accessKey',
  CpuUnlock: 'cpuUnlock',
  Pixel: 'pixel'
} as const

/** A {@link IntershardResources} value */
export type IntershardResource = typeof IntershardResources[keyof typeof IntershardResources]

/**
 * A resource that can be traded on the in-game market.
 * @enum
 */
export const MarketResources = {
  ...Resources,
  ...IntershardResources
} as const

/** A {@link MarketResources} value */
export type MarketResource = typeof MarketResources[keyof typeof MarketResources]
