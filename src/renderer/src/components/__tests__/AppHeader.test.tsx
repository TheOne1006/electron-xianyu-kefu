import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { AppHeader } from '../AppHeader'
import { ThemeProvider } from '../../contexts/ThemeContext'

function renderHeader(pathname: string): string {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[pathname]}>
      <ThemeProvider>
        <AppHeader />
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('AppHeader', () => {
  it('在首页显示设置标题', () => {
    const html = renderHeader('/')

    expect(html).toContain('>设置<')
  })
})
