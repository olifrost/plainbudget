# PlainBudget Viewer

A modern web interface for viewing PlainBudget files with live preview and statistics.

## Features

- 🎨 **Beautiful HTML Rendering**: Clean, modern interface with syntax highlighting
- 📊 **Statistics Dashboard**: View projections and expense distribution
- 📁 **File Loading**: Load `.pb` files from your filesystem
- 🔄 **Live Reload**: Instant updates when editing files
- 🌙 **Dark Theme**: Easy on the eyes for long sessions

## Quick Start

### Option 1: One-Click Launch
```bash
./launch-viewer.sh
```

### Option 2: Manual Start
```bash
cd viewer
npm install
npm run dev
```

## Usage

1. **Launch the viewer** using one of the methods above
2. **Load your budget**: Click "Load Sample" or use the file picker to load a `.pb` file
3. **View statistics**: Click "Show Stats" to see projections and expense breakdown
4. **Edit in VS Code**: Keep your `.pb` files open in VS Code while the viewer shows live preview

## Development

The viewer is built with:
- **Vite** for fast development and hot reload
- **Vanilla JS** for maximum future-proofing
- **CSS Grid** for responsive layout
- **PlainBudget.js** (copied from parent directory)

## File Structure

```
viewer/
├── index.html          # Main HTML file
├── main.js            # Application logic
├── style.css          # Styling and theme
├── plainbudget.js     # Budget parsing engine
├── package.json       # Dependencies
└── vite.config.js     # Vite configuration
```

## Workflow

1. Edit your `.pb` files in VS Code
2. The viewer automatically updates (if watching files)
3. View formatted output and statistics in your browser
4. Share the URL with others for collaborative budget viewing
