'use client'

import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { HexagonParticleField } from './hexagon-particle-field'

export function HexagonHeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <Suspense fallback={null}>
        <HexagonParticleField />
      </Suspense>
    </Canvas>
  )
}
