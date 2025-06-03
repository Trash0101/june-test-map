export interface Point {
  lat: number
  lng: number
}

export interface RouteInfo {
  distance: string
  segments: number
  roads: string[]
}

export interface GraphNode {
  node: string
  distance: number
  road: string
}

export interface RouteResult {
  path: Point[]
  roads: string[]
  distance: number
}

export interface DijkstraResult {
  path: string[]
  roads: string[]
  distance: number
}

export interface GeoJsonFeature {
  type: string
  properties: {
    name?: string
    highway?: string
  }
  geometry: {
    type: string
    coordinates: number[][]
  }
}

export interface GeoJsonData {
  type: string
  features: GeoJsonFeature[]
}
