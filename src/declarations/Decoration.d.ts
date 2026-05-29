/** An instance of a decoration that is owned by a user */
interface DecorationInstance<P extends string = string> {
  _id: string
  user: string
  /**
   * Selected property values for an active decoration (null if inactive)
   * Value type = typeof this['decoration']['props'][key]['default']
   */
  active?: { [key in P]: unknown } | null
  /** The underlying decoration */
  decoration: Decoration<P>
  /** ISO 8601 timestamp */
  createdAt: string
  /** ISO 8601 timestamp */
  updatedAt?: string
  /** ISO 8601 timestamp */
  activatedAt?: string
  /** ISO 8601 timestamp */
  deactivatedAt?: string
}

/** Properties common to all decoration types */
interface _Decoration {
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
    original: string
    '128x128': string
    '256x256': string
  }
  steam: number
  steamItemDefId: number
  /** Appears to always be 0 */
  __v: number
}

type DecorationConstant =
  | 'badge'
  | 'creep'
  | 'floorLandscape'
  | 'object'
  | 'wallGraffiti'
  | 'wallLandscape'

interface BadgeDecoration extends _Decoration {
  type: 'badge'
  badge: {
    path1: string
    path2: string
  }
}

interface Decoration<P extends string> extends _Decoration {
  graphics: Array<{
    /** Image asset URL (appears to always be an SVG file) */
    url: string
  } & { [key in P]: unknown }>
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
  type: Exclude<DecorationConstant, 'badge'>
}

interface DecorationProperty {
  type: DecorationPropertyConstant
  label: boolean
  readonly: boolean
}

type DecorationPropertyConstant =
  | 'boolean'
  | 'color'
  | 'number'
  | 'range'
  | 'string'

interface BooleanDecorationProperty {
  type: 'boolean'
  default: boolean
}

interface ColorDecorationProperty {
  type: 'color'
  /** Web color format */
  default: string
}

interface NumberDecorationProperty {
  type: 'number'
  default: number
}

interface RangeDecorationProperty {
  type: 'range'
  min: number
  max: number
  default: number
}

interface StringDecorationProperty {
  type: 'string'
  default: string
}
