import { computed, defineComponent, ref, type PropType } from 'vue'
import { NButton, NInput, NModal, NPopconfirm } from 'naive-ui'
import type { ColorSchemeStore } from '@/hooks/useColorScheme'
import { message } from '@/utils/feedback'
import type { SchemePartData } from '@/types'

function fmtTime(t: number): string {
  const d = new Date(t)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 配色方案管理弹窗（SRS FR05-02） */
export default defineComponent({
  name: 'SchemeModal',
  props: {
    show: { type: Boolean, default: false },
    store: { type: Object as () => ColorSchemeStore, required: true },
    getCurrentData: { type: Function as PropType<() => SchemePartData[]>, required: true },
    onLoadScheme: {
      type: Function as PropType<
        (parts: SchemePartData[]) => { applied: number; skipped: number }
      >,
      required: true,
    },
    onSaved: { type: Function as PropType<() => void>, default: null },
  },
  setup(props, { emit }) {
    const saveName = ref('')
    const conflict = ref<{ id: string; name: string } | null>(null)
    const renamingId = ref<string | null>(null)
    const renameText = ref('')
    const fileRef = ref<HTMLInputElement>()

    const doSave = (name: string) => {
      const data = props.getCurrentData()
      props.store.create(name.trim(), data)
      conflict.value = null
      saveName.value = ''
      message.success('配色方案保存成功')
      props.onSaved?.()
    }

    const handleSaveClick = () => {
      const name = saveName.value.trim()
      if (!name) {
        message.warning('请输入方案名称')
        return
      }
      const exist = props.store.findByName(name)
      if (exist) {
        // 同名：覆盖保存 / 另存为副本（SRS FR05-02-1）
        conflict.value = { id: exist.id, name }
      } else {
        doSave(name)
      }
    }

    const handleOverwrite = () => {
      if (!conflict.value) return
      props.store.overwrite(conflict.value.id, props.getCurrentData())
      conflict.value = null
      saveName.value = ''
      message.success('配色方案保存成功')
      props.onSaved?.()
    }

    const handleSaveCopy = () => {
      if (!conflict.value) return
      let name = conflict.value.name
      let i = 2
      while (props.store.findByName(name)) name = `${conflict.value.name}(${i++})`
      doSave(name)
    }

    const applyResult = (r: { applied: number; skipped: number }) => {
      if (r.skipped > 0) message.warning('部分部件在当前模型不存在，已跳过')
      else message.success('已加载配色方案')
    }

    const handleLoad = (parts: SchemePartData[]) => {
      applyResult(props.onLoadScheme(parts))
    }

    const handleImportFile = async (e: Event) => {
      const input = e.target as HTMLInputElement
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      const text = await file.text()
      const r = props.store.importJson(text)
      if (!r.ok) {
        message.warning('配色文件格式不正确，请确认文件')
        return
      }
      handleLoad(r.data.parts)
    }

    const startRename = (id: string, name: string) => {
      renamingId.value = id
      renameText.value = name
    }

    const confirmRename = () => {
      if (renamingId.value) props.store.rename(renamingId.value, renameText.value)
      renamingId.value = null
    }

    const sortedSchemes = computed(() =>
      [...props.store.schemes.value].sort((a, b) => b.createdAt - a.createdAt),
    )

    return () => (
      <NModal
        show={props.show}
        onUpdateShow={(v: boolean) => emit('update:show', v)}
        preset="card"
        title="配色方案"
        class="w-[520px] max-w-[92vw]"
      >
        {/* 保存 + 导入导出 */}
        <div class="flex items-center gap-2">
          <span
            class="flex-1"
            onKeydown={(e: KeyboardEvent) => {
              if (e.key === 'Enter') handleSaveClick()
            }}
          >
            <NInput v-model:value={saveName.value} size="small" placeholder="输入方案名称" />
          </span>
          <NButton size="small" type="primary" onClick={handleSaveClick}>
            保存
          </NButton>
        </div>
        {conflict.value && (
          <div class="mt-2 flex items-center gap-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-700">
            <span>已存在同名方案</span>
            <NButton size="tiny" type="warning" secondary onClick={handleOverwrite}>
              覆盖保存
            </NButton>
            <NButton size="tiny" secondary onClick={handleSaveCopy}>
              另存为副本
            </NButton>
          </div>
        )}
        <div class="mt-2 flex gap-2">
          <NButton size="small" secondary onClick={() => props.store.exportJson('当前配置', props.getCurrentData())}>
            导出当前 JSON
          </NButton>
          <NButton size="small" secondary onClick={() => fileRef.value?.click()}>
            导入 JSON
          </NButton>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            class="hidden"
            onChange={handleImportFile}
          />
        </div>

        {/* 方案列表 */}
        <div class="thin-scroll mt-3 max-h-[46vh] space-y-1.5 overflow-y-auto">
          {sortedSchemes.value.length === 0 && (
            <div class="py-8 text-center text-xs text-neutral-400">暂无保存方案</div>
          )}
          {sortedSchemes.value.map((s) => (
            <div
              key={s.id}
              class="flex items-center gap-2 rounded border border-neutral-200 px-3 py-2 text-sm hover:border-brand-500"
            >
              {renamingId.value === s.id ? (
                <>
                  <span
                    class="flex-1"
                    onKeydown={(e: KeyboardEvent) => {
                      if (e.key === 'Enter') confirmRename()
                    }}
                  >
                    <NInput v-model:value={renameText.value} size="tiny" />
                  </span>
                  <NButton size="tiny" type="primary" onClick={confirmRename}>
                    确定
                  </NButton>
                  <NButton size="tiny" quaternary onClick={() => (renamingId.value = null)}>
                    取消
                  </NButton>
                </>
              ) : (
                <>
                  <div class="min-w-0 flex-1">
                    <div class="truncate font-medium text-neutral-700">{s.name}</div>
                    <div class="text-[11px] text-neutral-400">
                      {fmtTime(s.createdAt)} · {s.parts.length} 个部件
                    </div>
                  </div>
                  <NButton size="tiny" secondary type="primary" onClick={() => handleLoad(s.parts)}>
                    加载
                  </NButton>
                  <NButton
                    size="tiny"
                    quaternary
                    onClick={() => props.store.exportJson(s.name, s.parts)}
                  >
                    导出
                  </NButton>
                  <NButton
                    size="tiny"
                    quaternary
                    onClick={() => startRename(s.id, s.name)}
                  >
                    重命名
                  </NButton>
                  <NPopconfirm onPositiveClick={() => props.store.remove(s.id)}>
                    {{
                      trigger: () => (
                        <NButton size="tiny" quaternary type="error">
                          删除
                        </NButton>
                      ),
                      default: () => '确定删除该方案？',
                    }}
                  </NPopconfirm>
                </>
              )}
            </div>
          ))}
        </div>
      </NModal>
    )
  },
})
