<template>
  <div class="control-panel" :class="{ 'control-panel--collapsed': isCollapsed }">
    <div class="control-panel__header">
      <div class="control-panel__title-wrapper">
        <div class="control-panel__icon">🗺️</div>
        <img alt="Logo" class="control-panel__logo" src="@/assets/logo.svg" width="32" height="32" />
        <h2 class="control-panel__title">Route Builder</h2>
      </div>
      <button class="control-panel__toggle" @click="toggleCollapse">
        <span class="control-panel__toggle-icon" :class="{ 'rotated': isCollapsed }">
          {{ isCollapsed ? '▼' : '▲' }}
        </span>
      </button>
    </div>

    <div class="control-panel__content" v-show="!isCollapsed">
      <div class="status-section">
        <div v-if="loading" class="status-indicator status-indicator--loading">
          <div class="loading-spinner"></div>
          <span>{{ loadingMessage }}</span>
        </div>

        <div v-else-if="error" class="status-indicator status-indicator--error">
          <span class="status-icon">⚠️</span>
          <span>{{ error }}</span>
        </div>

        <div v-else-if="roadsLoaded" class="status-indicator status-indicator--success">
          <span class="status-icon">✅</span>
          <span>Дороги загружены ({{ roadsCount }} сегментов)</span>
        </div>
      </div>

      <div class="control-section">
        <h3 class="control-section__title">
          <span class="control-section__icon">📄</span>
          Загрузка GeoJSON
        </h3>

        <div class="api-section">
          <div class="input-group">
            <input
              v-model="apiUrl"
              type="url"
              placeholder="https://"
              class="input-field"
              :disabled="loadingGeoJson"
            />
            <button
              class="btn btn--primary btn--small"
              @click="fetchGeoJsonFromApi"
              :disabled="!apiUrl.trim() || loadingGeoJson"
            >
              {{ loadingGeoJson ? 'Загрузка...' : 'Загрузить' }}
            </button>
          </div>
        </div>

        <!-- Разделитель -->
        <div class="divider">
          <span class="divider__text">или</span>
        </div>

        <!-- Drag & Drop зона -->
        <div
          v-if="!geoJsonInfo"
          class="drop-zone"
          :class="{
            'drop-zone--active': isDragOver,
            'drop-zone--loading': loadingGeoJson
          }"
          @dragover.prevent="handleDragOver"
          @dragleave.prevent="handleDragLeave"
          @drop.prevent="handleFileDrop"
          @click="triggerFileInput"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".json,.geojson"
            @change="handleFileSelect"
            class="drop-zone__input"
          />

          <div class="drop-zone__content">
            <div class="drop-zone__icon">
              {{ loadingGeoJson ? '🔄' : (isDragOver ? '📥' : '📁') }}
            </div>
            <div class="drop-zone__text">
              <div class="drop-zone__primary">
                {{ loadingGeoJson ? 'Обработка файла...' : (isDragOver ? 'Отпустите файл' : 'Перетащите GeoJSON файл') }}
              </div>
              <div class="drop-zone__secondary" v-if="!loadingGeoJson && !isDragOver">
                или нажмите для выбора
              </div>
            </div>
          </div>
        </div>

        <div v-if="geoJsonInfo" class="geojson-info">
          <div class="info-header">
            <span class="info-header__icon">📊</span>
            <span class="info-header__title">Информация о файле</span>
          </div>
          <div class="info-stats">
            <div class="info-stat">
              <span class="info-stat__label">Тип:</span>
              <span class="info-stat__value">{{ geoJsonInfo.type }}</span>
            </div>
            <div class="info-stat">
              <span class="info-stat__label">Объектов:</span>
              <span class="info-stat__value">{{ geoJsonInfo.featuresCount }}</span>
            </div>
            <div class="info-stat" v-if="geoJsonInfo.fileName">
              <span class="info-stat__label">Файл:</span>
              <span class="info-stat__value">{{ geoJsonInfo.fileName }}</span>
            </div>
          </div>
          <button class="btn btn--danger btn--small" @click="clearGeoJson">
            <span class="btn__icon">🗑️</span>
            Очистить GeoJSON
          </button>
        </div>
      </div>

      <div class="control-section">
        <h3 class="control-section__title">
          <span class="control-section__icon">📍</span>
          Управление точками
        </h3>

        <div class="button-group">
          <button
            class="btn"
            :class="pointMode ? 'btn--primary' : 'btn--secondary'"
            @click="togglePointMode"
          >
            <span class="btn__icon">{{ pointMode ? '✅' : '📍' }}</span>
            {{ pointMode ? 'Режим точек активен' : 'Включить режим точек' }}
          </button>

          <button
            class="btn btn--danger btn--small"
            @click="clearPoints"
            :disabled="points.length === 0"
          >
            <span class="btn__icon">🗑️</span>
            Очистить
          </button>
        </div>

        <div v-if="points.length > 0" class="points-list">
          <div v-for="(point, index) in points" :key="index" class="point-item">
            <div v-if="point" class="point-item__info">
              <div class="point-item__label">Точка {{ index + 1 }}</div>
              <div class="point-item__coords">
                {{ point.lat.toFixed(4) }}, {{ point.lng.toFixed(4) }}
              </div>
            </div>
            <button class="point-item__remove" @click="removePoint(index)">×</button>
          </div>
        </div>
      </div>

      <div class="control-section">
        <h3 class="control-section__title">
          <span class="control-section__icon">🛣️</span>
          Маршрут
        </h3>

        <div class="button-group">
          <button
            class="btn btn--primary"
            @click="buildRoute"
            :disabled="points.length < 2 || routeBuilding"
          >
            <span class="btn__icon">{{ routeBuilding ? '🔄' : '🚀' }}</span>
            {{ routeBuilding ? 'Строим маршрут...' : 'Построить маршрут' }}
          </button>

          <button
            class="btn btn--secondary btn--small"
            @click="clearRoute"
            :disabled="!currentRoute"
          >
            <span class="btn__icon">🧹</span>
            Очистить
          </button>
        </div>

        <!-- Прогресс бар -->
        <div v-if="routeBuilding" class="progress-bar">
          <div class="progress-bar__fill" :style="{ width: routeProgress + '%' }"></div>
        </div>
      </div>

      <!-- Информация о маршруте -->
      <div v-if="routeInfo" class="control-section">
        <h3 class="control-section__title">
          <span class="control-section__icon">📊</span>
          Информация о маршруте
        </h3>

        <div class="route-stats">
          <div class="stat-card">
            <div class="stat-card__value">{{ routeInfo.distance }}</div>
            <div class="stat-card__label">км</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">{{ routeInfo.segments }}</div>
            <div class="stat-card__label">сегментов</div>
          </div>
        </div>

        <!-- Список дорог -->
        <div v-if="routeInfo.roads.length > 0" class="roads-section">
          <h4 class="roads-section__title">Дороги по маршруту:</h4>
          <div class="roads-list">
            <div v-for="(road, index) in routeInfo.roads.slice(0, 5)" :key="index" class="road-item">
              <span class="road-item__number">{{ index + 1 }}.</span>
              <span class="road-item__name">{{ road || 'Неизвестная дорога' }}</span>
            </div>
            <div v-if="routeInfo.roads.length > 5" class="road-item road-item--more">
              + еще {{ routeInfo.roads.length - 5 }} дорог
            </div>
          </div>
        </div>
      </div>

      <!-- Дополнительные опции -->
      <div class="control-section">
        <h3 class="control-section__title">
          <span class="control-section__icon">⚙️</span>
          Настройки
        </h3>

        <div class="button-group button-group--vertical">
          <button class="btn btn--secondary" @click="loadSampleData">
            <span class="btn__icon">📂</span>
            Загрузить тестовые данные
          </button>
          <button class="btn btn--secondary" @click="fitMapToData">
            <span class="btn__icon">🎯</span>
            Показать все дороги
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineEmits } from 'vue'
import type {RouteInfo, Point} from "@/types/Map.ts";

