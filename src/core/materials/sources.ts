/**
 * References for the material property values in dataset.ts.
 *
 * `kind` matches the Data source filter of the Materials Database screen.
 * No value has been taken from MMPDS-17: its design allowables depend on
 * product form and thickness and were not available to check against, so
 * they should only be added by transcribing them from the document itself.
 */
export type SourceKind = 'standard' | 'handbook' | 'datasheet' | 'judgement'

export interface MaterialSource {
  readonly kind: SourceKind
  readonly reference: string
}

export const SOURCES = {
  asmNonferrous: { kind: 'handbook',
    reference: 'ASM Handbook Vol. 2, Properties and Selection: Nonferrous Alloys (1990), aluminium, copper and magnesium alloy data: typical values' },
  asmTitanium: { kind: 'handbook',
    reference: 'ASM Materials Properties Handbook: Titanium Alloys (1994), Ti-6Al-4V: typical values, annealed' },
  asmSteels: { kind: 'handbook',
    reference: 'ASM Handbook Vol. 1, Properties and Selection: Irons, Steels and High-Performance Alloys (1990), stainless and PH steels: typical values' },
  en485: { kind: 'standard',
    reference: 'EN 485-2:2016 Aluminium sheet, strip and plate, mechanical properties: minimum values, 6082-T6 over 3 up to 6 mm' },
  en10083: { kind: 'standard',
    reference: 'EN 10083-2/-3:2006 Steels for quenching and tempering: minimum values for the stated ruling section' },
  en10025: { kind: 'standard',
    reference: 'EN 10025-2:2019 Hot rolled non-alloy structural steels: minimum values, thickness up to 16 mm' },
  en1993: { kind: 'standard',
    reference: 'EN 1993-1-1:2005 §3.2.6 (E, ν, α for structural steel) and EN 1993-1-2:2005 §3.4.1.3 (λ at 20 °C); density 7850 kg/m³ from EN 1991-1-1 Table A.4' },
  en10088: { kind: 'standard',
    reference: 'EN 10088-1:2014 Annex (physical properties) and EN 10088-2:2014 (minimum mechanical values, hot rolled plate)' },
  iso3506: { kind: 'standard',
    reference: 'ISO 3506-1:2020 Stainless steel fasteners: minimum values, property class 80' },
  en1561: { kind: 'standard',
    reference: 'EN 1561:2011 Grey cast irons: minimum Rm and informative annex of typical properties' },
  en1563: { kind: 'standard',
    reference: 'EN 1563:2018 Spheroidal graphite cast irons: minimum values and informative annex of typical properties' },
  en13601: { kind: 'standard',
    reference: 'EN 13601:2021 Copper rod, bar and wire for general electrical purposes: R250 temper' },
  ams: { kind: 'standard',
    reference: 'SAE AMS material specification named in the "spec" column: minimum values' },
  tsaiHahn: { kind: 'handbook',
    reference: 'Tsai S.W., Hahn H.T., Introduction to Composite Materials, Technomic (1980), table of typical unidirectional ply properties (T300/5208, Scotchply 1002)' },
  camanho2007: { kind: 'handbook',
    reference: 'Camanho P.P., Maimí P., Dávila C.G., Prediction of size effects in notched laminates using continuum damage mechanics, Composites Science and Technology 67 (2007) 2715–2727: IM7/8552 ply properties' },
  supplier: { kind: 'datasheet',
    reference: 'Producer datasheets (e.g. Special Metals, Victrex, Hexcel, Deutsches Kupferinstitut): typical values' },
  judgement: { kind: 'judgement',
    reference: 'Datum engineering judgement for screening; check against the producer before relying on it' },
} as const satisfies Record<string, MaterialSource>

export type SourceId = keyof typeof SOURCES
