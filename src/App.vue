<template>
  <div class="app app--dark">
    <AppHeader />
    <AppControls
      v-model:point-mode="pointMode"
      v-model:current-route="currentRoute"
      :loadingMessage
      :loading
      :error
      :roadsLoaded
      :roadsCount
      :points
      @clear-points="clearPoints"
      @clear-route="clearRoute"
      @load-sample-data="loadSampleData"
      @remove-point="removePoint"
      @build-route="buildRoute"
      @fit-map-to-data="fitMapToData"
      @geojson-loaded="loadGeoJsonData"
      @geojson-error="setError"
      @geojson-clear="loadSampleData"
    />
    <div class="map-container">
      <div id="map" />
    </div>
  </div>
</template>

<script setup lang="ts">
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { ref, onMounted } from 'vue'
import AppHeader from "@/components/AppHeader.vue";
import AppControls from "@/components/AppControls.vue";
import {Layer} from "leaflet";
import type {
  GeoJsonData,
  Point,
  RouteInfo,
  GraphNode,
  GeoJsonFeature,
  RouteResult, DijkstraResult
} from "@/types/Map.ts";
import customMarker from "@/utils/customMarker.ts";

let map:L.Map | null = null
const loading = ref(false)
const loadingMessage = ref('')
const error = ref<string | null>(null)
const roadsLoaded = ref(false)
const roadsCount = ref(0)
const pointMode = ref(true)
const points = ref<Point[]>([])
const markers = ref<Layer[]>([])
const geoJsonData = ref<GeoJsonData | null>(null)
const roadsLayer = ref<L.GeoJSON | null>(null)
const currentRoute = ref<Point[] | null>(null)
const routeLayer = ref<L.Polyline | null>(null)
const routeInfo = ref<RouteInfo | null>(null)
const routeBuilding = ref(false)
const routeProgress = ref(0)
const graph = ref<Map<string, GraphNode[]>>(new Map())

const initMap = () => {
  map = L.map('map', {
    zoomControl: false,
  }).setView([55.7558, 37.6176], 10)

  if(!map) return;

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map as L.Map);

  map.on('click', handleMapClick)
}

const handleMapClick = (e: L.LeafletMouseEvent) => {
  if (!pointMode.value) return

  const { lat, lng } = e.latlng
  addPoint(lat, lng)
}

const addPoint = (lat: number, lng: number) => {
  const point: Point = { lat, lng }
  points.value.push(point)
  const marker = L.marker([lat, lng], {
    draggable: true,
    title: `Точка ${points.value.length}`,
    icon: customMarker()
  }).addTo(map!)

  marker.on('dragend', (e: L.DragEndEvent) => {
    const index = markers.value.indexOf(marker)
    if (index !== -1) {
      const newPos = e.target.getLatLng()
      points.value[index] = { lat: newPos.lat, lng: newPos.lng }
      if (points.value.length >= 2) {
        setTimeout(() => buildRoute(), 500)
      }
    }
  })
  marker.on("click", (mark) => {
    const index = points.value.findIndex((el) => {
      const markLatLng = mark.latlng;
      return markLatLng.lat === el.lat && markLatLng.lng === el.lng
    })
    if(index !== -1) {
      marker.remove();
      points.value.splice(index, 1)
      clearRoute();
      buildRoute();
    }
  })

  markers.value.push(marker)

  buildRoute();
}

const removePoint = (index: number) => {
  points.value.splice(index, 1)

  if (markers.value[index]) {
    map!.removeLayer(markers.value[index] as Layer)
    markers.value.splice(index, 1)
  }

  markers.value.forEach((marker, i) => {
    marker.setTooltipContent(`Точка ${i + 1}`)
  })

  clearRoute()

  if (points.value.length >= 2) {
    buildRoute();
  }
}

const clearPoints = () => {
  points.value = []
  markers.value.forEach(marker => marker.remove())
  markers.value = []
  clearRoute()
}

const loadSampleData = async () => {
  loading.value = true
  loadingMessage.value = 'Генерируем тестовые данные дорог...'
  error.value = null

  try {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const testData = generateTestRoads()
    await loadGeoJsonData(testData)

  } catch (err) {
    error.value = 'Ошибка загрузки данных: ' + (err as Error).message
  } finally {
    loading.value = false
  }
}

