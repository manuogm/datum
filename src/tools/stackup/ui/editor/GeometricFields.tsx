// A geometric row's fields (design §4): the characteristic, the frame as on
// the drawing, then only the inputs that apply to that characteristic under
// the drawing standard (the engine's rules decide: a field that does not
// apply is not shown). A modifier's own inputs appear in a sub-panel only
// while it is on. At the foot, ON THE STACK: the ± the row adds and how it
// was reached, with the engine's sources and when to include it.
//
// What a characteristic offers under the standard comes from the engine's
// geometricAvailability: a characteristic or modifier that is not in the
// drawing standard (ASME Y14.5-2018 has no concentricity, symmetry or CZ;
// Ⓣ only on planar features) is flagged where it is still set, and offered
// nowhere else.
import { useState, type KeyboardEvent } from 'react'
import { Chip, Icon, MonoLabel, SegmentedControl, Select, Switch, cx } from '../../../../app/ui'
import type { UnitSystem } from '../../../../core/units'
import {
  GEOMETRIC_RULES, acceptsDiameterZone, geometricAvailability, geometricRule, inStandard, isProfile,
  type GeometricCharacteristic, type MaterialBoundary, type MaterialCondition, type StackTo,
} from '../../calc'
import {
  BOUNDARY_LABELS, CHARACTERISTIC_GROUPS, MATERIAL_LABELS, STANDARD_NAME, characteristicName, gdtIcon,
} from '../gdt/characteristics'
import { FeatureControlFrame } from '../gdt/FeatureControlFrame'
import { GdtModifier, type ModifierSymbol } from '../gdt/GdtModifier'
import { offersHighPoints, offersSurface, showsMaterialCondition } from '../logic/engineInput'
import { len, plusMinus, sigma, signed } from '../logic/format'
import {
  bonusReadout, breakdownTerms, highPointsReadout, modifierHeadline, shiftReadout, surfaceReadout, unequalReadout,
} from '../logic/readouts'
import { unequalFormOf, unequalShown } from '../logic/unequal'
import type { DatumCell, FeatureSize, GeometricEntry } from '../state/stackInputs'
import { DetailRow, type DimensionDetailsProps } from './DimensionDetails'
import styles from './editor.module.css'
import { LengthInput } from './LengthInput'

interface GeometricFieldsProps extends DimensionDetailsProps {
  entry: GeometricEntry
}

