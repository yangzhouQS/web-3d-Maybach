import type { ColorPreset, MaterialPreset } from '@/types'

/** 材质快捷预设（SRS FR04） */
export const materialPresets: MaterialPreset[] = [
  { name: '亮光车漆', metalness: 0.9, roughness: 0.1 },
  { name: '哑光车漆', metalness: 0.2, roughness: 0.8 },
  { name: '金属拉丝', metalness: 0.95, roughness: 0.3 },
]

/** 内置迈巴赫经典配色预设（SRS FR05-01），作用于当前选中部件 */
export const colorPresets: ColorPreset[] = [
  {
    name: '双拼双色',
    colors: { body: '#0d0d10', roof: '#e8e4d8' },
    material: { metalness: 0.9, roughness: 0.12 },
  },
  {
    name: '哑光黑',
    colors: { body: '#141416', roof: '#141416' },
    material: { metalness: 0.2, roughness: 0.8 },
  },
  {
    name: '香槟金',
    colors: { body: '#b99a5b', roof: '#b99a5b' },
    material: { metalness: 0.9, roughness: 0.15 },
  },
  {
    name: '银灰',
    colors: { body: '#c6c9cd', roof: '#c6c9cd' },
    material: { metalness: 0.85, roughness: 0.2 },
  },
]

/** 预设视角定义（角度制，运行时按包围盒换算坐标，SRS FR06） */
export const viewPresets = [
  { key: 'front', label: '正面', theta: 0, phi: 85 },
  { key: 'front45', label: '45°前侧', theta: 45, phi: 70 },
  { key: 'side', label: '侧面', theta: 90, phi: 88 },
  { key: 'rear', label: '车尾', theta: 180, phi: 85 },
  { key: 'top', label: '俯视', theta: 45, phi: 10 },
  { key: 'default', label: '默认视角', theta: 45, phi: 58 },
] as const
