#!/bin/bash

echo "Installing Dead-Click Radar dependencies..."

echo "Installing root dependencies..."
npm install

echo "Installing core package dependencies..."
cd packages/core
npm install
cd ../..

echo "Installing demo package dependencies..."
cd apps/demo
npm install
cd ../..

echo "Building core library..."
cd packages/core
npm run build
cd ../..

echo "Setup complete!"
echo ""
echo "To start demo: cd apps/demo && npm run dev"