import type { CarPartItem } from '@/types'

/**
 * 部件配置表（SRS 附录 A / 建模文档 §5 命名契约 V1.1，18 部件一一对应）
 * 可换色部件 editable=true；固定件（logo/tire）editable=false 面板置灰；
 * window 自 V1.1 起开放换色（带透明度的玻璃色调）；driver 为 V1.1 新增可换色件
 * 多实例 Mesh（tire 的 4 个轮胎、window 的 4 片玻璃）同名归并为一个逻辑部件
 */
export const partConfig: CarPartItem[] = [
  // ---- 车身组 ----
  { meshName: 'body', label: '车身主体', group: 'body', color: '#1a1a1e', metalness: 0.9, roughness: 0.15, selected: false, editable: true },
  { meshName: 'roof', label: '车顶', group: 'body', color: '#1a1a1e', metalness: 0.9, roughness: 0.15, selected: false, editable: true },
  // ---- 外饰组 ----
  { meshName: 'grille', label: '中网', group: 'trim', color: '#c9c9cf', metalness: 0.95, roughness: 0.3, selected: false, editable: true },
  { meshName: 'bumper_front', label: '前保险杠', group: 'trim', color: '#232328', metalness: 0.8, roughness: 0.35, selected: false, editable: true },
  { meshName: 'bumper_rear', label: '后保险杠', group: 'trim', color: '#232328', metalness: 0.8, roughness: 0.35, selected: false, editable: true },
  { meshName: 'mirror_l', label: '左后视镜壳', group: 'trim', color: '#1a1a1e', metalness: 0.9, roughness: 0.2, selected: false, editable: true },
  { meshName: 'mirror_r', label: '右后视镜壳', group: 'trim', color: '#1a1a1e', metalness: 0.9, roughness: 0.2, selected: false, editable: true },
  { meshName: 'handle_lf', label: '左前门把手', group: 'trim', color: '#c9c9cf', metalness: 0.95, roughness: 0.3, selected: false, editable: true },
  { meshName: 'handle_rf', label: '右前门把手', group: 'trim', color: '#c9c9cf', metalness: 0.95, roughness: 0.3, selected: false, editable: true },
  { meshName: 'trim', label: '镀铬饰条', group: 'trim', color: '#bfa14a', metalness: 0.95, roughness: 0.3, selected: false, editable: true },
  { meshName: 'window', label: '车窗玻璃', group: 'trim', color: '#0a0d14', metalness: 0.05, roughness: 0.03, selected: false, editable: true },
  { meshName: 'driver', label: '驾驶员', group: 'body', color: '#847a72', metalness: 0.0, roughness: 0.85, selected: false, editable: true },
  { meshName: 'logo', label: '车标', group: 'trim', color: '#bfa14a', metalness: 1.0, roughness: 0.2, selected: false, editable: false },
  // ---- 轮毂组 ----
  { meshName: 'wheel_fl', label: '左前轮毂', group: 'wheel', color: '#d8d8dc', metalness: 0.95, roughness: 0.25, selected: false, editable: true },
  { meshName: 'wheel_fr', label: '右前轮毂', group: 'wheel', color: '#d8d8dc', metalness: 0.95, roughness: 0.25, selected: false, editable: true },
  { meshName: 'wheel_rl', label: '左后轮毂', group: 'wheel', color: '#d8d8dc', metalness: 0.95, roughness: 0.25, selected: false, editable: true },
  { meshName: 'wheel_rr', label: '右后轮毂', group: 'wheel', color: '#d8d8dc', metalness: 0.95, roughness: 0.25, selected: false, editable: true },
  { meshName: 'tire', label: '轮胎橡胶', group: 'wheel', color: '#151517', metalness: 0.1, roughness: 0.9, selected: false, editable: false },
]

export const GROUP_LABEL: Record<string, string> = {
  body: '车身组',
  trim: '外饰组',
  wheel: '轮毂组',
}

/** 深拷贝一份初始部件配置（运行态使用，避免污染配置源） */
export function createInitialParts(): CarPartItem[] {
  return partConfig.map((p) => ({ ...p }))
}