interface GeoJsonInfo {
  type: string;
  featuresCount: number;
  fileName?: string;
}

const emit = defineEmits([
  'clear-points',
  'remove-point',
  'build-route',
  'clear-route',
  'load-sample-data',
  'fit-map-to-data',
  'geojson-loaded',
  'geojson-error',
  'geojson-clear'
])

defineProps<{
  loadingMessage: string;
  loading: boolean;
  error: string | null;
  roadsLoaded: boolean;
  roadsCount: number;
  points: Point[];
}>();

const isCollapsed = ref(false)
const pointMode = defineModel<boolean>('point-mode')
const currentRoute = defineModel<Point[] | null>('current-route')
const routeInfo = ref<RouteInfo | null>(null)
const routeBuilding = ref(false)
const routeProgress = ref(0)

const apiUrl = ref('')
const loadingGeoJson = ref(false)
const isDragOver = ref(false)
const geoJsonInfo = ref<GeoJsonInfo | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const togglePointMode = () => {
  pointMode.value = !pointMode.value
}

const clearPoints = () => {
  emit('clear-points')
}

const removePoint = (index: number) => {
  emit('remove-point', index)
}

const buildRoute = () => {
  emit('build-route')
}

const clearRoute = () => {
  currentRoute.value = null
  routeInfo.value = null
  emit('clear-route')
}

