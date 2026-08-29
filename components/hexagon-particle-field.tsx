'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Builds points that trace the outline of a regular hexagon (flat-top),
 * with slight randomized jitter and per-point size/phase attributes for
 * the shader to animate.
 */
function buildHexRingPoints(opts: {
  radius: number
  count: number
  bandWidth: number
  rotation?: number
  seed?: number
}) {
  const { radius, count, bandWidth, rotation = 0, seed = 1 } = opts
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const edgeIndex = new Float32Array(count)

  // deterministic pseudo-random
  let s = seed
  const rand = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }

  const corners: [number, number][] = []
  for (let i = 0; i < 6; i++) {
    const a = rotation + (Math.PI / 3) * i
    corners.push([Math.cos(a) * radius, Math.sin(a) * radius])
  }

  for (let i = 0; i < count; i++) {
    const edge = i % 6
    const t = rand()
    const [x1, y1] = corners[edge]
    const [x2, y2] = corners[(edge + 1) % 6]

    let x = x1 + (x2 - x1) * t
    let y = y1 + (y2 - y1) * t

    // push points slightly inward/outward across a band to give the
    // outline some volume rather than a razor-thin line
    const nx = y2 - y1
    const ny = -(x2 - x1)
    const nl = Math.sqrt(nx * nx + ny * ny) || 1
    const jitter = (rand() - 0.5) * bandWidth
    x += (nx / nl) * jitter
    y += (ny / nl) * jitter

    const z = (rand() - 0.5) * bandWidth * 0.6

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    sizes[i] = 0.55 + rand() * 1.05
    phases[i] = rand() * Math.PI * 2
    edgeIndex[i] = edge
  }

  return { positions, sizes, phases, edgeIndex }
}

/** Points scattered inside the hexagon (used for the inner core glow) */
function buildHexFillPoints(opts: { radius: number; count: number; seed?: number }) {
  const { radius, count, seed = 7 } = opts
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  const phases = new Float32Array(count)
  const edgeIndex = new Float32Array(count)

  let s = seed
  const rand = () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647
  }

  const isInHex = (x: number, y: number) => {
    const q2x = Math.abs(x)
    const q2y = Math.abs(y)
    const h = radius * Math.sqrt(3) / 2
    if (q2x > radius || q2y > h) return false
    return h * radius - h * q2x - (radius / 2) * q2y >= 0
  }

  let i = 0
  let guard = 0
  while (i < count && guard < count * 40) {
    guard++
    const x = (rand() * 2 - 1) * radius
    const y = (rand() * 2 - 1) * radius
    if (!isInHex(x, y)) continue
    // bias density toward center using a power falloff
    const distNorm = Math.sqrt(x * x + y * y) / radius
    if (rand() > Math.pow(1 - distNorm, 0.6) + 0.05) continue

    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = (rand() - 0.5) * radius * 0.25
    sizes[i] = 0.4 + rand() * 0.8
    phases[i] = rand() * Math.PI * 2
    edgeIndex[i] = 0
    i++
  }

  return { positions, sizes, phases, edgeIndex, actualCount: i }
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform float uPulse;

  attribute float aSize;
  attribute float aPhase;

  varying float vPhase;
  varying float vDist;

  void main() {
    vec3 pos = position;

    // gentle breathing displacement along the outward normal direction
    float breathe = sin(uTime * 0.6 + aPhase) * 0.06;
    pos.xy *= (1.0 + breathe * 0.02);
    pos.z += sin(uTime * 0.8 + aPhase * 2.0) * 0.12;

    // pointer repulsion in screen-projected xy space (approximated in local space)
    vec2 toPoint = pos.xy - uPointer;
    float d = length(toPoint);
    float falloff = smoothstep(1.1, 0.0, d);
    pos.xy += normalize(toPoint + 0.0001) * falloff * uPointerStrength;
    pos.z += falloff * uPointerStrength * 0.6;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = aSize * uPixelRatio * (1.0 + uPulse * 0.35 + falloff * 0.8) * (40.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;

    vPhase = aPhase;
    vDist = d;
  }
`

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uTime;

  varying float vPhase;
  varying float vDist;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float core = smoothstep(0.22, 0.0, d);
    float glow = smoothstep(0.5, 0.22, d);
    float alpha = clamp(core * 1.1 + glow * 0.22, 0.0, 1.0);

    float mixAmt = 0.5 + 0.5 * sin(uTime * 0.35 + vPhase);
    vec3 color = mix(uColorA, uColorB, mixAmt);

    // brighten hot core
    color += vec3(1.0) * core * 0.3;

    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`

function HexLayer({
  points,
  colorA,
  colorB,
  pointer,
  pointerStrength = 0.9,
  pulse,
  opacity = 1,
}: {
  points: { positions: Float32Array; sizes: Float32Array; phases: Float32Array }
  colorA: THREE.Color
  colorB: THREE.Color
  pointer: React.RefObject<THREE.Vector2>
  pointerStrength?: number
  pulse: React.RefObject<number>
  opacity?: number
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(points.positions, 3))
    geo.setAttribute('aSize', new THREE.BufferAttribute(points.sizes, 1))
    geo.setAttribute('aPhase', new THREE.BufferAttribute(points.phases, 1))
    return geo
  }, [points])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerStrength: { value: pointerStrength },
      uPulse: { value: 0 },
      uColorA: { value: colorA },
      uColorB: { value: colorB },
    }),
    [colorA, colorB, pointerStrength],
  )

  useFrame((state) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    materialRef.current.uniforms.uPointer.value.copy(pointer.current)
    materialRef.current.uniforms.uPulse.value = pulse.current
    materialRef.current.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
  })

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        opacity={opacity}
      />
    </points>
  )
}

