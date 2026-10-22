import type { ModelConfig } from '@/types'

/**
 * 模型级配置（SRS §5 ModelConfig）
 * 相机距离 = 包围盒对角线 × distanceRatio，随模型尺寸自动缩放
 */
export const modelConfig: ModelConfig = {
  url: './models/maybach.glb',
  // 交付模型长轴为 X、车头朝 -X（scripts/inspect-model.mjs 核定）；
  // 旋转 π/2 使车头朝 +Z，与预设视角（正面=+Z）对齐
  orientation: Math.PI / 2,
  allowFallback: true,
  camera: {
    initPhi: Math.PI / 3.1,
    initTheta: Math.PI / 4,
    distanceRatio: 1.1,
    minDistanceRatio: 0.45,
    maxDistanceRatio: 2.6,
  },
}
