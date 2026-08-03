export type MeasureFn = (text: string) => number

export interface PaginationResult {
  pages: string[]
  pageCount: number
}

/**
 * Split plain text into pages by measuring prefixes against a fixed page
 * height. `measure` returns the rendered height of the given text in px.
 * Uses an exponential upper-bound probe + binary search per page.
 */
export function paginate(text: string, measure: MeasureFn, pageHeight: number): PaginationResult {
  if (!text) return { pages: [''], pageCount: 1 }
  const pages: string[] = []
  let rest = text
  let estimate = 1

  while (rest.length > 0) {
    let lo = 1
    let hi = Math.min(rest.length, Math.max(estimate * 2, 2))
    while (hi < rest.length && measure(rest.slice(0, hi)) <= pageHeight) {
      hi = Math.min(rest.length, hi * 2)
    }
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2)
      if (measure(rest.slice(0, mid)) <= pageHeight) {
        lo = mid
      } else {
        hi = mid - 1
      }
    }
    const cut = Math.max(1, lo)
    pages.push(rest.slice(0, cut).trimEnd() || ' ')
    rest = rest.slice(cut)
    estimate = cut
  }
  return { pages, pageCount: pages.length }
}
