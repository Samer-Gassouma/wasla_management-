# Management Desktop - Printer Setup

## Overview

The management-desktop app uses a **local printer service** running on the client computer to print to the Ethernet printer.

## Architecture

```
┌─────────────────────┐                    ┌─────────────────────┐
│  Management Desktop │                    │   Backend Server    │
│   (This Computer)    │                    │   (192.168.0.193)   │
│                     │                    │                     │
│  - App UI           │ ←──────── API ─────│  - Auth Service     │
│  - Queue Management │  Data Requests     │  - Queue Service    │
│  - Statistics       │                    │  - Statistics       │
│                     │                    │                     │
│  - Local Printer    │                    │                     │
│    Service          │                    │                     │
│    (localhost:8105) │                    │                     │
│         ↓           │                    │                     │
│         ↓           │                    │                     │
└─────────┴───────────┘                    └─────────────────────┘
         │
         │ Ethernet Connection
         ↓
┌─────────────────────┐
│  Thermal Printer    │
│  192.168.192.168     │
└─────────────────────┘
```

## Setup Instructions

### 1. Start the Local Printer Service

Before running the management-desktop app, start the local printer service:

```bash
cd /home/ivan/prod/station-backend
./start-local-printer.sh
```

Or manually:
```bash
cd /home/ivan/prod/station-backend
PRINTER_SERVICE_PORT=8105 ./bin/printer-service-local &
```

### 2. Verify Printer Service is Running

Check if the service is running:
```bash
curl http://localhost:8105/health
```

Expected response:
```json
{"service":"printer-service","status":"ok"}
```

### 3. Configure Printer IP

The printer IP is configured in `src/services/printerIpConfigService.ts`:
- Default IP: `192.168.192.168`
- Port: `9100`

You can change this IP in the management-desktop app UI by pressing **F3** in the Printer Status Display.

### 4. Test Printer Connection

Test the connection using the management-desktop app:
1. Look for the printer status indicator in the top-right corner
2. Click on it to view printer status
3. Press **F3** to change the printer IP
4. Test the connection

Or via command line:
```bash
# Update printer config
curl -X PUT http://localhost:8105/api/printer/config/printer1 \
  -H "Content-Type: application/json" \
  -d '{
    "id": "printer1",
    "name": "Local Thermal Printer",
    "ip": "192.168.192.168",
    "port": 9100,
    "width": 48,
    "timeout": 5000,
    "model": "ESC/POS",
    "enabled": true,
    "isDefault": true
  }'

# Test connection
curl -X POST http://localhost:8105/api/printer/test/printer1
```

## Why Local Printer Service?

The printer is connected via **Ethernet** directly to the client computer (this machine), while the server is on a different network (WiFi).

- **Server IP**: 192.168.0.193 (WiFi network)
- **Printer IP**: 192.168.192.168 (Ethernet network on this machine)
- **Client Computer**: 192.168.0.31 (WiFi) + 192.168.192.100 (Ethernet)

The server cannot reach the printer because it's on a different network. Therefore, we run a local printer service on the client computer that can access both:
- The backend server (via WiFi at 192.168.0.193)
- The printer (via Ethernet at 192.168.192.168)

## Troubleshooting

### Printer service not starting
```bash
# Check if port 8105 is already in use
lsof -i :8105

# Kill existing process if needed
kill <PID>
```

### Cannot connect to printer
1. Verify printer IP is correct: `ping 192.168.192.168`
2. Check printer port is open: `nc -zv 192.168.192.168 9100`
3. Update printer config in the app UI (press F3)

### Printer prints but content is wrong
Check the printer model and width in the configuration. The default is:
- Model: ESC/POS
- Width: 48mm (80mm) per line

## Production Deployment

For production, you can:
1. Add the printer service as a systemd service
2. Auto-start it on boot
3. Monitor it for crashes

Example systemd service file:
```ini
[Unit]
Description=Management Desktop Printer Service
After=network.target

[Service]
Type=simple
User=ste
WorkingDirectory=/home/ste/station-backend
ExecStart=/home/ste/station-backend/bin/printer-service-local
Environment=PRINTER_SERVICE_PORT=8105
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

