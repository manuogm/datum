import { formatChange, formatNumber, formatRange } from './format'
import { REFERENCE_TEMP_C } from './thermal'
import type { AdvisorSettings, FitCandidate } from './types'

/**
 * The "why" text of the Fit advisor: how temperature moves the fit, whether
 * any candidate can meet the required window, and what the best match gives.
 * `ranked` is best first and not empty.
 */
export function explainBest(settings: AdvisorSettings, ranked: readonly FitCandidate[], shiftUmPerK: number): string {
  return [
    thermalSentence(settings, shiftUmPerK),
    feasibilitySentence(settings, ranked, shiftUmPerK),
    bestSentence(ranked[0]),
  ].filter((sentence) => sentence !== '').join(' ')
}

function thermalSentence({ housing, shaft, serviceTempC }: AdvisorSettings, shiftUmPerK: number): string {
  const housingText = `${housing.name} housing (α ${formatNumber(housing.thermalExpansionUmPerMK)} µm/(m·K))`
  const shaftText = `${shaft.name} shaft (α ${formatNumber(shaft.thermalExpansionUmPerMK)})`
  if (shiftUmPerK === 0) {
    return `The ${housingText} and the ${shaftText} expand alike, so the fit is the same at every temperature.`
  }
  const change = (tempC: number) =>
    `${formatChange(shiftUmPerK * (tempC - REFERENCE_TEMP_C))} µm at ${formatNumber(tempC)} °C`
  const order = shiftUmPerK > 0 ? `the ${housingText} expands more than the ${shaftText}` : `the ${shaftText} expands more than the ${housingText}`
  return `Relative to ${REFERENCE_TEMP_C} °C the clearance changes by ${change(serviceTempC.minC)} and ${change(serviceTempC.maxC)}: ${order}.`
}

function feasibilitySentence(settings: AdvisorSettings, ranked: readonly FitCandidate[], shiftUmPerK: number): string {
  if (ranked.some((c) => c.windowShare === 1)) return ''
  const { requiredClearanceUm: window, serviceTempC } = settings
  const noneFits = `No candidate keeps the clearance inside ${formatRange(window.minUm, window.maxUm, 'µm')} at every service temperature`
  const thermalChangeUm = Math.abs(shiftUmPerK) * (serviceTempC.maxC - serviceTempC.minC)
  const smallestFitToleranceUm = Math.min(...ranked.map((c) => c.fit.fitToleranceUm))
  const windowWidthUm = window.maxUm - window.minUm
  if (thermalChangeUm + smallestFitToleranceUm <= windowWidthUm) return `${noneFits}.`
  return `${noneFits}: the thermal change over the service range (${formatNumber(thermalChangeUm)} µm) plus the fit tolerance`
    + ` of the most precise candidate (${formatNumber(smallestFitToleranceUm)} µm) is wider than the ${formatNumber(windowWidthUm)} µm window.`
    + ' Narrow the temperature range, widen the window or pair materials with closer α.'
}

function bestSentence(best: FitCandidate): string {
  const name = best.preferred ? ` (${best.preferred.name.toLowerCase()})` : ''
  const shown = best.checks.filter((check) => check.status !== 'pass' || check.id === 'service-window' || check.id === 'thermal-assembly')
  return [`Best match: ${best.fit.designation}${name}, score ${best.score}.`, ...shown.map((check) => check.message)].join(' ')
}
