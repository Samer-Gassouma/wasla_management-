import net from 'net';
import http from 'http';

/**
 * Embedded Printer Service
 * Runs a simple HTTP server within the Electron app
 * to handle print requests directly to the local printer
 */
export class EmbeddedPrinterService {
  constructor(port = 8105) {
    this.port = port;
    this.server = null;
    this.isRunning = false;
  }

  /**
   * Start the embedded printer service
   */
  async start() {
    if (this.isRunning) {
      console.log('[Printer Service] Already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleRequest(req, res);
        });

        this.server.listen(this.port, () => {
          this.isRunning = true;
          console.log(`[Printer Service] Started on http://localhost:${this.port}`);
          resolve();
        });

        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.log(`[Printer Service] Port ${this.port} is already in use`);
            this.isRunning = false;
            resolve(); // Don't reject, just log the error
          } else {
            console.error('[Printer Service] Server error:', err);
            reject(err);
          }
        });
      } catch (error) {
        console.error('[Printer Service] Failed to start:', error);
        reject(error);
      }
    });
  }

  /**
   * Stop the embedded printer service
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          console.log('[Printer Service] Stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Handle incoming HTTP requests
   */
  async handleRequest(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      await this.handleRoutes(req, res);
    } catch (error) {
      console.error('[Printer Service] Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message || 'Internal server error' }));
    }
  }

  /**
   * Handle different routes
   */
  async handleRoutes(req, res) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Health check
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', service: 'printer-service' }));
      return;
    }

    // Get printer config
    if (url.pathname.startsWith('/api/printer/config/') && req.method === 'GET') {
      const printerId = url.pathname.split('/').pop() || 'default';
      const config = this.getDefaultConfig();
      res.writeHead(200);
      res.end(JSON.stringify(config));
      return;
    }

    // Update printer config
    if (url.pathname.startsWith('/api/printer/config/') && req.method === 'PUT') {
      res.writeHead(200);
      res.end(JSON.stringify({ message: 'printer configuration updated successfully' }));
      return;
    }

    // Test printer connection
    if (url.pathname.startsWith('/api/printer/test/') && req.method === 'POST') {
      const printerId = url.pathname.split('/').pop() || 'default';
      const connected = await this.testConnection();
      res.writeHead(200);
      res.end(JSON.stringify({ connected, error: connected ? '' : 'Could not connect to printer' }));
      return;
    }

    // Print endpoints - all types supported
    if (url.pathname === '/api/printer/print/booking' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const ticketData = JSON.parse(body);
        await this.printTicket(ticketData, 'booking');
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'booking ticket printed successfully' }));
        return;
      } catch (error) {
        console.error('[Printer Service] Print error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message || 'Failed to print ticket' }));
        return;
      }
    }

    if (url.pathname === '/api/printer/print/daypass' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const ticketData = JSON.parse(body);
        await this.printTicket(ticketData, 'daypass');
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'day pass ticket printed successfully' }));
        return;
      } catch (error) {
        console.error('[Printer Service] Print error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message || 'Failed to print ticket' }));
        return;
      }
      
    }

    if (url.pathname === '/api/printer/print/exitpass' && req.method === 'POST') {
      try {
        const body = await this.readBody(req);
        const ticketData = JSON.parse(body);
        await this.printTicket(ticketData, 'exitpass');
        res.writeHead(200);
        res.end(JSON.stringify({ message: 'exit pass ticket printed successfully' }));
        return;
      } catch (error) {
        console.error('[Printer Service] Print error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message || 'Failed to print ticket' }));
        return;
      }
    }

    // Default 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Read request body
   */
  readBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        resolve(body);
      });
      req.on('error', reject);
    });
  }

  /**
   * Get default printer configuration
   */
  getDefaultConfig() {
    return {
      id: 'printer1',
      name: 'Local Printer',
      ip: 'localhost',  // Virtual printer on localhost
      port: 9100,
      width: 48,
      timeout: 5000,
      model: 'ESC/POS',
      enabled: true,
      isDefault: true,
    };
  }

  /**
   * Test printer connection
   */
  async testConnection() {
    const config = this.getDefaultConfig();
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;

      socket.setTimeout(config.timeout);

      socket.on('connect', () => {
        connected = true;
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(config.port, config.ip);
    });
  }

  /**
   * Print a ticket
   */
  async printTicket(ticketData, ticketType) {
    const config = ticketData.printerConfig || this.getDefaultConfig();
    
    // Generate ticket content
    const content = this.generateTicketContent(ticketData, ticketType);
    
    // Convert to ESC/POS commands
    const escPosData = this.convertToESCPOS(content);
    
    // Send to printer
    await this.sendToPrinter(config.ip, config.port, escPosData);
  }

  /**
   * Generate ticket content - Simple and direct output
   */
  generateTicketContent(data, type) {
    const lines = [];
    const now = new Date(data.createdAt);
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // Header - Company name
    lines.push('================================');
    lines.push('  STE DHRAIFF SERVICES');
    lines.push('     TRANSPORT');
    lines.push('================================');
    lines.push('');

    if (type === 'booking') {
      // Booking ticket (client reservation)
      lines.push('     BILLET RESERVATION');
      lines.push('================================');
      if (data.licensePlate) {
        lines.push(`Vehicule: ${data.licensePlate}`);
      }
      lines.push(`Destination: ${data.destinationName}`);
      lines.push(`Sieges: ${data.seatNumber}`);
      lines.push('--------------------------------');
      if (data.basePrice) {
        const baseTotal = data.basePrice * data.seatNumber;
        lines.push(`Prix base: ${baseTotal.toFixed(2)} TND`);
      }
      if (data.stationFee) {
        const feeTotal = data.stationFee * data.seatNumber;
        lines.push(`Frais: ${feeTotal.toFixed(2)} TND`);
      }
      lines.push(`Total: ${data.totalAmount.toFixed(2)} TND`);
      lines.push('--------------------------------');
      lines.push(`Date: ${dateStr}`);
      lines.push(`Heure: ${timeStr}`);
      if (data.createdBy) {
        lines.push(`Agent: ${data.createdBy}`);
      }
    } else if (type === 'daypass') {
      // Day pass ticket
      lines.push('      PASS JOURNEE');
      lines.push('================================');
      lines.push(`Vehicule: ${data.licensePlate}`);
      if (data.destinationName) {
        lines.push(`Route: ${data.destinationName}`);
      }
      lines.push('--------------------------------');
      lines.push(`Montant: ${data.totalAmount.toFixed(2)} TND`);
      lines.push('--------------------------------');
      lines.push(`Date: ${dateStr}`);
      lines.push(`Heure: ${timeStr}`);
      if (data.createdBy) {
        lines.push(`Agent: ${data.createdBy}`);
      }
      lines.push('--------------------------------');
      lines.push('   Valide toute la journee');
    } else if (type === 'exitpass') {
      // Exit pass (authorization de sortie)
      lines.push('  AUTORISATION DE SORTIE');
      lines.push('================================');
      lines.push(`Vehicule: ${data.licensePlate}`);
      lines.push(`Destination: ${data.destinationName}`);
      lines.push('--------------------------------');
      if (data.seatNumber && data.seatNumber > 0) {
        lines.push(`Sieges: ${data.seatNumber}`);
        if (data.basePrice) {
          const baseTotal = data.basePrice * data.seatNumber;
          lines.push(`Prix: ${baseTotal.toFixed(2)} TND`);
        }
      }
      lines.push(`Total: ${data.totalAmount.toFixed(2)} TND`);
      lines.push('--------------------------------');
      lines.push(`Date: ${dateStr}`);
      lines.push(`Heure: ${timeStr}`);
      if (data.createdBy) {
        lines.push(`Agent: ${data.createdBy}`);
      }
      lines.push('--------------------------------');
      lines.push('      Sortie autorisee');
    }

    lines.push('');
    lines.push('================================');
    lines.push('    Merci et bon voyage!');
    lines.push('================================');
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Convert text to ESC/POS commands - Simple direct output
   */
  convertToESCPOS(content) {
    // ESC @ - Initialize printer
    let data = Buffer.from([0x1B, 0x40]);

    // Set character set to French (Code Page 850)
    data = Buffer.concat([data, Buffer.from([0x1B, 0x74, 0x02])]);

    // Center alignment
    data = Buffer.concat([data, Buffer.from([0x1B, 0x61, 0x01])]);

    // Add content with proper encoding
    const contentBuffer = Buffer.from(content, 'utf8');
    data = Buffer.concat([data, contentBuffer]);

    // Reset alignment
    data = Buffer.concat([data, Buffer.from([0x1B, 0x61, 0x00])]);

    // Add line feeds
    data = Buffer.concat([data, Buffer.from([0x0A, 0x0A, 0x0A, 0x0A])]);

    // Cut paper - GS V 0
    data = Buffer.concat([data, Buffer.from([0x1D, 0x56, 0x00])]);

    return data;
  }

  /**
   * Send data to printer - Direct output
   */
  async sendToPrinter(ip, port, data) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let isResolved = false;
      let dataWritten = false;

      // Connection timeout
      socket.setTimeout(5000);

      socket.on('connect', () => {
        console.log(`[Printer Service] Connected to printer at ${ip}:${port}`);
        console.log(`[Printer Service] Sending ${data.length} bytes...`);
        
        // Write data to printer immediately
        socket.write(data, (err) => {
          if (err && !isResolved) {
            console.error('[Printer Service] Write error:', err);
            isResolved = true;
            socket.destroy();
            reject(err);
          } else {
            dataWritten = true;
            console.log('[Printer Service] Data sent to printer successfully');
            
            // Properly end the socket after writing
            socket.end();
            
            // Give printer time to process, then resolve
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true;
                resolve();
              }
            }, 200);
          }
        });
      });

      socket.on('error', (err) => {
        console.error('[Printer Service] Socket error:', err);
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Cannot connect to printer at ${ip}:${port} - ${err.message}`));
        }
      });

      socket.on('timeout', () => {
        console.warn('[Printer Service] Socket timeout');
        if (!isResolved) {
          isResolved = true;
          socket.destroy();
          if (dataWritten) {
            resolve(); // Data was sent, consider it success
          } else {
            reject(new Error(`Printer connection timeout at ${ip}:${port}`));
          }
        }
      });

      socket.on('close', () => {
        console.log('[Printer Service] Socket closed');
        if (!isResolved) {
          isResolved = true;
          if (dataWritten) {
            resolve(); // Data was sent successfully
          } else {
            reject(new Error('Connection closed before data could be sent'));
          }
        }
      });

      // Connect to printer
      console.log(`[Printer Service] Connecting to printer at ${ip}:${port}`);
      socket.connect(port, ip);
    });
  }

  /**
   * Check if service is running
   */
  getStatus() {
    return this.isRunning;
  }
}

