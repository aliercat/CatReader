import { useEffect, useState } from 'react'
import Bookshelf from './pages/Bookshelf'
import Reader from './pages/Reader'
import { applyUiTheme, loadUiTheme, saveUiTheme, type UiThemeMode } from './lib/ui-theme'

type View = { type: 'shelf' } | { type: 'reader'; bookId: string }

function App() {
  const [view, setView] = useState<View>({ type: 'shelf' })
  const [uiTheme, setUiTheme] = useState<UiThemeMode>(() => loadUiTheme())

  useEffect(() => {
    applyUiTheme(uiTheme)
  }, [uiTheme])

  const changeUiTheme = (mode: UiThemeMode): void => {
    setUiTheme(mode)
    saveUiTheme(mode)
  }

  if (view.type === 'reader') {
    return (
      <Reader
        bookId={view.bookId}
        onBack={() => setView({ type: 'shelf' })}
        uiTheme={uiTheme}
        onUiThemeChange={changeUiTheme}
      />
    )
  }
  return <Bookshelf onOpen={(bookId) => setView({ type: 'reader', bookId })} />
}

export default App
