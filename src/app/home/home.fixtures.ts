// Fixture data for Home, matching the "Home v2" design. Replace with real
// project storage once it exists; the types live in homeData.ts.
import type { HomeData } from './homeData'

export const HOME_FIXTURE: HomeData = {
  lastUsedTool: 'fit',
  lastCalculation: {
    fit: 'Ø25 H7/p6',
    bolt: '8-BOLT PATTERN',
    lam: '[0/±45/90]s',
  },
  materials: { count: 214, sources: ['MMPDS', 'EN', 'ASTM'] },
  recentProjects: [
    {
      id: 'P-0142',
      name: 'FW-27 Rear upright',
      lastCalculation: 'Fit Tolerance · carrier pin Rev C',
      status: 'pass',
      calculationCount: 14,
      decisionCount: 7,
      updatedAt: '2026-10-05T14:32',
    },
    {
      id: 'P-0139',
      name: 'Battery module M3 · busbar clamp',
      lastCalculation: 'Bolted Joint · M5 into PA66',
      status: 'review',
      calculationCount: 9,
      decisionCount: 3,
      updatedAt: '2026-10-04T17:05',
    },
    {
      id: 'P-0131',
      name: 'Front wing endplate',
      lastCalculation: 'Laminate · endplate skin Rev D',
      status: 'pass',
      calculationCount: 22,
      decisionCount: 11,
      updatedAt: '2026-10-02T11:20',
    },
  ],
}
