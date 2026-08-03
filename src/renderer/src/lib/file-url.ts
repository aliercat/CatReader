export function fileUrl(p: string): string {
  return 'file:///' + encodeURI(p.replace(/\\/g, '/'))
}
