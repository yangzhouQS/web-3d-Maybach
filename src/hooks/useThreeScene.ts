import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Tween, Easing, Group } from '@tweenjs/tween.js'
import type { ModelConfig, RenderOption } from '@/types'

/** DPR clamp 上限（SRS §4.2） */
const MAX_PIXEL_RATIO = 2

export interface ThreeScene {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly renderer: THREE.WebGLRenderer
  readonly controls: OrbitControls
  readonly canvas: HTMLCanvasElement
  /** 相机动画组，由内部循环驱动 */
  readonly tweenGroup: Group
  requestRender(): void
  /** 立即同步渲染一帧（截图前调用，SRS FR07-01） */
  renderOnce(): void
  /** 临时覆写渲染尺寸与像素比（2x 高清截图用，结束后恢复，SRS FR07-02） */
  resizeTo(w: number, h: number, pixelRatio: number): void
  /** 替换渲染管线（如 EffectComposer），传 null 恢复直接渲染 */
  setCustomRender(fn: (() => void) | null): void
  /** 注册尺寸变化监听（composer 等需要同步尺寸） */
  addResizeListener(cb: (w: number, h: number) => void): void
  /** 按模型包围盒推导相机初始位与距离限制（SRS FR02-03） */
  fitFromBox(box: THREE.Box3, cam: ModelConfig['camera']): void
  /** 以当前 target 为中心，动画飞行到指定角度（度），可被打断（SRS FR06） */
  flyToAngles(thetaDeg: number, phiDeg: number, durationMs?: number): void
  applyRenderOptions(opt: RenderOption): void
  onContextLost(cb: () => void): void
  getStats(): { fps: number; drawCalls: number }
  dispose(): void
}

/** WebGL 能力检测（SRS §7：不可用需给出错误提示而非白屏） */
export function detectWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'))
  } catch {
    return false
  }
}

