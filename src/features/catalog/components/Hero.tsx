import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { cn } from 'cn'
import { NftImage } from '@/components/common/NftImage'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { highlightsQueryOptions } from '../queries'

/**
 * "Destaques": hero with the featured NFTs from the highlights API. Slides change only on
 * request (no auto-rotation), each dot is a labelled button.
 */
export function Hero() {
  const { data, isPending } = useQuery(highlightsQueryOptions())
  const [index, setIndex] = useState(0)
  const slides = data?.hero ?? []
  const current = slides.length ? slides[index % slides.length]! : null

  return (
    <section aria-labelledby="hero-title" className="page-container">
      <div className="grid items-center gap-8 py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] md:gap-10 md:py-10 lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col items-start gap-5">
          <p className="text-sm font-medium text-soft">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="text-[1.75rem] leading-[1.45] font-bold tracking-tight uppercase sm:text-4xl lg:text-[2.75rem] lg:leading-[1.55]"
          >
            Seja dono do futuro
            <br className="hidden sm:block" /> da arte digital
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-sand">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital
            rara, apoie artistas e tenha uma parte da cultura da internet.
          </p>
          <div className="flex w-full items-center justify-between gap-4 pt-2">
            <Button asChild className="h-10 px-5 tracking-wide uppercase">
              <a href="#catalogo">Explorar</a>
            </Button>
            {slides.length > 1 && (
              <div role="group" aria-label="Escolher destaque" className="flex items-center gap-1">
                {slides.map((slide, position) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setIndex(position)}
                    aria-label={`Mostrar destaque ${position + 1} de ${slides.length}: ${slide.name}`}
                    aria-pressed={position === index % slides.length}
                    className="grid size-6 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span
                      className={cn(
                        'block size-1.5 rounded-full transition-all',
                        position === index % slides.length ? 'w-4 bg-brand' : 'bg-primary/50',
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          aria-roledescription="carrossel"
          aria-label="Destaques"
          className="w-full max-w-[28rem] justify-self-center md:justify-self-end"
        >
          {isPending || !current ? (
            <Skeleton className="aspect-square w-full rounded-3xl" />
          ) : (
            <Link
              to="/nft/$nftId"
              params={{ nftId: current.id }}
              aria-roledescription="slide"
              aria-label={`${current.name} — destaque ${(index % slides.length) + 1} de ${slides.length}`}
              className="block overflow-hidden rounded-3xl focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
            >
              <NftImage
                image={current.image}
                sizes="(min-width: 768px) 448px, calc(100vw - 2rem)"
                priority
                className="rounded-3xl"
              />
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
