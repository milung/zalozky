import './zalozky-link'

const buildLink = (args = {}) => {
  const element = document.createElement('zalozky-link')
  Object.assign(element, {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    description: 'Reference documentation for web standards and browsers',
    icon: 'https://developer.mozilla.org/favicon.ico',
    tags: ['docs', 'web'],
    background: '#ecfeff',
    borderColor: '#06b6d4',
    foregroundColor: '#111827',
    source: 'local',
    isSearch: false,
    expanded: false,
    ...args
  })
  return element
}

export default {
  title: 'Components/Zalozky Link',
  component: 'zalozky-link',
  render: (args) => buildLink(args)
}

export const Default = {
  args: {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org',
    description: 'Reference documentation for web standards and browsers',
    icon: 'https://developer.mozilla.org/favicon.ico',
    tags: ['docs', 'web'],
    source: 'local'
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link')
    const title = host?.shadowRoot?.querySelector('h3')?.textContent ?? ''
    const anchor = host?.shadowRoot?.querySelector('.bookmark-link')

    expect(title).toContain('MDN')
    expect(anchor?.getAttribute('href')).toBe('https://developer.mozilla.org')
    expect(host?.shadowRoot?.querySelectorAll('.tag').length).toBe(2)
  }
}

export const SearchMode = {
  args: {
    title: 'Search the docs',
    url: 'https://example.com/search?q=%s',
    isSearch: true,
    tags: ['search'],
    description: 'Search within the docs index'
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link')
    const searchInput = host?.shadowRoot?.querySelector('.search-input')
    const form = host?.shadowRoot?.querySelector('.search-box')

    expect(searchInput).not.toBeNull()
    expect(form).not.toBeNull()
    expect(host?.shadowRoot?.querySelector('.bookmark-link')?.getAttribute('href')).toBe('')
  }
}

export const Expanded = {
  args: {
    title: 'Expanded preview',
    url: 'https://example.com',
    description: 'This card is expanded to show a QR preview',
    expanded: true,
    tags: ['preview']
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-link')
    const card = host?.shadowRoot?.querySelector('.bookmark-card')
    const qr = host?.shadowRoot?.querySelector('.qr-wrap img')

    expect(card?.classList.contains('expanded')).toBe(true)
    expect(qr).not.toBeNull()
    expect(qr?.getAttribute('src')).toContain('api.qrserver.com')
  }
}
