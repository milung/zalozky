import i18next from 'i18next'
import { initLitI18n, translate as litTranslate } from 'lit-i18n'

export type Locale = 'en' | 'sk'

const resources = {
  en: {
    translation: {
      app: {
        searchPlaceholder: 'Search keywords or tags:docs && web',
        addBookmark: 'Add bookmark',
        addWidget: 'Add widget',
        addItemMenu: 'Add item menu',
        openAddOptions: 'Open add options',
        signInGoogle: 'Sign in with Google',
        signOut: 'Sign out',
        themeSystem: 'Theme: System',
        themeLight: 'Theme: Light',
        themeDark: 'Theme: Dark',
        googleUser: 'Google user',
        bookmarks: { one: 'bookmark', other: 'bookmarks' },
        emptyState: 'No bookmarks found',
        authRequired: 'Add Firebase configuration to enable Google sign-in.',
        authSignedIn: 'Signed in as {{name}}',
        authSignedOut: 'Signed out.',
        authSignInFailed: 'Google sign-in failed.',
        authSignOutFailed: 'Unable to sign out.',
        firebaseLoadFailed: 'Unable to load Firebase bookmarks.',
        loadFailed: 'Unable to load bookmarks.',
        bookmarkUrlRequired: 'A bookmark URL is required.',
        bookmarkSearchRequiresPlaceholder: 'Search bookmarks need a %s placeholder in the URL.',
        widgetTitleRequired: 'A widget title is required.',
        widgetHtmlRequired: 'Widget HTML is required.',
        firebaseSaveFailed: 'Firebase save failed; saved locally instead.',
        unableToSaveBookmark: 'Unable to save bookmark.',
        unableToSaveWidget: 'Unable to save widget.',
        deleteBookmarkFirebaseFailed: 'Unable to delete bookmark from Firebase.'
      },
      tags: {
        title: 'Tags',
        filterPlaceholder: 'Filter tags',
        filterLabel: 'Filter tags'
      },
      bookmark: {
        qrCode: 'QR code',
        edit: 'Edit',
        remove: 'Remove',
        search: 'Search',
        newBookmark: 'New bookmark',
        searchMode: 'Search mode (URL uses %s placeholder)',
        searchNote: 'The entered query replaces %s and the browser opens the completed URL in the same tab.',
        url: 'URL',
        behavior: 'Behavior',
        title: 'Title',
        iconUrl: 'Icon URL',
        toDataUrl: 'To data url',
        description: 'Description',
        colors: 'Colors',
        background: 'Background',
        border: 'Border',
        text: 'Text',
        addNewTag: 'Add new tag',
        add: 'Add',
        cancel: 'Cancel',
        saveChanges: 'Save changes',
        createBookmark: 'Create bookmark',
        editBookmark: 'Edit bookmark',
        addBookmark: 'Add bookmark',
        closeDialog: 'Close dialog',
        optionalDescription: 'Optional description',
        addNewBookmark: 'Add bookmark',
        noTitle: 'New bookmark'
      },
      widget: {
        edit: 'Edit',
        remove: 'Remove',
        title: 'Title',
        linkUrlOptional: 'Link URL (optional)',
        colors: 'Colors',
        background: 'Background',
        border: 'Border',
        text: 'Text',
        htmlFragment: 'HTML fragment',
        tags: 'Tags',
        addNewTag: 'Add new tag',
        add: 'Add',
        cancel: 'Cancel',
        saveChanges: 'Save widget',
        createWidget: 'Create widget',
        editWidget: 'Edit widget',
        addWidget: 'Add widget',
        closeDialog: 'Close dialog',
        widgetTitlePlaceholder: 'Widget title',
        urlPlaceholder: 'https://example.com',
        emptyTitle: 'New widget',
        widgetContent: 'Widget content'
      }
    }
  },
  sk: {
    translation: {
      app: {
        searchPlaceholder: 'Hľadaj kľúčové slová alebo tagy:docs && web',
        addBookmark: 'Pridať záložku',
        addWidget: 'Pridať widget',
        addItemMenu: 'Ponuka pridať položku',
        openAddOptions: 'Otvoriť možnosti pridania',
        signInGoogle: 'Prihlásiť sa cez Google',
        signOut: 'Odhlásiť sa',
        themeSystem: 'Téma: Systém',
        themeLight: 'Téma: Svetlá',
        themeDark: 'Téma: Tmavá',
        googleUser: 'Používateľ Google',
        bookmarks: { one: 'záložka', few: 'záložky', many: 'záložiek', other: 'záložiek' },
        emptyState: 'Nenašli sa žiadne záložky',
        authRequired: 'Pridajte Firebase konfiguráciu pre zapnutie Google prihlásenia.',
        authSignedIn: 'Prihlásený ako {{name}}',
        authSignedOut: 'Odhlásený.',
        authSignInFailed: 'Google prihlásenie zlyhalo.',
        authSignOutFailed: 'Nepodarilo sa odhlásiť.',
        firebaseLoadFailed: 'Nepodarilo sa načítať záložky z Firebase.',
        loadFailed: 'Nepodarilo sa načítať záložky.',
        bookmarkUrlRequired: 'URL záložky je povinná.',
        bookmarkSearchRequiresPlaceholder: 'Vyhľadávacie záložky potrebujú zástupný symbol %s v URL.',
        widgetTitleRequired: 'Názov widgetu je povinný.',
        widgetHtmlRequired: 'HTML widgetu je povinné.',
        firebaseSaveFailed: 'Uloženie do Firebase zlyhalo; uložilo sa lokálne.',
        unableToSaveBookmark: 'Nepodarilo sa uložiť záložku.',
        unableToSaveWidget: 'Nepodarilo sa uložiť widget.',
        deleteBookmarkFirebaseFailed: 'Nepodarilo sa odstrániť záložku z Firebase.'
      },
      tags: {
        title: 'Tagy',
        filterPlaceholder: 'Filtrovať tagy',
        filterLabel: 'Filtrovať tagy'
      },
      bookmark: {
        qrCode: 'QR kód',
        edit: 'Upraviť',
        remove: 'Odstrániť',
        search: 'Hľadať',
        newBookmark: 'Nová záložka',
        searchMode: 'Vyhľadávací režim (URL používa %s)',
        searchNote: 'Zadaný výraz nahradí %s a prehliadač otvorí dokončenú URL v rovnakom okne.',
        url: 'URL',
        behavior: 'Správanie',
        title: 'Názov',
        iconUrl: 'URL ikony',
        toDataUrl: 'Na data url',
        description: 'Popis',
        colors: 'Farby',
        background: 'Pozadie',
        border: 'Rám',
        text: 'Text',
        addNewTag: 'Pridať nový tag',
        add: 'Pridať',
        cancel: 'Zrušiť',
        saveChanges: 'Uložiť zmeny',
        createBookmark: 'Vytvoriť záložku',
        editBookmark: 'Upraviť záložku',
        addBookmark: 'Pridať záložku',
        closeDialog: 'Zavrieť dialóg',
        optionalDescription: 'Voliteľný popis',
        addNewBookmark: 'Pridať záložku',
        noTitle: 'Nová záložka'
      },
      widget: {
        edit: 'Upraviť',
        remove: 'Odstrániť',
        title: 'Názov',
        linkUrlOptional: 'URL odkazu (voliteľné)',
        colors: 'Farby',
        background: 'Pozadie',
        border: 'Rám',
        text: 'Text',
        htmlFragment: 'HTML fragment',
        tags: 'Tagy',
        addNewTag: 'Pridať nový tag',
        add: 'Pridať',
        cancel: 'Zrušiť',
        saveChanges: 'Uložiť widget',
        createWidget: 'Vytvoriť widget',
        editWidget: 'Upraviť widget',
        addWidget: 'Pridať widget',
        closeDialog: 'Zavrieť dialóg',
        widgetTitlePlaceholder: 'Názov widgetu',
        urlPlaceholder: 'https://example.com',
        emptyTitle: 'Nový widget',
        widgetContent: 'Obsah widgetu'
      }
    }
  }
} as const

