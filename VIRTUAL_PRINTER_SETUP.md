# Virtual Printer Setup for Management Desktop

## Overview

A complete virtual thermal printer simulator that mimics an ESC/POS thermal printer. This allows you to test the entire printing system without needing physical hardware.

## Features

✅ **Simulates ESC/POS thermal printer** on port 9100  
✅ **Decodes and displays** all print commands  
✅ **Saves print jobs** to text files for review  
✅ **Real-time console output** showing what would be printed  
✅ **Supports all ticket types**: Booking, Day Pass, Exit Pass, Statistics  
✅ **Production-ready** - switch to real printer by changing IP only

## Quick Start

### 1. Start the Virtual Printer

```bash
cd /home/ivan/prod/management-desktop
./start-virtual-printer.sh
```

Or manually:
```bash
node virtual-printer.cjs
```

You should see:
```
════════════════════════════════════════════════════════════
  VIRTUAL THERMAL PRINTER SIMULATOR
════════════════════════════════════════════════════════════

  ● Status:  ONLINE
  ● Listening on: 0.0.0.0:9100
  ● Logs directory: /home/ivan/prod/management-desktop/virtual-printer-logs

  Configure your printer IP to: localhost
  Configure your printer port to: 9100
════════════════════════════════════════════════════════════

  Waiting for print jobs...
```

### 2. Start the Management Desktop App

In another terminal:
```bash
cd /home/ivan/prod/management-desktop
npm run dev
```

The app will automatically use `localhost:9100` for printing (already configured).

### 3. Test Printing

Run the automated test:
```bash
node test-printer.cjs
```

Or print from the Management Desktop UI:
- Create bookings and print tickets
- Print day passes
- Print exit passes
- All will appear in the virtual printer!

## How It Works

### Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Management Desktop │  HTTP   │ Embedded Printer    │
│      (Electron)     │ ───────>│    Service          │
│                     │         │  (localhost:8105)   │
└─────────────────────┘         └──────────┬──────────┘
                                           │ TCP
                                           │ ESC/POS
                                           ▼
                              ┌─────────────────────────┐
                              │  Virtual Printer        │
                              │  (localhost:9100)       │
                              │  • Receives print data  │
                              │  • Decodes ESC/POS      │
                              │  • Displays output      │
                              │  • Saves to files       │
                              └─────────────────────────┘
```

### What Gets Printed

When you print a ticket, the virtual printer will:

1. **Receive** the ESC/POS binary data
2. **Decode** commands and text
3. **Display** in the console with a nice border:
   ```
   ██████████████████████████████████████████████████
   █  PRINT JOB #1                                  █
   ██████████████████████████████████████████████████
   █  [ESC @ - Initialize Printer]                 █
   █  [ESC a - Alignment: CENTER]                  █
   █  ================================              █
   █    STE DHRAIFF SERVICES                       █
   █       TRANSPORT                               █
   █  ================================              █
   █        BILLET RESERVATION                     █
   █  ================================              █
   █  Vehicule: 123 TU 456                         █
   █  Destination: Monastir                        █
   █  Sieges: 3                                    █
   █  --------------------------------              █
   █  Prix base: 15.00 TND                         █
   █  Frais: 0.45 TND                              █
   █  Total: 15.45 TND                             █
   █  --------------------------------              █
   █  Date: 05/02/2026                             █
   █  Heure: 23:30                                 █
   █  Agent: Agent Test                            █
   █  [GS V - Cut Paper]                           █
   ██████████████████████████████████████████████████
   ```

4. **Save** to a file in `virtual-printer-logs/` with:
   - Decoded readable text
   - Raw hex data
   - Timestamp and metadata

## Print Logs

All print jobs are saved to:
```
/home/ivan/prod/management-desktop/virtual-printer-logs/
```

Example filename:
```
print-job-2026-02-05T23-30-15-123Z-1.txt
```

Each file contains:
- Job metadata (time, client, data size)
- Decoded human-readable output
- Raw hex data for debugging

## Supported Ticket Types

### 1. Booking Ticket (Billet Réservation)
```javascript
{
  licensePlate: "123 TU 456",
  destinationName: "Monastir",
  seatNumber: 3,
  totalAmount: 15.45,
  basePrice: 5.0,
  stationFee: 0.15,
  createdBy: "Agent Name"
}
```

### 2. Day Pass Ticket (Pass Journée)
```javascript
{
  licensePlate: "789 TU 012",
  destinationName: "Toutes destinations",
  totalAmount: 2.0,
  createdBy: "Agent Name"
}
```

### 3. Exit Pass Ticket (Autorisation de Sortie)
```javascript
{
  licensePlate: "345 TU 678",
  destinationName: "Sousse",
  seatNumber: 4,
  totalAmount: 20.0,
  basePrice: 5.0,
  createdBy: "Agent Name"
}
```

## Switching to Real Printer

When you have a physical thermal printer:

### Option 1: Change Default Config
Edit `src/services/printerIpConfigService.ts`:
```typescript
private readonly DEFAULT_CONFIG: PrinterIpConfig = {
  ip: '192.168.192.168',  // Your printer's IP
  port: 9100
};
```

### Option 2: Use F3 in the App
1. Press **F3** in the Management Desktop
2. Enter your printer's IP address
3. Test connection
4. Save

The system works exactly the same - just point it to a real printer IP!

## Troubleshooting

### Virtual Printer Won't Start
**Error:** `Port 9100 is already in use`

**Solution:**
```bash
# Find what's using the port
lsof -i :9100

