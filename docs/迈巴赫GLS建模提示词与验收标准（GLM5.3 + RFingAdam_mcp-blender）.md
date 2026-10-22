# 迈巴赫GLS建模提示词与验收标准（GLM5\.3 \+ RFingAdam/mcp\-blender）

**文档定位：**供开发 / 建模执行人员，使用 GLM5\.3 通过 RFingAdam/mcp\-blender 远程控制 Blender，从零创建迈巴赫GLS灰模，导出 maybach\.glb 交付 Vue3\+TSX\+Three\.js 部件换色系统。

**核心红线（漏一条则前端换色直接失效）：**每个可换色部件 = 独立 Object \+ 独立 Mesh \+ 独立 Principled BSDF 材质 \+ 严格英文命名；禁止任何两个部件共用材质数据块。

**配套文档：**《Maybach 3D 部件换色预览系统 — SRS 需求规格说明书 V1\.0》。

# 1 建模任务总览

## 1\.1 交付目标

通过 GLM5\.3 大模型，借助 mcp\-blender 的 218 个工具远程驱动 Blender，完成迈巴赫 GLS 灰模搭建，产出 **maybach\.glb**，满足前端**部件独立换色、材质参数调节、配色方案管理**的全部能力要求。

## 1\.2 工作流与技术栈

- **大模型**：GLM5\.3（智谱开放平台，支持 MCP 协议）

- **建模引擎**：Blender 5\.2\.3 LTS（本机：/home/qs/tools/kilo/blender\-5\.2\.3\-linux\-x64；4\.2\+ 均兼容）

- **MCP 服务**：RFingAdam/mcp\-blender（218 个工具，默认端口 9876）

- **交付格式**：GLB（glTF Binary）

- **对接系统**：Vue3 \+ Vite8 \+ TSX \+ Three\.js（MeshStandardMaterial / GLTFLoader / OrbitControls）

## 1\.3 建模闭环流程

## 1\.4 三条不可触碰的硬性红线

|\#|红线|违反后果|
|---|---|---|
|R1|部件独立：每个可换色零件是独立 Object、独立 Mesh，禁止合并|无法对单个部件换色；body 与 roof 合并则车顶永远跟随车身变色|
|R2|材质独立：每个部件独立 Principled BSDF 材质数据块，禁止共享|改一个部件，整台车一起变色（串色），换色功能完全失效|
|R3|命名规范：名称与前端 partConfig 严格一致，大小写敏感、无中文空格|前端遍历 Mesh 时匹配不上，部件列表为空或部分缺失|

# 2 环境准备与连接确认

## 2\.1 前置依赖

- Blender：5\.2\.3 LTS（本机已就绪；4\.2 及以上均可，glTF 导出与 MCP 插件兼容）

- Python ≥3\.10

- uv（推荐）或 pip

- GLM5\.3 客户端（支持 MCP 的 Agent，如智谱官方 Agent、Zcode）

- 本地回环网络：默认端口 9876

## 2\.2 安装步骤（Blender 插件 \+ MCP 服务）

### 步骤 1：获取 mcp\-blender 仓库

```bash
git clone https://github.com/RFingAdam/mcp-blender.git
cd mcp-blender
```

### 步骤 2：安装 Blender 端插件并启动 Socket

1. 打开 Blender → 编辑 → 偏好设置 → 附加组件 → 从磁盘安装

2. 选中仓库内 Blender 插件文件，勾选启用（插件名见仓库 README）

3. 3D 视图按 **N** 打开侧边栏，切换到 MCP 面板

4. 点击 **Start MCP Server**，默认监听 127\.0\.0\.1:9876

5. 保持 Blender 窗口打开、退出编辑模式，不要关闭

> 本机环境（GLM 开发机）已预装：插件以符号链接安装于 `~/.config/blender/5.2/scripts/addons/blender_mcp_addon`，Blender 启动脚本 `/tmp/kilo/start_mcp.py` 自动启用插件并 Start Server。手动重启 Blender 后需在 View3D 侧栏 MCP 面板重新点击 Start Server。

### 步骤 3：启动 MCP Server（推荐 uvx）

```bash
uvx mcp-blender
```

```bash
pip install mcp-blender
mcp-blender
```

> 启动成功日志应包含类似 **Connected to blender socket at localhost:9876** 的提示。
> 
> 

### 步骤 4：GLM5\.3 客户端 MCP 配置 JSON

```json
{
  "mcpServers": {
    "blender": {
      "command": "uvx",
      "args": ["mcp-blender"]
    }
  }
}
```