export function createThreeScene(container: HTMLElement): ThreeScene {
  if (!detectWebGL()) {
    throw new Error('NO_WEBGL')
  }

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#f3f4f6')

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500)

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true, // 透明背景截图（SRS FR07-02）
    preserveDrawingBuffer: true, // 画布像素读取（SRS FR07-01）
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const canvas = renderer.domElement
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  container.appendChild(canvas)

  // ---- 控制器（SRS FR01-02）----
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.autoRotateSpeed = 1.2
  // 触摸适配：单指旋转、双指缩放平移（SRS FR01-02）
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }
  controls.maxPolarAngle = Math.PI / 2.02 // 不钻到地面以下
  controls.addEventListener('start', () => {
    // 用户交互时暂停自动旋转，结束恢复（SRS FR01-02）
    controls.autoRotate = false
  })
  let pendingAutoRotate = false
  controls.addEventListener('end', () => {
    controls.autoRotate = pendingAutoRotate
  })

  // ---- 光照体系（SRS FR01-03）----
  const ambient = new THREE.AmbientLight(0xffffff, 1.1)
  scene.add(ambient)

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.2)
  mainLight.position.set(6, 10, 6)
  mainLight.castShadow = true
  mainLight.shadow.mapSize.set(2048, 2048)
  mainLight.shadow.camera.near = 1
  mainLight.shadow.camera.far = 40
  mainLight.shadow.camera.left = -8
  mainLight.shadow.camera.right = 8
  mainLight.shadow.camera.top = 8
  mainLight.shadow.camera.bottom = -8
  mainLight.shadow.bias = -0.0004
  scene.add(mainLight)

  // 补光：弱化暗部死黑
  const fillLight = new THREE.DirectionalLight(0xdfe8ff, 0.7)
  fillLight.position.set(-7, 4, -6)
  scene.add(fillLight)

  // ---- 地面：阴影承接 + 网格辅助（SRS FR01-03 / FR01-04）----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ opacity: 0.28 }),
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const grid = new THREE.GridHelper(24, 48, 0x9aa0a8, 0xc5cad1)
  ;(grid.material as THREE.Material).transparent = true
  ;(grid.material as THREE.Material).opacity = 0.6
  grid.position.y = 0.002
  scene.add(grid)

  // ---- 尺寸自适应（SRS FR01-01）----
  let dirty = true
  const resizeCbs = new Set<(w: number, h: number) => void>()
  let customRender: (() => void) | null = null
  const resize = () => {
    const w = Math.max(container.clientWidth, 1)
    const h = Math.max(container.clientHeight, 1)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    resizeCbs.forEach((cb) => cb(w, h))
    dirty = true
  }
  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  // ---- 混合渲染循环（SRS §2.4-5）----
  // 阻尼/自转期间 controls.update() 返回 true；动画期间标志位为真；静止后仅在 dirty 时渲染
  let cameraAnimating = false
  let disposed = false
  const tweenGroup = new Group()
  let frames = 0
  let fpsTime = performance.now()
  let fps = 0

  const tick = () => {
    if (disposed) return
    requestAnimationFrame(tick)
    const changed = controls.update()
    tweenGroup.update()
    if (changed || dirty || cameraAnimating) {
      if (customRender) customRender()
      else renderer.render(scene, camera)
      dirty = false
      frames++
    }
    const now = performance.now()
    if (now - fpsTime >= 1000) {
      fps = Math.round((frames * 1000) / (now - fpsTime))
      frames = 0
      fpsTime = now
    }
  }
  requestAnimationFrame(tick)

  // ---- WebGL 上下文丢失兜底（SRS §2.4-8）----
  let contextLostCb: (() => void) | null = null
  canvas.addEventListener(
    'webglcontextlost',
    (e) => {
      e.preventDefault()
      disposed = true // 停止渲染循环
      contextLostCb?.()
    },
    false,
  )

  // ---- 相机动画（SRS FR06）----
  let activeTween: Tween<{ theta: number; phi: number }> | null = null

  function flyToAngles(thetaDeg: number, phiDeg: number, durationMs = 900): void {
    activeTween?.stop()
    const r = camera.position.distanceTo(controls.target)
    const offset = new THREE.Vector3().subVectors(camera.position, controls.target)
    const spherical = new THREE.Spherical().setFromVector3(offset)
    // theta 最短路径归一
    const deltaTheta = ((((thetaDeg * Math.PI) / 180 - spherical.theta) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI
    const proxy = {
      theta: spherical.theta,
      phi: spherical.phi,
    }
    const targetTheta = proxy.theta + deltaTheta
    const targetPhi = Math.max(Math.min((phiDeg * Math.PI) / 180, Math.PI / 2.02), 0.06)
    controls.enabled = false
    cameraAnimating = true
    activeTween = new Tween(proxy, tweenGroup)
      .to({ theta: targetTheta, phi: targetPhi }, durationMs)
      .easing(Easing.Cubic.Out)
      .onUpdate(() => {
        const v = new THREE.Vector3().setFromSphericalCoords(r, proxy.phi, proxy.theta)
        camera.position.copy(controls.target.clone().add(v))
        camera.lookAt(controls.target)
      })
      .onComplete(() => {
        controls.enabled = true
        cameraAnimating = false
        dirty = true
      })
      .onStop(() => {
        controls.enabled = true
        cameraAnimating = false
        dirty = true
      })
      .start()
  }

  return {
    scene,
    camera,
    renderer,
    controls,
    canvas,
    tweenGroup,
    requestRender: () => {
      dirty = true
    },
    renderOnce() {
      if (customRender) customRender()
      else renderer.render(scene, camera)
    },
    resizeTo(w, h, pr) {
      renderer.setPixelRatio(pr)
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      resizeCbs.forEach((cb) => cb(w, h))
      dirty = true
    },
    setCustomRender(fn) {
      customRender = fn
      dirty = true
    },
    addResizeListener(cb) {
      resizeCbs.add(cb)
    },
    fitFromBox(box, cam) {
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const diag = Math.max(size.length(), 0.001)
      const dist = diag * cam.distanceRatio
      controls.target.copy(center)
      controls.minDistance = diag * cam.minDistanceRatio
      controls.maxDistance = diag * cam.maxDistanceRatio
      const v = new THREE.Vector3().setFromSphericalCoords(
        dist,
        (cam.initPhi * Math.PI) / 180,
        (cam.initTheta * Math.PI) / 180,
      )
      camera.position.copy(center.clone().add(v))
      camera.near = diag / 100
      camera.far = diag * 20
      camera.updateProjectionMatrix()
      camera.lookAt(center)
      // 阴影相机随模型尺寸缩放
      const s = diag * 0.6
      mainLight.shadow.camera.left = -s
      mainLight.shadow.camera.right = s
      mainLight.shadow.camera.top = s
      mainLight.shadow.camera.bottom = -s
      mainLight.shadow.camera.updateProjectionMatrix()
      mainLight.position.set(center.x + diag * 0.5, center.y + diag * 0.9, center.z + diag * 0.5)
      dirty = true
    },
    flyToAngles,
    applyRenderOptions(opt: RenderOption) {
      pendingAutoRotate = opt.autoRotate
      controls.autoRotate = opt.autoRotate
      grid.visible = opt.showGrid
      if (renderer.shadowMap.enabled !== opt.showShadow) {
        renderer.shadowMap.enabled = opt.showShadow
        // 阴影开关需要刷新材质（three 要求）
        scene.traverse((o) => {
          const mesh = o as THREE.Mesh
          if (mesh.isMesh && mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            mats.forEach((m) => (m.needsUpdate = true))
          }
        })
      }
      if (opt.transparentBg) {
        scene.background = null
        renderer.setClearAlpha(0)
      } else {
        scene.background = new THREE.Color(opt.bgColor)
        renderer.setClearAlpha(1)
      }
      dirty = true
    },
    onContextLost(cb) {
      contextLostCb = cb
    },
    getStats() {
      return { fps, drawCalls: renderer.info.render.calls }
    },
    dispose() {
      disposed = true
      ro.disconnect()
      activeTween?.stop()
      tweenGroup.removeAll()
      controls.dispose()
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry?.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          mats.forEach((m: THREE.Material) => m?.dispose())
        }
      })
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
