// User and Authentication
export type UserRole = 'Manager' | 'Technician' | 'Admin';
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

// Settings
export interface GarageSettings {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  vatRate: number; // Stored as a percentage, e.g., 20 for 20%
  invoiceNotes: string;
}

// Offline Sync
export interface SyncAction {
    id: string;
    type: 'UPDATE_INVENTORY_ITEM';
    payload: {
        itemId: string;
        updates: Partial<InventoryItem>;
    };
    timestamp: string;
}