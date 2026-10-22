import { defineComponent, ref } from 'vue'
import MaybachViewer from '@/components/MaybachViewer'
import type { ThreeScene } from '@/hooks/useThreeScene'
import type { RenderOption } from '@/types'
import { isMobileDevice } from '@/utils/device'

const isMobile = isMobileDevice()

export default defineComponent({
  name: 'App',
  setup() {
    const renderOption = ref<RenderOption>({
      autoRotate: false,
      showGrid: true,
      // 移动端自动降级：默认关闭阴影与后处理轮廓（SRS §2.4-6）
      showShadow: !isMobile,
      bgColor: '#f3f4f6',
      transparentBg: false,
      enableOutline: !isMobile,
    })
    const webglOk = ref(true)
    const viewerKey = ref(0)

    const handleReady = (three: ThreeScene | null) => {
      if (!three) {
        webglOk.value = false
        return
      }
      three.applyRenderOptions(renderOption.value)
    }

    return () => (
      <div class="flex h-full w-full flex-col bg-neutral-100">
        {/* 顶部通栏导航 */}
        <header class="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-4">
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold tracking-wide text-neutral-800">
              Maybach 3D 部件换色预览
            </span>
            <span class="hidden rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-700 sm:inline">
              线上可视化定制
            </span>
          </div>
          <div class="flex items-center gap-2">{/* 工具按钮组：阶段4/6 接入 */}</div>
        </header>

        {/* 主体：大屏左右布局 / 小屏上下布局 */}
        <div class="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
          {/* 左侧控制面板（大屏固定 320px 可滚动） */}
          <aside class="thin-scroll h-[46%] shrink-0 overflow-y-auto border-t border-neutral-200 bg-white lg:h-auto lg:w-80 lg:border-t-0 lg:border-r">
            <div class="p-3 text-sm text-neutral-500">控制面板（阶段 4 接入）</div>
          </aside>

          {/* 右侧 3D 画布区域 */}
          <main class="canvas-area relative min-h-0 flex-1 bg-neutral-50">
            {webglOk.value ? (
              <MaybachViewer
                key={viewerKey.value}
                onReady={handleReady}
                onContextLost={() => {
                  // 上下文丢失：整体重建画布并重放配色状态（SRS §2.4-8）
                  viewerKey.value++
                }}
              />
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
