/// <reference types="vite/client" />

interface Highlight {
  add(range: AbstractRange): void
  delete(range: AbstractRange): boolean
  clear(): void
}

interface HighlightRegistry {
  set(name: string, highlight: Highlight): void
  delete(name: string): boolean
  clear(): void
}

interface CSS {
  highlights?: HighlightRegistry
}

declare var Highlight: {
  new (...ranges: AbstractRange[]): Highlight
}
