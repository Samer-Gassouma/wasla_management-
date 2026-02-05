export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

import { API } from "@/config";

let authToken: string | null = null;

// Initialize auth token from localStorage on module load (for refresh persistence)
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem("authToken");
    if (saved) authToken = saved;
  } catch {}
}

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.localStorage.setItem("authToken", token);
      } else {
        window.localStorage.removeItem("authToken");
      }
    } catch {}
  }
}

export function getAuthToken() {
  return authToken;
}

export function getStaffInfo() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      staffId: payload.staff_id,
      firstName: payload.first_name || '',
      lastName: payload.last_name || '',
    };
  } catch {
    return null;
  }
}

export function logout() {
  setAuthToken(null);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem("authToken");
      window.localStorage.removeItem("staffInfo");
    } catch {}
  }
}

async function request<T>(base: string, path: string, method: HttpMethod = "GET", body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// Auth
export async function login(cin: string): Promise<{ data: { token: string; staff: { firstName: string; lastName: string } } }> {
  const r = await request<{ data: { token: string; staff: { firstName: string; lastName: string } } }>(API.auth, "/api/v1/auth/login", "POST", { cin });
  const token = r.data.token;
  setAuthToken(token);
  return r;
}

// Queue management functions
export async function listQueue(destinationId: string) {
  return request<{ data: any[] }>(API.queue, `/api/v1/queue/${destinationId}`);
}

export async function listQueueSummaries() {
  return request<{ data: Array<any> }>(API.queue, "/api/v1/queue-summaries");
}

export async function reorderQueue(destinationId: string, entryIds: string[]) {
  return request<{ data: any }>(API.queue, `/api/v1/queue/${destinationId}/reorder`, "PUT", { entryIds });
}

export async function deleteQueueEntry(destinationId: string, entryId: string) {
  return request<{ data: any }>(API.queue, `/api/v1/queue/${destinationId}/entry/${entryId}`, "DELETE");
}

export async function clearQueue(destinationId: string) {
  return request<{ data: any }>(API.queue, `/api/v1/queue/${destinationId}/clear`, "DELETE");
}

export async function clearAllQueues() {
  return request<{ data: any }>(API.queue, `/api/v1/queue/clear-all`, "DELETE");
}

export async function changeDestination(destinationId: string, entryId: string, newDestinationId: string, newDestinationName: string) {
  return request<{ data: any }>(API.queue, `/api/v1/queue/${destinationId}/entry/${entryId}/change-destination`, "PUT", {
    newDestinationId,
    newDestinationName
  });
}

export async function transferSeats(destinationId: string, fromEntryId: string, toEntryId: string, seats: number) {
  return request<{ data: any }>(API.queue, `/api/v1/queue/${destinationId}/transfer-seats`, "POST", {
    fromEntryId,
    toEntryId,
    seats
  });
}

// Vehicles CRUD (via queue service only for vehicles endpoints)
export async function listVehicles() {
  return request<{ data: Array<any> }>(API.queue, "/api/v1/vehicles");
}

export async function createVehicle(body: { licensePlate: string; capacity?: number; phoneNumber?: string | null; defaultDestinationId?: string; defaultDestinationName?: string }) {
  return request<{ data: any }>(API.queue, "/api/v1/vehicles", "POST", body);
}

export async function updateVehicle(id: string, body: Partial<{ capacity: number; phoneNumber: string | null; isActive: boolean; isAvailable: boolean; isBanned: boolean; defaultDestinationId: string; defaultDestinationName: string }>) {
  return request<{ data: any }>(API.queue, `/api/v1/vehicles/${id}`, "PUT", body);
}

export async function deleteVehicle(id: string) {
  return request<{ data: any }>(API.queue, `/api/v1/vehicles/${id}`, "DELETE");
}

// Authorized stations per vehicle
export async function listAuthorizedStations(vehicleId: string) {
  return request<{ data: Array<any> }>(API.queue, `/api/v1/vehicles/${vehicleId}/authorized-routes`);
}

export async function addAuthorizedStation(vehicleId: string, body: { stationId: string; stationName?: string; priority?: number; isDefault?: boolean }) {
  return request<{ data: any }>(API.queue, `/api/v1/vehicles/${vehicleId}/authorized-routes`, "POST", body);
}

export async function updateAuthorizedStation(vehicleId: string, authId: string, body: Partial<{ stationId: string; stationName: string; priority: number; isDefault: boolean }>) {
  return request<{ data: any }>(API.queue, `/api/v1/vehicles/${vehicleId}/authorized-routes/${authId}`, "PUT", body);
}

export async function deleteAuthorizedStation(vehicleId: string, authId: string) {
  return request<{ data: any }>(API.queue, `/api/v1/vehicles/${vehicleId}/authorized-routes/${authId}`, "DELETE");
}

// Statistics API
export async function getTodayStationIncome(stationId: string) {
  return request<{ data: any }>(API.statistics, `/api/v1/statistics/station/${stationId}/today`);
}

export async function getAllStaffIncomeForDate(dateISO?: string) {
  const q = dateISO ? `?date=${encodeURIComponent(dateISO)}` : "";
  return request<{ data: Array<any> }>(API.statistics, `/api/v1/statistics/staff/all${q}`);
}

export async function getStaffTransactions(staffId: string, dateISO?: string) {
  const q = dateISO ? `?date=${encodeURIComponent(dateISO)}` : "";
  return request<{ data: Array<any> }>(API.statistics, `/api/v1/statistics/staff/${staffId}/transactions${q}`);
}

// Advanced statistics API - income by time period
// Note: This endpoint returns ActualIncomeSummary (single object, not array)
export async function getIncomeByTimePeriod(startTime: string, endTime: string) {
  return request<{ data: any }>(API.statistics, `/api/v1/statistics/income/period?start=${encodeURIComponent(startTime)}&end=${encodeURIComponent(endTime)}`);
}

// Get income for specific day (all staff)
export async function getIncomeForDay(date: string) {
  return request<{ data: Array<any> }>(API.statistics, `/api/v1/statistics/staff/all?date=${encodeURIComponent(date)}`);
}

// Get income for current month (all staff)
export async function getIncomeForMonth(year: number, month: number) {
  return request<{ data: Array<any> }>(API.statistics, `/api/v1/statistics/staff/all-month?year=${year}&month=${month}`);
}

// Get actual income (base price + 0.150 for each booking)
export async function getActualIncome(dateISO?: string) {
  const q = dateISO ? `?date=${encodeURIComponent(dateISO)}` : "";
  return request<{ data: any }>(API.statistics, `/api/v1/statistics/income/actual${q}`);
}

// Get actual income for a specific month
export async function getActualIncomeForMonth(year: number, month: number) {
  return request<{ data: any }>(API.statistics, `/api/v1/statistics/income/month?year=${year}&month=${month}`);
}

// Get destination routes for income calculation
export async function getDestinationRoutes() {
  return request<{ data: Array<any> }>(API.queue, `/api/v1/routes`);
}

// Get all destinations
export async function getAllDestinations() {
  return request<{ data: Array<{ id: string; name: string; basePrice: number; isActive: boolean }> }>(API.queue, "/api/v1/destinations");
}

// Staff CRUD (Go auth service on 192.168.0.193:8001)
export async function listStaff() {
  return request<{ data: Array<any> }>(API.auth, "/api/v1/staff/");
}

export async function createStaff(body: { firstName: string; lastName: string; cin: string; phoneNumber: string; role?: string }) {
  return request<{ data: any }>(API.auth, "/api/v1/staff/", "POST", body);
}

export async function updateStaff(id: string, body: Partial<{ firstName: string; lastName: string; phoneNumber: string; role: string; isActive: boolean }>) {
  return request<{ data: any }>(API.auth, `/api/v1/staff/${id}`, "PUT", body);
}

export async function deleteStaff(id: string) {
  return request<{ data: any }>(API.auth, `/api/v1/staff/${id}`, "DELETE");
}

export async function getVehicleAuthorizedRoutes(vehicleId: string) {
  return request<{ data: Array<{ id: string; stationId: string; stationName: string; priority: number; isDefault: boolean }> }>(API.queue, `/api/v1/vehicles/${vehicleId}/authorized-routes`);
}

export async function searchVehicles(query: string) {
  return request<{ data: Array<{ id: string; licensePlate: string; capacity: number; isActive: boolean; isAvailable: boolean }> }>(API.queue, `/api/v1/vehicles?search=${encodeURIComponent(query)}`);
}

export async function addVehicleToQueue(destinationId: string, vehicleId: string, destinationName: string) {
  return request<{ 
    data: { 
      queueEntry: any; 
      dayPass?: any;
      dayPassValid?: any;
      dayPassStatus: string;
    } 
  }>(API.queue, `/api/v1/queue/${destinationId}`, "POST", {
    vehicleId,
    destinationId,
    destinationName
  });
}

export async function getVehicleDayPass(vehicleId: string) {
  return request<{ data: any }>(API.queue, `/api/v1/day-pass/vehicle/${vehicleId}`);
}

export async function createBookingByDestination(payload: { destinationId: string; seats: number; subRoute?: string; preferExactFit?: boolean }) {
  return request<{ data: any }>(API.booking, "/api/v1/bookings", "POST", payload);
}

export async function createBookingByQueueEntry(payload: { queueEntryId: string; seats: number }) {
  return request<{ data: { 
    bookings: Array<{ 
      id: string; 
      queueId: string; 
      vehicleId: string; 
      licensePlate: string; 
      seatsBooked: number; 
      seatNumber: number; 
      totalAmount: number; 
      bookingStatus: string; 
      paymentStatus: string; 
      createdBy: string; 
      createdByName: string; 
      createdAt: string 
    }>;
    exitPass?: {
      id: string;
      queueId: string;
      vehicleId: string;
      licensePlate: string;
      destinationId: string;
      destinationName: string;
      previousVehicles: Array<{
        licensePlate: string;
        exitTime: string;
      }>;
      currentExitTime: string;
      totalPrice: number;
      createdBy: string;
      createdByName: string;
      createdAt: string;
    };
    hasExitPass: boolean;
  } }>(API.booking, "/api/v1/bookings/by-queue-entry", "POST", payload);
}

// Booking service

export async function cancelBooking(id: string) {
  return request<{ data: any }>(API.booking, `/api/v1/bookings/${id}/cancel`, "PUT");
}

export async function cancelOneBookingByQueueEntry(payload: { queueEntryId: string }) {
  return request<{ data: { id: string } }>(API.booking, "/api/v1/bookings/cancel-one-by-queue-entry", "POST", payload);
}

export async function listTrips() {
  return request<{ data: any[] }>(API.booking, "/api/v1/trips");
}

export async function listTodayTrips(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : '';
  return request<{ data: Array<{ 
    id: string; 
    licensePlate: string; 
    destinationName: string; 
    destinationId: string;
    vehicleId: string;
    seatsBooked: number; 
    vehicleCapacity: number;
    basePrice: number;
    startTime: string;
    createdAt: string;
  }> }>(API.booking, `/api/v1/trips/today${qs}`);
}

export async function healthAuth() {
  return fetch(`${API.auth}/health`).then((r) => ({ ok: r.ok }));
}
export async function healthQueue() {
  return fetch(`${API.queue}/health`).then((r) => ({ ok: r.ok }));
}
export async function healthBooking() {
  return fetch(`${API.booking}/health`).then((r) => ({ ok: r.ok }));
}
export async function healthWS() {
  return fetch(`${API.ws.replace('ws', 'http')}/health`).then((r) => ({ ok: r.ok }));
}
