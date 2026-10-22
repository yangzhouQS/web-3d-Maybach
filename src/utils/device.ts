/** 移动端降级判定（SRS §2.4-6：pointer coarse 或 UA 命中即按移动渲染档） */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
}

export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent)
}

export function isMobileDevice(): boolean {
  return isCoarsePointer() || isMobileUA()
}
