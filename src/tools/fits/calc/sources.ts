/**
 * Where the tabulated values come from, used in comments and error messages.
 *
 * ISO 286-1:2010 Table 1 holds the standard tolerance values (IT grades).
 * The fundamental deviation tables are numbered differently in the 1988 and
 * 2010 editions of ISO 286-1, so they are referred to here by their title.
 * ISO 286-2:2010 lists the resulting limit deviations per tolerance class and
 * is used for the worked examples in the tests.
 */
export const SOURCE = {
  standardTolerances: 'ISO 286-1 Table 1',
  shaftsAtoJ: 'the ISO 286-1 table of fundamental deviations for shafts a to j',
  shaftsKtoZC: 'the ISO 286-1 table of fundamental deviations for shafts k to zc',
  holes: 'the ISO 286-1 table of fundamental deviations for holes',
} as const
