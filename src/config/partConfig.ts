import type { CarPartItem } from '@/types'

/**
 * 部件配置表（SRS 附录 A / 建模文档 §5 命名契约 V1.1，18 部件一一对应）
 * 可换色部件 editable=true；固定件（logo/tire）editable=false 面板置灰；
 * 多实例 Mesh（tire 的 4 个轮胎、window 的 4 片玻璃）同名归并为一个逻辑部件
 *
 * 默认配色：Mercedes-Maybach GLS 600 Manufaktur 黑金双色
 * （黑曜石黑 Obsidian Black 下部 + 卡拉哈里金 Kalahari Gold 上部，
 *  与 GLB 内置原始材质一致；重置即恢复此配色）
 */
export const partConfig: CarPartItem[] = [
  // ---- 车身组 ----
  { meshName: 'body', label: '车身主体', group: 'body', color: '#0c0f14', metalness: 0.85, roughness: 0.22, selected: false, editable: true },
  { meshName: 'roof', label: '车顶', group: 'body', color: '#96805a', metalness: 0.75, roughness: 0.32, selected: false, editable: true },
  { meshName: 'driver', label: '驾驶员', group: 'body', color: '#454244', metalness: 0.0, roughness: 0.8, selected: false, editable: true },
  // ---- 外饰组 ----
  { meshName: 'grille', label: '中网', group: 'trim', color: '#3a3d43', metalness: 0.9, roughness: 0.25, selected: false, editable: true },
  { meshName: 'bumper_front', label: '前保险杠', group: 'trim', color: '#101318', metalness: 0.6, roughness: 0.45, selected: false, editable: true },
  { meshName: 'bumper_rear', label: '后保险杠', group: 'trim', color: '#101318', metalness: 0.6, roughness: 0.45, selected: false, editable: true },
  { meshName: 'mirror_l', label: '左后视镜壳', group: 'trim', color: '#96805a', metalness: 0.75, roughness: 0.32, selected: false, editable: true },
  { meshName: 'mirror_r', label: '右后视镜壳', group: 'trim', color: '#96805a', metalness: 0.75, roughness: 0.32, selected: false, editable: true },
  { meshName: 'handle_lf', label: '左前门把手', group: 'trim', color: '#d8d9dc', metalness: 1.0, roughness: 0.18, selected: false, editable: true },
  { meshName: 'handle_rf', label: '右前门把手', group: 'trim', color: '#d8d9dc', metalness: 1.0, roughness: 0.18, selected: false, editable: true },
  { meshName: 'trim', label: '镀铬饰条', group: 'trim', color: '#dfe1e4', metalness: 1.0, roughness: 0.12, selected: false, editable: true },
  { meshName: 'window', label: '车窗玻璃', group: 'trim', color: '#1a222c', metalness: 0.05, roughness: 0.03, selected: false, editable: true },
  { meshName: 'logo', label: '车标', group: 'trim', color: '#e8e9ec', metalness: 1.0, roughness: 0.15, selected: false, editable: false },
  // ---- 轮毂组 ----
  { meshName: 'wheel_fl', label: '左前轮毂', group: 'wheel', color: '#63676e', metalness: 0.9, roughness: 0.28, selected: false, editable: true },
  { meshName: 'wheel_fr', label: '右前轮毂', group: 'wheel', color: '#63676e', metalness: 0.9, roughness: 0.28, selected: false, editable: true },
  { meshName: 'wheel_rl', label: '左后轮毂', group: 'wheel', color: '#63676e', metalness: 0.9, roughness: 0.28, selected: false, editable: true },
  { meshName: 'wheel_rr', label: '右后轮毂', group: 'wheel', color: '#63676e', metalness: 0.9, roughness: 0.28, selected: false, editable: true },
  { meshName: 'tire', label: '轮胎橡胶', group: 'wheel', color: '#141414', metalness: 0.0, roughness: 0.92, selected: false, editable: false },
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
