/**
 * GLB 模型检查脚本（开发工具，SRS 附录 A 验收辅助）
 * 用法：node scripts/inspect-model.mjs [path=public/models/maybach.glb]
 * 输出：整车/部件包围盒、尺寸、车头朝向、面数，用于核验 orientation 与命名契约
 */
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { readFileSync } from 'node:fs'

const file = process.argv[2] ?? 'public/models/maybach.glb'
const buf = readFileSync(file)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

new GLTFLoader().parse(
  ab,
  '',
  (gltf) => {
    const scene = gltf.scene
    scene.updateMatrixWorld(true)
    const total = new THREE.Box3().setFromObject(scene)
    const size = total.getSize(new THREE.Vector3())
    const center = total.getCenter(new THREE.Vector3())
    console.log(`整车包围盒 尺寸(m): ${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}  中心: ${center.toArray().map((v) => v.toFixed(2)).join('/')}`)

    let tris = 0
    const parts = []
    scene.traverse((o) => {
      const m = o
      if (!m.isMesh) return
      const g = m.geometry
      tris += (g.index ? g.index.count : g.attributes.position.count) / 3
      const b = new THREE.Box3().setFromObject(m)
      const c = b.getCenter(new THREE.Vector3())
      parts.push({ name: m.name || m.parent?.name || '(unnamed)', tris: Math.round((g.index ? g.index.count : g.attributes.position.count) / 3), center: c, minY: b.min.y })
    })
    console.log(`总三角面数: ${Math.round(tris)}（附录 A 预算 ≤300000）\n`)
    console.log('部件'.padEnd(14), '面数'.padStart(6), '  中心 x/y/z')
    for (const p of parts) {
      console.log(p.name.padEnd(14), String(p.tris).padStart(6), ' ', p.center.toArray().map((v) => v.toFixed(2)).join('/'))
    }

    const grille = parts.find((p) => /grille/i.test(p.name))
    const body = parts.find((p) => p.name === 'body')
    if (grille) {
      const axis = size.x > size.z ? 'X' : 'Z'
      const nose = axis === 'Z' ? (grille.center.z < center.z ? '-Z' : '+Z') : grille.center.x < center.x ? '-X' : '+X'
      console.log(`\n长轴: ${axis}｜车头朝向: ${nose}（以中网位置判定）`)
      let orientation = 0
      if (axis === 'Z' && nose === '-Z') orientation = Math.PI
      else if (axis === 'X' && nose === '+X') orientation = -Math.PI / 2
      else if (axis === 'X' && nose === '-X') orientation = Math.PI / 2
      console.log(`→ 建议 modelConfig.orientation = ${orientation}`)
      if (!body) console.log('⚠ 未找到名为 body 的 Mesh，车身部件缺失！')
    }
    process.exit(0)
  },
  (err) => {
    console.error('解析失败:', err)
    process.exit(1)
  },
)
