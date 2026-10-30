import { useNavigate } from '@tanstack/react-router'
import { SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** Header search: a focus-trapped dialog that sends the term to the catalog URL (?q=). */
export function SearchDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    setOpen(false)
    void navigate({ to: '/mercado', search: { q: term.trim() || undefined } })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Buscar NFTs" className="text-foreground">
          <SearchIcon className="size-5" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar no catálogo</DialogTitle>
          <DialogDescription>Procure por nome, coleção, criador ou ID do token.</DialogDescription>
        </DialogHeader>
        <form role="search" onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <Label htmlFor="global-search" className="sr-only">
            Termo de busca
          </Label>
          <Input
            id="global-search"
            type="search"
            autoComplete="off"
            placeholder="Ex.: Emerald Ape, Nomad Society…"
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            className="h-10"
          />
          <Button type="submit">Buscar</Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