保存并刷新 MCP 列表，应能加载 mcp\-blender 的 218 个工具。

## 2\.3 连通性测试（必做）

向 GLM5\.3 发送最小验证指令：

```text
请通过 mcp-blender 执行 execute_blender_code，运行代码：
import bpy
print(bpy.context.scene.name)
并把返回结果告诉我。
```

> 能正常返回场景名（如 Scene）即表示 GLM → MCP → Blender 链路已打通。若工具未加载、返回报错，先按第 8 章故障排查处理。

> 本机 mcp-blender 工具名对照：执行代码=blender_execute_script；物体清单=blender_object_list；创建物体=blender_object_create；创建材质=blender_material_create；材质赋值=blender_material_assign；导出 GLB=blender_export_gltf；截图=blender_render_screenshot / blender_render_multi_angle。
> 
> 

# 3 核心交付：迈巴赫GLS完整建模主提示词

以下提示词可直接复制发送给 GLM5\.3。它已内置部件清单、材质独立红线、坐标系、迭代截图自检与导出参数，**不要裁剪其中任何一段**，否则可能破坏换色功能。

```text
你现在通过 mcp-blender 工具远程控制 Blender ,/home/qs/tools/kilo/blender-5.2.3-linux-x64，任务是：从零创建一台迈巴赫GLS灰模，用于 Vue3+Three.js 网页独立部件换色项目，最终导出 GLB 文件。
前端项目目录：/home/qs/code2027/demo/doc-agent/web-3d-Maybach，3d输出文件也希望这个作为根目录
【第一步：清场】
先清空当前场景：删除默认立方体、灯光、相机，确保从干净场景开始。

【第二步：创建部件，名称严格一致（大小写敏感，不能错）】
每个名称创建独立Object、独立Mesh，绝对禁止合并多个部件到一个Object：

可换色部件：
  body            车身主体
  roof            车顶
  grille          中网
  bumper_front    前保险杠
  bumper_rear     后保险杠
  mirror_l        左后视镜壳
  mirror_r        右后视镜壳
  wheel_fl        左前轮毂
  wheel_fr        右前轮毂
  wheel_rl        左后轮毂
  wheel_rr        右后轮毂
  handle_lf       左前门把手
  handle_rf       右前门把手
  trim            镀铬饰条

固定部件（不可换色，前端面板置灰）：
  window          车窗玻璃
  logo            车标
  tire            轮胎橡胶

【第三步：材质，每部件独立材质球，禁止共享】
1. 每个Object单独调用创建材质功能，使用Principled BSDF（原理化BSDF）
2. 绝对禁止多个部件复用同一个材质数据块——否则前端换色会整台车一起变色（串色）
3. 材质参数映射到 Three.js MeshStandardMaterial：
   Base Color = 颜色（前端拾色器控制）
   Metallic = 金属度 0~1
   Roughness = 粗糙度 0~1
4. 不要使用程序纹理、渐变、Cycles专属节点、动画材质
5. window 车窗：Base Color 深灰 + Alpha≈0.3（glTF alphaMode BLEND）；禁用 Transmission 透射扩展（前端 MeshStandardMaterial 不支持，需 MeshPhysicalMaterial 且部分环境黑屏）

【第四步：比例与造型】
1. 整车比例参考迈巴赫GLS：长5210mm、宽2030mm、高1838mm，轴距约3135mm
2. 车身低趴修长，A柱倾斜、车顶流畅弧线、车尾直立
3. 车头朝 -X、车宽沿 Y，故左右对称使用镜像修改器沿 Y 轴（跨 XZ 平面），不能用 X 轴（那会变成前后镜像）；完成后左右部件（mirror_l/mirror_r、wheel_fl/wheel_fr等）必须应用镜像并拆成独立Object
4. 每完成一轮形体修改，必须调用截图工具获取 45°前斜侧 + 侧面视口截图，自己检查：轮距比例、车顶弧线、车头长度、车轮大小、部件是否穿模粘连
5. 发现比例错误、部件粘连、物体被误合并，立即修复，全程保持部件独立

【第五步：导出前处理】
1. 所有Object执行 Apply（应用）缩放/旋转/位置——变换数值清零但世界位置不变，禁止把部件挪回原点；并应用全部修改器。整车原点置于车底几何中心（车轮接地 Z=0），建模单位 1=1米
2. 坐标系约定：建模期（Blender Z-up）车头沿 -X、车宽沿 Y、车高沿 Z；glTF 导出器自动转为 +Y 向上，成品 GLB 车头朝 -X。+Y 向上是 glTF 标准；-X 前向是本项目与前端 partConfig 的约定（glTF 官方惯例前向为 +Z），以前端 SRS 为准
3. 法线全部朝外，全部平滑着色，删除多余内部碎面
4. 总三角面数控制在 25万以内，适合网页加载

【第六步：导出 GLB】
1. 调用导出工具，输出文件 maybach.glb
2. 参数：glTF Binary (.glb)；关闭Draco压缩（前端Three项目没有解码器，开启会黑屏）；不导出灯光、相机、动画、骨骼、形状键
3. 导出前调用物体清单工具，逐个核对上面全部17个部件都存在且名称无误

【第七步：完成后自检】
导出后用清单工具再确认一次部件完整，向我汇报：创建了哪些部件、材质是否独立、文件导出路径和大小。
```

