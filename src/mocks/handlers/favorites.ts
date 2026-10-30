import { mockConfig } from '../config'
import { store } from '../db/store'
import { summaryById } from '../domain/catalog'
import { fail, json, noContent, route } from '../lib/http'

function failIfConfigured() {
  if (mockConfig.get().favoritesFailure) {
    throw fail(500, 'INTERNAL_ERROR', 'Não foi possível atualizar seus favoritos agora.', {
      retryable: true,
    })
  }
}

export const favoritesHandlers = [
  route('get', '/favorites', 'required', ({ auth }) => {
    const items = (store.state.favorites[auth.user.id] ?? [])
      .map((favorite) => ({ ...favorite, nft: summaryById(favorite.nftId) }))
      .filter((favorite) => favorite.nft !== null)
      .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    return json({ items })
  }),

  route('put', '/favorites/:nftId', 'required', ({ auth, params }) => {
    failIfConfigured()
    const nft = summaryById(params.nftId!)
    if (!nft) throw fail(404, 'NOT_FOUND', 'NFT não encontrado.')
    const list = (store.state.favorites[auth.user.id] ??= [])
    let favorite = list.find((item) => item.nftId === nft.id)
    if (!favorite) {
      favorite = { nftId: nft.id, addedAt: new Date().toISOString() }
      list.push(favorite)
    }
    return json({ ...favorite, nft })
  }),

  route('delete', '/favorites/:nftId', 'required', ({ auth, params }) => {
    failIfConfigured()
    const list = store.state.favorites[auth.user.id] ?? []
    store.state.favorites[auth.user.id] = list.filter((item) => item.nftId !== params.nftId)
    return noContent()
  }),
]
