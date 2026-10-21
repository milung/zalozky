# Zalozky

Zalozky is a lightweight bookmark and widget manager built with TypeScript and Lit. It helps you save useful links, tag them, search quickly, and keep your most relevant bookmarks at the top using simple usage-based ranking.

The app can run fully in local browser storage, and it also supports optional Firebase authentication and cloud sync when environment variables are configured.

## Features

- Save bookmarks and HTML-based widgets
- Search by title, URL, or description
- Filter bookmarks by tags
- Sort by probability / recent usefulness
- Theme switching with light/dark/system modes
- Local-first storage with optional Firebase sync
- Google sign-in support when Firebase is configured
- Storybook support for component development

## Tech Stack

- TypeScript
- Vite
- Lit
- Firebase (optional auth + Firestore)
- Vitest
- Storybook

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open the app in your browser, usually at:

   ```text
   http://localhost:5173
   ```

## Available Scripts

```bash
npm run dev
npm run build
npm run preview
npm run typecheck
npm run storybook
npm run build-storybook
npm run firebase:serve
npm run firebase:deploy
```

## Firebase Configuration

The app supports Firebase-backed authentication and bookmark storage. If you do not provide Firebase settings, the app still works in local mode.

Create a `.env.local` file in the project root with the following variables:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

After that, you can run:

```bash
npm run firebase:serve
```

or deploy the hosting and Firestore rules with:

```bash
npm run firebase:deploy
```

## Testing

The project includes Vitest tests. Run them with:

```bash
npx vitest run
```

For test coverage:

```bash
npx vitest run --coverage
```

## Project Structure

```text
.
├── src/
│   ├── bookmark-data.ts
│   ├── firebase.ts
│   ├── i18n.ts
│   ├── zalozky-app.ts
│   ├── ...
├── public/
├── firebase.json
├── firestore.rules
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .env.local (optional)
├── README.md
└── ...
```

## Notes

- The app stores bookmarks in browser local storage by default.
- Firebase sync is enabled only when the required environment variables are present.
- The UI supports localization through the i18n layer and can be extended with additional translations.


