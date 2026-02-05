import { API } from '../config';
import { printerIpConfigService, PrinterIpConfig } from './printerIpConfigService';

// Printer configuration interface
export interface PrinterConfig {
  id: string;
  name: string;
  ip: string;
  port: number;
  width: number;
  timeout: number;
  model: string;
  enabled: boolean;
  isDefault: boolean;
}

// Ticket data interface
export interface TicketData {
  licensePlate: string;
  destinationName: string;
  seatNumber: number;
  totalAmount: number;
  stationFee?: number;
  createdBy: string;
  createdAt: string;
  stationName: string;
  routeName: string;
  // Vehicle and pricing information
  vehicleCapacity?: number;
  basePrice?: number;
  // Exit pass count for today
  exitPassCount?: number;
  // Branding (optional)
  brandName?: string;
  brandLogo?: string;
  // Company branding
  companyName?: string;
  companyLogo?: string;
  // Staff information
  staffFirstName?: string;
  staffLastName?: string;
}

// Statistics report data interface
export interface StatisticsReportData {
  periodLabel: string;
  totalSeatsBooked: number;
  totalSeatIncome: number;
  totalDayPassesSold: number;
  totalDayPassIncome: number;
  totalIncome: number;
  staffData?: Array<{
    name: string;
    seats: number;
    seatIncome: number;
    dayPasses: number;
    dayPassIncome: number;
    income: number;
  }>;
  createdBy?: string;
  createdAt?: string;
}

// Printer service class
export class PrinterService {
  private baseUrl: string;
  private defaultBrandName: string = 'STE';
  private defaultBrandLogoPath: string = '/icons/ste_260.png';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Get printer configuration from local storage
  async getPrinterConfig(): Promise<PrinterIpConfig> {
    return printerIpConfigService.getConfig();
  }

  // Test printer connection using local configuration
  async testPrinterConnection(): Promise<{ connected: boolean; error?: string }> {
    return await printerIpConfigService.testPrinterConnection();
  }

  private withBranding(data: TicketData): TicketData {
    return {
      ...data,
      brandName: data.brandName || this.defaultBrandName,
      brandLogo: data.brandLogo || this.defaultBrandLogoPath,
      companyName: data.companyName || data.brandName || this.defaultBrandName,
      companyLogo: data.companyLogo || data.brandLogo || this.defaultBrandLogoPath,
    };
  }

  // Print booking ticket using local printer configuration
  async printBookingTicket(ticketData: TicketData): Promise<void> {
    const printerConfig = await this.getPrinterConfig();
    
    const response = await fetch(`${this.baseUrl}/api/printer/print/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.withBranding(ticketData),
        printerConfig: printerConfig
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to print booking ticket: ${response.statusText}`);
    }
  }

  // Print day pass ticket using local printer configuration
  async printDayPassTicket(ticketData: TicketData): Promise<void> {
    const printerConfig = await this.getPrinterConfig();
    
    const response = await fetch(`${this.baseUrl}/api/printer/print/daypass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.withBranding(ticketData),
        printerConfig: printerConfig
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to print day pass ticket: ${response.statusText}`);
    }
  }

  // Print exit pass ticket using local printer configuration
  async printExitPassTicket(ticketData: TicketData): Promise<void> {
    const printerConfig = await this.getPrinterConfig();
    
    const response = await fetch(`${this.baseUrl}/api/printer/print/exitpass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...this.withBranding(ticketData),
        printerConfig: printerConfig
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to print exit pass ticket: ${response.statusText}`);
    }
  }

  // Print statistics report using local printer configuration
  async printStatisticsReport(reportData: StatisticsReportData): Promise<void> {
    const printerConfig = await this.getPrinterConfig();
    
    const response = await fetch(`${this.baseUrl}/api/printer/print/statistics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...reportData,
        printerConfig: printerConfig
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to print statistics report: ${response.statusText}`);
    }
  }

  // Helper method to create ticket data from queue entry
  createTicketDataFromQueueEntry(
    entry: any, 
    destination: any, 
    staffName: string,
    staffFirstName?: string,
    staffLastName?: string
  ): TicketData {
    return {
      licensePlate: entry.licensePlate || 'Unknown',
      destinationName: destination?.name || 'Unknown Destination',
      seatNumber: 0, // Not applicable for exit passes
      totalAmount: 0,
      basePrice: destination?.basePrice || 0,
      createdBy: staffName,
      createdAt: entry.createdAt || new Date().toISOString(),
      stationName: 'Station',
      routeName: destination?.name || 'Unknown Route',
      staffFirstName: staffFirstName || '',
      staffLastName: staffLastName || '',
    };
  }
}

// Create a singleton instance
export const printerService = new PrinterService(API.printer);
