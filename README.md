# Health Dashboard PWA

A Progressive Web App for tracking health metrics including weight, blood pressure, and pulse. Built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- 📊 **Track Multiple Metrics** - Monitor weight, blood pressure, and pulse
- 📈 **Time-Series Charts** - Visualize your data over 1W/1M/1Y periods
- 🌙 **Dark Mode** - Beautiful dark theme with localStorage persistence
- 📱 **Mobile First** - Responsive design optimized for mobile devices
- 🔌 **Offline Support** - Full PWA with service worker for offline usage
- ⚡ **Fast & Modern** - Built with Vite for lightning-fast development

## Getting Started

### Installation

```bash
# Install dependencies (use local cache if you have npm permission issues)
npm install --cache .npm-cache

# Generate PWA icons (PNG files for iOS)
npm run generate-icons
```

### Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:5173`

### Installing as PWA on iPhone

1. Open the app in Safari browser
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. The app icon will appear on your home screen
5. Launch it like a native app with full-screen experience

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS with new @theme syntax
- **React Router** - Client-side routing
- **Recharts** - Data visualization
- **vite-plugin-pwa** - PWA support with service worker

## Project Structure

```
├── public/          # Static assets
├── src/
│   ├── components/  # Reusable components (Layout, etc.)
│   ├── pages/       # Route components (Dashboard, Feed, Settings)
│   ├── App.tsx      # Main app component with routing
│   ├── index.css    # Global styles and Tailwind config
│   └── main.tsx     # App entry point
├── design/          # Design reference files
└── CLAUDE.md        # AI assistant guidance
```

## Design

The design features a modern dark theme with a teal accent color (#30e8c9). Reference designs are available in the `/design` folder showing the dashboard layout and component structure.
