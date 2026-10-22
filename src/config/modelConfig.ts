import type { ModelConfig } from '@/types'

/**
 * 模型级配置（SRS §5 ModelConfig）
 * 相机距离 = 包围盒对角线 × distanceRatio，随模型尺寸自动缩放
 */
export const modelConfig: ModelConfig = {
  url: './models/maybach.glb',
  orientation: 0,
  allowFallback: true,
  camera: {
    initPhi: Math.PI / 3.1,
    initTheta: Math.PI / 4,
    distanceRatio: 1.1,
    minDistanceRatio: 0.45,
    maxDistanceRatio: 2.6,
  },
}
