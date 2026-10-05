// The preferred-fit chips of the calculator: the ISO preferred fits that are
// of the chosen type (clearance, transition or interference) at this size.
// The type is computed, since it can depend on the size (H7/p6 is a
// transition fit up to 3 mm).
import { analyseFitDesignation, PREFERRED_FITS, type FitType, type PreferredFit } from '../../calc'

export function preferredFitsOfType(nominalMm: number, fitType: FitType): readonly PreferredFit[] {
  return PREFERRED_FITS.filter((preferred) => {
    const fit = analyseFitDesignation(preferred.designation, nominalMm)
    return fit.ok && fit.value.fitType === fitType
  })
}