const loadSampleData = () => {
  emit('load-sample-data')
}

const fitMapToData = () => {
  emit('fit-map-to-data')
}

const fetchGeoJsonFromApi = async () => {
  if (!apiUrl.value.trim()) return

  loadingGeoJson.value = true
  try {
    const response = await fetch(apiUrl.value)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('application/json') && !contentType?.includes('application/geo+json')) {
      console.warn('Content-Type не указывает на JSON, но продолжаем...')
    }

    const geoJsonData = await response.json()
    processGeoJsonData(geoJsonData, new URL(apiUrl.value).pathname.split('/').pop() || 'api-data')
  } catch (error) {
    console.error('Ошибка загрузки GeoJSON:', error)
    emit('geojson-error', error instanceof Error ? error.message : 'Неизвестная ошибка')
  } finally {
    loadingGeoJson.value = false
  }
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  if (!e.currentTarget?.contains(e.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

const handleFileDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

const triggerFileInput = () => {
  if (loadingGeoJson.value) return
  fileInput.value?.click()
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = target.files
  if (files && files.length > 0) {
    processFile(files[0])
  }
}

const processFile = async (file: File) => {
  if (!file.name.match(/\.(json|geojson)$/i)) {
    emit('geojson-error', 'Пожалуйста, выберите файл с расширением .json или .geojson')
    return
  }

  loadingGeoJson.value = true
  try {
    const text = await file.text()
    const geoJsonData = JSON.parse(text)
    processGeoJsonData(geoJsonData, file.name)
  } catch (error) {
    console.error('Ошибка обработки файла:', error)
    emit('geojson-error', error instanceof Error ? error.message : 'Ошибка чтения файла')
  } finally {
    loadingGeoJson.value = false
  }
}

const processGeoJsonData = (data: any, fileName: string) => {
  try {
    if (!data || typeof data !== 'object') {
      throw new Error('Неверный формат данных')
    }

    if (!data.type) {
      throw new Error('Отсутствует поле "type" в GeoJSON')
    }

    let featuresCount = 0
    if (data.type === 'FeatureCollection') {
      if (!Array.isArray(data.features)) {
        throw new Error('FeatureCollection должен содержать массив features')
      }
      featuresCount = data.features.length
    } else if (data.type === 'Feature') {
      featuresCount = 1
    } else if (['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'].includes(data.type)) {
      featuresCount = 1
    } else {
      throw new Error(`Неподдерживаемый тип GeoJSON: ${data.type}`)
    }

    geoJsonInfo.value = {
      type: data.type,
      featuresCount,
      fileName
    }

    emit('geojson-loaded', data)
  } catch (error) {
    console.error('Ошибка валидации GeoJSON:', error)
    emit('geojson-error', error instanceof Error ? error.message : 'Ошибка валидации GeoJSON')
  }
}

const clearGeoJson = () => {
  geoJsonInfo.value = null
  apiUrl.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
  emit('geojson-clear');
}
</script>

<style lang="scss" scoped>
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
$success-color: #4caf50;
$warning-color: #ff9800;
.control-panel {
  position: absolute;
  top: 120px;
  left: 20px;
  width: 380px;
  background: $dark-bg-secondary;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid $dark-divider;
  z-index: 1000;
  max-height: calc(100vh - 40px);
  overflow: hidden;
  transition: all 0.3s ease;

  &--collapsed {
    height: auto;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: linear-gradient(135deg, $accent-dark 0%, rgba(46, 46, 46, 0.8) 100%);
    border-bottom: 1px solid $dark-divider;
  }

  &__title-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__icon {
    font-size: 1.25rem;
  }

  &__logo {
    display: none;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 700;
    color: $accent-light;
    margin: 0;
  }

  &__toggle {
    background: transparent;
    border: 1px solid $dark-divider;
    border-radius: 6px;
    padding: 6px 10px;
    color: $dark-text-secondary;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: $dark-bg-tertiary;
      border-color: $accent-light;
      color: $accent-light;
    }
  }

  &__toggle-icon {
    transition: transform 0.3s ease;

    &.rotated {
      transform: rotate(180deg);
    }
  }

  &__content {
    padding: 20px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: $dark-bg-tertiary;
      border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
      background: $dark-divider;
      border-radius: 3px;

      &:hover {
        background: $accent-dark;
      }
    }
  }
}

