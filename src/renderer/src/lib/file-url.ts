export function fileUrl(p: string): string {
  return 'catreader://local/' + encodeURI(p.replace(/\\/g, '/'))
}
