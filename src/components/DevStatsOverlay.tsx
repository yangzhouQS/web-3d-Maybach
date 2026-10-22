import { defineComponent, onBeforeUnmount, onMounted, ref, type PropType } from 'vue'

/** FPS / DrawCall 统计浮层（仅开发环境，SRS FR08-2） */
export default defineComponent({
  name: 'DevStatsOverlay',
  props: {
    getStats: {
      type: Function as PropType<() => { fps: number; drawCalls: number }>,
      required: true,
    },
  },
  setup(props) {
    if (!import.meta.env.DEV) return () => null
    const fps = ref(0)
    const drawCalls = ref(0)
    let timer: ReturnType<typeof setInterval> | null = null
    onMounted(() => {
      timer = setInterval(() => {
        const s = props.getStats()
        fps.value = s.fps
        drawCalls.value = s.drawCalls
      }, 500)
    })
    onBeforeUnmount(() => {
      if (timer) clearInterval(timer)
    })
    return () => (
      <div class="pointer-events-none absolute left-2 top-2 z-20 rounded bg-black/55 px-2 py-1 font-mono text-[11px] leading-4 text-lime-300">
        FPS {fps.value} · DrawCall {drawCalls.value}
      </div>
    )
  },
})
