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

function torus(name: string, r: number, tube: number, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 28), matFor(name))
  m.name = name
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  return m
}

/**
 * 程序化占位模型（开发联调用，命名严格对齐 SRS 附录 A）
 * 坐标约定与真实交付模型一致：长轴 X、车头朝 -X、左侧为 +Z、单位米
 */
export function buildPlaceholderCar(): THREE.Group {
  const g = new THREE.Group()
  g.name = 'placeholder-car'

  // 车身与车顶
  g.add(box('body', 4.9, 0.85, 2.0, 0, 0.8, 0))
  g.add(box('roof', 2.6, 0.62, 1.74, 0.2, 1.52, 0))

  // 车窗
  g.add(box('window_front', 0.08, 0.5, 1.66, -1.08, 1.5, 0))
  g.add(box('window_rear', 0.08, 0.5, 1.66, 1.48, 1.5, 0))
  g.add(box('window_left', 2.5, 0.5, 0.08, 0.2, 1.5, 0.87))
  g.add(box('window_right', 2.5, 0.5, 0.08, 0.2, 1.5, -0.87))

  // 前脸与保险杠
  g.add(box('grille', 0.14, 0.55, 1.7, -2.47, 0.66, 0))
  g.add(box('bumper_front', 0.32, 0.4, 1.96, -2.52, 0.42, 0))
  g.add(box('bumper_rear', 0.32, 0.4, 1.96, 2.52, 0.42, 0))

  // 轮毂（Z 轴为轮轴方向；左侧 +Z）
  const wheelX = 1.62
  for (const [suffix, x, z] of [
    ['fl', -wheelX, 0.98],
    ['fr', -wheelX, -0.98],
    ['rl', wheelX, 0.98],
    ['rr', wheelX, -0.98],
  ] as const) {
    const m = cyl(`wheel_${suffix}`, 0.42, 0.3, x, 0.42, z, Math.PI / 2)
    g.add(m)
  }
  // 轮胎（4 个同名 Mesh，exact 匹配归并为一个逻辑部件；环面包裹轮毂外缘）
  for (const [x, z] of [
    [-wheelX, 0.98],
    [-wheelX, -0.98],
    [wheelX, 0.98],
    [wheelX, -0.98],
  ] as const) {
    g.add(torus('tire', 0.36, 0.11, x, 0.42, z))
  }

  // 后视镜（左侧 +Z）
  g.add(box('mirror_l', 0.12, 0.12, 0.24, -1.0, 1.28, 1.06))
  g.add(box('mirror_r', 0.12, 0.12, 0.24, -1.0, 1.28, -1.06))

  // 门把手（交付命名 handle_lf/handle_rf，占位用同风格）
  for (const [suffix, x, z] of [
    ['lf', -0.5, 1.02],
    ['rf', -0.5, -1.02],
    ['lr', 0.4, 1.02],
    ['rr', 0.4, -1.02],
  ] as const) {
    g.add(box(`handle_${suffix}`, 0.3, 0.08, 0.06, x, 1.16, z))
  }

  // 侧饰条
  g.add(box('trim_left', 3.4, 0.1, 0.07, 0, 0.36, 1.02))
  g.add(box('trim_right', 3.4, 0.1, 0.07, 0, 0.36, -1.02))

  // 车标（不可编辑固定件，位置与交付模型一致：车头）
  const emblem = cyl('emblem', 0.13, 0.05, -2.44, 1.1, 0, Math.PI / 2)
  g.add(emblem)

  return g
}
