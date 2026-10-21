import './zalozky-widget'

const buildWidget = (args = {}) => {
  const element = document.createElement('zalozky-widget')
  Object.assign(element, {
    title: 'Weather widget',
    url: 'https://example.com/weather',
    html: '<section><h3>Sunny</h3><p>24°C</p></section>',
    tags: ['weather', 'dashboard'],
    background: '#fef3c7',
    borderColor: '#f59e0b',
    foregroundColor: '#111827',
    source: 'local',
    expanded: false,
    ...args
  })
  return element
}

export default {
  title: 'Components/Zalozky Widget',
  component: 'zalozky-widget',
  render: (args) => buildWidget(args)
}

export const Default = {
  args: {
    title: 'Weather widget',
    html: '<section><h3>Sunny</h3><p>24°C</p></section>',
    tags: ['weather', 'dashboard']
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget')
    const content = host?.shadowRoot?.querySelector('.widget-content')
    const tags = host?.shadowRoot?.querySelectorAll('.tag') ?? []

    expect(content?.textContent).toContain('Sunny')
    expect(tags.length).toBe(2)
  }
}

export const EmptyContent = {
  args: {
    title: 'Empty widget',
    html: ''
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget')
    const placeholder = host?.shadowRoot?.querySelector('.widget-empty')

    expect(placeholder?.textContent).toBe('Widget content')
  }
}

export const ClickNavigation = {
  args: {
    title: 'Metric dashboard',
    url: '',
    html: '<div>Metric</div>'
  },
  play: async ({ canvasElement }) => {
    const host = canvasElement.querySelector('zalozky-widget')
    const card = host?.shadowRoot?.querySelector('.widget-card')

    expect(card).not.toBeNull()
    expect(() => {
      card?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))
    }).not.toThrow()
  }
}
