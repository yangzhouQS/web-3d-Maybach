import type { CarPartItem } from '@/types'

/**
 * 部件匹配（SRS FR02-02）：
 * 默认 meshName 精确匹配；提供 matchPattern 时按正则匹配；
 * 同一配置命中的多个 Mesh 归并为一个逻辑部件
 */
export function matchPartConfig(
  meshName: string,
  configs: CarPartItem[],
): CarPartItem | undefined {
  for (const c of configs) {
    if (c.matchPattern) {
      const pats = Array.isArray(c.matchPattern) ? c.matchPattern : [c.matchPattern]
      if (c.meshName === meshName || pats.some((p) => p.test(meshName))) return c
    } else if (c.meshName === meshName) {
      return c
    }
  }
  return undefined
}
