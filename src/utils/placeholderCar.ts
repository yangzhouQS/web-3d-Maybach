import * as THREE from 'three'
import { partConfig } from '@/config/partConfig'
import { matchPartConfig } from '@/utils/partMatch'

function std(color: string, metalness: number, roughness: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness })
}

/** 按部件配置查找材质（多实例部件共享同一逻辑配置） */
function matFor(meshName: string): THREE.MeshStandardMaterial {
  const cfg = matchPartConfig(meshName, partConfig)
  return std(cfg?.color ?? '#888888', cfg?.metalness ?? 0.5, cfg?.roughness ?? 0.5)
}

function box(
  name: string,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matFor(name))
  m.name = name
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

function cyl(
  name: string,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  rotX = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), matFor(name))
  m.name = name
  m.position.set(x, y, z)
  m.rotation.x = rotX
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/**
 * 程序化占位模型（开发联调用，命名严格对齐 SRS 附录 A）
 * 车头朝 -Z，单位米
 */
export function buildPlaceholderCar(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'placeholder-car'

  // 车身与车顶
  g.add(box('body', 2.0, 0.85, 4.9, 0, 0.8, 0))
  g.add(box('roof', 1.74, 0.62, 2.6, 0, 1.52, 0.2))

  // 车窗（简化为环绕 cabin 的块）
  g.add(box('window_front', 1.66, 0.5, 0.08, 0, 1.5, -1.08))
  g.add(box('window_rear', 1.66, 0.5, 0.08, 0, 1.5, 1.48))
  g.add(box('window_left', 0.08, 0.5, 2.5, -0.87, 1.5, 0.2))
  g.add(box('window_right', 0.08, 0.5, 2.5, 0.87, 1.5, 0.2))

  // 前脸与保险杠
  g.add(box('grille', 1.7, 0.55, 0.14, 0, 0.66, -2.47))
  g.add(box('bumper_front', 1.96, 0.4, 0.32, 0, 0.42, -2.52))
  g.add(box('bumper_rear', 1.96, 0.4, 0.32, 0, 0.42, 2.52))

  // 轮毂（X 轴为轮轴方向）
  const wheelZ = 1.62
  for (const [suffix, x, z] of [
    ['FL', -0.98, -wheelZ],
    ['FR', 0.98, -wheelZ],
    ['RL', -0.98, wheelZ],
    ['RR', 0.98, wheelZ],
  ] as const) {
    const m = cyl(`wheel_${suffix}`, 0.42, 0.3, x, 0.42, z, Math.PI / 2)
    g.add(m)
  }

  // 后视镜
  g.add(box('mirror_FL', 0.24, 0.12, 0.12, -1.06, 1.28, -1.0))
  g.add(box('mirror_FR', 0.24, 0.12, 0.12, 1.06, 1.28, -1.0))

  // 门把手
  for (const [suffix, x, z] of [
    ['FL', -1.02, -0.5],
    ['FR', 1.02, -0.5],
    ['RL', -1.02, 0.4],
    ['RR', 1.02, 0.4],
  ] as const) {
    g.add(box(`handle_${suffix}`, 0.06, 0.08, 0.3, x, 1.16, z))
  }

  // 侧饰条
  g.add(box('trim_left', 0.07, 0.1, 3.4, -1.02, 0.36, 0))
  g.add(box('trim_right', 0.07, 0.1, 3.4, 1.02, 0.36, 0))

  // 车标（不可编辑固定件）
  const emblem = cyl('emblem', 0.13, 0.05, 0, 1.1, -2.44, Math.PI / 2)
  g.add(emblem)

  return g
}
