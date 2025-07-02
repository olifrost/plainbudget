#!/bin/bash

# PlainBudget Viewer Launch Script
# This script starts the Vite dev server and opens your budget viewer

cd "$(dirname "$0")/viewer"

echo "🚀 Starting PlainBudget Viewer..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the dev server
echo "🌐 Opening browser..."
npm run dev
