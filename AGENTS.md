# AGENTS.md — Maybach 3D 部件换色预览系统

面向 AI 编码代理的项目工作指引。需求唯一事实源：`docs/Maybach 3D 部件换色预览系统 — 软件需求规格说明书（SRS）.md`（V1.1）；执行状态与偏差记录：`docs/开发计划.md`。改需求相关行为时同步更新这两份文档。

## 常用命令

```bash
npm run dev          # 开发服务器（含 lil-gui 面板与 FPS/DrawCall 浮层）
npm run typecheck    # vue-tsc 类型检查（提交前必须通过）
npm run build        # 生产构建（base './'，可部署任意子目录）
npm run preview      # 预览 dist

node scripts/inspect-model.mjs public/models/maybach.glb   # 核验模型命名/朝向/面数
# E2E 冒烟（需先起 dev，依赖 playwright-core + 系统 /usr/bin/google-chrome）
node scripts/e2e-smoke.mjs http://localhost:5199
```

## 环境锁定（勿升级）

- **TypeScript 锁定 `~5.9.3`**：TS 7（原生版）与 vue-tsc 3.x 不兼容
- Node ≥ 20.19（Vite 8 要求）；registry 走 npmmirror
- TailwindCSS 锁 v3；lil-gui 仅动态 import（`import.meta.env.DEV` 守卫），生产包不得引入
- **已知接受风险**：Dependabot 告警 tailwindcss@3 构建链（chokidar/fast-glob/braces 栈耗尽 DoS）——均为 dev 依赖、不进生产产物、不可达路径；官方修复需升级 Tailwind v4（破坏性），已用 `overrides.braces@^3.0.3` 缓解，**勿执行 `npm audit fix --force`**

## 架构分层

```
src/
  App.tsx               # 页面编排：状态、动作入口、撤销栈（大文件，改动注意作用域）
  types/index.ts        # SRS §5 全量类型（CarPartItem/ColorScheme/SchemeStorage/ModelConfig…）
  config/               # partConfig（部件契约）/ modelConfig（模型与相机）/ presets
  hooks/useThreeScene   # 场景/相机/渲染器/控制器/混合渲染循环（含 customRender/resize 钩子）
  hooks/useCarModel     # GLB 加载、部件匹配、材质操作、Raycaster 点选、OutlinePass
  hooks/useColorScheme  # LocalStorage 方案存储与 JSON 校验
  hooks/useUndo         # 30 步快照栈（700ms 合并窗口）
  hooks/useDevPanel     # lil-gui（DEV）
  components/           # Viewer/面板/工具栏/方案弹窗/加载遮罩/统计浮层；panel/ 为面板子组件
  utils/                # 颜色、截图、设备判定、占位模型、匹配、消息（NaiveUI 离散 API）
public/models/          # 真实 GLB（缺失时自动加载占位模型，画布左下角有标识）
```

## 关键约定（违反会引入难查的 bug）

1. **NaiveUI 组件的动态子内容必须用槽函数**：`<NCollapseItem>{{ default: () => rows }}</NCollapseItem>`。禁止直接传 JSX 子元素数组——会被包成静态快照槽，状态更新后 DOM 不刷新（已踩坑：部件复选框，提交 `bcf6dd4`）。
2. **Three 对象禁止进入 Vue 深度响应式**（SRS §2.4-7）：scene/camera/mesh/material 一律普通变量或模块级引用；UI 状态（parts、renderOption）是纯数据才允许 reactive。
3. **改材质前必须克隆**（GLB 加载时已统一克隆）；材质更新只走事件驱动（`requestRender()`），禁止每帧遍历部件（SRS §2.4-5）。
4. **模型契约**（SRS 附录 A）：mesh 命名 `wheel_fl`/`handle_lf` 等由 `partConfig.matchPattern` 正则归并；坐标约定长轴 X、车头 -X、左侧 +Z，`modelConfig.orientation = π/2` 转到 +Z 对齐预设视角。替换模型后必须跑 `scripts/inspect-model.mjs` 核验。
5. 注释用中文并标注对应 SRS 条款号（如 `// SRS FR03-06`）。
6. 消息文案对齐 SRS §7 错误表；危险操作（重置全部、删方案）二次确认。

## 验证流程

改代码后：`npm run typecheck && npm run build`；涉及交互/渲染的改动跑 e2e-smoke（先隐藏 `.lil-gui`，用 `aside div.cursor-pointer` 精确定位行，`text=轮毂` 会命中"轮毂组"标题）。E2E 断言可读 DEV 探针 `window.__MAYBACH__`（parts/model/loadStatus，仅开发环境存在）。

## 提交规范

- 每个功能/修复独立提交，及时推送 `origin master`（用户要求）
- 格式：`feat|fix|refactor|docs: 阶段或模块 + 中文摘要`，正文列要点与 SRS 依据
- Git 身份已仓库级配置（yangzhouQS），远程为 SSH 地址