/** Thin hexagon line outline rendered with LineLoop for crisp geometric edges */
function HexOutline({
  radius,
  rotation = 0,
  color,
  opacity = 0.5,
}: {
  radius: number
  rotation?: number
  color: string
  opacity?: number
}) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 6; i++) {
      const a = rotation + (Math.PI / 3) * i
      pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0))
    }
    return pts
  }, [radius, rotation])

  const geometry = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points])

  return (
    <lineLoop geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineLoop>
  )
}

export function HexagonParticleField() {
  const pointer = useRef(new THREE.Vector2(999, 999))
  const pulse = useRef(0)
  const { viewport } = useThree()

  const outerRing = useMemo(
    () => buildHexRingPoints({ radius: 2.9, count: 2600, bandWidth: 0.1, rotation: 0, seed: 11 }),
    [],
  )
  const innerRing = useMemo(
    () => buildHexRingPoints({ radius: 1.7, count: 1600, bandWidth: 0.07, rotation: Math.PI / 6, seed: 29 }),
    [],
  )
  const core = useMemo(() => buildHexFillPoints({ radius: 1.35, count: 700, seed: 53 }), [])

  const colorSoft = useMemo(() => new THREE.Color('#f2f2f2'), [])

  useFrame((state) => {
    pulse.current = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 0.9)
  })

  return (
    <group
      onPointerMove={(e) => {
        pointer.current.set(e.point.x, e.point.y)
      }}
      onPointerOut={() => {
        pointer.current.set(999, 999)
      }}
    >
      {/* invisible plane to capture pointer coordinates across the full viewport */}
      <mesh position={[0, 0, 0]} visible={false}>
        <planeGeometry args={[viewport.width * 1.4, viewport.height * 1.4]} />
        <meshBasicMaterial />
      </mesh>

      <group>
        <HexOutline radius={2.9} color="#f2f2f2" opacity={0.16} />
        <HexOutline radius={1.7} color="#a1a1aa" opacity={0.14} />

        <HexLayer points={outerRing} colorA={colorSoft} colorB={colorSoft} pointer={pointer} pointerStrength={0.4} pulse={pulse} opacity={0.85} />
        <HexLayer points={innerRing} colorA={colorSoft} colorB={colorSoft} pointer={pointer} pointerStrength={0.55} pulse={pulse} opacity={0.8} />
        <HexLayer points={core} colorA={colorSoft} colorB={colorSoft} pointer={pointer} pointerStrength={0.7} pulse={pulse} opacity={0.45} />
      </group>
    </group>
  )
}
