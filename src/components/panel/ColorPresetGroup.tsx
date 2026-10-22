import { defineComponent, type PropType } from 'vue'
import type { ColorPreset } from '@/types'

/** 内置经典配色预设组（SRS FR05-01） */
export default defineComponent({
  name: 'ColorPresetGroup',
  props: {
    presets: { type: Array as () => ColorPreset[], required: true },
    onApply: {
      type: Function as PropType<(preset: ColorPreset) => void>,
      required: true,
    },
  },
  setup(props) {
    return () => (
      <div class="grid grid-cols-2 gap-1">
        {props.presets.map((c) => (
          <button
            key={c.name}
            class="flex items-center gap-1.5 rounded border border-neutral-200 px-2 py-1.5 text-xs text-neutral-600 transition hover:border-brand-500 hover:text-brand-700"
            onClick={() => props.onApply(c)}
          >
            <span class="flex">
              {[...new Set(Object.values(c.colors))].map((hex) => (
                <span
                  key={hex}
                  class="h-3.5 w-3.5 rounded-full border border-white shadow"
                  style={{ background: hex, marginLeft: '-4px' }}
                />
              ))}
            </span>
            {c.name}
          </button>
        ))}
      </div>
    )
  },
})
