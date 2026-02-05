#!/usr/bin/env node

/**
 * Virtual Thermal Printer Simulator
 * Simulates an ESC/POS thermal printer for testing
 * Listens on port 9100 and logs received print data
 */

const net = require('net');
const fs = require('fs');
const path = require('path');

const PRINTER_PORT = 9100;
const PRINTER_IP = '0.0.0.0'; // Listen on all interfaces
const LOG_DIR = path.join(__dirname, 'virtual-printer-logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

let printJobCounter = 0;

/**
 * Decode ESC/POS commands to human-readable text
 */
function decodeESCPOS(buffer) {
  const lines = [];
  let text = '';
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    
    // Check for ESC/POS commands
    if (byte === 0x1B) { // ESC
      if (i + 1 < buffer.length) {
        const cmd = buffer[i + 1];
        if (cmd === 0x40) {
          lines.push('[ESC @ - Initialize Printer]');
          i++;
        } else if (cmd === 0x61) { // Alignment
          const align = buffer[i + 2];
          const alignText = align === 0 ? 'LEFT' : align === 1 ? 'CENTER' : 'RIGHT';
          lines.push(`[ESC a - Alignment: ${alignText}]`);
          i += 2;
        } else if (cmd === 0x74) { // Character code table
          lines.push('[ESC t - Set Code Table]');
          i += 2;
        }
      }
    } else if (byte === 0x1D) { // GS
      if (i + 1 < buffer.length) {
        const cmd = buffer[i + 1];
        if (cmd === 0x56) { // Cut paper
          lines.push('[GS V - Cut Paper]');
          i += 2;
        }
      }
    } else if (byte === 0x0A) { // Line feed
      if (text.trim()) {
        lines.push(text);
        text = '';
      }
      lines.push(''); // Empty line
    } else if (byte >= 0x20 && byte <= 0x7E) { // Printable ASCII
      text += String.fromCharCode(byte);
    } else if (byte >= 0x80) { // Extended ASCII (UTF-8)
      text += String.fromCharCode(byte);
    }
  }
  
  if (text.trim()) {
    lines.push(text);
  }
  
  return lines;
}

/**
 * Save print job to file
 */
function savePrintJob(data, clientInfo) {
  printJobCounter++;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `print-job-${timestamp}-${printJobCounter}.txt`;
  const filepath = path.join(LOG_DIR, filename);
  
  const decodedLines = decodeESCPOS(data);
  const output = [
    '=' .repeat(60),
    `VIRTUAL PRINTER - Print Job #${printJobCounter}`,
    `Time: ${new Date().toLocaleString('fr-FR')}`,
    `Client: ${clientInfo.address}:${clientInfo.port}`,
    `Data Size: ${data.length} bytes`,
    '=' .repeat(60),
    '',
    '--- DECODED OUTPUT ---',
    '',
    ...decodedLines,
    '',
    '=' .repeat(60),
    '',
    '--- RAW DATA (HEX) ---',
    '',
    data.toString('hex').match(/.{1,32}/g).join('\n'),
    '',
    '=' .repeat(60),
  ].join('\n');
  
  fs.writeFileSync(filepath, output);
  
  return { filename, decodedLines };
}

/**
 * Display print preview in console
 */
function displayPrintPreview(decodedLines, jobNumber) {
  console.log('\n' + '█'.repeat(50));
  console.log(`█  PRINT JOB #${jobNumber}`.padEnd(49) + '█');
  console.log('█'.repeat(50));
  
  decodedLines.forEach(line => {
    if (line.startsWith('[') && line.endsWith(']')) {
      // ESC/POS command - show in gray
      console.log(`█ \x1b[90m${line}\x1b[0m`.padEnd(59) + '█');
    } else {
      // Text content - show normally
      const displayLine = line.substring(0, 46);
      console.log(`█  ${displayLine}`.padEnd(49) + '█');
    }
  });
  
  console.log('█'.repeat(50));
  console.log('');
}

/**
 * Create the virtual printer server
 */
const server = net.createServer((socket) => {
  const clientInfo = {
    address: socket.remoteAddress,
    port: socket.remotePort,
  };
  
  console.log(`\x1b[32m✓\x1b[0m Client connected: ${clientInfo.address}:${clientInfo.port}`);
  
  let receivedData = Buffer.alloc(0);
  
  socket.on('data', (data) => {
    console.log(`\x1b[34m→\x1b[0m Receiving data: ${data.length} bytes`);
    receivedData = Buffer.concat([receivedData, data]);
  });
  
  socket.on('end', () => {
    console.log(`\x1b[33m○\x1b[0m Connection closing, total data: ${receivedData.length} bytes`);
    if (receivedData.length > 0) {
      const { filename, decodedLines } = savePrintJob(receivedData, clientInfo);
      displayPrintPreview(decodedLines, printJobCounter);
      console.log(`\x1b[32m✓\x1b[0m Print job saved to: ${filename}`);
    } else {
      console.log(`\x1b[33m⚠\x1b[0m No data received from client`);
    }
    console.log(`\x1b[33m○\x1b[0m Client disconnected: ${clientInfo.address}:${clientInfo.port}`);
  });
  
  socket.on('close', () => {
    console.log(`\x1b[33m○\x1b[0m Socket closed for: ${clientInfo.address}:${clientInfo.port}`);
    if (receivedData.length > 0 && printJobCounter === 0) {
      // Data was received but not processed in 'end' event
      const { filename, decodedLines } = savePrintJob(receivedData, clientInfo);
      displayPrintPreview(decodedLines, printJobCounter);
      console.log(`\x1b[32m✓\x1b[0m Print job saved to: ${filename}`);
    }
  });
  
  socket.on('error', (err) => {
    console.error(`\x1b[31m✗\x1b[0m Socket error: ${err.message}`);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\x1b[31m✗\x1b[0m Port ${PRINTER_PORT} is already in use!`);
    console.error('  Please stop any other service using this port and try again.');
    process.exit(1);
  } else {
    console.error(`\x1b[31m✗\x1b[0m Server error: ${err.message}`);
    process.exit(1);
  }
});

server.listen(PRINTER_PORT, PRINTER_IP, () => {
  console.log('\x1b[36m' + '═'.repeat(60) + '\x1b[0m');
  console.log('\x1b[36m  VIRTUAL THERMAL PRINTER SIMULATOR\x1b[0m');
  console.log('\x1b[36m' + '═'.repeat(60) + '\x1b[0m');
  console.log('');
  console.log(`  \x1b[32m●\x1b[0m Status:  \x1b[32mONLINE\x1b[0m`);
  console.log(`  \x1b[34m●\x1b[0m Listening on: \x1b[1m${PRINTER_IP}:${PRINTER_PORT}\x1b[0m`);
  console.log(`  \x1b[35m●\x1b[0m Logs directory: ${LOG_DIR}`);
  console.log('');
  console.log('  Configure your printer IP to: \x1b[1m192.168.192.168\x1b[0m (or localhost)');
  console.log('  Configure your printer port to: \x1b[1m9100\x1b[0m');
  console.log('');
  console.log('\x1b[36m' + '═'.repeat(60) + '\x1b[0m');
  console.log('');
  console.log('  Waiting for print jobs...');
  console.log('  Press Ctrl+C to stop the virtual printer');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n');
  console.log('\x1b[33m' + '═'.repeat(60) + '\x1b[0m');
  console.log('  \x1b[33mShutting down virtual printer...\x1b[0m');
  console.log(`  Total print jobs processed: \x1b[1m${printJobCounter}\x1b[0m`);
  console.log('\x1b[33m' + '═'.repeat(60) + '\x1b[0m');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});
