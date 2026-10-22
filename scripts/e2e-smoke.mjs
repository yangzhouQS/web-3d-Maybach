/**
 * 无头浏览器端到端冒烟测试（开发工具）
 * 用法：先启动 dev 服务器，再 node scripts/e2e-smoke.mjs [url]
 * 验证：页面加载、真实模型渲染（非占位）、部件面板完整、点选反馈、视角切换、控制台无错误
 */
import { chromium } from 'playwright-core'

const URL_BASE = process.argv[2] ?? 'http://localhost:5199'
const OUT = '/tmp/kilo'

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text()}`)
})

await page.goto(URL_BASE, { waitUntil: 'networkidle' })

// 隐藏 dev panel，避免遮挡工具栏
await page.evaluate(() => {
  const gui = document.querySelector('.lil-gui')
  if (gui) (gui).style.display = 'none'
})

// 等待加载完成（Loading 遮罩消失，最多 20s）
await page
  .waitForSelector('text=模型加载中', { state: 'detached', timeout: 20000 })
  .catch(() => errors.push('loading cover 未消失'))

const results = {}
results.webglErrorPage = await page.locator('text=当前浏览器不支持 WebGL').count()
results.fallbackBadge = await page.locator('text=占位预览模型').count()

// 部件面板行（契约 17 部件标签，SRS 附录 A）
const expectParts = [
  '车身主体', '车顶', '中网', '前保险杠', '后保险杠', '左后视镜壳', '右后视镜壳',
  '左前门把手', '右前门把手', '镀铬饰条', '车窗玻璃', '车标',
  '左前轮毂', '右前轮毂', '左后轮毂', '右后轮毂', '轮胎橡胶',
]
results.partRows = {}
for (const p of expectParts) {
  results.partRows[p] = await page.locator(`text=${p}`).first().isVisible()
}

// 点选左前轮毂（面板行，精确到行 div 避免命中「轮毂组」标题）→ 选中态描边 + 复选框勾选断言
const wheelRow = page.locator('aside div.cursor-pointer:has-text("左前轮毂")').first()
await wheelRow.click()
await page.waitForTimeout(900)
const wheelChecked = await wheelRow.locator('.n-checkbox--checked').count()
results.wheelCheckboxChecked = wheelChecked > 0
await page.screenshot({ path: `${OUT}/e2e-wheel-selected.png` })

// 修改颜色：点击取色器输入 hex（NaiveUI color picker input）
const colorInput = page.locator('.n-color-picker input').first()
if (await colorInput.count()) {
  await colorInput.fill('#b99a5b')
  await colorInput.press('Enter')
  await page.waitForTimeout(600)
}
await page.screenshot({ path: `${OUT}/e2e-color-applied.png` })

// 视角切换：45°前侧 / 侧面
await page.locator('button:has-text("45°前侧")').first().click()
await page.waitForTimeout(1400)
await page.screenshot({ path: `${OUT}/e2e-front45.png` })
await page.locator('button:has-text("侧面")').first().click()
await page.waitForTimeout(1400)
await page.screenshot({ path: `${OUT}/e2e-side.png` })

// 撤销快捷键
await page.keyboard.press('Control+z')
await page.waitForTimeout(500)

// 透明背景截图按钮（下拉 1x）
await page.locator('button:has-text("截图")').first().click()
await page.waitForTimeout(800)

results.consoleErrors = errors
console.log(JSON.stringify(results, null, 2))
await browser.close()
process.exit(errors.length ? 1 : 0)
