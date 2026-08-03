const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#2f9e63)',
  'linear-gradient(135deg,#fa709a,#f7b733)',
  'linear-gradient(135deg,#30cfd0,#330867)'
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function CoverPlaceholder({ title }: { title: string }) {
  const ch = (title.trim().charAt(0) || '书').toUpperCase()
  const bg = GRADIENTS[hashCode(title) % GRADIENTS.length]
  return (
    <div className="cover-ph" style={{ background: bg }}>
      {ch}
    </div>
  )
}