const generateTestRoads = (): GeoJsonData => {
  const roads: GeoJsonFeature[] = []
  const center = [55.7558, 37.6176]
  const gridSize = 0.01
  const gridCount = 20

  for (let i = 0; i < gridCount; i++) {
    const lat = center[0] - (gridCount / 2) * gridSize + i * gridSize
    const coords: number[][] = []
    for (let j = 0; j < gridCount; j++) {
      const lng = center[1] - (gridCount / 2) * gridSize + j * gridSize
      coords.push([lng, lat])
    }

    roads.push({
      type: "Feature",
      properties: {
        name: `Горизонтальная улица ${i + 1}`,
        highway: "primary"
      },
      geometry: {
        type: "LineString",
        coordinates: coords
      }
    })
  }

  for (let j = 0; j < gridCount; j++) {
    const lng = center[1] - (gridCount / 2) * gridSize + j * gridSize
    const coords: number[][] = []
    for (let i = 0; i < gridCount; i++) {
      const lat = center[0] - (gridCount / 2) * gridSize + i * gridSize
      coords.push([lng, lat])
    }

    roads.push({
      type: "Feature",
      properties: {
        name: `Вертикальная улица ${j + 1}`,
        highway: "primary"
      },
      geometry: {
        type: "LineString",
        coordinates: coords
      }
    })
  }

  return {
    type: "FeatureCollection",
    features: roads
  }
}

const loadGeoJsonData = async (data: GeoJsonData) => {
  error.value = null;
  clearPoints();
  clearRoute();
  geoJsonData.value = data
  roadsCount.value = data.features.length

  if (roadsLayer.value) {
    map!.removeLayer(roadsLayer.value)
  }

  roadsLayer.value = L.geoJSON(data, {
    style: {
      color: '#666',
      weight: 2,
      opacity: 0.7
    },
    onEachFeature: (feature, layer) => {
      if (feature.properties.name) {
        layer.bindTooltip(feature.properties.name)
      }
    }
  }).addTo(map!)

  buildGraph()

  roadsLoaded.value = true
  fitMapToData()
}

const buildGraph = () => {
  graph.value.clear()

  geoJsonData.value!.features.forEach(feature => {
    if (feature.geometry.type === 'LineString') {
      const coords = feature.geometry.coordinates

      for (let i = 0; i < coords.length - 1; i++) {
        const from = `${coords[i][1]},${coords[i][0]}`
        const to = `${coords[i + 1][1]},${coords[i + 1][0]}`

        const distance = getDistance(
          coords[i][1], coords[i][0],
          coords[i + 1][1], coords[i + 1][0]
        )

        if (!graph.value.has(from)) {
          graph.value.set(from, [])
        }
        if (!graph.value.has(to)) {
          graph.value.set(to, [])
        }

        graph.value.get(from)!.push({
          node: to,
          distance: distance,
          road: feature.properties.name || 'Неизвестная дорога'
        })

        graph.value.get(to)!.push({
          node: from,
          distance: distance,
          road: feature.properties.name || 'Неизвестная дорога'
        })
      }
    }
  })
}

const buildRoute = async () => {
  if (points.value.length < 2) return

  routeBuilding.value = true
  routeProgress.value = 0
  clearRoute()

  try {
    const route: Point[] = []
    const allRoads: string[] = []
    let totalDistance = 0

    for (let i = 0; i < points.value.length - 1; i++) {
      routeProgress.value = (i / (points.value.length - 1)) * 100

      const segment = await findRoute(points.value[i], points.value[i + 1])
      if (segment.path.length > 0) {
        route.push(...segment.path)
        allRoads.push(...segment.roads)
        totalDistance += segment.distance
      }
    }

    routeProgress.value = 100

    if (route.length > 0 && map) {
      const latLngs: L.LatLngExpression[] = route.map(p => [p.lat, p.lng])
      routeLayer.value = L.polyline(latLngs, {
        color: '#ff4444',
        weight: 4,
        opacity: 0.8
      }).addTo(map)

      currentRoute.value = route
      routeInfo.value = {
        distance: totalDistance.toFixed(2),
        segments: route.length - 1,
        roads: [...new Set(allRoads)]
      }

      map.fitBounds(routeLayer.value.getBounds(), { padding: [20, 20] })
    } else {
      error.value = 'Не удалось построить маршрут между указанными точками'
    }

  } catch (err) {
    error.value = 'Ошибка построения маршрута: ' + (err as Error).message
  } finally {
    routeBuilding.value = false
    routeProgress.value = 0
  }
}

