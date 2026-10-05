// Plain shapes shared by the chart layouts, in SVG coordinates.

export interface Rect {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface Segment {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}
