import './zalozky-tags'

const buildTags = (args = {}) => {
  const element = document.createElement('zalozky-tags')
  Object.assign(element, {
    tags: ['docs', 'dev', 'web', 'design'],
    selectedTags: ['docs'],
    filterText: '',
    locale: 'en',
    ...args
  })
  return element
}

export default {
  title: 'Components/Zalozky Tags',
  component: 'zalozky-tags',
  render: (args) => buildTags(args)
}

export const Default = {
  args: {
    tags: ['docs', 'dev', 'web', 'design'],
    selectedTags: ['docs'],
    filterText: ''
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-tags')
    const buttons = host?.shadowRoot?.querySelectorAll('.tag-pill') ?? []
    const selected = host?.shadowRoot?.querySelector('.tag-pill.selected')

    expect(buttons.length).toBe(4)
    expect(selected?.textContent).toContain('docs')
  }
}

export const Filtered = {
  args: {
    tags: ['docs', 'dev', 'web', 'design'],
    filterText: 'de',
    selectedTags: []
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-tags')
    const visible = host?.shadowRoot?.querySelectorAll('.tag-pill') ?? []

    expect(Array.from(visible).map((button) => button.textContent?.trim())).toEqual(expect.arrayContaining([':design', ':dev']))
  }
}

export const ToggleEvent = {
  args: {
    tags: ['docs', 'dev', 'web'],
    selectedTags: []
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-tags')
    const button = host?.shadowRoot?.querySelector('.tag-pill')
    const toggleSpy = vi.fn()
    host?.addEventListener('tag-toggle', toggleSpy)

    const expectedTag = String(button?.textContent ?? '').trim().replace(/^:/, '')

    button?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    await Promise.resolve()

    expect(toggleSpy).toHaveBeenCalledTimes(1)
    expect(toggleSpy.mock.calls[0]?.[0]?.detail?.tag).toBe(expectedTag)
  }
}
