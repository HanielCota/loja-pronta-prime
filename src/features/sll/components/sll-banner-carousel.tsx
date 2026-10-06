'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveRegion } from '@/components/ui/live-region';
import { panelCard } from '@/features/member/components/area-shell';

type Banner = {
  id: string;
  label: string | null;
  title: string;
  description: string;
  buttonLabel: string;
  destination: string;
  imageAlt: string | null;
};

/**
 * Destaques no topo do painel. Sem banner publicado, não mostra nada: um cartão grande dizendo
 * "nenhum aviso" empurrava o painel pra baixo sem dar nada pra ela fazer.
 */
export function SllBannerCarousel({ banners }: { banners: Banner[] }) {
  const [active, setActive] = useState(0);
  // Só anuncia a troca que ela pediu (nada ao abrir a página). A região fica sempre montada: a
  // parte do banner é recriada a cada troca, e região recriada junto com o texto não é anunciada.
  const [announcement, setAnnouncement] = useState('');
  if (!banners.length) return null;
  const banner = banners[active] ?? banners[0]!;
  const show = (index: number) => {
    setActive(index);
    setAnnouncement(`Banner ${index + 1} de ${banners.length}: ${banners[index]?.title ?? ''}`);
  };
  const next = (active + 1) % banners.length;
  const previous = (active - 1 + banners.length) % banners.length;
  const button = banner.destination.startsWith('/') ? (
    <Button asChild>
      <Link href={banner.destination}>
        {banner.buttonLabel}
        <ArrowRight aria-hidden="true" />
      </Link>
    </Button>
  ) : (
    <Button asChild>
      <a href={banner.destination} rel="noreferrer" target="_blank">
        {banner.buttonLabel}
        <ArrowRight aria-hidden="true" />
      </a>
    </Button>
  );

  return (
    <section
      aria-label="Destaques do SLL"
      aria-roledescription="carrossel"
      className={`${panelCard} gap-5`}
    >
      <div
        className="grid items-center gap-5 motion-safe:animate-in motion-safe:duration-300 motion-safe:fade-in md:grid-cols-[minmax(0,3fr)_minmax(16rem,2fr)]"
        key={banner.id}
      >
        <div className="flex flex-col items-start gap-3">
          {banner.label ? (
            <p className="rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-link">
              {banner.label}
            </p>
          ) : null}
          {/* Fica antes do título da página: um parágrafo, não h2, pra não abrir a página com um
              subtítulo antes do h1. A seção já tem nome ("Destaques do SLL"). */}
          <p className="text-title font-semibold text-balance text-foreground">{banner.title}</p>
          <p className="text-body text-pretty text-muted-foreground">{banner.description}</p>
          {button}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={banner.imageAlt ?? ''}
          className="aspect-[2/1] w-full rounded-2xl object-cover"
          src={`/api/sll/banner/${banner.id}`}
        />
      </div>
      {banners.length > 1 ? (
        <div className="flex items-center justify-center gap-3 border-t border-border pt-4">
          <Button
            aria-label="Banner anterior"
            onClick={() => show(previous)}
            size="icon"
            type="button"
            variant="soft"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <fieldset className="flex items-center gap-2">
            <legend className="sr-only">Escolher banner</legend>
            {banners.map((item, index) => (
              <button
                aria-pressed={index === active}
                aria-label={`Mostrar banner ${index + 1}: ${item.title}`}
                className={`min-h-11 min-w-11 rounded-full px-3 text-body outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${index === active ? 'bg-primary-soft text-link' : 'text-foreground hover:bg-muted'}`}
                key={item.id}
                onClick={() => show(index)}
                type="button"
              >
                {index + 1}
              </button>
            ))}
          </fieldset>
          <Button
            aria-label="Próximo banner"
            onClick={() => show(next)}
            size="icon"
            type="button"
            variant="soft"
          >
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <LiveRegion>{announcement}</LiveRegion>
    </section>
  );
}
