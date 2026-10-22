# 模型资源目录

将按 SRS 附录 A 规范导出的 `maybach.glb` 放置在本目录。

- 每个可换色部件独立 Mesh，命名如 `body`、`wheel_FL`、`mirror_FR` 等
- 材质统一 MeshStandardMaterial，GLB ≤ 15MB
- 模型缺失时，开发联调将自动加载程序化占位模型（可在 `src/config/modelConfig.ts` 关闭）
