#!/bin/bash

# Start Virtual Printer Simulator
# This script starts a virtual thermal printer that simulates
# an ESC/POS printer on port 9100

cd "$(dirname "$0")"

echo "Starting Virtual Thermal Printer Simulator..."
echo ""

# Make the script executable
chmod +x virtual-printer.cjs

# Run the virtual printer
node virtual-printer.cjs
