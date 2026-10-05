/**
 * Display units: converts SI values to the viewer's unit system and formats
 * them for reading. Calculations stay in SI.
 */
export {
  UNIT_SYSTEMS, formatDecimal, formatQuantity, formatQuantityRange, fromDisplay, parseDecimal, toDisplay, unitOf,
  type FormatOptions, type Quantity, type UnitSystem,
} from './units'
