/**
 * Defines types/constants/enums/etc related to resources
 * (including account-bound resources)
 * @module
 */

/**
 * A non-account bound resource that must be manifested somewhere in the
 * game world in order to exist.
 */
export type ResourceConstant
  = | 'energy'
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

/**
 * Resources that can be combined in a {@link StructureFactory} to create
 * commodities, which can then be sold to NPCs for a high price.
 */
export type DepositResourceConstant
  = | 'biomass'
    | 'metal'
    | 'silicon'
    | 'mist'

/**
 * Resources that can be combined in a {@link StructureLab} to create
 * {@link MineralBoostConstant}s.
 */
export type MineralResourceConstant
  = | 'H'
    | 'K'
    | 'L'
    | 'O'
    | 'U'
    | 'X'
    | 'Z'

/**
 * Resources created in a {@link StructureLab} that can be used to improve
 * the performance of {@link Creep} parts.
 */
export type MineralBoostConstant
  = | 'UH'
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

/**
 * A resource that was formed from the combination of two or more
 * {@link MineralResourceConstant}s in a {@link StructureLab}.
 */
export type MineralCompoundConstant
  = | 'G'
    | 'OH'
    | 'ZK'
    | 'UL'
    | MineralBoostConstant

/**
 * An account-bound resource.
 *
 * They are not tied to any particular in-game room/position,
 * and they may be traded or consumed anywhere.
 */
export type IntershardResourceConstant
  = | 'accessKey'
    | 'cpuUnlock'
    | 'pixel'

export type MarketResourceConstant = ResourceConstant | IntershardResourceConstant