export function GeometricFields(props: GeometricFieldsProps) {
  const { row, index, entry, inputs, dispatch, system, invalidField, error } = props
  const { standard } = inputs
  const rule = GEOMETRIC_RULES[entry.characteristic]
  const n = index + 1
  const change = (changes: Partial<GeometricEntry>) => dispatch({ type: 'geometric', id: row.id, changes })
  const materials: readonly MaterialCondition[] = ['rfs', 'mmc', 'lmc']
  const showMaterial = showsMaterialCondition(entry, standard)
  const datumCells = entry.datums
  return (
    <>
      <DetailRow label="">
        <CharacteristicPicker value={entry.characteristic} standard={standard} onChange={(characteristic) => change({ characteristic })} />
        <p className={styles.characteristic}>
          <strong>{characteristicName(entry.characteristic, standard)}</strong> <span>{rule.rule}</span>
        </p>
      </DetailRow>

      <DetailRow label="Frame">
        <div className={styles.frameLine}>
          <FeatureControlFrame entry={entry} system={system} standard={standard} statistical={row.statistical} />
          <MonoLabel size="xs" tone="faint">
            {STANDARD_NAME[standard]} drawing
          </MonoLabel>
        </div>
      </DetailRow>

      <DetailRow label="Zone">
        <div className={styles.zoneLine}>
          <LengthInput
            aria-label={`Row ${n} ${rule.name.toLowerCase()} tolerance`}
            prefix={entry.diameterZone && acceptsDiameterZone(entry.characteristic) ? 'Ø' : 't'}
            value={entry.zone}
            system={system}
            showUnit
            invalid={invalidField === 'zone'}
            onChange={(zone) => change({ zone })}
            className={styles.zoneInput}
          />
          {acceptsDiameterZone(entry.characteristic) && (
            <Chip variant="option" selected={entry.diameterZone} onClick={() => change({ diameterZone: !entry.diameterZone })}>
              Ø zone
            </Chip>
          )}
          <span className={styles.basicField}>
            <span className={styles.inlineLabel}>Basic</span>
            <LengthInput
              aria-label={`Row ${n} basic dimension`}
              value={row.nominal}
              system={system}
              showUnit
              invalid={invalidField === 'nominal'}
              className={styles.basicInput}
              onChange={(nominal) => dispatch({ type: 'row', id: row.id, changes: { nominal } })}
            />
          </span>
        </div>
      </DetailRow>

      {showMaterial && (
        <DetailRow label="Material">
          <SegmentedControl
            label={`Row ${n} material condition`}
            size="sm"
            options={materials.map((value) => ({
              value,
              label: (
                <span className={styles.glyphLabel}>
                  {value !== 'rfs' && <GdtModifier symbol={value === 'mmc' ? 'M' : 'L'} />}
                  {MATERIAL_LABELS[standard][value]}
                </span>
              ),
            }))}
            value={entry.materialCondition}
            onChange={(materialCondition) => change({ materialCondition })}
          />
          {invalidField === 'material' && error && <p className={styles.fieldError}>{error}</p>}
          {entry.materialCondition !== 'rfs' && (
            <SizePanel
              title="Toleranced feature size"
              feature={entry.feature}
              system={system}
              label={`Row ${n} toleranced feature`}
              invalid={invalidField === 'feature'}
              onChange={(feature) => change({ feature })}
              readout={bonusReadout(system, entry, standard)}
            />
          )}
          {offersSurface(entry, standard) && <StackToPanel entry={entry} n={n} onChange={(stackTo) => change({ stackTo })} />}
        </DetailRow>
      )}

      {rule.datums && (
        <DetailRow label="Datums">
          <div className={styles.datums}>
            {datumCells.map((datum, d) => (
              <DatumInput
                key={d}
                datum={datum}
                position={d}
                rowNumber={n}
                standard={standard}
                boundary={rule.datumBoundary}
                invalid={invalidField === 'datum'}
                onChange={(next) => change({ datums: datumCells.map((cell, i) => (i === d ? { ...cell, ...next } : cell)) })}
              />
            ))}
          </div>
          {rule.datumBoundary &&
            datumCells.map(
              (datum, d) =>
                datum.letter.trim() &&
                datum.modifier !== 'rmb' && (
                  <SizePanel
                    key={d}
                    title={`Datum ${datum.letter.trim()} feature size`}
                    feature={datum.feature}
                    system={system}
                    label={`Row ${n} datum ${datum.letter.trim()} feature`}
                    invalid={invalidField === 'datum'}
                    onChange={(feature) => change({ datums: datumCells.map((cell, i) => (i === d ? { ...cell, feature } : cell)) })}
                    readout={shiftReadout(system, datum)}
                    allowance={{
                      value: datum.boundaryAllowance,
                      onChange: (boundaryAllowance) => change({ datums: datumCells.map((cell, i) => (i === d ? { ...cell, boundaryAllowance } : cell)) }),
                    }}
                  />
                ),
            )}
        </DetailRow>
      )}

      {(offersHighPoints(entry, standard) || (standard === 'asme' && isForm(entry.characteristic))) && (
        <DetailRow label="Seating">
          <Seating entry={entry} n={n} standard={standard} system={system} offered={offersHighPoints(entry, standard)} change={change} />
        </DetailRow>
      )}

      <DetailRow label="Modifiers">
        <Modifiers {...props} change={change} />
      </DetailRow>

      <OnTheStack {...props} />
    </>
  )
}

