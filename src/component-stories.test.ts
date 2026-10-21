import { describe, expect, it } from 'vitest'

const storyModules = [
  './zalozky-app.stories',
  './zalozky-link.stories',
  './zalozky-tags.stories',
  './zalozky-widget.stories',
  './zalozky-link-editor.stories',
  './zalozky-widget-editor.stories',
  './html-fragment-editor.stories'
]

describe('component story coverage', () => {
  it.each(storyModules)('exports a story collection for %s', async (modulePath) => {
    const module = await import(modulePath)
    expect(module.default).toBeTruthy()
    const namedStories = Object.keys(module).filter((key) => key !== 'default')
    expect(namedStories.length).toBeGreaterThan(0)
  })
})
