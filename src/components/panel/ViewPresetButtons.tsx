import { defineComponent, type PropType } from 'vue'
import { NButton } from 'naive-ui'

export interface ViewPresetOption {
  key: string
  label: string
  theta: number
  phi: number
}

/** 预设视角按钮组（SRS FR06，动画切换、可打断） */
export default defineComponent({
  name: 'ViewPresetButtons',
  props: {
    presets: { type: Array as () => readonly ViewPresetOption[], required: true },
    disabled: { type: Boolean, default: false },
    onApply: {
      type: Function as PropType<(thetaDeg: number, phiDeg: number) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="grid grid-cols-3 gap-1">
        {props.presets.map((v) => (
          <NButton
            key={v.key}
            size="tiny"
            secondary
            disabled={props.disabled}
            onClick={() => props.onApply(v.theta, v.phi)}
          >
            {v.label}
          </NButton>
        ))}
      </div>
    )
  },
})
