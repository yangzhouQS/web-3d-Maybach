import { ref, type Ref } from 'vue'

/**
 * 撤销 / 重做命令栈（SRS FR03-08）
 * 采用全量快照（部件纯数据很小），上限 30 步；
 * 滑动条等连续输入通过 mergeKey 在时间窗内合并为一步
 */
export function useUndoRedo<T>(limit = 30) {
  const canUndo = ref(false)
  const canRedo = ref(false)
  let stack: T[] = []
  let index = -1
  let lastPushKey = ''
  let lastPushTime = 0

  const sync = () => {
    canUndo.value = index > 0
    canRedo.value = index >= 0 && index < stack.length - 1
  }

  return {
    canUndo: canUndo as Ref<boolean>,
    canRedo: canRedo as Ref<boolean>,
    reset(state: T) {
      stack = [state]
      index = 0
      lastPushKey = ''
      sync()
    },
    push(state: T, mergeKey = '') {
      const now = Date.now()
      const merging = mergeKey !== '' && mergeKey === lastPushKey && now - lastPushTime < 700
      if (merging && index >= 0) {
        stack[index] = state
      } else {
        stack = stack.slice(0, index + 1)
        stack.push(state)
        if (stack.length > limit) stack.shift()
        index = stack.length - 1
      }
      lastPushKey = mergeKey
      lastPushTime = now
      sync()
    },
    undo(): T | null {
      if (index <= 0) return null
      index--
      lastPushKey = ''
      sync()
      return stack[index]
    },
    redo(): T | null {
      if (index < 0 || index >= stack.length - 1) return null
      index++
      lastPushKey = ''
      sync()
      return stack[index]
    },
  }
}
