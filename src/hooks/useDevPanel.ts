import type { Ref } from 'vue'
import type { ThreeScene } from '@/hooks/useThreeScene'
import type { RenderOption } from '@/types'

/**
 * lil-gui 调试面板（仅开发环境，动态导入不进生产包，SRS §4.5-4）
 * 直接修改响应式 renderOption，经 watch 同步到渲染层
 */
let destroyPrev: (() => void) | null = null

export function setupDevPanel(three: ThreeScene, renderOption: Ref<RenderOption>): void {
  if (!import.meta.env.DEV) return
  destroyPrev?.()
  destroyPrev = null

  void import('lil-gui').then(({ GUI }) => {
    const gui = new GUI({ title: 'Dev Panel', width: 200 })
    const ro = renderOption.value
    gui.add(ro, 'autoRotate').name('自动旋转')
    gui.addColor(ro, 'bgColor').name('背景色')
    gui.add(ro, 'showGrid').name('地面网格')
    gui.add(ro, 'showShadow').name('阴影')
    gui.add(ro, 'enableOutline').name('轮廓高亮')
    gui.add(ro, 'transparentBg').name('透明背景')
    const cam = gui.addFolder('相机')
    cam
      .add(
        {
          front45: () => three.flyToAngles(45, 70),
        },
        'front45',
      )
      .name('45° 前侧')
    cam
      .add(
        {
          top: () => three.flyToAngles(45, 10),
        },
        'top',
      )
      .name('俯视')
    cam
      .add(
        {
          defaultView: () => three.flyToAngles(45, 58),
        },
        'defaultView',
      )
      .name('默认视角')
    destroyPrev = () => gui.destroy()
  })
}
