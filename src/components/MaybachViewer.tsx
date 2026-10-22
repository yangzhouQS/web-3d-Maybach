import {
  defineComponent,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { createThreeScene, detectWebGL } from '@/hooks/useThreeScene'
import type { ThreeScene } from '@/hooks/useThreeScene'

/**
 * 3D 画布容器组件：持有 Three 场景实例（非响应式），
 * 卸载时释放全部 three 资源（SRS 核心原则：场景与 Vue 解耦）
 */
export default defineComponent({
  name: 'MaybachViewer',
  props: {
    onReady: {
      type: Function,
      required: true as const,
    },
    onContextLost: {
      type: Function,
      default: null,
    },
  },
  setup(props, { expose }) {
    const hostRef = ref<HTMLDivElement>()
    let three: ThreeScene | null = null

    onMounted(() => {
      const host = hostRef.value
      if (!host) return
      if (!detectWebGL()) {
        props.onReady(null)
        return
      }
      try {
        three = createThreeScene(host)
        three.onContextLost(() => props.onContextLost?.())
        props.onReady(three)
      } catch {
        props.onReady(null)
      }
    })

    onBeforeUnmount(() => {
      three?.dispose()
      three = null
    })

    expose({
      getThree: () => three,
    })

    return () => <div ref={hostRef} class="absolute inset-0" />
  },
})
