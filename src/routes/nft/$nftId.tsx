import { createFileRoute } from '@tanstack/react-router'
import { usePageTitle } from '@/lib/use-page-title'

export const Route = createFileRoute('/nft/$nftId')({
  component: Page,
})

function Page() {
  usePageTitle('NFT')
  return (
    <section className="page-container py-12">
      <h1 className="text-2xl font-bold">NFT</h1>
    </section>
  )
}
