import { createRoot } from 'react-dom/client'
import { MockLab } from './MockLab'

/** Renders the Mock Lab in its own React root, outside the application tree. */
export function mount() {
  const container = document.createElement('div')
  container.id = 'kurio-mock-lab'
  document.body.append(container)
  createRoot(container).render(<MockLab />)
}
