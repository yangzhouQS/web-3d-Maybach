import {
  computed,
  defineComponent,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import MaybachViewer from '@/components/MaybachViewer'
import LoadingCover from '@/components/LoadingCover'
import PartControlPanel from '@/components/PartControlPanel'
import TopToolbar from '@/components/TopToolbar'
import type { ThreeScene } from '@/hooks/useThreeScene'
import type { CarModel } from '@/hooks/useCarModel'
import { createCarModel } from '@/hooks/useCarModel'
import { useUndoRedo } from '@/hooks/useUndo'
import { createInitialParts } from '@/config/partConfig'
import { dialog, message } from '@/utils/feedback'
import { isMobileDevice } from '@/utils/device'
import type {
  ColorPreset,
  MaterialPreset,
  RenderOption,
  SchemePartData,
} from '@/types'

const isMobile = isMobileDevice()

export default defineComponent({
  name: 'App',
  setup() {
    // 部件状态：纯数据对象，可安全响应式（Three 对象均不进入响应式，SRS §2.4-7）
    const parts = reactive(createInitialParts())

    const renderOption = ref<RenderOption>({
      autoRotate: false,
      showGrid: true,
      showShadow: !isMobile,
      bgColor: '#f3f4f6',
      transparentBg: false,
      enableOutline: !isMobile,
    })

    const webglOk = ref(true)
    const viewerKey = ref(0)
    const loadStatus = ref<'idle' | 'loading' | 'success' | 'error' | 'timeout'>('idle')
    const loadProgress = ref(0)
    const canvasHover = ref<string | null>(null)
    const lastSelected = ref<string | null>(null)

    const modelReady = computed(() => loadStatus.value === 'success')

    // 非响应式：three / model 实例
    let threeApi: ThreeScene | null = null
    let model: CarModel | null = null
    let replaySnapshot: SchemePartData[] | null = null

    // ---- 撤销 / 重做（SRS FR03-08）----
    const undo = useUndoRedo<SchemePartData[]>()

    const pushUndo = (mergeKey = '') => {
      if (model) undo.push(model.snapshotData(), mergeKey)
    }

    const doUndo = () => {
      const s = undo.undo()
      if (s && model) model.applyData(s)
    }
    const doRedo = () => {
      const s = undo.redo()
      if (s && model) model.applyData(s)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      if (e.shiftKey) doRedo()
      else doUndo()
    }
    onMounted(() => window.addEventListener('keydown', onKeyDown))
    onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))

    // ---- 面板动作（统一入口：校验选中 → 应用 → 撤销入栈 → 提示）----
    const selectedNames = () => parts.filter((p) => p.selected && p.editable).map((p) => p.meshName)

    const guardSelection = (): boolean => {
      if (!selectedNames().length) {
        message.warning('请先选择部件')
        return false
      }
      return true
    }

    const handleColor = (hex: string) => {
      const sel = selectedNames()
      if (!sel.length) return
      model?.applyColor(sel, hex)
      pushUndo(`color:${sel.join(',')}`)
    }

    const handleParams = (params: { metalness?: number; roughness?: number }) => {
      const sel = selectedNames()
      if (!sel.length) return
      model?.applyParams(sel, params)
      const key = Object.keys(params).join('+')
      pushUndo(`params:${sel.join(',')}:${key}`)
    }

    const handleMaterialPreset = (preset: MaterialPreset) => {
      if (!guardSelection()) return
      model?.applyMaterialPreset(selectedNames(), preset)
      pushUndo(`matPreset:${preset.name}`)
      message.success(`已应用材质预设：${preset.name}`)
    }

    const handleColorPreset = (preset: ColorPreset) => {
      if (!model) return
      const names = Object.keys(preset.colors)
      for (const n of names) model.applyColor([n], preset.colors[n])
      if (preset.material) {
        const targets = selectedNames().length ? selectedNames() : names
        model.applyParams(targets, preset.material)
      }
      pushUndo(`colorPreset:${preset.name}`)
      message.success(`已应用配色：${preset.name}`)
    }

    const handleResetAll = () => {
      dialog.warning({
        title: '重置全部',
        content: '所有部件将恢复模型初始配色，确定继续吗？',
        positiveText: '重置',
        negativeText: '取消',
        onPositiveClick: () => {
          model?.resetParts()
          pushUndo('resetAll')
          message.success('已恢复初始配色')
        },
      })
    }

    const handleSelectPart = (meshName: string, additive: boolean) => {
      if (additive) model?.toggleSelection(meshName)
      else model?.setSelection([meshName], meshName)
      lastSelected.value = meshName
    }

    const handleSelectAllEditable = () => {
      model?.setSelection(parts.filter((p) => p.editable).map((p) => p.meshName))
      lastSelected.value = null
    }

    const handleViewPreset = (theta: number, phi: number) => {
      threeApi?.flyToAngles(theta, phi)
    }

    const handleRenderOption = (patch: Partial<RenderOption>) => {
      Object.assign(renderOption.value, patch)
    }

    // ---- 画布就绪 / 重建 ----
    const handleReady = (three: ThreeScene | null) => {
      if (!three) {
        webglOk.value = false
        return
      }
      threeApi = three
      three.applyRenderOptions(renderOption.value)
      model = createCarModel(three, parts, {
        onSelectionChange: (_names, last) => {
          lastSelected.value = last ?? null
        },
        onHoverChange: (name) => {
          canvasHover.value = name
        },
        onLoadDone: () => {
          if (replaySnapshot) {
            // 上下文恢复后重放配色状态（SRS §2.4-8）
            model?.applyData(replaySnapshot)
            replaySnapshot = null
          }
          undo.reset(model!.snapshotData())
        },
      })
      model.applyOutline(renderOption.value.enableOutline)
      watch(model.status, (s) => (loadStatus.value = s))
      watch(model.progress, (p) => (loadProgress.value = p))
      loadStatus.value = model.status.value
      loadProgress.value = model.progress.value
    }

    watch(
      renderOption,
      (opt) => {
        threeApi?.applyRenderOptions(opt)
        model?.applyOutline(opt.enableOutline)
      },
      { deep: true },
    )

    return () => (
      <div class="flex h-full w-full flex-col bg-neutral-100">
        <header class="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold tracking-wide text-neutral-800">
              Maybach 3D 部件换色预览
            </span>
            <span class="hidden rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 sm:inline">
              线上可视化定制
            </span>
          </div>
          <TopToolbar
            disabled={!modelReady.value}
            canUndo={undo.canUndo.value}
            canRedo={undo.canRedo.value}
            autoRotate={renderOption.value.autoRotate}
            onUndo={doUndo}
            onRedo={doRedo}
            onToggleAutoRotate={() =>
              handleRenderOption({ autoRotate: !renderOption.value.autoRotate })
            }
            onResetAll={handleResetAll}
            onScreenshot={null}
            onOpenSchemes={null}
          />
        </header>

        <div class="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
          <aside class="thin-scroll h-[46%] shrink-0 overflow-y-auto border-t border-neutral-200 bg-white lg:h-auto lg:w-80 lg:border-t-0 lg:border-r">
            <PartControlPanel
              parts={parts}
              disabled={!modelReady.value}
              hoverName={canvasHover.value}
              lastSelected={lastSelected.value}
              renderOption={renderOption.value}
              onSelectPart={handleSelectPart}
              onSelectAllEditable={handleSelectAllEditable}
              onClearSelection={() => model?.clearSelection()}
              onColor={handleColor}
              onParams={handleParams}
              onMaterialPreset={handleMaterialPreset}
              onColorPreset={handleColorPreset}
              onViewPreset={handleViewPreset}
              onRenderOption={handleRenderOption}
              onHoverPart={(n: string | null) => model?.setHoverFromPanel(n)}
            />
          </aside>

          <main class="canvas-area relative min-h-0 flex-1 bg-neutral-50">
            {webglOk.value ? (
              <>
                <MaybachViewer
                  key={viewerKey.value}
                  onReady={handleReady}
                  onContextLost={() => {
                    replaySnapshot = model?.snapshotData() ?? null
                    model?.dispose()
                    model = null
                    threeApi = null
                    loadStatus.value = 'loading'
                    viewerKey.value++
                  }}
                />
                <LoadingCover
                  status={loadStatus.value}
                  progress={loadProgress.value}
                  onRetry={() => model?.retry()}
                />
              </>
            ) : (
              <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-neutral-500">
                <div class="text-base text-neutral-700">当前浏览器不支持 WebGL</div>
                <div>请使用 Chrome / Edge ≥110 或 Safari ≥16 访问</div>
              </div>
            )}
          </main>
        </div>
      </div>
    )
  },
})
