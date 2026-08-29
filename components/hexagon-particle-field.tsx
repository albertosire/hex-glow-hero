'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
uniform vec2 uPointer;
uniform float uPointerActive;
uniform float uPointSize;
varying float vHover;

void main() {
  vec3 pos = position;
  float distanceToPointer = distance(pos.xy, uPointer);
  vHover = smoothstep(0.75, 0.0, distanceToPointer) * uPointerActive;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = uPointSize * (1.0 + vHover * 1.5) * (42.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`

const fragmentShader = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vHover;

void main() {
  float distanceToCenter = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.2, 0.0, distanceToCenter);
  float halo = smoothstep(0.5, 0.05, distanceToCenter);
  vec3 color = mix(uColor, vec3(1.0), vHover * 0.8);
  float alpha = core * (0.8 + vHover * 0.2) + halo * vHover * 0.35;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(color * (1.0 + vHover * 1.8), alpha);
}
`

const backgroundVertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const backgroundFragmentShader = /* glsl */ `
precision highp float;
uniform vec2 uPointer;
uniform float uPointerActive;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  vec2 world = (vUv - 0.5) * uResolution;
  float light = 0.0;
  float pointerDistance = distance(world, uPointer);
  light += smoothstep(2.6, 0.0, pointerDistance) * uPointerActive;
  vec3 base = vec3(0.025, 0.025, 0.03);
  vec3 illuminated = vec3(0.28, 0.28, 0.3) * light;
  gl_FragColor = vec4(base + illuminated, 1.0);
}
`

function hexagonVertices(radius: number, z: number, rotation = Math.PI / 6) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = rotation + (Math.PI / 3) * index
    return new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z)
  })
}

function HexNodes({
  points,
  pointer,
  color,
  size,
}: {
  points: THREE.Vector3[]
  pointer: React.RefObject<THREE.Vector2>
  color: THREE.Color
  size: number
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const geometry = useMemo(() => {
    const next = new THREE.BufferGeometry()
    next.setFromPoints(points)
    return next
  }, [points])

  const uniforms = useMemo(
    () => ({
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerActive: { value: 0 },
      uPointSize: { value: size },
      uColor: { value: color },
    }),
    [color, size],
  )

  useFrame(() => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uPointer.value.copy(pointer.current)
    materialRef.current.uniforms.uPointerActive.value = pointer.current.x < 100 ? 1 : 0
  })

  return (
    <points geometry={geometry} renderOrder={2}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite
        depthTest
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function BackgroundGlow({ pointer }: { pointer: React.RefObject<THREE.Vector2> }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const { viewport } = useThree()
  const uniforms = useMemo(
    () => ({
      uPointer: { value: new THREE.Vector2(999, 999) },
      uPointerActive: { value: 0 },
      uResolution: { value: new THREE.Vector2(viewport.width, viewport.height) },
    }),
    [viewport.width, viewport.height],
  )

  useFrame(() => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uPointer.value.copy(pointer.current)
    materialRef.current.uniforms.uPointerActive.value = pointer.current.x < 100 ? 1 : 0
  })

  return (
    <mesh position={[0, 0, -0.8]} renderOrder={0}>
      <planeGeometry args={[viewport.width, viewport.height]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={backgroundVertexShader}
        fragmentShader={backgroundFragmentShader}
        uniforms={uniforms}
        depthWrite
        depthTest
      />
    </mesh>
  )
}

export function HexagonParticleField() {
  const pointer = useRef(new THREE.Vector2(999, 999))
  const { viewport } = useThree()
  const outerPoints = useMemo(() => hexagonVertices(2.9, 0), [])
  const innerPoints = useMemo(() => hexagonVertices(1.7, 0.08), [])
  const color = useMemo(() => new THREE.Color('#ededed'), [])

  return (
    <group
      onPointerMove={(event) => pointer.current.set(event.point.x, event.point.y)}
      onPointerOut={() => pointer.current.set(999, 999)}
    >
      <BackgroundGlow pointer={pointer} />
      <mesh position={[0, 0, 0.5]} visible={false}>
        <planeGeometry args={[viewport.width, viewport.height]} />
        <meshBasicMaterial />
      </mesh>
      <HexNodes points={outerPoints} pointer={pointer} color={color} size={0.18} />
      <HexNodes points={innerPoints} pointer={pointer} color={color} size={0.22} />
    </group>
  )
}