/** Why a characteristic is flagged under ASME: Y14.5-2018 removed concentricity and symmetry (the 2009 edition has them). */
const NOT_IN_STANDARD = 'not in ASME Y14.5-2018, only in Y14.5-2009'

const isForm = (characteristic: GeometricCharacteristic) => characteristic === 'flatness' || characteristic === 'straightness'

const STACK_TO: readonly { value: StackTo; label: string }[] = [
  { value: 'axis', label: 'Axis' },
  { value: 'near-surface', label: 'Near surface' },
  { value: 'far-surface', label: 'Far surface' },
]

/**
 * Ⓜ/Ⓛ on a location tolerance: where the row takes the stack. To a surface
 * it runs between the virtual and resultant condition boundaries, which
 * hold the size and the bonus in one row (ASME Y14.5-2018 §5; ISO
 * 2692:2021; Fischer 2011). The hole or pin choice above it decides which
 * boundary is inner.
 */
function StackToPanel({ entry, n, onChange }: { entry: GeometricEntry; n: number; onChange: (stackTo: StackTo) => void }) {
  return (
    <div className={styles.subPanel}>
      <MonoLabel size="xs">Stack to</MonoLabel>
      <SegmentedControl label={`Row ${n} stack to`} size="sm" options={STACK_TO} value={entry.stackTo} onChange={onChange} />
      <span className={styles.muted}>
        {entry.stackTo === 'axis'
          ? 'The axis or centre plane. To reach a surface, pick it here rather than adding a radius row.'
          : `The ${entry.stackTo === 'near-surface' ? 'near' : 'far'} surface, size included: don’t add a separate radius row for this feature.`}
      </span>
    </div>
  )
}

/**
 * Flatness or straightness of a surface a mating part rests on: one-sided,
 * from the high points t into the material (Fischer 2011; Drake ch. 9).
 * Under ASME, Rule #1 puts form inside size (Y14.5-2018 §5): the note says
 * when to leave the row out.
 */
function Seating({ entry, n, standard, system, offered, change }: {
  entry: GeometricEntry; n: number; standard: 'iso' | 'asme'; system: UnitSystem; offered: boolean; change: (changes: Partial<GeometricEntry>) => void
}) {
  const readout = entry.highPoints.on ? highPointsReadout(system, entry) : null
  return (
    <>
      {offered && (
        <Switch checked={entry.highPoints.on} onChange={(on) => change({ highPoints: { ...entry.highPoints, on } })}>
          <span className={styles.switchText}>Seats on its high points (a mating part rests on it)</span>
        </Switch>
      )}
      {offered && entry.highPoints.on && (
        <div className={styles.subPanel}>
          <div className={styles.sizeLine}>
            <span className={styles.inlineLabel}>Adding material here makes it</span>
            <SegmentedControl
              label={`Row ${n}: adding material at this surface makes the dimension`}
              size="sm"
              options={[
                { value: 'larger', label: 'Larger' },
                { value: 'smaller', label: 'Smaller' },
              ]}
              value={entry.highPoints.materialSide}
              onChange={(materialSide) => change({ highPoints: { ...entry.highPoints, materialSide } })}
            />
          </div>
          {readout && <span className={styles.readout}>{readout}</span>}
        </div>
      )}
      {standard === 'asme' && (
        <span className={styles.muted}>Rule #1 (ASME Y14.5-2018 §5): if this feature’s size is already in the chain, its form is inside that size; leave this row out.</span>
      )}
    </>
  )
}

