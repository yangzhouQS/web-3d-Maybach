/** 部件分组（侧边面板折叠分组依据，SRS §5） */
export type PartGroup = 'body' | 'trim' | 'wheel'

/** 单车辆可换色部件（SRS §5） */
export interface CarPartItem {
  /** 精确匹配 GLB Mesh.name */
  meshName: string
  /** 多实例部件正则匹配（如 /^wheel_/），命中多个 Mesh 归并为一个逻辑部件 */
  matchPattern?: RegExp | RegExp[]
  /** 前端展示中文名称 */
  label: string
  /** 所属分组：车身组 / 外饰组 / 轮毂组 */
  group: PartGroup
  /** hex #ffffff */
  color: string
  metalness: number
  roughness: number
  /** UI 运行态，不参与序列化 */
  selected: boolean
  /** false=禁止修改颜色 */
  editable: boolean
}

/** 一套配色方案（SRS §5） */
export interface ColorScheme {
  id: string
  name: string
  createdAt: number
  parts: SchemePartData[]
}

/** 方案/导出共用的部件纯数据 */
export interface SchemePartData {
  meshName: string
  color: string
  metalness: number
  roughness: number
}

/** LocalStorage 存储结构（SRS §5） */
export interface SchemeStorage {
  schemaVersion: '1.0'
  schemes: ColorScheme[]
}

/** 模型级配置（SRS §5，车型替换只需更换 GLB + 本配置） */
export interface ModelConfig {
  /** GLB 资源地址 */
  url: string
  /** 车头朝向修正角（绕 Y 轴弧度），与附录 A 导出朝向一致 */
  orientation: number
  /** GLB 缺失时是否允许加载程序化占位模型（开发联调用） */
  allowFallback: boolean
  camera: {
    /** 初始极角（弧度） */
    initPhi: number
    /** 初始方位角（弧度） */
    initTheta: number
    /** 初始距离 = 包围盒对角线 × 该系数 */
    distanceRatio: number
    minDistanceRatio: number
    maxDistanceRatio: number
  }
}

/** 全局渲染配置（SRS §5） */
export interface RenderOption {
  autoRotate: boolean
  showGrid: boolean
  showShadow: boolean
  bgColor: string
  transparentBg: boolean
  enableOutline: boolean
}

/** 导出配色 JSON 顶层结构（SRS §5） */
export interface ExportColorJson {
  version: '1.0'
  schemeName: string
  parts: SchemePartData[]
}

/** 材质预设（SRS FR04） */
export interface MaterialPreset {
  name: string
  metalness: number
  roughness: number
}

/** 内置配色预设（SRS FR05-01） */
export interface ColorPreset {
  name: string
  /** meshName → color；未列出的部件保持不变 */
  colors: Record<string, string>
  /** 可选：同时覆盖材质参数 */
  material?: { metalness?: number; roughness?: number }
}

/** 加载状态机 */
export type LoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'timeout'