const findRoute = async (start: Point, end: Point): Promise<RouteResult> => {
  const startNode = findNearestRoadPoint(start)
  const endNode = findNearestRoadPoint(end)

  if (!startNode || !endNode) {
    return { path: [], roads: [], distance: 0 }
  }

  const result = dijkstra(startNode, endNode)

  if (result.path.length === 0) {
    return { path: [], roads: [], distance: 0 }
  }

  const coordinates: Point[] = [start]

  result.path.forEach(nodeKey => {
    const [lat, lng] = nodeKey.split(',').map(Number)
    coordinates.push({ lat, lng })
  })

  coordinates.push(end)

  return {
    path: coordinates,
    roads: result.roads,
    distance: result.distance
  }
}

const findNearestRoadPoint = (point: Point): string | null => {
  let nearest: string | null = null
  let minDistance = Infinity

  for (const nodeKey of graph.value.keys()) {
    const [lat, lng] = nodeKey.split(',').map(Number)
    const distance = getDistance(point.lat, point.lng, lat, lng)

    if (distance < minDistance) {
      minDistance = distance
      nearest = nodeKey
    }
  }

  return nearest
}

const dijkstra = (start: string, end: string): DijkstraResult => {
  const distances = new Map<string, number>()
  const previous = new Map<string, string>()
  const roads = new Map<string, string>()
  const unvisited = new Set<string>()

  for (const node of graph.value.keys()) {
    distances.set(node, Infinity)
    unvisited.add(node)
  }
  distances.set(start, 0)

  while (unvisited.size > 0) {
    let current: string | null = null
    let minDistance = Infinity

    for (const node of unvisited) {
      if (distances.get(node)! < minDistance) {
        minDistance = distances.get(node)!
        current = node
      }
    }

    if (current === null || current === end) break

    unvisited.delete(current)

    const neighbors = graph.value.get(current) || []
    for (const neighbor of neighbors) {
      if (!unvisited.has(neighbor.node)) continue

      const alt = distances.get(current)! + neighbor.distance
      if (alt < distances.get(neighbor.node)!) {
        distances.set(neighbor.node, alt)
        previous.set(neighbor.node, current)
        roads.set(neighbor.node, neighbor.road)
      }
    }
  }

  const path: string[] = []
  const pathRoads: string[] = []
  let current: string | undefined = end

  while (previous.has(current!)) {
    path.unshift(current!)
    if (roads.has(current!)) {
      pathRoads.unshift(roads.get(current!)!)
    }
    current = previous.get(current!)
  }

  return {
    path: path,
    roads: pathRoads,
    distance: distances.get(end) || 0
  }
}

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180)
}

const clearRoute = () => {
  if (routeLayer.value && map) {
    map.removeLayer(routeLayer.value)
    routeLayer.value = null
  }
  currentRoute.value = null
  routeInfo.value = null
}

const fitMapToData = () => {
  if (roadsLayer.value) {
    map!.fitBounds(roadsLayer.value.getBounds(), { padding: [20, 20] })
  }
}

const setError = (string:string) => {
  error.value = string
}

onMounted(async () => {
  initMap()
  await loadSampleData()
})

</script>

<style lang="scss">
$dark-bg-primary: #121212;
$dark-bg-secondary: #1e1e1e;
$dark-bg-tertiary: #2d2d2d;
$dark-text-primary: #ffffff;
$dark-text-secondary: rgba(255, 255, 255, 0.7);
$dark-text-disabled: rgba(255, 255, 255, 0.5);
$dark-divider: rgba(255, 255, 255, 0.12);
$accent-color: hsla(160, 100%, 37%, 1);
$accent-light: hsl(160, 98%, 46%);
$accent-dark: hsla(160, 100%, 37%, 0.2);
$error-color: #cf6679;
$header-height-mobile: 70px;
$header-height-desktop: 80px;
$max-content-width: 1200px;
$breakpoint-mobile: 768px;

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Roboto', 'Arial', sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  &--dark {
    background-color: $dark-bg-primary;
    color: $dark-text-primary;
  }
}

.map-container {
  flex: 1;
}
#map{
  width: 100%;
  height: calc(100vh - 80px);
}
@media (max-width: 480px) {
  #map {
    height: 100vh;
  }
}
</style>