/** The 12 characteristics as icon toggles in five captioned groups; arrow keys move between them. */
function CharacteristicPicker({ value, standard, onChange }: { value: GeometricCharacteristic; standard: 'iso' | 'asme'; onChange: (c: GeometricCharacteristic) => void }) {
  const all = CHARACTERISTIC_GROUPS.flatMap((group) => group.items)
  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0
    if (step === 0) return
    event.preventDefault()
    const next = all[(all.indexOf(value) + step + all.length) % all.length]
    onChange(next)
    const group = event.currentTarget
    requestAnimationFrame(() => group.querySelector<HTMLElement>(`[data-characteristic="${next}"]`)?.focus())
  }
  return (
    <div className={styles.picker} role="radiogroup" aria-label="Geometric characteristic" onKeyDown={onKeyDown}>
      {CHARACTERISTIC_GROUPS.map((group) => (
        <div key={group.label} className={styles.pickerGroup}>
          <MonoLabel size="xs" tone="faint">
            {group.label}
          </MonoLabel>
          <div className={styles.pickerItems}>
            {group.items.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={c === value}
                aria-label={`${characteristicName(c, standard)} ${GEOMETRIC_RULES[c].symbol}${inStandard(c, standard) ? '' : `, ${NOT_IN_STANDARD}`}`}
                title={inStandard(c, standard) ? characteristicName(c, standard) : `${characteristicName(c, standard)}: ${NOT_IN_STANDARD}`}
                tabIndex={c === value ? 0 : -1}
                data-characteristic={c}
                className={cx(styles.pickerItem, c === value && styles.pickerSelected, !inStandard(c, standard) && styles.pickerOutside)}
                onClick={() => onChange(c)}
              >
                <Icon name={gdtIcon(c)} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const FEATURE_TYPES = [
  { value: 'internal', label: 'Hole' },
  { value: 'external', label: 'Pin' },
] as const

interface SizePanelProps {
  title: string
  feature: FeatureSize
  system: UnitSystem
  label: string
  invalid: boolean
  onChange: (feature: FeatureSize) => void
  readout: string | null
  /** A datum feature's own tolerance at MMC, which puts its boundary at virtual condition. */
  allowance?: { value: number | null; onChange: (value: number | null) => void }
}

/** The sub-panel of Ⓜ/Ⓛ or of a datum at MMB/LMB: the feature's type and size limits, and what they give. */
export function SizePanel({ title, feature, system, label, invalid, onChange, readout, allowance }: SizePanelProps) {
  return (
    <div className={styles.subPanel}>
      <MonoLabel size="xs">{title}</MonoLabel>
      <div className={styles.sizeGrid}>
        <SegmentedControl label={`${label} type`} size="sm" options={FEATURE_TYPES} value={feature.type} onChange={(type) => onChange({ ...feature, type })} />
        <LengthInput prefix="min" aria-label={`${label}, smallest size`} value={feature.min} system={system} invalid={invalid && feature.min === null} onChange={(min) => onChange({ ...feature, min })} />
        <LengthInput prefix="max" aria-label={`${label}, largest size`} value={feature.max} system={system} invalid={invalid && feature.max === null} onChange={(max) => onChange({ ...feature, max })} />
      </div>
      {allowance && (
        <div className={styles.allowanceLine}>
          <span className={styles.inlineLabel}>Its own tolerance at MMC</span>
          <LengthInput aria-label={`${label}, its own tolerance at MMC`} value={allowance.value} system={system} showUnit placeholder="optional" onChange={allowance.onChange} />
        </div>
      )}
      {readout && <span className={styles.readout}>{readout}</span>}
    </div>
  )
}

interface DatumInputProps {
  datum: DatumCell
  position: number
  rowNumber: number
  standard: 'iso' | 'asme'
  /** MMB/LMB allowed on this characteristic's datums. */
  boundary: boolean
  invalid: boolean
  onChange: (changes: Partial<DatumCell>) => void
}

const POSITION = ['primary', 'secondary', 'tertiary']

/** A datum cell: its letter and, once a letter is in, its material boundary. */
export function DatumInput({ datum, position, rowNumber, standard, boundary, invalid, onChange }: DatumInputProps) {
  const boundaries: readonly MaterialBoundary[] = ['rmb', 'mmb', 'lmb']
  return (
    <span className={styles.datumCell}>
      <input
        className={cx(styles.letterInput, invalid && datum.letter.trim() && datum.modifier !== 'rmb' && styles.invalidBox)}
        aria-label={`Row ${rowNumber} ${POSITION[position]} datum`}
        maxLength={2}
        value={datum.letter}
        onChange={(event) => onChange({ letter: event.target.value.toUpperCase() })}
      />
      {boundary && datum.letter.trim() && (
        <Select
          size="sm"
          aria-label={`Row ${rowNumber} datum ${datum.letter.trim()} material boundary`}
          className={styles.boundarySelect}
          options={boundaries.map((value) => ({ value, label: BOUNDARY_LABELS[standard][value] }))}
          value={datum.modifier}
          onChange={(modifier) => onChange({ modifier })}
        />
      )}
    </span>
  )
}

/** Ⓟ Projected, Ⓤ/UZ Unequal (profile), Ⓕ Free state, Ⓣ Tangent plane, CZ Combined zone (ISO 1101:2017 calls CZ a combined zone): each only where it is valid. */
function Modifiers({ row, index, entry, inputs, system, invalidField, error, change }: GeometricFieldsProps & { change: (changes: Partial<GeometricEntry>) => void }) {
  const { standard } = inputs
  const rule = GEOMETRIC_RULES[entry.characteristic]
  const available = geometricAvailability(entry.characteristic, standard)
  const profile = isProfile(entry.characteristic)
  const n = index + 1
  const chip = (symbol: ModifierSymbol, text: string, on: boolean, toggle: () => void, outside = false) => {
    const option = (
      <Chip variant="option" selected={on} onClick={toggle} leading={<GdtModifier symbol={symbol} />}>
        {text}
        {outside && <span className={styles.outsideMark}> · not in {STANDARD_NAME[standard]}</span>}
      </Chip>
    )
    return outside ? (
      <span className={styles.chipOutside} title={`Not used on ${rule.name.toLowerCase()} under ${STANDARD_NAME[standard]}: switch it off`}>
        {option}
      </span>
    ) : (
      option
    )
  }
  return (
    <>
      <div className={styles.chips}>
        {available.projected && chip('P', 'Projected', entry.projected.on, () => change({ projected: { ...entry.projected, on: !entry.projected.on } }))}
        {available.unequal && chip(standard === 'iso' ? 'UZ' : 'U', 'Unequal', entry.unequal.on, () => change({ unequal: { ...entry.unequal, on: !entry.unequal.on } }))}
        {available.freeState && chip('F', 'Free state', entry.freeState, () => change({ freeState: !entry.freeState }))}
        {/* Not in the standard for this characteristic: offered nowhere, shown flagged only while still set (to switch it off). */}
        {(available.tangentPlane || entry.tangentPlane) &&
          chip('T', 'Tangent plane', entry.tangentPlane, () => change({ tangentPlane: !entry.tangentPlane }), !available.tangentPlane)}
        {(available.combinedZone || entry.commonZone) &&
          chip('CZ', 'Combined zone', entry.commonZone, () => change({ commonZone: !entry.commonZone }), !available.combinedZone)}
      </div>
      {profile && available.unequal && entry.unequal.on && (
        <div className={styles.subPanel}>
          <div className={styles.sizeLine}>
            <span className={styles.inlineLabel}>{standard === 'iso' ? 'UZ offset' : 'Ⓤ value'}</span>
            <LengthInput
              aria-label={`Row ${n} ${standard === 'iso' ? 'UZ offset' : 'Ⓤ value'}`}
              value={unequalShown(entry, standard)}
              system={system}
              signed={standard === 'iso'}
              showUnit
              invalid={invalidField === 'unequal'}
              // Stored as typed, with the form it was typed in; the engine value is worked out from the zone later (B1).
              onChange={(value) => change({ unequal: { ...entry.unequal, value, typedAs: unequalFormOf(standard) } })}
            />
          </div>
          <div className={styles.sizeLine}>
            <span className={styles.inlineLabel}>Adding material here makes it</span>
            <SegmentedControl
              label={`Row ${n}: adding material makes the dimension`}
              size="sm"
              options={[
                { value: 'larger', label: 'Larger' },
                { value: 'smaller', label: 'Smaller' },
              ]}
              value={entry.unequal.materialSide}
              onChange={(materialSide) => change({ unequal: { ...entry.unequal, materialSide } })}
            />
          </div>
          {invalidField === 'unequal' && error ? <p className={styles.fieldError}>{error}</p> : <UnequalReadout entry={entry} system={system} />}
        </div>
      )}
      {rule.projected && entry.projected.on && (
        <div className={styles.subPanel}>
          <div className={styles.sizeLine}>
            <span className={styles.inlineLabel}>Projection height</span>
            <LengthInput
              aria-label={`Row ${n} projection height`}
              value={entry.projected.height}
              system={system}
              showUnit
              invalid={invalidField === 'projected'}
              onChange={(height) => change({ projected: { ...entry.projected, height } })}
            />
            <span className={styles.muted}>zone applies above the face</span>
          </div>
        </div>
      )}
      {row.statistical && <span className={styles.muted}>⟨ST⟩ is on the row (ROW below), drawn after the tolerance in the frame.</span>}
    </>
  )
}

function UnequalReadout({ entry, system }: { entry: GeometricEntry; system: UnitSystem }) {
  const text = unequalReadout(system, entry)
  return text ? <span className={styles.readout}>{text}</span> : null
}

/** ON THE STACK: the equivalent ± and how it was reached (design §4.5). */
function OnTheStack({ entry, contributor, inputs, system }: GeometricFieldsProps) {
  const [open, setOpen] = useState(false)
  if (!contributor) return null
  const { conversion, geometric: breakdown } = contributor
  const rule = geometricRule(entry.characteristic, inputs.standard)
  const terms = breakdown && (breakdown.bonus > 0 || breakdown.datumShift > 0)
  return (
    <section className={styles.onTheStack} aria-label="On the stack">
      <div className={styles.onTheStackHead}>
        <MonoLabel size="xs">On the stack</MonoLabel>
        <span className={styles.bigBand}>{plusMinus(system, contributor.halfBand)}</span>
        <span className={styles.muted}>
          worst case · σ {sigma(system, contributor.sigma)} RSS
        </span>
      </div>
      {breakdown?.surface ? (
        // To the feature surface: the boundaries (VC, RC) and where they put the surface (engine surfaceBoundary).
        <p className={styles.mono}>
          {surfaceReadout(system, breakdown.surface)[0]}
          <br />
          {surfaceReadout(system, breakdown.surface)[1]}
        </p>
      ) : terms && breakdown ? (
        <p className={styles.mono}>
          {breakdownTerms(system, entry, breakdown)}
          <br />= effective zone {len(system, breakdown.effectiveZone)} → {plusMinus(system, breakdown.effectiveZone / 2)}
        </p>
      ) : (
        <p className={styles.mono}>{rule.rule}</p>
      )}
      {Math.abs(contributor.meanShift) > 1e-12 && <p className={styles.mono}>mean shift {signed(system, contributor.meanShift)}</p>}
      {conversion.modifiers.map((line) => (
        <p key={line} className={styles.modifierLine}>
          {modifierHeadline(line)}
        </p>
      ))}
      <button type="button" className={styles.disclosure} aria-expanded={open} onClick={() => setOpen(!open)}>
        Sources and when to include it {open ? '‹' : '›'}
      </button>
      {open && (
        <div className={styles.includeWhen}>
          <p>{conversion.appliesWhen ?? rule.appliesWhen}</p>
          {conversion.unsure && (
            <p>
              <strong>Judgement call.</strong> {conversion.unsure}
            </p>
          )}
          {conversion.modifiers.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className={styles.source}>{conversion.source}</p>
        </div>
      )}
    </section>
  )
}
