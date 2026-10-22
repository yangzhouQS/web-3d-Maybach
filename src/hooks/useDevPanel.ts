import type { Ref } from 'vue'
import type { ThreeScene } from '@/hooks/useThreeScene'
import type { RenderOption } from '@/types'

/**
 * lil-gui 调试面板（仅开发环境，动态导入不进生产包，SRS §4.5-4）
 * 直接修改响应式 renderOption，经 watch 同步到渲染层
 */
let destroyPrev: (() => void) | null = null

/**
 * 标题栏拖拽移动 lil-gui 面板：
 * - pointer capture 跟随，边界钳制不出视口
 * - 拖拽超过阈值时吞掉 click，避免误触发 lil-gui 自带的折叠
 */
function makeDraggable(gui: { domElement: HTMLElement }): void {
  const el = gui.domElement
  const title = el.querySelector<HTMLElement>('.title')
  if (!title) return

  el.style.position = 'fixed'
  el.style.top = '60px'
  el.style.right = 'auto'
  el.style.left = 'auto'
  el.style.zIndex = '1001'
  title.style.cursor = 'move'
  title.style.touchAction = 'none'
  el.title = '按住标题栏拖动可移动面板'

  let dragging = false
  let justDragged = false
  let sx = 0
  let sy = 0
  let ox = 0
  let oy = 0

  const onDown = (e: PointerEvent) => {
    dragging = true
    justDragged = false
    sx = e.clientX
    sy = e.clientY
    const rect = el.getBoundingClientRect()
    ox = rect.left
    oy = rect.top
    title.setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  const onMove = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.hypot(dx, dy) > 4) justDragged = true
    const x = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, ox + dx))
    const y = Math.max(0, Math.min(window.innerHeight - 40, oy + dy))
    el.style.left = `${x}px`
    el.style.top = `${y}px`
  }
  const onUp = () => {
    dragging = false
  }
  const onClickCapture = (e: MouseEvent) => {
    if (justDragged) {
      e.preventDefault()
      e.stopImmediatePropagation()
      justDragged = false
    }
  }

  title.addEventListener('pointerdown', onDown)
  title.addEventListener('pointermove', onMove)
  title.addEventListener('pointerup', onUp)
  title.addEventListener('pointercancel', onUp)
  title.addEventListener('click', onClickCapture, true)
}

export function setupDevPanel(three: ThreeScene, renderOption: Ref<RenderOption>): void {
  if (!import.meta.env.DEV) return
  destroyPrev?.()
  destroyPrev = null

  void import('lil-gui').then(({ GUI }) => {
    const gui = new GUI({ title: 'Dev Panel（可拖拽）', width: 200 })
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
    makeDraggable(gui)
    destroyPrev = () => gui.destroy()
  })
}
