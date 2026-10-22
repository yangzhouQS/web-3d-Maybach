import { defineComponent, type PropType } from 'vue'
import { NButton, NTooltip } from 'naive-ui'

/** 顶部通栏操作按钮组（SRS §6.1） */
export default defineComponent({
  name: 'TopToolbar',
  props: {
    disabled: { type: Boolean, default: false },
    canUndo: { type: Boolean, default: false },
    canRedo: { type: Boolean, default: false },
    autoRotate: { type: Boolean, default: false },
    onUndo: { type: Function, required: true },
    onRedo: { type: Function, required: true },
    onToggleAutoRotate: { type: Function, required: true },
    onResetAll: { type: Function, required: true },
    onScreenshot: { type: Function as PropType<(() => void) | null>, default: null },
    onOpenSchemes: { type: Function as PropType<(() => void) | null>, default: null },
  },
  setup(props) {
    return () => (
      <div class="flex items-center gap-1.5">
        <NTooltip>
          {{
            trigger: () => (
              <NButton
                size="small"
                quaternary
                disabled={props.disabled || !props.canUndo}
                onClick={() => props.onUndo()}
              >
                撤销
              </NButton>
            ),
            default: () => 'Ctrl+Z',
          }}
        </NTooltip>
        <NTooltip>
          {{
            trigger: () => (
              <NButton
                size="small"
                quaternary
                disabled={props.disabled || !props.canRedo}
                onClick={() => props.onRedo()}
              >
                重做
              </NButton>
            ),
            default: () => 'Ctrl+Shift+Z',
          }}
        </NTooltip>
        <span class="mx-1 h-4 w-px bg-neutral-200" />
        <NButton
          size="small"
          quaternary
          type={props.autoRotate ? 'primary' : 'default'}
          disabled={props.disabled}
          onClick={() => props.onToggleAutoRotate()}
        >
          自动旋转
        </NButton>
        {props.onScreenshot && (
          <NButton size="small" quaternary disabled={props.disabled} onClick={() => props.onScreenshot?.()}>
            截图
          </NButton>
        )}
        {props.onOpenSchemes && (
          <NButton size="small" quaternary disabled={props.disabled} onClick={() => props.onOpenSchemes?.()}>
            配色方案
          </NButton>
        )}
        <NButton size="small" quaternary type="error" disabled={props.disabled} onClick={() => props.onResetAll()}>
          重置全部
        </NButton>
      </div>
    )
  },
})