.status-section {
  margin-bottom: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;

  &--loading {
    background: rgba(255, 152, 0, 0.1);
    color: $warning-color;
    border: 1px solid rgba(255, 152, 0, 0.2);
  }

  &--success {
    background: rgba(76, 175, 80, 0.1);
    color: $success-color;
    border: 1px solid rgba(76, 175, 80, 0.2);
  }

  &--error {
    background: rgba(207, 102, 121, 0.1);
    color: $error-color;
    border: 1px solid rgba(207, 102, 121, 0.2);
  }
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.control-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid $dark-divider;

  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: $dark-text-primary;
    margin-bottom: 16px;
  }

  &__icon {
    font-size: 1rem;
  }
}

.api-section {
  margin-bottom: 16px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-field {
  flex: 1;
  padding: 10px 12px;
  background: $dark-bg-tertiary;
  border: 1px solid $dark-divider;
  border-radius: 8px;
  color: $dark-text-primary;
  font-size: 14px;
  transition: all 0.3s ease;

  &::placeholder {
    color: $dark-text-disabled;
  }

  &:focus {
    outline: none;
    border-color: $accent-light;
    background: rgba(255, 255, 255, 0.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.divider {
  display: flex;
  align-items: center;
  margin: 16px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $dark-divider;
  }

  &__text {
    padding: 0 12px;
    font-size: 12px;
    color: $dark-text-disabled;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.drop-zone {
  position: relative;
  border: 2px dashed $dark-divider;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: $dark-bg-tertiary;

  &:hover:not(&--loading) {
    border-color: $accent-dark;
    background: rgba(255, 255, 255, 0.02);
  }

  &--active {
    border-color: $accent-light;
    background: $accent-dark;
    transform: scale(1.02);
  }

  &--loading {
    cursor: not-allowed;
    opacity: 0.7;
  }

  &__input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  &__content {
    pointer-events: none;
  }

  &__icon {
    font-size: 2rem;
    margin-bottom: 8px;
    display: block;
  }

  &__primary {
    font-size: 16px;
    font-weight: 500;
    color: $dark-text-primary;
    margin-bottom: 4px;
  }

  &__secondary {
    font-size: 13px;
    color: $dark-text-secondary;
  }
}

.geojson-info {
  margin-top: 16px;
  padding: 16px;
  background: $dark-bg-tertiary;
  border-radius: 8px;
  border: 1px solid $dark-divider;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  &__icon {
    font-size: 16px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $dark-text-primary;
  }
}

.info-stats {
  margin-bottom: 12px;
}

.info-stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;

  &__label {
    color: $dark-text-secondary;
  }

  &__value {
    color: $accent-light;
    font-weight: 500;
  }
}

.button-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  &--vertical {
    flex-direction: column;
  }
}

.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &__icon {
    font-size: 14px;
  }

  &--primary {
    background: $accent-color;
    color: white;

    &:hover:not(:disabled) {
      background: $accent-light;
      transform: translateY(-1px);
    }
  }

  &--secondary {
    background: $dark-bg-tertiary;
    color: $dark-text-secondary;
    border: 1px solid $dark-divider;

    &:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.05);
      color: $dark-text-primary;
      border-color: $accent-dark;
    }
  }

  &--danger {
    background: $error-color;
    color: white;

    &:hover:not(:disabled) {
      background: lighten($error-color, 10%);
    }
  }

  &--small {
    padding: 6px 12px;
    font-size: 12px;
  }
}

