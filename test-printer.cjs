#!/usr/bin/env node

/**
 * Test Virtual Printer
 * Sends test print jobs to the virtual printer
 */

const http = require('http');

const PRINTER_SERVICE_URL = 'http://localhost:8105';

// Test ticket data
const testTickets = {
  booking: {
    licensePlate: '123 TU 456',
    destinationName: 'Monastir',
    seatNumber: 3,
    totalAmount: 15.45,
    stationFee: 0.45,
    basePrice: 5.0,
    createdBy: 'Agent Test',
    createdAt: new Date().toISOString(),
    stationName: 'Station Ksar Hellal',
    routeName: 'Ksar Hellal - Monastir',
    printerConfig: {
      ip: 'localhost',
      port: 9100
    }
  },
  daypass: {
    licensePlate: '789 TU 012',
    destinationName: 'Toutes destinations',
    seatNumber: 0,
    totalAmount: 2.0,
    createdBy: 'Agent Test',
    createdAt: new Date().toISOString(),
    stationName: 'Station Ksar Hellal',
    routeName: 'Pass Journée',
    printerConfig: {
      ip: 'localhost',
      port: 9100
    }
  },
  exitpass: {
    licensePlate: '345 TU 678',
    destinationName: 'Sousse',
    seatNumber: 4,
    totalAmount: 20.0,
    basePrice: 5.0,
    createdBy: 'Agent Test',
    createdAt: new Date().toISOString(),
    stationName: 'Station Ksar Hellal',
    routeName: 'Ksar Hellal - Sousse',
    printerConfig: {
      ip: 'localhost',
      port: 9100
    }
  }
};

async function testPrint(type, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'localhost',
      port: 8105,
      path: `/api/printer/print/${type}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(responseData));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  TESTING VIRTUAL PRINTER SYSTEM');
  console.log('═'.repeat(60));
  console.log('');
  
  try {
    // Test 1: Booking ticket
    console.log('📝 Test 1: Printing Booking Ticket...');
    await testPrint('booking', testTickets.booking);
    console.log('   ✓ Booking ticket printed successfully\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Day pass ticket
    console.log('🎫 Test 2: Printing Day Pass Ticket...');
    await testPrint('daypass', testTickets.daypass);
    console.log('   ✓ Day pass ticket printed successfully\n');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 3: Exit pass ticket
    console.log('🚪 Test 3: Printing Exit Pass Ticket...');
    await testPrint('exitpass', testTickets.exitpass);
    console.log('   ✓ Exit pass ticket printed successfully\n');
    
    console.log('═'.repeat(60));
    console.log('  ✓ ALL TESTS PASSED!');
    console.log('  Check the virtual printer output above.');
    console.log('═'.repeat(60));
    console.log('');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Virtual printer is running (node virtual-printer.cjs)');
    console.error('  2. Management desktop app is running (npm run dev)');
    console.error('');
    process.exit(1);
  }
}

runTests();
