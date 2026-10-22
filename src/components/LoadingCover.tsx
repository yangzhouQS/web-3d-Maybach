import { defineComponent } from 'vue'
import { NButton, NProgress } from 'naive-ui'
import type { LoadStatus } from '@/types'

/** 加载遮罩：进度 / 失败重试 / 超时重试（SRS FR01-05） */
export default defineComponent({
  name: 'LoadingCover',
  props: {
    status: { type: String as () => LoadStatus, required: true },
    progress: { type: Number, default: 0 },
    onRetry: { type: Function, required: true as const },
  },
  setup(props) {
    return () => {
      if (props.status !== 'loading' && props.status !== 'error' && props.status !== 'timeout') {
        return null
      }
      const isError = props.status === 'error'
      const isTimeout = props.status === 'timeout'
      return (
        <div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
          {props.status === 'loading' && (
            <>
              <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
              <div class="text-sm text-neutral-600">模型加载中…</div>
              <div class="w-56">
                {props.progress >= 0 ? (
                  <NProgress
                    type="line"
                    percentage={Math.round(props.progress * 100)}
                    showIndicator
                  />
                ) : (
                  // total 未知时的不确定进度（SRS FR01-05）
                  <NProgress type="line" percentage={80} indicator-placement="inside" processing />
                )}
              </div>
            </>
          )}
          {(isError || isTimeout) && (
            <>
              <div class="text-base font-medium text-neutral-700">
                {isTimeout ? '加载时间过长，请检查网络后重试' : '模型加载失败，请检查模型资源地址'}
              </div>
              <NButton type="primary" size="small" onClick={() => props.onRetry()}>
                重新加载
              </NButton>
            </>
          )}
        </div>
      )
    }
  },
})
