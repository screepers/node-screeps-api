import { RoomObjectConstant } from './rooms'
import { UserBadgeSvgs } from './users'

/**
 * Defines types/constants/enums/etc related to decorations (cosmetic effects
 * that can be applied to rooms and room objects).
 * @module
 */

/** An instance of a {@link Decoration} that is owned by a user */
export interface DecorationInstance<P extends string = string> {
  _id: string
  /** The owner's user ID */
  user: string
  /** Selected property values for an active decoration (null if inactive) */
  active?: { [key in P]: unknown } | null
  /** The underlying decoration */
  decoration: BadgeDecoration | Decoration<P>
  /** ISO 8601 timestamp */
  createdAt: string
  /** ISO 8601 timestamp */
  updatedAt?: string
  /** ISO 8601 timestamp */
  activatedAt?: string
  /** ISO 8601 timestamp */
  deactivatedAt?: string
}

/**
 * Enumerates all possible {@link Decoration.type} values
 * @enum
 */
export const DecorationTypes = {
  Badge: 'badge',
  Creep: 'creep',
  FloorLandscape: 'floorLandscape',
  Graffiti: 'wallGraffiti',
  Object: 'object',
  WallLandscape: 'wallLandscape'
} as const

/** A {@link DecorationTypes} value */
export type DecorationType = typeof DecorationTypes[keyof typeof DecorationTypes]

/** Properties common to all decoration types */
export interface DecorationBase {
  _id: string
  name: string
  /** Whether or not this decoration is being used somewhere */
  enabled?: boolean
  /** Number from 1 (least rare) to 5 (most rare) */
  rarity: number
  rarityMultiplier?: number
  /** Group ID */
  group: string
  groupDescription: string | null
  /** Theme ID */
  theme: string
  /** Preview image asset URLs */
  preview: {
    'original': string
    '128x128': string
    '256x256': string
  }
  steam: number
  steamItemDefId: number
  /** Appears to always be 0 */
  __v: number
}

/**
 * Represents a single premium user {@link UserBadge}.
 * {@link DecorationInstance}s of each badge can be earned by users via pixelization.
 */
export interface BadgeDecoration extends DecorationBase {
  type: 'badge'
  badge: UserBadgeSvgs
}

/**
 * Represents a single non-{@link BadgeDecoration} decoration.
 * {@link DecorationInstance | instances} of each decoration can be earned
 * by users via pixelization.
 * @param P An optional union of {@link DecorationProperty.label} names for this decoration
 */
export interface Decoration<P extends string> extends DecorationBase {
  type: Exclude<DecorationType, 'badge'>
  graphics: ({
    /** Image asset URL (appears to always be an SVG file) */
    url: string
  } & { [key in P]: unknown })[]
  /** Appears to always be a .svg filename */
  description: string
  /**
   * For object decorations; if defined, indicates the type of room object
   * this can be applied to (ex: 'controller')
   */
  objectType?: RoomObjectConstant
  /** Configurable properties of a decoration */
  props: { [key in P]: DecorationProperty }
  /** For object decorations; indicates whether {@link objectType} is present */
  restricted?: boolean
}

/** A configurable property of a {@link Decoration} */
export interface DecorationProperty {
  type: DecorationPropertyType
  label: boolean
  readonly: boolean
}

/**
 * All possible {@link DecorationProperty} types
 * @enum
 */
export const DecorationPropertyTypes = {
  Boolean: 'boolean',
  Color: 'color',
  Number: 'number',
  Range: 'range',
  String: 'string'
} as const

/** A {@link DecorationPropertyTypes} value */
export type DecorationPropertyType = typeof DecorationPropertyTypes[keyof typeof DecorationPropertyTypes]

/** A configurable boolean property of a {@link Decoration} */
export interface BooleanProperty extends DecorationProperty {
  type: 'boolean'
  default: boolean
}

/**
 * A configurable color property of a {@link Decoration}.
 *
 * It should accept any valid web color value.
 */
export interface ColorProperty extends DecorationProperty {
  type: 'color'
  /** Web color format */
  default: string
}

/** A configurable number property of a {@link Decoration} */
export interface NumberProperty extends DecorationProperty {
  type: 'number'
  default: number
}

/**
 * A configurable number property of a {@link Decoration} that only accepts
 * values within a defined range.
 */
export interface RangeProperty extends DecorationProperty {
  type: 'range'
  min: number
  max: number
  default: number
}

/** A configurable string property of a {@link Decoration} */
export interface StringProperty extends DecorationProperty {
  type: 'string'
  default: string
}
