import { ref, type Ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { ThreeScene } from '@/hooks/useThreeScene'
import { modelConfig } from '@/config/modelConfig'
import { buildPlaceholderCar } from '@/utils/placeholderCar'
import { message } from '@/utils/feedback'
import type { CarPartItem, LoadStatus, MaterialPreset, SchemePartData } from '@/types'

const LOAD_TIMEOUT_MS = 30_000
const CLICK_DRIFT_PX = 6

export interface CarModelCallbacks {
  /** 选中集合变化；last 为本次最后选中的部件（SRS FR03-03 多选初始值） */
  onSelectionChange?: (meshNames: string[], last?: string) => void
  /** hover 部件变化（画布 → 面板定位，SRS FR03-06） */
  onHoverChange?: (meshName: string | null) => void
  /** 模型加载完成（含占位模型兜底） */
  onLoadDone?: (info: { fallback: boolean }) => void
}

export interface CarModel {
  status: Ref<LoadStatus>
  /** 0~1；-1 表示不确定进度（chunked 传输，SRS FR01-05） */
  progress: Ref<number>
  retry(): void
  dispose(): void
  setSelection(meshNames: string[], last?: string): void
  toggleSelection(meshName: string): void
  clearSelection(): void
  getSelected(): CarPartItem[]
  applyColor(partNames: string[], hex: string): boolean
  applyParams(partNames: string[], params: { metalness?: number; roughness?: number }): void
  applyMaterialPreset(partNames: string[], preset: MaterialPreset): void
  resetParts(partNames?: string[]): void
  snapshotData(): SchemePartData[]
  /** 应用方案数据，返回 {applied, skipped}（SRS FR05-02-6） */
  applyData(list: SchemePartData[]): { applied: number; skipped: number }
  applyOutline(enabled: boolean): void
  setHoverFromPanel(meshName: string | null): void
}

export function createCarModel(
  three: ThreeScene,
  parts: CarPartItem[],
  cb: CarModelCallbacks = {},
): CarModel {
  const status = ref<LoadStatus>('idle')
  const progress = ref(0)

  const partMeshes = new Map<string, THREE.Mesh[]>()
  const meshToPart = new Map<THREE.Object3D, string>()
  const originals = new Map<string, { color: string; metalness: number; roughness: number }>()
  let root: THREE.Object3D | null = null

  // ---- 后处理：选中态描边 + hover 高亮（SRS FR03-05/06/07）----
  const composer = new EffectComposer(three.renderer)
  composer.addPass(new RenderPass(three.scene, three.camera))
  const selectedOutline = new OutlinePass(
    new THREE.Vector2(1, 1),
    three.scene,
    three.camera,
  )
  selectedOutline.edgeStrength = 4
  selectedOutline.edgeGlow = 0.3
  selectedOutline.edgeThickness = 1.5
  selectedOutline.visibleEdgeColor.set('#2563eb')
  selectedOutline.hiddenEdgeColor.set('#1e3a8a')
  const hoverOutline = new OutlinePass(new THREE.Vector2(1, 1), three.scene, three.camera)
  hoverOutline.edgeStrength = 3
  hoverOutline.edgeGlow = 0.2
  hoverOutline.visibleEdgeColor.set('#f59e0b')
  hoverOutline.hiddenEdgeColor.set('#92400e')
  composer.addPass(selectedOutline)
  composer.addPass(hoverOutline)
  composer.addPass(new OutputPass())
  const syncComposerSize = (w: number, h: number) => {
    composer.setSize(w, h)
    selectedOutline.resolution.set(w, h)
    hoverOutline.resolution.set(w, h)
  }
  three.addResizeListener(syncComposerSize)
  syncComposerSize(
    Math.max(three.renderer.domElement.clientWidth, 1),
    Math.max(three.renderer.domElement.clientHeight, 1),
  )
  let outlineEnabled = false
  let hoverPartName: string | null = null

  // ---- 材质工具：克隆后统一操作（SRS §2.4-2 禁改共享材质）----
  function eachMat(mesh: THREE.Mesh, fn: (m: THREE.MeshStandardMaterial) => void) {
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    list.forEach((m) => fn(m as THREE.MeshStandardMaterial))
  }

  function cloneMaterials(mesh: THREE.Mesh) {
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => {
        const c = m.clone() as THREE.MeshStandardMaterial & { isMeshStandardMaterial?: boolean }
        if (!c.isMeshStandardMaterial) {
          return new THREE.MeshStandardMaterial({
            color: (c as THREE.MeshStandardMaterial).color?.clone() ?? new THREE.Color('#999'),
            metalness: 0.5,
            roughness: 0.5,
          })
        }
        return c
      })
    } else {
      const m = mesh.material as THREE.MeshStandardMaterial & { isMeshStandardMaterial?: boolean }
      mesh.material = m.isMeshStandardMaterial
        ? m.clone()
        : new THREE.MeshStandardMaterial({ color: m.color?.clone() ?? new THREE.Color('#999') })
    }
  }

  // ---- 加载（SRS FR02-01 / FR01-05）----
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function cancelTimeout(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function load(): void {
    status.value = 'loading'
    progress.value = 0
    timeoutId = setTimeout(() => {
      status.value = 'timeout'
    }, LOAD_TIMEOUT_MS)

    new GLTFLoader().load(
      modelConfig.url,
      (gltf) => {
        cancelTimeout()
        setupModel(gltf.scene, false)
      },
      (ev) => {
        // total 为 0 时展示不确定进度（SRS FR01-05）
        progress.value = ev.total > 0 ? Math.min(ev.loaded / ev.total, 1) : -1
      },
      () => {
        cancelTimeout()
        if (modelConfig.allowFallback) {
          message.warning('未找到模型资源，已加载占位预览模型（开发联调）')
          setupModel(buildPlaceholderCar(), true)
        } else {
          status.value = 'error'
        }
      },
    )
  }

  function retry(): void {
    disposeModelRoot()
    load()
  }

  function disposeModelRoot(): void {
    if (!root) return
    three.scene.remove(root)
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry?.dispose()
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((m: THREE.Material | undefined) => m?.dispose())
      }
    })
    root = null
    partMeshes.clear()
    meshToPart.clear()
    originals.clear()
    parts.forEach((p) => (p.selected = false))
    selectedOutline.selectedObjects = []
    hoverOutline.selectedObjects = []
  }

  function setupModel(object: THREE.Object3D, fallback: boolean): void {
    root = object
    root.rotation.y = modelConfig.orientation

    // 贴地：模型整体下移至最低点为 0
    const preBox = new THREE.Box3().setFromObject(root)
    root.position.y -= preBox.min.y

    // 部件匹配 + 材质克隆（SRS FR02-02）
    const unmatched: string[] = []
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
      const cfg = parts.find((p) => {
        if (p.meshName === mesh.name) return true
        if (p.matchPattern) {
          const pats = Array.isArray(p.matchPattern) ? p.matchPattern : [p.matchPattern]
          return pats.some((pt) => pt.test(mesh.name))
        }
        return false
      })
      if (cfg) {
        cloneMaterials(mesh)
        if (!partMeshes.has(cfg.meshName)) partMeshes.set(cfg.meshName, [])
        partMeshes.get(cfg.meshName)!.push(mesh)
        meshToPart.set(mesh, cfg.meshName)
      } else {
        unmatched.push(mesh.name)
      }
    })

    // 原始材质回填为默认值（SRS FR02-03）
    for (const p of parts) {
      const meshes = partMeshes.get(p.meshName)
      if (!meshes?.length) continue
      const mat = (Array.isArray(meshes[0].material)
        ? meshes[0].material[0]
        : meshes[0].material) as THREE.MeshStandardMaterial
      const c = mat.color.getHexString()
      p.color = `#${c}`
      p.metalness = mat.metalness
      p.roughness = mat.roughness
      originals.set(p.meshName, { color: p.color, metalness: p.metalness, roughness: p.roughness })
    }

    three.scene.add(root)
    three.fitFromBox(new THREE.Box3().setFromObject(root), modelConfig.camera)

    if (import.meta.env.DEV && unmatched.length) {
      console.warn('[useCarModel] 未匹配的 mesh：', unmatched.join(', '))
    }

    status.value = 'success'
    // 初始化后默认选中车身（SRS FR02-03）
    setSelection(['body'])
    cb.onLoadDone?.({ fallback })
  }

  // ---- 选中与反馈（SRS FR03-06/07）----
  function getPartMeshes(meshName: string): THREE.Mesh[] {
    return partMeshes.get(meshName) ?? []
  }

  function setEmissiveFallback(meshNames: string[]): void {
    for (const p of parts) {
      const on = meshNames.includes(p.meshName)
      for (const mesh of getPartMeshes(p.meshName)) {
        eachMat(mesh, (m) => {
          m.emissive.set(on ? '#1d4ed8' : '#000000')
          m.emissiveIntensity = on ? 0.35 : 1
        })
      }
    }
  }

  function refreshSelectionFeedback(): void {
    const selected = parts.filter((p) => p.selected).map((p) => p.meshName)
    if (outlineEnabled) {
      selectedOutline.selectedObjects = selected.flatMap((n) => getPartMeshes(n))
      setEmissiveFallback([])
    } else {
      selectedOutline.selectedObjects = []
      setEmissiveFallback(selected)
    }
    three.requestRender()
  }

  function setSelection(meshNames: string[], last?: string): void {
    parts.forEach((p) => (p.selected = meshNames.includes(p.meshName) && p.editable))
    refreshSelectionFeedback()
    const selected = parts.filter((p) => p.selected).map((p) => p.meshName)
    cb.onSelectionChange?.(selected, last ?? selected[selected.length - 1])
  }

  function toggleSelection(meshName: string): void {
    const cur = parts.filter((p) => p.selected).map((p) => p.meshName)
    setSelection(
      cur.includes(meshName) ? cur.filter((n) => n !== meshName) : [...cur, meshName],
    )
  }

  function clearSelection(): void {
    setSelection([])
  }

  function getSelected(): CarPartItem[] {
    return parts.filter((p) => p.selected)
  }

  function applyOutline(enabled: boolean): void {
    outlineEnabled = enabled
    three.setCustomRender(enabled ? () => composer.render() : null)
    refreshSelectionFeedback()
  }

  function setHoverFromPanel(meshName: string | null): void {
    hoverPartName = meshName
    hoverOutline.selectedObjects = meshName ? getPartMeshes(meshName) : []
    three.requestRender()
  }

  // ---- 画布点选与 hover（Raycaster，SRS FR03-05/06）----
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let downX = 0
  let downY = 0
  let rafHover = false

  function pickAt(cx: number, cy: number): string | null {
    const rect = three.canvas.getBoundingClientRect()
    ndc.x = ((cx - rect.left) / rect.width) * 2 - 1
    ndc.y = -((cy - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, three.camera)
    const targets = [...meshToPart.keys()]
    const hits = raycaster.intersectObjects(targets, false)
    if (!hits.length) return null
    return meshToPart.get(hits[0].object) ?? null
  }

  const onPointerDown = (e: PointerEvent) => {
    downX = e.clientX
    downY = e.clientY
  }

  const onPointerUp = (e: PointerEvent) => {
    if (status.value !== 'success') return
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_DRIFT_PX) return
    const name = pickAt(e.clientX, e.clientY)
    if (!name) {
      clearSelection()
      return
    }
    const part = parts.find((p) => p.meshName === name)
    if (part && !part.editable) {
      message.warning('该部件为固定件，不支持改色')
      return
    }
    if (e.shiftKey) toggleSelection(name)
    else setSelection([name], name)
  }

  const onPointerMove = (e: PointerEvent) => {
    if (status.value !== 'success' || rafHover) return
    rafHover = true
    requestAnimationFrame(() => {
      rafHover = false
      const name = pickAt(e.clientX, e.clientY)
      if (name !== hoverPartName) {
        hoverPartName = name
        hoverOutline.selectedObjects = name && outlineEnabled ? getPartMeshes(name) : []
        cb.onHoverChange?.(name)
        three.requestRender()
      }
    })
  }

  three.canvas.addEventListener('pointerdown', onPointerDown)
  three.canvas.addEventListener('pointerup', onPointerUp)
  three.canvas.addEventListener('pointermove', onPointerMove)

  // ---- 材质操作（事件驱动，SRS FR03/FR04）----
  function applyColor(partNames: string[], hex: string): boolean {
    const c = new THREE.Color()
    try {
      c.set(hex)
    } catch {
      return false
    }
    for (const name of partNames) {
      const part = parts.find((p) => p.meshName === name)
      if (!part) continue
      part.color = `#${c.getHexString()}`
      for (const mesh of getPartMeshes(name)) {
        eachMat(mesh, (m) => m.color.copy(c))
      }
    }
    three.requestRender()
    return true
  }

  function applyParams(
    partNames: string[],
    params: { metalness?: number; roughness?: number },
  ): void {
    for (const name of partNames) {
      const part = parts.find((p) => p.meshName === name)
      if (!part) continue
      if (params.metalness !== undefined) part.metalness = params.metalness
      if (params.roughness !== undefined) part.roughness = params.roughness
      for (const mesh of getPartMeshes(name)) {
        eachMat(mesh, (m) => {
          if (params.metalness !== undefined) m.metalness = params.metalness
          if (params.roughness !== undefined) m.roughness = params.roughness
        })
      }
    }
    three.requestRender()
  }

  function applyMaterialPreset(partNames: string[], preset: MaterialPreset): void {
    applyParams(partNames, { metalness: preset.metalness, roughness: preset.roughness })
  }

  function resetParts(partNames?: string[]): void {
    const targets = partNames ?? [...originals.keys()]
    for (const name of targets) {
      const orig = originals.get(name)
      if (!orig) continue
      applyColor([name], orig.color)
      applyParams([name], { metalness: orig.metalness, roughness: orig.roughness })
    }
  }

  // ---- 方案数据（SRS FR05：仅可编辑部件参与保存/导出）----
  function snapshotData(): SchemePartData[] {
    return parts
      .filter((p) => p.editable)
      .map((p) => ({
        meshName: p.meshName,
        color: p.color,
        metalness: p.metalness,
        roughness: p.roughness,
      }))
  }

  function applyData(list: SchemePartData[]): { applied: number; skipped: number } {
    let applied = 0
    let skipped = 0
    for (const item of list) {
      const part = parts.find((p) => p.meshName === item.meshName)
      if (!part) {
        skipped++
        continue
      }
      applyColor([item.meshName], item.color)
      applyParams([item.meshName], {
        metalness: item.metalness,
        roughness: item.roughness,
      })
      applied++
    }
    return { applied, skipped }
  }

  load()

  return {
    status,
    progress,
    retry,
    dispose() {
      cancelTimeout()
      three.canvas.removeEventListener('pointerdown', onPointerDown)
      three.canvas.removeEventListener('pointerup', onPointerUp)
      three.canvas.removeEventListener('pointermove', onPointerMove)
      three.setCustomRender(null)
      disposeModelRoot()
    },
    setSelection,
    toggleSelection,
    clearSelection,
    getSelected,
    applyColor,
    applyParams,
    applyMaterialPreset,
    resetParts,
    snapshotData,
    applyData,
    applyOutline,
    setHoverFromPanel,
  }
}
