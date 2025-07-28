# PlainBudget Viewer

A beautiful web interface for viewing and analyzing PlainBudget files.

## Live Demo

Visit the live demo at: [https://olifrost.github.io/plainbudget/](https://olifrost.github.io/plainbudget/)

## Features

- 🎨 **Beautiful HTML Rendering**: Clean, modern interface with icons and colors
- 📊 **Statistics Dashboard**: View projections and expense distribution
- 📁 **File Loading**: Load `.pb` files from your filesystem
- ⚙️ **Configurable**: Set default file paths for easy access
- 🌐 **Web & Desktop**: Works as a web app or desktop application with Tauri

## Usage

1. **Try the demo**: The live site loads with sample budget data
2. **Load your budget**: Use the file picker to load your own `.pb` file
3. **Configure paths**: Click the gear icon to set a default budget file path (desktop app only)
4. **View statistics**: Automatically displayed alongside your budget

## Local Development

```bash
cd viewer
npm install
npm run dev
```

For the desktop app:
```bash
cd viewer
cargo tauri dev
```

## About PlainBudget

PlainBudget is a simple, text-based budgeting format that's human-readable and version-control friendly. Learn more at the [main repository](https://github.com/olifrost/plainbudget).
