# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A Progressive Web App (PWA) for tracking health metrics including weight, blood pressure, and pulse. Built with React, TypeScript, Vite, and Tailwind CSS v4.

## Development Commands

```bash
# Install dependencies (use local cache due to npm permission issues)
npm install --cache .npm-cache

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **React 18** with TypeScript
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling with CSS-first configuration (@theme in index.css)
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **vite-plugin-pwa** - PWA support with service worker

### Project Structure
- `/src/pages/` - Route components (Dashboard, Feed, Settings)
- `/src/components/` - Reusable components (Layout with bottom navigation)
- `/public/` - Static assets including PWA icon
- `/design/` - Design reference files

### Key Features
- Dark mode by default with localStorage persistence
- Offline-first PWA with service worker
- Time-series charts with 1W/1M/1Y views
- Bottom navigation with Feed/Dashboard/Settings
- Custom color palette (primary: #30e8c9, dark background: #11211e)

### Styling Notes
- Uses Tailwind CSS v4 with @theme directive (not traditional config file)
- Custom colors defined in src/index.css
- Dark mode via class-based strategy (HTML element gets 'dark' class)
- PostCSS plugin: @tailwindcss/postcss (not legacy tailwindcss plugin)
