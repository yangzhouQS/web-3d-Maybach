import type { ThreeScene } from '@/hooks/useThreeScene'
import { downloadBlob, screenshotFileName } from '@/utils/color'
import { message } from '@/utils/feedback'

/**
 * 画布截图（SRS FR07）
 * - 仅捕获 WebGL canvas 像素，DOM 面板不参与画面
 * - preserveDrawingBuffer 已开启，截图前仍同步渲染一帧保证内容新鲜
 * - 透明背景跟随当前渲染配置（alpha: true 已开启）
 * - 2x：临时放大渲染尺寸导出后恢复
 */
export async function captureScreenshot(three: ThreeScene, scale: 1 | 2): Promise<void> {
  const canvas = three.renderer.domElement
  const cssW = Math.max(canvas.clientWidth, 1)
  const cssH = Math.max(canvas.clientHeight, 1)
  const baseRatio = three.renderer.getPixelRatio()

  const restore = () => {
    three.resizeTo(cssW, cssH, baseRatio)
    three.requestRender()
  }

  try {
    if (scale > 1) three.resizeTo(cssW * scale, cssH * scale, 1)
    three.renderOnce()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'))
    if (!blob) {
      message.error('截图生成失败，请重试')
      return
    }
    downloadBlob(screenshotFileName('png'), blob)
    message.success('截图已开始下载')
  } finally {
    if (scale > 1) restore()
  }
}
