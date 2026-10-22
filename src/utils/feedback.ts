import { createDiscreteApi } from 'naive-ui'

/**
 * 全局消息 / 确认弹窗（NaiveUI 离散 API，无需 Provider 包裹）
 * 文案对齐 SRS §7 错误处理与提示规范
 */
export const { message, dialog } = createDiscreteApi(['message', 'dialog'])
