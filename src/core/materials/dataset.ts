import type { Material } from './material'

/**
 * The Datum materials dataset: every material on the Materials Database
 * screen plus a common engineering set (6061, 2014, C45, S355, 316L, cast
 * irons, bronze, brass).
 *
 * Each value's source is `sources.default` unless `sources.overrides` names
 * another for that property (see sources.ts for the full references).
 * Comments marked "UNSURE" flag values recalled from the source rather than
 * transcribed from it, or taken from the screen mock-up: check them against
 * the source before using them for sign-off.
 *
 * α is the mean coefficient 20 … 100 °C unless a comment says otherwise.
 */
export const MATERIALS: readonly Material[] = [
  // ── Aluminium ──────────────────────────────────────────────────────────
  {
    id: 'al-6061-t6', name: 'Al 6061-T6', family: 'aluminium', spec: 'AMS 4027', condition: 'T6 sheet and plate',
    designation: 'UNS A96061',
    densityGPerCm3: 2.70, youngsModulusGPa: 68.9, poissonsRatio: 0.33,
    yieldStrengthMPa: 276, tensileStrengthMPa: 310, elongationPercent: 12,
    thermalExpansionUmPerMK: 23.6, thermalConductivityWPerMK: 167,
    fatigue: { strengthMPa: 96.5, cycles: 5e8 }, // R.R. Moore rotating beam
    maxServiceTempC: 120,
    sources: { default: 'asmNonferrous' },
  },
  {
    id: 'al-6082-t6', name: 'Al 6082-T6', family: 'aluminium', spec: 'EN 573-3 / EN 485-2', condition: 'T6 sheet, over 3 up to 6 mm',
    designation: 'EN AW-6082',
    // Rp0.2 / Rm / A: EN 485-2 minimums. UNSURE: recalled, not transcribed; the values vary with thickness.
    // Physical values: typical producer values (6082 is not covered by ASM Vol. 2).
    densityGPerCm3: 2.70, youngsModulusGPa: 70, poissonsRatio: 0.33,
    yieldStrengthMPa: 260, tensileStrengthMPa: 310, elongationPercent: 10,
    thermalExpansionUmPerMK: 23.4, thermalConductivityWPerMK: 170,
    fatigue: null,
    maxServiceTempC: 120,
    sources: {
      default: 'en485',
      overrides: {
        densityGPerCm3: 'supplier', youngsModulusGPa: 'supplier', poissonsRatio: 'supplier',
        thermalExpansionUmPerMK: 'supplier', thermalConductivityWPerMK: 'supplier',
      },
    },
  },
  {
    id: 'al-7075-t6', name: 'Al 7075-T6', family: 'aluminium', spec: 'AMS 4045', condition: 'T6 sheet and plate',
    designation: 'UNS A97075',
    densityGPerCm3: 2.81, youngsModulusGPa: 71.7, poissonsRatio: 0.33,
    yieldStrengthMPa: 503, tensileStrengthMPa: 572, elongationPercent: 11,
    thermalExpansionUmPerMK: 23.4, thermalConductivityWPerMK: 130,
    fatigue: { strengthMPa: 159, cycles: 5e8 }, // R.R. Moore rotating beam
    maxServiceTempC: 120, // artificial ageing temperature of T6: above it the alloy over-ages
    sources: { default: 'asmNonferrous' },
  },
  {
    id: 'al-2014-t6', name: 'Al 2014-T6', family: 'aluminium', spec: 'ASTM B209', condition: 'T6 sheet and plate',
    designation: 'UNS A92014',
    densityGPerCm3: 2.80, youngsModulusGPa: 72.4, poissonsRatio: 0.33,
    yieldStrengthMPa: 414, tensileStrengthMPa: 483, elongationPercent: 13,
    thermalExpansionUmPerMK: 23.0, thermalConductivityWPerMK: 154,
    fatigue: { strengthMPa: 124, cycles: 5e8 }, // R.R. Moore rotating beam
    maxServiceTempC: 120,
    sources: { default: 'asmNonferrous' },
  },
  {
    id: 'al-2618-t61', name: 'Al 2618-T61', family: 'aluminium', spec: 'AMS 4132', condition: 'T61 forgings',
    designation: 'UNS A92618',
    densityGPerCm3: 2.76, youngsModulusGPa: 74.5, poissonsRatio: 0.33,
    yieldStrengthMPa: 372, tensileStrengthMPa: 441, elongationPercent: 10,
    thermalExpansionUmPerMK: 22.3, thermalConductivityWPerMK: 146,
    fatigue: { strengthMPa: 124, cycles: 5e8 }, // UNSURE: recalled value
    maxServiceTempC: 200, // 2618 is the elevated-temperature (piston / engine) alloy
    sources: { default: 'asmNonferrous' },
  },

  // ── Titanium ───────────────────────────────────────────────────────────
  {
    id: 'ti-6al-4v', name: 'Ti-6Al-4V Grade 5', family: 'titanium', spec: 'AMS 4911', condition: 'Annealed plate',
    designation: 'UNS R56400',
    densityGPerCm3: 4.43, youngsModulusGPa: 113.8, poissonsRatio: 0.342,
    yieldStrengthMPa: 880, tensileStrengthMPa: 950, elongationPercent: 14,
    thermalExpansionUmPerMK: 8.6, thermalConductivityWPerMK: 6.7,
    fatigue: { strengthMPa: 510, cycles: 1e7 }, // unnotched, Kt = 1
    maxServiceTempC: 350,
    sources: { default: 'asmTitanium' },
  },
  {
    id: 'ti-5553', name: 'Ti-5553', family: 'titanium', spec: 'AMS 4983', condition: 'Solution treated and aged forgings',
    // UNSURE: all values as shown on the Materials screen mock-up, typical of producer data, not checked against AMS 4983.
    densityGPerCm3: 4.65, youngsModulusGPa: 112, poissonsRatio: null,
    yieldStrengthMPa: 1170, tensileStrengthMPa: 1240, elongationPercent: 6,
    thermalExpansionUmPerMK: 8.4, thermalConductivityWPerMK: null,
    fatigue: null,
    maxServiceTempC: 300,
    sources: { default: 'supplier' },
  },

  // ── Steel ──────────────────────────────────────────────────────────────
  {
    id: 'steel-42crmo4-qt', name: '42CrMo4 +QT', family: 'steel', spec: 'EN 10083-3', condition: 'Quenched and tempered, ruling section up to 16 mm',
    designation: '1.7225',
    // Rp0.2 / Rm / A: EN 10083-3 minimums for d ≤ 16 mm (Rm range 1100 … 1300 MPa; lower for larger sections).
    // Physical values: typical producer values; EN 10083 does not specify them.
    densityGPerCm3: 7.85, youngsModulusGPa: 210, poissonsRatio: 0.30,
    yieldStrengthMPa: 900, tensileStrengthMPa: 1100, elongationPercent: 10,
    thermalExpansionUmPerMK: 11.1, thermalConductivityWPerMK: 42,
    fatigue: null,
    maxServiceTempC: 400, // stays well below the tempering temperature (≥ 540 °C)
    sources: {
      default: 'en10083',
      overrides: {
        densityGPerCm3: 'supplier', youngsModulusGPa: 'supplier', poissonsRatio: 'supplier',
        thermalExpansionUmPerMK: 'supplier', thermalConductivityWPerMK: 'supplier',
      },
    },
  },
  {
    id: 'steel-c45-n', name: 'C45 +N', family: 'steel', spec: 'EN 10083-2', condition: 'Normalised, ruling section up to 16 mm',
    designation: '1.0503',
    // Physical values: typical producer values. UNSURE: α and λ vary by ±0.5 µm/(m·K) and ±5 W/(m·K) between datasheets.
    densityGPerCm3: 7.85, youngsModulusGPa: 210, poissonsRatio: 0.30,
    yieldStrengthMPa: 340, tensileStrengthMPa: 620, elongationPercent: 14,
    thermalExpansionUmPerMK: 11.5, thermalConductivityWPerMK: 48,
    fatigue: null,
    maxServiceTempC: 400,
    sources: {
      default: 'en10083',
      overrides: {
        densityGPerCm3: 'supplier', youngsModulusGPa: 'supplier', poissonsRatio: 'supplier',
        thermalExpansionUmPerMK: 'supplier', thermalConductivityWPerMK: 'supplier',
      },
    },
  },
  {
    id: 'steel-s355', name: 'S355JR', family: 'steel', spec: 'EN 10025-2', condition: 'Hot rolled, thickness up to 16 mm',
    designation: '1.0045',
    // Yield: EN 10025 specifies the upper yield strength ReH, used here in place of Rp0.2. Rm range 470 … 630 MPa.
    densityGPerCm3: 7.85, youngsModulusGPa: 210, poissonsRatio: 0.30,
    yieldStrengthMPa: 355, tensileStrengthMPa: 470, elongationPercent: 22,
    thermalExpansionUmPerMK: 12, // EN 1993-1-1 design value for structural steel (all temperatures up to 100 °C)
    thermalConductivityWPerMK: 53.3, // EN 1993-1-2: λ = 54 − 3.33·10⁻²·θ at θ = 20 °C
    fatigue: null,
    maxServiceTempC: 300,
    sources: {
      default: 'en10025',
      overrides: {
        densityGPerCm3: 'en1993', youngsModulusGPa: 'en1993', poissonsRatio: 'en1993',
        thermalExpansionUmPerMK: 'en1993', thermalConductivityWPerMK: 'en1993',
      },
    },
  },
  {
    id: 'steel-316l', name: '316L', family: 'steel', spec: 'EN 10088-2', condition: 'Solution annealed hot rolled plate',
    designation: '1.4404',
    // Rm range 520 … 670 MPa. ν: EN 10088-1 does not give it.
    densityGPerCm3: 8.0, youngsModulusGPa: 200, poissonsRatio: 0.30,
    yieldStrengthMPa: 220, tensileStrengthMPa: 520, elongationPercent: 45,
    thermalExpansionUmPerMK: 16.0, thermalConductivityWPerMK: 15,
    fatigue: null,
    maxServiceTempC: 400,
    sources: { default: 'en10088', overrides: { poissonsRatio: 'asmSteels' } },
  },
  {
    id: 'steel-a4-80', name: 'A4-80 (316)', family: 'steel', spec: 'ISO 3506-1', condition: 'Cold worked fasteners, property class 80',
    // Strengths: ISO 3506-1 minimums. ISO 3506-1 gives elongation as a length (0.3·d), not a percentage.
    // Physical values: those of 1.4401 (316) in EN 10088-1.
    densityGPerCm3: 8.0, youngsModulusGPa: 200, poissonsRatio: 0.30,
    yieldStrengthMPa: 600, tensileStrengthMPa: 800, elongationPercent: null,
    thermalExpansionUmPerMK: 16.0, thermalConductivityWPerMK: 15,
    fatigue: null,
    maxServiceTempC: 400,
    sources: {
      default: 'iso3506',
      overrides: {
        densityGPerCm3: 'en10088', youngsModulusGPa: 'en10088', poissonsRatio: 'asmSteels',
        thermalExpansionUmPerMK: 'en10088', thermalConductivityWPerMK: 'en10088',
      },
    },
  },
  {
    id: 'steel-17-4ph-h900', name: '17-4PH H900', family: 'steel', spec: 'AMS 5643', condition: 'Precipitation hardened H900 bar',
    designation: 'UNS S17400',
    // Strengths: AMS 5643 minimums for H900. Physical values: ASM Vol. 1. UNSURE: λ recalled (≈ 18 W/(m·K)).
    densityGPerCm3: 7.78, youngsModulusGPa: 197, poissonsRatio: 0.27,
    yieldStrengthMPa: 1170, tensileStrengthMPa: 1310, elongationPercent: 10,
    thermalExpansionUmPerMK: 10.8, thermalConductivityWPerMK: 18,
    fatigue: null,
    maxServiceTempC: 315, // above about 315 °C 17-4PH embrittles in long-term service
    sources: {
      default: 'ams',
      overrides: {
        densityGPerCm3: 'asmSteels', youngsModulusGPa: 'asmSteels', poissonsRatio: 'asmSteels',
        thermalExpansionUmPerMK: 'asmSteels', thermalConductivityWPerMK: 'asmSteels',
      },
    },
  },
  {
    id: 'steel-300m', name: '300M', family: 'steel', spec: 'AMS 6417', condition: 'Quenched and tempered to 1930 MPa class',
    designation: 'UNS K44220',
    // UNSURE: all values as shown on the Materials screen mock-up / typical producer data; not checked against AMS 6417.
    densityGPerCm3: 7.83, youngsModulusGPa: 205, poissonsRatio: 0.30,
    yieldStrengthMPa: 1586, tensileStrengthMPa: 1931, elongationPercent: 8,
    thermalExpansionUmPerMK: 11.3, thermalConductivityWPerMK: null,
    fatigue: null,
    maxServiceTempC: 300,
    sources: { default: 'supplier' },
  },

  // ── Cast iron ──────────────────────────────────────────────────────────
  {
    id: 'ci-gjl-250', name: 'EN-GJL-250', family: 'cast-iron', spec: 'EN 1561', condition: 'Grey cast iron, separately cast test bar',
    designation: '5.1301',
    // Brittle: no proof stress, elongation < 1 %. E depends on stress level (103 … 118 GPa in the EN 1561 annex).
    // UNSURE: α from the annex is quoted for −20 … 200 °C, not 20 … 100 °C.
    densityGPerCm3: 7.2, youngsModulusGPa: 110, poissonsRatio: 0.26,
    yieldStrengthMPa: null, tensileStrengthMPa: 250, elongationPercent: null,
    thermalExpansionUmPerMK: 11.7, thermalConductivityWPerMK: 48.5,
    fatigue: null,
    maxServiceTempC: 350,
    sources: { default: 'en1561' },
  },
  {
    id: 'ci-gjs-400-15', name: 'EN-GJS-400-15', family: 'cast-iron', spec: 'EN 1563', condition: 'Ductile cast iron, separately cast sample',
    designation: '5.3106',
    // UNSURE: α from the annex is the mean value 20 … 400 °C; over 20 … 100 °C it is lower (≈ 11.5).
    densityGPerCm3: 7.1, youngsModulusGPa: 169, poissonsRatio: 0.275,
    yieldStrengthMPa: 250, tensileStrengthMPa: 400, elongationPercent: 15,
    thermalExpansionUmPerMK: 12.5, thermalConductivityWPerMK: 36.2,
    fatigue: null,
    maxServiceTempC: 350,
    sources: { default: 'en1563' },
  },

  // ── Nickel ─────────────────────────────────────────────────────────────
  {
    id: 'ni-718', name: 'Inconel 718', family: 'nickel', spec: 'AMS 5662', condition: 'Solution treated and precipitation hardened bar',
    designation: 'UNS N07718',
    // Strengths: AMS 5662 minimums after precipitation heat treatment. UNSURE: Rm recalled (185 ksi).
    densityGPerCm3: 8.19, youngsModulusGPa: 200, poissonsRatio: 0.29,
    yieldStrengthMPa: 1034, tensileStrengthMPa: 1276, elongationPercent: 12,
    thermalExpansionUmPerMK: 13.0, thermalConductivityWPerMK: 11.4,
    fatigue: null,
    maxServiceTempC: 650,
    sources: {
      default: 'ams',
      overrides: {
        densityGPerCm3: 'supplier', youngsModulusGPa: 'supplier', poissonsRatio: 'supplier',
        thermalExpansionUmPerMK: 'supplier', thermalConductivityWPerMK: 'supplier',
      },
    },
  },

  // ── Magnesium ──────────────────────────────────────────────────────────
  {
    id: 'mg-az31b', name: 'Mg AZ31B-H24', family: 'magnesium', spec: 'ASTM B90', condition: 'H24 sheet',
    designation: 'UNS M11311',
    densityGPerCm3: 1.77, youngsModulusGPa: 45, poissonsRatio: 0.35,
    yieldStrengthMPa: 220, tensileStrengthMPa: 290, elongationPercent: 15,
    thermalExpansionUmPerMK: 26.0, thermalConductivityWPerMK: 96,
    fatigue: null,
    maxServiceTempC: 120,
    sources: { default: 'asmNonferrous' },
  },

  // ── Copper alloys ──────────────────────────────────────────────────────
  {
    id: 'cu-etp', name: 'Cu-ETP', family: 'copper', spec: 'EN 13601', condition: 'Half hard rod (R250)',
    designation: 'CW004A / UNS C11000',
    // Rm: minimum of the R250 temper. UNSURE: Rp0.2 and A recalled for R250. Other values: ASM Vol. 2 (C11000).
    densityGPerCm3: 8.89, youngsModulusGPa: 115, poissonsRatio: 0.31,
    yieldStrengthMPa: 200, tensileStrengthMPa: 250, elongationPercent: 8,
    thermalExpansionUmPerMK: 17.0, thermalConductivityWPerMK: 388,
    fatigue: null,
    maxServiceTempC: 200,
    sources: { default: 'asmNonferrous', overrides: { tensileStrengthMPa: 'en13601', yieldStrengthMPa: 'en13601', elongationPercent: 'en13601' } },
  },
  {
    id: 'cu-c36000', name: 'Free-cutting brass C36000', family: 'copper', spec: 'ASTM B16', condition: 'Half hard rod, 25 mm',
    designation: 'UNS C36000 (≈ CW603N CuZn36Pb3)',
    densityGPerCm3: 8.50, youngsModulusGPa: 97, poissonsRatio: 0.31,
    yieldStrengthMPa: 310, tensileStrengthMPa: 385, elongationPercent: 25,
    thermalExpansionUmPerMK: 20.5, thermalConductivityWPerMK: 115,
    fatigue: null,
    maxServiceTempC: 200,
    sources: { default: 'asmNonferrous' },
  },
  {
    id: 'cu-c93200', name: 'Bearing bronze C93200', family: 'copper', spec: 'ASTM B505', condition: 'Continuous cast (bushes)',
    designation: 'UNS C93200 (≈ CuSn7Zn4Pb7-C)',
    // UNSURE: recalled ASM typical values.
    densityGPerCm3: 8.93, youngsModulusGPa: 100, poissonsRatio: 0.34,
    yieldStrengthMPa: 125, tensileStrengthMPa: 240, elongationPercent: 20,
    thermalExpansionUmPerMK: 18.0, thermalConductivityWPerMK: 58.7,
    fatigue: null,
    maxServiceTempC: 250,
    sources: { default: 'asmNonferrous' },
  },

  // ── Composites (in-plane values; strength depends on the laminate and failure criterion, so none is given) ──
  {
    id: 'cfrp-t700-m21-qi', name: 'CFRP T700/M21 QI', family: 'composite', spec: 'Hexcel', condition: 'Quasi-isotropic laminate [0/±45/90]s',
    // UNSURE: laminate values as shown on the Materials screen mock-up, not checked against producer data.
    densityGPerCm3: 1.58, youngsModulusGPa: 54, poissonsRatio: 0.30,
    yieldStrengthMPa: null, tensileStrengthMPa: null, elongationPercent: null,
    thermalExpansionUmPerMK: 2.1, thermalConductivityWPerMK: null,
    fatigue: null,
    maxServiceTempC: 150,
    sources: { default: 'supplier' },
  },
  {
    id: 'cfrp-ud-0', name: 'CFRP UD 0°', family: 'composite', spec: 'Hexcel', condition: 'Unidirectional, fibre direction',
    // UNSURE: as shown on the Materials screen mock-up. α along the fibres is close to zero (−0.5 … +0.5).
    densityGPerCm3: 1.58, youngsModulusGPa: 135, poissonsRatio: 0.30,
    yieldStrengthMPa: null, tensileStrengthMPa: null, elongationPercent: null,
    thermalExpansionUmPerMK: 0.2, thermalConductivityWPerMK: null,
    fatigue: null,
    maxServiceTempC: 150,
    sources: { default: 'supplier' },
  },
  {
    id: 'gfrp-e-glass-qi', name: 'GFRP E-glass QI', family: 'composite', spec: 'ISO 1268', condition: 'Quasi-isotropic laminate',
    // UNSURE: as shown on the Materials screen mock-up; typical of E-glass/epoxy.
    densityGPerCm3: 1.90, youngsModulusGPa: 24, poissonsRatio: 0.30,
    yieldStrengthMPa: null, tensileStrengthMPa: null, elongationPercent: null,
    thermalExpansionUmPerMK: 12, thermalConductivityWPerMK: null,
    fatigue: null,
    maxServiceTempC: 120,
    sources: { default: 'supplier' },
  },

  // ── Polymers ───────────────────────────────────────────────────────────
  {
    id: 'peek', name: 'PEEK', family: 'polymer', spec: 'Victrex 450G', condition: 'Unfilled, injection moulded',
    // "Yield" is the tensile stress at yield (ISO 527), not Rp0.2. α below the glass transition (143 °C), flow direction.
    densityGPerCm3: 1.30, youngsModulusGPa: 3.7, poissonsRatio: 0.40,
    yieldStrengthMPa: 98, tensileStrengthMPa: null, elongationPercent: 45,
    thermalExpansionUmPerMK: 45, thermalConductivityWPerMK: 0.29,
    fatigue: null,
    maxServiceTempC: 250,
    sources: { default: 'supplier' },
  },
  {
    id: 'pa66-gf30', name: 'PA66-GF30', family: 'polymer', spec: 'ISO 1874', condition: 'Dry as moulded (e.g. BASF Ultramid A3EG6)',
    // UNSURE: recalled datasheet values. Strongly anisotropic: α ≈ 25 along the flow, 2–4× that across it.
    // Absorbs water: E and Rm drop by about a third when conditioned, and the part swells.
    densityGPerCm3: 1.36, youngsModulusGPa: 10, poissonsRatio: 0.35,
    yieldStrengthMPa: null, tensileStrengthMPa: 190, elongationPercent: 3,
    thermalExpansionUmPerMK: 25, thermalConductivityWPerMK: 0.30,
    fatigue: null,
    maxServiceTempC: 120,
    sources: { default: 'supplier' },
  },
]
