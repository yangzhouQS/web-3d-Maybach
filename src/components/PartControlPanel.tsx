import { computed, defineComponent, nextTick, ref, watch } from 'vue'
import {
  NButton,
  NCheckbox,
  NCollapse,
  NCollapseItem,
  NColorPicker,
  NSlider,
  NSwitch,
} from 'naive-ui'
import { GROUP_LABEL } from '@/config/partConfig'
import { colorPresets, materialPresets, viewPresets } from '@/config/presets'
import ColorPresetGroup from '@/components/panel/ColorPresetGroup'
import ViewPresetButtons from '@/components/panel/ViewPresetButtons'
import type { CarPartItem, PartGroup, RenderOption } from '@/types'

const GROUPS: PartGroup[] = ['body', 'trim', 'wheel']

function SectionTitle({ text }: { text: string }) {
  return <div class="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-neutral-400">{text}</div>
}

export default defineComponent({
  name: 'PartControlPanel',
  props: {
    parts: { type: Array as () => CarPartItem[], required: true },
    disabled: { type: Boolean, default: false },
    hoverName: { type: String as () => string | null, default: null },
    lastSelected: { type: String as () => string | null, default: null },
    renderOption: { type: Object as () => RenderOption, required: true },
    onSelectPart: { type: Function, required: true },
    onSelectAllEditable: { type: Function, required: true },
    onClearSelection: { type: Function, required: true },
    onColor: { type: Function, required: true },
    onParams: { type: Function, required: true },
    onMaterialPreset: { type: Function, required: true },
    onColorPreset: { type: Function, required: true },
    onViewPreset: { type: Function, required: true },
    onRenderOption: { type: Function, required: true },
    onHoverPart: { type: Function, required: true },
  },
  setup(props) {
    const rowRefs = new Map<string, HTMLDivElement>()
    const expandedGroups = ref<string[]>(GROUPS.map(String))

    const selectedParts = computed(() => props.parts.filter((p) => p.selected))
    /** 多选编辑初始值：最后选中部件的当前值（SRS FR03-03） */
    const editTarget = computed<CarPartItem | null>(() => {
      const sel = selectedParts.value
      if (!sel.length) return null
      return props.parts.find((p) => p.meshName === props.lastSelected) ?? sel[sel.length - 1]
    })
    const multiCount = computed(() => selectedParts.value.length)

    // 画布 hover → 面板行滚动定位（SRS FR03-06）
    watch(
      () => props.hoverName,
      (name) => {
        if (!name) return
        nextTick(() => rowRefs.get(name)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
      },
    )

    const rowClass = (p: CarPartItem) => [
      'flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors',
      p.selected ? 'bg-blue-50' : 'hover:bg-neutral-50',
      props.hoverName === p.meshName ? 'ring-1 ring-amber-400' : '',
    ]

    return () => (
      <div
        class={{
          'pointer-events-none opacity-50': props.disabled,
          'p-3': true,
        }}
      >
        {/* 1. 部件分组折叠面板（SRS FR03-01） */}
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-neutral-700">部件列表</span>
          <div class="flex gap-1">
            <NButton size="tiny" quaternary type="primary" onClick={() => props.onSelectAllEditable()}>
              全选可编辑
            </NButton>
            <NButton size="tiny" quaternary onClick={() => props.onClearSelection()}>
              清空选中
            </NButton>
          </div>
        </div>
        <NCollapse v-model:expanded-names={expandedGroups.value} class="mt-1" display-directive="show">
          {GROUPS.map((g) => (
            <NCollapseItem title={GROUP_LABEL[g]} name={g}>
              {props.parts
                .filter((p) => p.group === g)
                .map((p) => (
                  <div
                    ref={(el) => {
                      if (el instanceof HTMLDivElement) rowRefs.set(p.meshName, el)
                    }}
                    class={rowClass(p)}
                    onClick={() => props.onSelectPart(p.meshName, false)}
                    onMouseenter={() => p.editable && props.onHoverPart(p.meshName)}
                    onMouseleave={() => props.onHoverPart(null)}
                  >
                    <span onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <NCheckbox
                        checked={p.selected}
                        disabled={!p.editable}
                        onUpdateChecked={(v: boolean) => {
                          if (v !== p.selected) props.onSelectPart(p.meshName, true)
                        }}
                      />
                    </span>
                    <span
                      class="h-4 w-4 shrink-0 rounded border border-neutral-300"
                      style={{ background: p.color }}
                    />
                    <span class={p.editable ? 'text-neutral-700' : 'text-neutral-400'}>{p.label}</span>
                    {!p.editable && <span class="ml-auto text-[10px] text-neutral-400">固定件</span>}
                  </div>
                ))}
            </NCollapseItem>
          ))}
        </NCollapse>

        {/* 2. 颜色拾取器（SRS FR03-03） */}
        <SectionTitle text="颜色" />
        {editTarget.value ? (
          <div class="flex items-center gap-3">
            <NColorPicker
              class="flex-1"
              size="small"
              modes={['hex']}
              show-alpha={false}
              value={editTarget.value.color}
              disabled={props.disabled}
              onUpdateValue={(v: string) => props.onColor(v)}
            />
            {multiCount.value > 1 && (
              <span class="text-xs text-amber-600">将应用到 {multiCount.value} 个部件</span>
            )}
          </div>
        ) : (
          <div class="text-xs text-neutral-400">请先选择部件（画布点击或列表勾选）</div>
        )}

        {/* 3. PBR 材质滑块 + 预设（SRS FR04） */}
        <SectionTitle text="车漆材质" />
        <div class="space-y-1">
          <div class="flex items-center gap-2 text-xs text-neutral-500">
            <span class="w-12">金属度</span>
            <NSlider
              class="flex-1"
              value={editTarget.value?.metalness ?? 0.5}
              min={0}
              max={1}
              step={0.01}
              disabled={!editTarget.value || props.disabled}
              onUpdateValue={(v: number) => props.onParams({ metalness: v })}
            />
            <span class="w-8 text-right tabular-nums">
              {(editTarget.value?.metalness ?? 0).toFixed(2)}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs text-neutral-500">
            <span class="w-12">粗糙度</span>
            <NSlider
              class="flex-1"
              value={editTarget.value?.roughness ?? 0.5}
              min={0}
              max={1}
              step={0.01}
              disabled={!editTarget.value || props.disabled}
              onUpdateValue={(v: number) => props.onParams({ roughness: v })}
            />
            <span class="w-8 text-right tabular-nums">
              {(editTarget.value?.roughness ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
        <div class="mt-2 flex gap-1">
          {materialPresets.map((m) => (
            <NButton size="tiny" secondary onClick={() => props.onMaterialPreset(m)}>
              {m.name}
            </NButton>
          ))}
        </div>

        {/* 4. 内置预设配色（SRS FR05-01） */}
        <SectionTitle text="经典配色" />
        <ColorPresetGroup presets={colorPresets} onApply={(p) => props.onColorPreset(p)} />

        {/* 5. 快捷视角（SRS FR06） */}
        <SectionTitle text="预设视角" />
        <ViewPresetButtons
          presets={viewPresets}
          disabled={props.disabled}
          onApply={(t, p) => props.onViewPreset(t, p)}
        />

        {/* 6. 渲染设置（SRS FR08 / FR01-04） */}
        <SectionTitle text="渲染设置" />
        <div class="space-y-2 pb-4">
          {(
            [
              ['autoRotate', '自动旋转'],
              ['showGrid', '地面网格'],
              ['showShadow', '阴影'],
              ['enableOutline', '轮廓高亮'],
              ['transparentBg', '透明背景'],
            ] as const
          ).map(([key, label]) => (
            <div class="flex items-center justify-between text-xs text-neutral-600">
              <span>{label}</span>
              <NSwitch
                size="small"
                value={props.renderOption[key] as boolean}
                onUpdateValue={(v: boolean) => props.onRenderOption({ [key]: v })}
              />
            </div>
          ))}
          <div class="flex items-center justify-between text-xs text-neutral-600">
            <span>背景色</span>
            <NColorPicker
              size="small"
              class="w-24"
              modes={['hex']}
              show-alpha={false}
              value={props.renderOption.bgColor}
              onUpdateValue={(v: string) => props.onRenderOption({ bgColor: v })}
            />
          </div>
        </div>
      </div>
    )
  },
})
