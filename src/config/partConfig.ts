import type { CarPartItem } from '@/types'

/**
 * 部件配置表（SRS 附录 A 命名契约）
 * 多实例部件（轮毂/后视镜/门把手等）由 matchPattern 正则归并为一个逻辑部件
 */
export const partConfig: CarPartItem[] = [
  { meshName: 'body', label: '车身', group: 'body', color: '#1a1a1e', metalness: 0.9, roughness: 0.15, selected: false, editable: true },
  { meshName: 'roof', label: '车顶', group: 'body', color: '#1a1a1e', metalness: 0.9, roughness: 0.15, selected: false, editable: true },
  { meshName: 'grille', label: '中网', group: 'trim', color: '#c9c9cf', metalness: 0.95, roughness: 0.3, selected: false, editable: true },
  {
    meshName: 'wheel', matchPattern: /^wheel_/, label: '轮毂', group: 'wheel',
    color: '#d8d8dc', metalness: 0.95, roughness: 0.25, selected: false, editable: true,
  },
  {
    meshName: 'tire', label: '轮胎', group: 'wheel',
    color: '#151517', metalness: 0.1, roughness: 0.9, selected: false, editable: true,
  },
  {
    meshName: 'mirror', matchPattern: /^mirror_/, label: '后视镜', group: 'trim',
    color: '#1a1a1e', metalness: 0.9, roughness: 0.2, selected: false, editable: true,
  },
  {
    meshName: 'bumper', matchPattern: /^bumper_/, label: '保险杠', group: 'trim',
    color: '#232328', metalness: 0.8, roughness: 0.35, selected: false, editable: true,
  },
  {
    meshName: 'handle', matchPattern: /^handle_/, label: '门把手', group: 'trim',
    color: '#c9c9cf', metalness: 0.95, roughness: 0.3, selected: false, editable: true,
  },
  {
    meshName: 'trim', matchPattern: /^trim_/, label: '饰条', group: 'trim',
    color: '#bfa14a', metalness: 0.95, roughness: 0.3, selected: false, editable: true,
  },
  {
    meshName: 'window', matchPattern: /^window_/, label: '车窗', group: 'trim',
    color: '#121418', metalness: 0.4, roughness: 0.05, selected: false, editable: true,
  },
  {
    meshName: 'emblem', matchPattern: /^(emblem|logo)$/, label: '车标', group: 'trim',
    color: '#bfa14a', metalness: 1.0, roughness: 0.2, selected: false, editable: false,
  },
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