.points-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.point-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: $dark-bg-tertiary;
  border-radius: 8px;
  border: 1px solid $dark-divider;

  &__info {
    flex: 1;
  }

  &__label {
    font-weight: 500;
    color: $dark-text-primary;
    font-size: 14px;
  }

  &__coords {
    font-size: 12px;
    color: $dark-text-secondary;
    margin-top: 2px;
  }

  &__remove {
    background: $error-color;
    color: white;
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.3s ease;

    &:hover {
      background: lighten($error-color, 10%);
      transform: scale(1.1);
    }
  }
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: $dark-bg-tertiary;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, $accent-color, $accent-light);
    transition: width 0.3s ease;
    border-radius: 2px;
  }
}

.route-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
  padding: 16px 12px;
  background: $dark-bg-tertiary;
  border-radius: 8px;
  border: 1px solid $dark-divider;

  &__value {
    font-size: 1.5rem;
    font-weight: bold;
    color: $accent-light;
    line-height: 1;
  }

  &__label {
    font-size: 0.75rem;
    color: $dark-text-secondary;
    margin-top: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.roads-section {
  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: $dark-text-primary;
    margin-bottom: 8px;
  }
}

.roads-list {
  max-height: 120px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: $dark-bg-tertiary;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: $dark-divider;
    border-radius: 2px;
  }
}

.road-item {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  margin-bottom: 4px;
  background: $dark-bg-tertiary;
  border-radius: 6px;
  font-size: 13px;
  border-left: 3px solid $accent-color;

  &__number {
    color: $accent-light;
    font-weight: 600;
    margin-right: 8px;
    min-width: 20px;
  }

  &__name {
    color: $dark-text-secondary;
    flex: 1;
  }

  &--more {
    color: $dark-text-disabled;
    font-style: italic;
    border-left-color: $dark-divider;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .control-panel {
    top: 10px;
    left: 10px;
    right: 10px;
    width: auto;
    &__content {
      max-height: calc(100vh - 10px);
    }
    &__icon {
      display: none;
    }
    &__logo {
      display: block;
    }
  }
  .btn {
    min-height: 50px;
  }

  .button-group:not(.button-group--vertical) {
    flex-direction: column;
  }

  .route-stats {
    grid-template-columns: 1fr;
  }

  .input-group {
    flex-direction: column;
  }
  .input-field {
    min-height: 50px;
  }

  .drop-zone {
    padding: 16px;

    &__icon {
      font-size: 1.5rem;
    }

    &__primary {
      font-size: 14px;
    }
  }
}
</style>
