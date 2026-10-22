import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'App',
  setup() {
    const canvasMounted = ref(false)
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
            {canvasMounted.value ? null : (
              <div class="absolute inset-0 flex items-center justify-center text-sm text-neutral-400">
                3D 画布（阶段 2 接入）
              </div>
            )}
          </main>
        </div>
      </div>
    )
  },
})
