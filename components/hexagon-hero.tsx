'use client'

import dynamic from 'next/dynamic'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const HexagonHeroScene = dynamic(
  () => import('@/components/hexagon-hero-scene').then((mod) => mod.HexagonHeroScene),
  { ssr: false },
)

export function HexagonHero() {
  return (
    <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background">
      {/* fine grid texture backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(to right, oklch(1 0 0 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.5) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,oklch(0.78_0.14_68/0.08),transparent)]" />

      <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden className="text-primary">
            <path
              d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-mono text-sm font-medium uppercase tracking-[0.2em] text-foreground">
            Núcleo
          </span>
        </div>
        <nav className="hidden items-center gap-8 font-mono text-xs uppercase tracking-[0.15em] text-muted-foreground md:flex">
          <a href="#" className="transition-colors hover:text-foreground">
            Sistema
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Arquitetura
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Contato
          </a>
        </nav>
        <Button
          size="sm"
          variant="outline"
          className="hidden border-border bg-transparent font-mono text-xs uppercase tracking-[0.15em] md:inline-flex"
        >
          Acessar
        </Button>
      </header>

      <div className="relative flex flex-1 items-center justify-center">
        <div className="absolute inset-0 z-0">
          <HexagonHeroScene />
        </div>

        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
          <span className="mb-6 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground backdrop-blur-sm">
            Campo de partículas — tempo real
          </span>
          <h1 className="text-balance font-sans text-5xl font-semibold leading-[1.05] text-foreground md:text-7xl">
            Estrutura viva no
            <br />
            núcleo do sistema
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Duas camadas hexagonais concêntricas, milhares de partículas reagindo ao seu cursor em
            tempo real. Renderizado com shaders customizados em react-three-fiber.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Button size="lg" className="group gap-2 font-mono text-sm uppercase tracking-[0.1em]">
              Explorar núcleo
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="font-mono text-sm uppercase tracking-[0.1em] text-muted-foreground hover:text-foreground"
            >
              Ver documentação
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between border-t border-border/60 px-6 py-5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground md:px-10">
        <span>Mova o cursor sobre o núcleo</span>
        <span className="hidden md:inline">WebGL · Shader GLSL customizado</span>
      </div>
    </section>
  )
}