# 4 分阶段迭代提示词（按需单独下发，比重发主提示词高效）

## 4\.1 形体修正（比例 / 弧度 / 轮距）

```text
当前模型存在：车身过长、车顶弧线太平、车轮偏小、轮距过窄。
请调整 body、roof、wheel_* 等部件顶点位置修正比例，保持所有部件独立Object、独立材质，每轮修改后截图45°斜侧自检，直到接近迈巴赫GLS比例。
```

## 4\.2 部件补齐 / 命名纠错

```text
请检查大纲里是否缺少部件，或名称和以下清单不一致（大小写敏感）：
body / roof / grille / bumper_front / bumper_rear / mirror_l / mirror_r / wheel_fl / wheel_fr / wheel_rl / wheel_rr / handle_lf / handle_rf / trim / window / logo / tire
缺失或命名错误的一一补齐修正，不要合并任何部件。
```

## 4\.3 材质串色排查（最关键纠错）

```text
请逐个体检查每个Object的材质：确认每个可换色部件拥有自己独立的Principled BSDF材质数据块，没有任何两个部件共用同一个材质。
发现共享材质的，立即为每个部件新建独立材质副本并重新赋值。完成后截图检查颜色是否独立。
```

## 4\.4 网格清理与性能（面数过高时）

```text
当前模型面数过高。请执行网格清理：删除内部不可见碎面、重叠面，法线朝外，用适当减面手段把总三角面控制在25万以内，保持部件独立和材质独立。
```

## 4\.5 导出参数复核

```text
请核对 maybach.glb 的导出参数：必须是 glTF Binary 格式、关闭Draco压缩、不导出灯光相机动画骨骼、文件大小不超过15MB、车头朝向 -X 且向上轴为 +Y。如有不符请重新导出。
```

# 5 部件清单对照表（与前端 partConfig 一一绑定）

此表是 GLM 建模与前端代码的**唯一契约**，meshName 字段大小写敏感。可换色部件在前端面板开放取色器；固定部件置灰仅展示。

> 契约补充（防验收误判）：
> 1. V1.0 固定 17 部件——大灯/尾灯并入 bumper_front / bumper_rear，后门把手省略，排气口并入 bumper_rear。**禁止**为还原度添加第 18 个部件（A1 会判"多余"），也不要因灯具未单列而判"缺失"。
> 2. Blender 导出 glTF 以 **Object 名**命名节点：重命名必须改 Object 名（选中后 F2），仅改 Mesh 数据名无效。
> 3. 建模单位 1=1 米（整车长 5.21m），导出 glTF 单位即为米，Three.js 端无需缩放。
> 4. **前端实现差异（已裁定落地）**：曾存在前端将 wheel\_\*/mirror\_\* 等归并为单逻辑部件、window/tire 可换色的偏差，已按本契约修复——partConfig 拆分为 17 条独立条目（四轮毂/两后视镜/两保险杠/两把手均可独立换色），window/logo/tire 置灰（editable:false，验收 A4 通过）。占位模型与 e2e-smoke 断言同步更新；E2E 实测 17 行面板全显、左前轮毂独立选中、探针 nonEditable=\[window,logo,tire\]。

