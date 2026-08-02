/**
 * Simple in-memory cache for decoded txt content so chapter slicing does not
 * re-read a potentially 100MB file on every page turn.
 */
export class TextCache {
  private readonly cache = new Map<string, string>()

  get(bookId: string): string | undefined {
    return this.cache.get(bookId)
  }

  set(bookId: string, text: string): void {
    this.cache.set(bookId, text)
  }

  delete(bookId: string): void {
    this.cache.delete(bookId)
  }
}
