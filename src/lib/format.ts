export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function shortAddress(address: string, head = 6, tail = 4) {
  return address.length <= head + tail + 1
    ? address
    : `${address.slice(0, head)}…${address.slice(-tail)}`
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const date = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' })

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso))
export const formatDate = (iso: string) => date.format(new Date(iso))
