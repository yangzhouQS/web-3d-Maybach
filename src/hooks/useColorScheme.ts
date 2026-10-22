import { ref, type Ref } from 'vue'
import type { ColorScheme, ExportColorJson, SchemePartData, SchemeStorage } from '@/types'
import { downloadText, HEX_RE, inUnitRange } from '@/utils/color'

/** LocalStorage 固定 key（SRS FR05-02-8） */
const STORAGE_KEY = 'maybach-color-schemes'

function emptyStorage(): SchemeStorage {
  return { schemaVersion: '1.0', schemes: [] }
}

function readStorage(): SchemeStorage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStorage()
    const parsed = JSON.parse(raw) as SchemeStorage
    // schemaVersion 校验失败时重置（格式迁移入口，SRS FR05-02-8）
    if (parsed?.schemaVersion === '1.0' && Array.isArray(parsed.schemes)) return parsed
    return emptyStorage()
  } catch {
    return emptyStorage()
  }
}

/** 导入 JSON 结构校验（SRS FR05-03：任一项不合法整体拒绝） */
export function validateExportJson(v: unknown): ExportColorJson | null {
  if (!v || typeof v !== 'object') return null
  const o = v as Record<string, unknown>
  if (o.version !== '1.0' || typeof o.schemeName !== 'string' || !Array.isArray(o.parts)) {
    return null
  }
  for (const it of o.parts) {
    const p = it as Record<string, unknown>
    if (typeof p?.meshName !== 'string' || p.meshName.length === 0) return null
    if (typeof p.color !== 'string' || !HEX_RE.test(p.color)) return null
    if (!inUnitRange(p.metalness) || !inUnitRange(p.roughness)) return null
  }
  return o as unknown as ExportColorJson
}

export interface ColorSchemeStore {
  schemes: Ref<ColorScheme[]>
  findByName(name: string): ColorScheme | undefined
  create(name: string, partsData: SchemePartData[]): ColorScheme
  overwrite(id: string, partsData: SchemePartData[]): void
  rename(id: string, name: string): void
  remove(id: string): void
  exportJson(schemeName: string, partsData: SchemePartData[]): void
  importJson(text: string): { ok: true; data: ExportColorJson } | { ok: false }
}

export function useColorScheme(): ColorSchemeStore {
  const schemes = ref<ColorScheme[]>(readStorage().schemes)

  const persist = () => {
    const storage: SchemeStorage = { schemaVersion: '1.0', schemes: schemes.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
  }

  return {
    schemes,
    findByName(name) {
      return schemes.value.find((s) => s.name === name)
    },
    create(name, partsData) {
      const scheme: ColorScheme = {
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        parts: partsData,
      }
      schemes.value = [scheme, ...schemes.value]
      persist()
      return scheme
    },
    overwrite(id, partsData) {
      const s = schemes.value.find((x) => x.id === id)
      if (!s) return
      s.parts = partsData
      s.createdAt = Date.now()
      persist()
    },
    rename(id, name) {
      const s = schemes.value.find((x) => x.id === id)
      if (!s || !name.trim()) return
      s.name = name.trim()
      persist()
    },
    remove(id) {
      schemes.value = schemes.value.filter((s) => s.id !== id)
      persist()
    },
    exportJson(schemeName, partsData) {
      const json: ExportColorJson = { version: '1.0', schemeName, parts: partsData }
      downloadText(`${schemeName}.json`, JSON.stringify(json, null, 2))
    },
    importJson(text) {
      try {
        const data = validateExportJson(JSON.parse(text))
        if (!data) return { ok: false }
        return { ok: true, data }
      } catch {
        return { ok: false }
      }
    },
  }
}