const fallbackLocale: Locale = 'en'

const resolveLocale = (): Locale => {
  if (typeof window === 'undefined') return fallbackLocale
  const stored = window.localStorage.getItem('zalozky-locale')
  if (stored === 'en' || stored === 'sk') return stored
  const browserLanguage = String(window.navigator?.language ?? '').toLowerCase()
  return browserLanguage.startsWith('sk') ? 'sk' : 'en'
}

let currentLocale: Locale = resolveLocale()

i18next.use(initLitI18n).init({
  lng: currentLocale,
  fallbackLng: fallbackLocale,
  resources,
  defaultNS: 'translation',
  interpolation: { escapeValue: false }
})

export function getCurrentLocale(): Locale {
  return currentLocale
}

export function setLocale(nextLocale: string): Locale {
  const safeLocale = nextLocale === 'sk' || nextLocale === 'en' ? nextLocale : fallbackLocale
  currentLocale = safeLocale
  void i18next.changeLanguage(safeLocale)

  if (typeof window !== 'undefined') {
    window.localStorage.setItem('zalozky-locale', safeLocale)
    document.documentElement.lang = safeLocale
  }

  return safeLocale
}

export function formatCount(key: string, count: number) {
  const locale = getCurrentLocale()
  const lookup = key.split('.').reduce<any>((target, segment) => target?.[segment], resources[locale].translation)

  if (typeof lookup === 'string') {
    return lookup
  }

  if (lookup && typeof lookup === 'object') {
    if (locale === 'sk') {
      const mod10 = Math.abs(count) % 10
      const mod100 = Math.abs(count) % 100
      if (count === 1) return lookup.one ?? lookup.other ?? String(count)
      if (mod10 === 1 && mod100 !== 11) return lookup.one ?? lookup.other ?? String(count)
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return lookup.few ?? lookup.other ?? String(count)
      return lookup.many ?? lookup.other ?? String(count)
    }

    if (count === 1) return lookup.one ?? lookup.other ?? String(count)
    return lookup.other ?? String(count)
  }

  return String(count)
}

export function t(key: string, options?: Record<string, unknown>) {
  return i18next.t(key, options as any)
}

export function translate(key: string, options?: Record<string, unknown>) {
  return litTranslate(key, options)
}

export const i18n = i18next

setLocale(currentLocale)
