// Printable A4 calculation reports: the page frame and the report building blocks.
export {
  Report, ReportFacts, ReportFigure, ReportSection, ReportSignOff, ReportSummary, ReportSummaryCell, ReportTitleBlock,
  ReportWarnings, type ReportFact, type ReportStatus,
} from './Report'
/** Classes for tables, two-column rows and diagram frames inside a report section. */
export { default as reportStyles } from './Report.module.css'
export { ReportPage } from './ReportPage'