# Kill it
kill -9 <PID>

# Or use
pkill -f "virtual-printer"
```

### No Print Jobs Appearing
1. Check virtual printer is running: `ps aux | grep virtual-printer`
2. Check printer service is running in Management Desktop console
3. Try test script: `node test-printer.cjs`
4. Check logs in `virtual-printer-logs/` directory

### Cannot Connect to Printer
**Error:** `Cannot connect to printer at localhost:9100`

**Solutions:**
- Ensure virtual printer is running
- Check firewall isn't blocking port 9100
- Try IP `127.0.0.1` instead of `localhost`

## Development Tips

### Viewing Live Logs
```bash
# Watch the virtual printer output
tail -f virtual-printer-logs/print-job-*.txt

# Or in another terminal, watch in real-time
watch -n 1 'ls -lt virtual-printer-logs/ | head -n 5'
```

### Testing Individual Print Functions
```javascript
// In browser console or Node script
const ticket = {
  licensePlate: "TEST 123",
  destinationName: "Test Destination",
  seatNumber: 1,
  totalAmount: 5.0,
  createdBy: "Test",
  createdAt: new Date().toISOString()
};

// Print via API
fetch('http://localhost:8105/api/printer/print/booking', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ...ticket,
    printerConfig: { ip: 'localhost', port: 9100 }
  })
});
```

### Debugging ESC/POS Commands
The virtual printer logs include hex data:
```
--- RAW DATA (HEX) ---

1b4001b741016532333d3d3d3d3d3d...
```

Use this to debug formatting issues or compare with real printer output.

## Production Deployment

1. **Development:** Use virtual printer (`localhost:9100`)
2. **Testing:** Use virtual printer on test network
3. **Production:** Switch to real printer IP
4. **No code changes needed** - just configuration!

## Benefits

✅ **No hardware needed** for development  
✅ **See exactly what prints** in logs  
✅ **Fast iteration** - no waiting for printer  
✅ **Debugging** - see ESC/POS commands  
✅ **Version control** - save print jobs as files  
✅ **Regression testing** - compare print outputs  

## Next Steps

- ✅ Virtual printer is running
- ✅ Management desktop configured
- ✅ All printing working
- 🎯 Ready to use the system!

Start the management desktop app and try printing booking tickets, day passes, and exit passes. Everything will appear in your virtual printer console and logs!
