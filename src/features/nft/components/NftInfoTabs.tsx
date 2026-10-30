import { StarIcon } from 'lucide-react'
import { cn } from 'cn'
import { NETWORK_LABEL, type NftDetail } from '@/api/contracts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, shortAddress } from '@/lib/format'

export type InfoTab = 'detalhes' | 'avaliacoes'

export function NftInfoTabs({
  nft,
  tab,
  onTabChange,
}: {
  nft: NftDetail
  tab: InfoTab
  onTabChange: (tab: InfoTab) => void
}) {
  const triggerClass =
    'h-auto flex-none px-0 pt-1 pb-3 text-[0.9375rem] text-soft group-data-horizontal/tabs:after:-bottom-px after:bg-brand group-data-[variant=line]/tabs-list:data-active:text-brand'

  return (
    <Tabs
      id="nft-info"
      value={tab}
      onValueChange={(value) => onTabChange(value as InfoTab)}
      className="scroll-mt-6 gap-0"
    >
      <TabsList
        variant="line"
        className="h-auto w-full flex-wrap justify-start gap-x-8 gap-y-1 border-b border-border p-0"
      >
        <TabsTrigger value="detalhes" className={triggerClass}>
          Detalhes do NFT
        </TabsTrigger>
        <TabsTrigger value="avaliacoes" className={triggerClass}>
          <span className="sm:hidden">Avaliações ({nft.rating.count})</span>
          <span className="hidden sm:inline">
            Avaliações de colecionadores ({nft.rating.count})
          </span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="detalhes" className="space-y-5 pt-5 text-sm leading-relaxed text-sand">
        {nft.story.map((paragraph) => (
          <p key={paragraph.slice(0, 32)}>{paragraph}</p>
        ))}
        <dl className="space-y-4">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>
              Cunhado na {NETWORK_LABEL[nft.network]} com procedência imutável e metadados
              armazenados no {nft.contract.metadataStorage}.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>
              <span className="font-mono" title={nft.contract.address}>
                {shortAddress(nft.contract.address)}
              </span>{' '}
              • Contrato inteligente {nft.contract.standard} verificado.
            </dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              Direitos autorais do criador ({nft.creator.name}): {nft.contract.royaltiesBps / 100}%
              nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>

      <TabsContent value="avaliacoes" className="pt-5">
        {nft.reviews.length === 0 ? (
          <p className="text-sm text-sand">Este NFT ainda não recebeu avaliações.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {nft.reviews.map((review) => (
              <li key={review.id} className="space-y-2 rounded-md bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold">{review.author}</p>
                  <span className="flex gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }, (_, index) => (
                      <StarIcon
                        key={index}
                        className={cn(
                          'size-3',
                          index < review.rating ? 'fill-primary text-primary' : 'text-meta',
                        )}
                      />
                    ))}
                  </span>
                  <span className="sr-only">Nota {review.rating} de 5</span>
                </div>
                <p className="text-sm text-sand">{review.comment}</p>
                <p className="text-xs text-meta">
                  <time dateTime={review.createdAt}>{formatDate(review.createdAt)}</time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  )
}
