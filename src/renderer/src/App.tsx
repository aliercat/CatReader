import { useState } from 'react'
import Bookshelf from './pages/Bookshelf'
import Reader from './pages/Reader'

type View = { type: 'shelf' } | { type: 'reader'; bookId: string }

function App() {
  const [view, setView] = useState<View>({ type: 'shelf' })

  if (view.type === 'reader') {
    return <Reader bookId={view.bookId} onBack={() => setView({ type: 'shelf' })} />
  }
  return <Bookshelf onOpen={(bookId) => setView({ type: 'reader', bookId })} />
}

export default App
