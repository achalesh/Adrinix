# Theme Switcher Implementation Plan

This plan outlines the steps to add a global Light Mode to the Adrinix platform, complete with a state-persisted theme switcher in the Settings page.

## Proposed Changes

### 1. State Management
#### [NEW] `src/store/useThemeStore.ts`
We will create a lightweight Zustand store using the `persist` middleware. This ensures that the user's theme preference (`light` or `dark`) is saved in the browser's `localStorage` and persists across sessions.

### 2. Global Styling Updates
#### [MODIFY] `src/index.css`
- Keep the existing `:root` variables as the default (Dark Mode).
- Add a new `[data-theme="light"]` selector block that overrides the CSS variables for a clean, premium light aesthetic:
  - `--bg-color`: `#f3f4f6`
  - `--panel-bg`: `rgba(255, 255, 255, 0.8)`
  - `--panel-border`: `rgba(0, 0, 0, 0.08)`
  - `--text-primary`: `#111827`
  - `--text-secondary`: `#4b5563`
  - `--glass-shadow`: `0 8px 32px 0 rgba(0, 0, 0, 0.05)`
- Add a smooth transition to body and panel backgrounds to make switching feel polished.

### 3. Application Integration
#### [MODIFY] `src/App.tsx`
- Inject the `useThemeStore` to listen to theme changes.
- Add a `useEffect` hook to apply the `data-theme` attribute directly to the HTML document element (`document.documentElement.setAttribute('data-theme', theme)`). This enables the CSS overrides globally.

### 4. User Interface
#### [MODIFY] `src/pages/Settings.tsx`
- Add a "Theme Preference" section within the "Appearance" tab.
- Create a toggle UI (e.g., Sun/Moon icons) that allows the user to click and instantly switch between Light and Dark modes.

## User Review Required
> [!IMPORTANT]
> Since the app was originally designed solely for Dark Mode, some nested custom components (like specific charts or invoice PDFs) might require slight tweaks after the base light mode is implemented. The core UI (nav, settings, forms) will adapt perfectly via CSS variables.

Are you ready to proceed with this implementation?
