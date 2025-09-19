// FIX: Removed circular dependency import. The WorkOrder type is defined within this file.

// User and Authentication
export type UserRole = 'Manager' | 'Technician' | 'Admin' | 'Service Advisor';
export interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

// Subscription and Billing
export enum PlanId {
  BASIC = 'plan_basic',
  STANDARD = 'plan_standard',
  PRO = 'plan_pro',
}

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  userLimit: number | 'unlimited';
  features: string[];
}

export enum SubscriptionStatus {
  TRIALING = 'trialing',
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
}

export interface Subscription {
  tenantId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  renewalDate: string | null;
  trialEnds: string | null;
}

// Dashboard
export interface RevenueDataPoint {
  name: string;
  value: number;
}

export interface TechnicianProductivity {
    name: string;
    logged: number;
    billed: number;
}

export interface DashboardData {
    totalNet: number;
    totalVat: number;
    totalGross: number;
    workOrderStats: Record<string, number>;
    revenueBreakdown: RevenueDataPoint[];
    techProductivity: TechnicianProductivity[];
}

// Work Orders
export enum WorkOrderStatus {
  NEW = 'New',
  IN_PROGRESS = 'In Progress',
  AWAITING_PARTS = 'Awaiting Parts',
  AWAITING_CUSTOMER = 'Awaiting Customer',
  READY = 'Ready for Collection',
  COMPLETED = 'Completed',
  INVOICED = 'Invoiced',
}

export type LineItemType = 'part' | 'labour' | 'fee';

export interface WorkOrderLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number; // Stored in pence in a real app, but float for mock
  isVatable: boolean;
  type: LineItemType;
}

export interface TimeLog {
  id: string;
  technicianName: string;
  startTime: string;
  endTime: string | null; // null if timer is active
  durationMinutes: number;
}


export interface WorkOrderNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

export interface WorkOrder {
  id: string;
  status: WorkOrderStatus;
  createdAt: string;
  lastUpdatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vehicle: string;
  vrm: string;
  issue: string;
  total: number; // This will be deprecated in favor of calculated totals
  isUrgent: boolean;
  lineItems: WorkOrderLineItem[];
  timeLogs: TimeLog[];
  notes: WorkOrderNote[];
  vehicleDetails?: VehicleDetails | null;
  customerId?: string;
}

// Check-In
export interface MotHistoryItem {
  date: string;
  status: 'Pass' | 'Fail';
  mileage: number;
  defects?: string[];
}

export interface VehicleDetails {
  vrm: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  motStatus: 'Valid' | 'Expired';
  motExpiry: string;
  taxStatus: 'Taxed' | 'Untaxed';
  motHistory: MotHistoryItem[];
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface AiAssistedDiagnosis {
  summary: string;
  potentialParts: string[];
  isUrgent: boolean;
  suggestedTasks: string[];
}

// Inventory
export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  stockQty: number;
  lowStockThreshold: number;
  price: number; // in pence
}

// Time & Attendance
export enum OvertimeRule {
    NONE = 'None',
    DAILY_OVER_8 = 'DailyOver8',
    WEEKLY_OVER_40 = 'WeeklyOver40',
}

export enum RoundingStrategy {
    NEAREST = 'Nearest',
    UP = 'Up',
    DOWN = 'Down',
}

export interface TimePolicy {
    timezone: string; // e.g., 'Europe/London'
    weekStartsOn: 1; // 1 = Monday
    overtimeRule: OvertimeRule;
    standardDailyMinutes: number;
    standardWeeklyMinutes: number;
    rounding: {
        increment: 5 | 6 | 10 | 15;
        strategy: RoundingStrategy;
    };
    autoBreak: {
        defaultBreakMinutes: number;
        breakThresholdMinutes: number;
    };
    version: number;
}


// Settings
export interface GarageSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  vatRate: number; // Stored as a percentage, e.g., 20 for 20%
  invoiceNotes: string;
  timePolicy: TimePolicy;
}

// HR & Employees
export enum EmployeeRole {
    TECHNICIAN = 'Technician',
    SERVICE_ADVISOR = 'Service Advisor',
    MANAGER = 'Manager',
    ADMIN = 'Admin',
    OTHER = 'Other',
}

export enum EmployeePayType {
    HOURLY = 'Hourly',
    SALARIED = 'Salaried',
}

export enum EmployeeStatus {
    ACTIVE = 'Active',
    SUSPENDED = 'Suspended',
    TERMINATED = 'Terminated',
    ON_LEAVE = 'On Leave',
}

export interface Employee {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: EmployeeRole;
    payType: EmployeePayType;
    hourlyRatePence?: number;
    salaryAnnualPence?: number;
    status: EmployeeStatus;
    startDate: string; // ISO date string
    endDate?: string; // ISO date string
    kioskPinCode: string; // 4-digit string
}


// Offline Sync
export type SyncActionType = 'UPDATE_INVENTORY_ITEM' | 'OFFLINE_SCAN_ADD_TO_WO';

export interface UpdateInventoryPayload {
    itemId: string;
    updates: Partial<InventoryItem>;
}

export interface OfflineScanPayload {
    sku: string;
    quantity: number;
    workOrderId: string;
}

export interface SyncAction {
    id: string;
    type: SyncActionType;
    payload: UpdateInventoryPayload | OfflineScanPayload;
    timestamp: string;
}