|meshName|中文名称|可换色|分组|备注|
|---|---|---|---|---|
|body|车身主体|**是**|车身组|整车外皮，占比最大|
|roof|车顶|**是**|车身组|双拼配色关键部件|
|grille|中网|**是**|外饰组|竖条格栅，高金属感|
|bumper\_front|前保险杠|**是**|外饰组|含下唇格栅区域|
|bumper\_rear|后保险杠|**是**|外饰组|含尾排区域|
|mirror\_l|左后视镜壳|**是**|外饰组|仅外壳，可双拼同车身色|
|mirror\_r|右后视镜壳|**是**|外饰组|与 mirror\_l 各自独立|
|wheel\_fl|左前轮毂|**是**|轮毂组|四轮毂独立换色|
|wheel\_fr|右前轮毂|**是**|轮毂组|独立 Object|
|wheel\_rl|左后轮毂|**是**|轮毂组|独立 Object|
|wheel\_rr|右后轮毂|**是**|轮毂组|独立 Object|
|handle\_lf|左前门把手|**是**|外饰组|镀铬可选|
|handle\_rf|右前门把手|**是**|外饰组|独立 Object|
|trim|镀铬饰条|**是**|外饰组|车窗下沿、侧裙饰条|
|window|车窗玻璃|否|固定件|开启透射材质|
|logo|车标|否|固定件|迈巴赫双M立标/中网标|
|tire|轮胎橡胶|否|固定件|深色橡胶质感|

# 6 验收标准（交付前端前逐项打勾）

## 6\.1 A 组：部件完整性（P0 硬性）

此组不通过则前端换色功能无法实现，直接阻断交付。

|\#|验收项|通过标准|验证方式|
|---|---|---|---|
|A1|部件数量|17 个部件全部存在，无缺失、无多余|GLM 用清单工具列大纲，人工比对第 5 章表|
|A2|部件独立性|每个部件独立 Object / 独立 Mesh，无两个可换色部件合并|Blender 大纲逐个点选确认|
|A3|命名规范|名称与前端 partConfig 完全一致，大小写敏感、无中文空格特殊符|导出后用脚本遍历 mesh\.name 核对|
|A4|固定件标记|window / logo / tire 存在且前端按不可换色处理|前端面板检查三项置灰|

## 6\.2 B 组：材质独立性与 PBR 适配（P0 硬性，防串色）

|\#|验收项|通过标准|验证方式|
|---|---|---|---|
|B1|材质独立|每个部件独立材质数据块，无共享材质|Blender 材质面板逐体核对，或导出后用工具查 material 引用计数|
|B2|材质类型|全部为 Principled BSDF，导出后映射 MeshStandardMaterial|查看节点类型|
|B3|参数映射|具备 Base Color / Metallic / Roughness，无程序节点依赖|检查节点树无纹理/渐变节点|
|B4|串色测试|单独改 body 颜色，全车只有车身变色，其余部件不变|在前端或 gltf\-viewer 中实测|

## 6\.3 C 组：坐标系与模型规范（P1）

|\#|验收项|通过标准|验证方式|
|---|---|---|---|
|C1|朝向|向上轴 \+Y（glTF 标准）；车头朝 \-X（本项目约定，与前端 partConfig 一致）|导入 Three 后检查朝向|
|C2|原点|整车原点置于地面几何中心，位置/缩放/旋转已应用|Blender 属性面板核对|
|C3|法线|全部朝外，无黑面；整体平滑着色|着色模式翻面检查|
|C4|修改器|全部已应用，无残留镜像/细分/布尔依赖|Blender 修改器面板检查|

## 6\.4 D 组：GLB 导出质量（P1）

|\#|验收项|通过标准|验证方式|
|---|---|---|---|
|D1|文件格式|maybach\.glb，glTF Binary|文件扩展名与导出设置核对|
|D2|文件大小|≤15MB|查看文件属性|
|D3|面数|总三角面 ≤25万|Blender 统计信息或导出日志|
|D4|无 Draco|未开启 Draco 压缩（或前端已集成解码器）|导出参数核对|
|D5|无冗余|不包含灯光、相机、动画、骨骼、形状键|gltf 内容检查|
|D6|渲染无异常|gltf\-viewer 打开无炸开、丢面、变黑|在线 gltf\-viewer\.donmccurdy\.com 实测|

## 6\.5 E 组：前端加载联调（P0 最终验收）

|\#|验收项|通过标准|验证方式|
|---|---|---|---|
|E1|加载成功|Three 项目正常加载 GLB，无控制台报错|浏览器 Console 检查|
|E2|部件识别|侧边面板自动列出全部 17 个部件，中文名称正确|前端界面核对|
|E3|单部件换色|选 body 改色，仅 body 变色，其余不动|前端实测|
|E4|批量换色|多选 wheel\_\* 批量改色，四个轮毂同步|前端实测|
|E5|材质调节|金属度 / 粗糙度滑块生效|前端实测|
|E6|重置|单部件 / 全部部件重置到模型原始色正常|前端实测|
|E7|截图 / 方案|截图、保存加载配色方案正常|前端实测|

