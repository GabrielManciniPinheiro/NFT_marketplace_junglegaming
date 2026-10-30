import { Link } from '@tanstack/react-router'

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="page-container flex flex-col gap-3 py-8 text-xs text-meta sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Kurio. Arte digital com procedência.</p>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/mercado" className="hover:text-sand">
            Mercado
          </Link>
          <Link to="/carrinho" className="hover:text-sand">
            Carrinho
          </Link>
          <Link to="/perfil" className="hover:text-sand">
            Minha conta
          </Link>
        </nav>
        <p>Ambiente de demonstração: pagamentos, carteiras e blockchain são simulados.</p>
      </div>
    </footer>
  )
}
