# Maybach 3D 部件换色预览系统

网页端迈巴赫 3D 定制看车工具：加载整车 GLB 模型，按部件单选/多选实时换色、调节车漆 PBR 材质，支持配色方案本地管理与 JSON 导入导出、预设视角动画、透明底/高清截图。

技术栈：Vue3（Composition API + TSX）· Vite 8 · TypeScript · Three.js · NaiveUI · TailwindCSS v3 · @tweenjs/tween.js

需求与设计文档见 [`docs/`](./docs)：

- 《软件需求规格说明书（SRS）V1.1》— 功能/非功能需求、数据模型、附录 A 模型导出规范、附录 B 设备测试矩阵
- 《开发计划》— 阶段任务拆解与验收标准

## 快速开始

```bash
npm install
npm run dev       # 开发（含 lil-gui 调试面板与 FPS/DrawCall 浮层）
npm run typecheck # 类型检查（TypeScript 锁定 ~5.9.x：TS7 与 vue-tsc 3.x 不兼容）
npm run build     # 生产构建（产物 dist/，base 为相对路径，可部署任意子目录）
npm run preview   # 本地预览生产构建
```

> 首次运行若 `public/models/maybach.glb` 不存在，会自动加载程序化占位模型（画布左下角显示标识），可在 `src/config/modelConfig.ts` 关闭。

## 模型替换 / 新增车型

1. 按 SRS 附录 A 规范导出 GLB（独立 Mesh、`wheel_FL` 等命名、MeshStandardMaterial、≤15MB）；
2. 替换 `public/models/maybach.glb`；
3. 如部件命名有差异，更新 `src/config/partConfig.ts`；车头朝向不同则调整 `src/config/modelConfig.ts` 的 `orientation`。

业务代码无需改动。

## 功能清单（对应 SRS）

| 模块 | 说明 |
|---|---|
| 3D 画布 | 自适应、OrbitControls 阻尼/触摸、三光布光、背景/网格/阴影开关、加载进度/超时/重试 |
| 部件换色 | meshName+matchPattern 多实例归并匹配、画布点选（Shift 追加）、选中态轮廓/emissive 反馈、单选/批量改色、重置 |
| 车漆材质 | metalness/roughness 滑块、亮光/哑光/金属拉丝预设 |
| 配色方案 | LocalStorage 存储、保存/覆盖/重命名/删除、JSON 导入导出与结构校验、缺失部件跳过警告 |
| 视角与截图 | 六预设视角 Tween 动画（可打断）、1x/2x 截图、透明背景 PNG |
| 撤销/重做 | 30 步快照栈，Ctrl+Z / Ctrl+Shift+Z，滑动条输入自动合并 |
| 健壮性 | WebGL 不可用提示、上下文丢失恢复与配色重放、移动端自动降级（关阴影/轮廓）、DPR clamp 2 |

## 目录结构

```
src/
  App.tsx                 # 页面编排：状态、动作入口、撤销栈
  types/                  # SRS §5 全量类型
  config/                 # partConfig / modelConfig / 预设（部件、配色、视角）
  hooks/
    useThreeScene.ts      # 场景/相机/渲染器/控制器/混合渲染循环
    useCarModel.ts        # GLB 加载、部件匹配、材质操作、点选与轮廓
    useColorScheme.ts     # 方案存储与 JSON 校验
    useUndo.ts            # 撤销/重做快照栈
    useDevPanel.ts        # lil-gui（仅开发环境）
  components/             # Viewer / 控制面板 / 工具栏 / 方案弹窗 / 加载遮罩 / 统计浮层
  utils/                  # 颜色、截图、设备判定、占位模型、匹配、消息
public/models/            # GLB 模型放置处
```

## 部署

静态部署（Nginx / OSS / Vercel 等），无需后端。建议：

- `dist/` 内 JS/CSS 为哈希文件名，配置强缓存 `Cache-Control: max-age=31536000, immutable`
- `index.html` 不缓存（`no-cache`），保障发版即时生效
- GLB 同样走强缓存，保障 15MB 模型重复访问体验（SRS §2.2）

## 已知限制

- 车窗玻璃使用 MeshStandardMaterial 简化（无透射），二期迭代 MeshPhysicalMaterial（SRS 前置约束）
- hover 呼吸高亮为限时脉冲（约 1.2s 后回归静态描边），避免驻留渲染破坏停帧原则
- Draco 压缩 GLB 需自行接入 DRACOLoader 解码器配置