## 6\.6 验收结论判定

- A、B、E 三组任意一项不通过 → **阻断交付**，修复后重新导出

- C、D 组为质量项，不通过 → 建议修复，但不阻断核心换色联调

- 全部通过 → 生成第 7 章交付物清单，正式交接前端

# 7 高频坑位与解决对照表

|现象|根因|解决话术（发给 GLM）|
|---|---|---|
|改一个部件全车变色|材质共享|请为每个部件复制独立材质，禁止复用材质数据块|
|部件列表为空|命名大小写 / 中文 / 空格|按清单严格重命名，大小写敏感，禁止中文|
|body 与 roof 无法分开改色|被合并成 1 个 Object|拆分为独立 Object，禁止合并可换色部件|
|模型导入歪 90 度|坐标系错误|车头朝 \-X，向上 \+Y，应用旋转|
|模型黑屏加载失败|开启了 Draco 压缩|关闭 Draco 压缩重新导出|
|网页卡顿|面数过高|减面到 25 万以内，删内部碎面|
|大面积黑面|法线反向|法线全部朝外，重新计算|
|左右后视镜一起变色|镜像未分离成独立 Object|应用镜像后拆成 mirror\_l / mirror\_r 两个独立 Object|
|GLM 无法调用工具|MCP 未连接 / 端口占用|重启 Agent 客户端，核对 9876 端口与配置 JSON|
|导出后部件名称丢失|导出前误删除 / 过滤了物体|导出前用清单工具核对 17 个部件，缺失则补齐|

# 8 故障排查清单

|故障现象|处理动作|
|---|---|
|GLM 看不到 Blender 工具|确认 uvx 命令正常、MCP 配置 JSON 无语法错误；重启 Agent 客户端并重新加载 MCP 列表|
|提示连接失败|确认 Blender 插件已点 Start MCP Server；防火墙放行 127\.0\.0\.1:9876；端口未被占用|
|执行命令无响应|退出 Blender 编辑模式与模态操作；确保 Blender 窗口保持前置运行|
|导出 GLB 部件丢失|GLM 可能在校验阶段误删物体；下发补齐指令重新导出|
|模型比例反复崩坏|强制 GLM 每轮修改后截图自检；或在提示词中补充固定比例参考值|

# 9 交付物清单（建模完成后交给前端）

1. **maybach\.glb** 主模型文件（≤15MB，符合第 6 章全部验收标准）

2. **部件对照表**：meshName / 中文名称 / 是否可换色 editable（即第 5 章表格，作为前端 partConfig 配置依据）

3. **材质备注**：哪些部件带贴图、哪些为纯色车漆，供前端材质调节参考

4. **预览截图**：45° 前斜侧效果图，便于前端快速核对

# 10 附录

## 10\.1 材质参数与 Three\.js 映射速查

|Blender Principled BSDF|Three\.js 参数|说明|
|---|---|---|
|Base Color|color|前端拾色器控制，即换色核心字段|
|Metallic|metalness|金属度，0\~1；车漆建议 0\.2\~0\.95|
|Roughness|roughness|粗糙度，0\~1；亮光低值、哑光高值|
|Alpha（车窗）|transparent \+ opacity|车窗用 alpha 混合（Base Color A≈0\.3，alphaMode BLEND）；禁用 Transmission 扩展（MeshStandardMaterial 不支持）|

## 10\.2 GLB 导出参数清单（前端约定）

|参数|取值 / 要求|
|---|---|
|格式|glTF Binary \(\.glb\)，单文件|
|输出路径|/home/qs/code2027/demo/doc\-agent/web\-3d\-Maybach/maybach\.glb（前端项目根目录）|
|向上轴|\+Y（glTF 标准）|
|前向|\-X（车头朝向）|
|Draco 压缩|关闭（前端未集成解码器）|
|灯光 / 相机 / 动画 / 骨骼 / 形状键|不导出，减小体积|
|文件大小|≤15MB|
|三角面数|≤25万|

> （注：部分内容由豆包工作 AI 生成）

> **前端接入备忘（commit 317011f）**：GLB 文件保持 \-X 前向不变；前端加载时以 `modelConfig.orientation = π/2` 将车头旋至 \+Z 对齐预设视角（正面=\+Z）。朝向修正只在前端做，**禁止两端同时改**，否则双重旋转 180°。最新模型核验：17/17 部件、6936 tris、车头 \-X、左侧 \+Z，与 `node scripts/inspect-model.mjs` 复核一致。
