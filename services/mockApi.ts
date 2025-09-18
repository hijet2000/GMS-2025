
import { 
    User, Subscription, PlanId, SubscriptionStatus, DashboardData, 
    WorkOrder, WorkOrderStatus, VehicleDetails, MotHistoryItem, Customer, WorkOrderLineItem, WorkOrderNote, TimeLog, LineItemType,
    InventoryItem, GarageSettings
} from '../types';
import { Chance } from 'chance';
import { formatISO } from 'date-fns';
import { calculateWorkOrderTotals } from '../utils/money';


const chance = new Chance(12345); // Seeded for consistency

// --- DATABASE ---
let DB: {
    users: User[];
    subscriptions: Subscription[];
    workOrders: WorkOrder[];
    customers: Customer[];
    vehicles: Record<string, VehicleDetails>;
    inventory: InventoryItem[];
    garageSettings: GarageSettings;
} = {
    users: [],
    subscriptions: [],
    workOrders: [],
    customers: [],
    vehicles: {},
    inventory: [],
    garageSettings: {} as GarageSettings, // Initialized in seedData
};

const TECHNICIANS = ['Bob M.', 'Sarah T.', 'Dave C.'];

// --- HELPERS ---
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getStartOfWeek = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const target = new Date(date.setDate(diff));
    return new Date(target.setHours(0, 0, 0, 0));
};

const getStartOfMonth = (d: Date) => {
    const target = new Date(d.getFullYear(), d.getMonth(), 1);
    return new Date(target.setHours(0, 0, 0, 0));
}

// --- SEED DATA ---
const seedData = () => {
    // Reset DB
    DB = { users: [], subscriptions: [], workOrders: [], customers: [], vehicles: {}, inventory: [], garageSettings: {} as GarageSettings };

    // User
    const user: User = { id: 'user_1', name: 'Alex Workshop', email: 'workshop@example.com', tenantId: 'tenant_1' };
    DB.users.push(user);

    // Subscription
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    const subscription: Subscription = { tenantId: 'tenant_1', planId: PlanId.BASIC, status: SubscriptionStatus.TRIALING, renewalDate: null, trialEnds: trialEnds.toISOString() };
    DB.subscriptions.push(subscription);
    
    // Customers
    for (let i = 0; i < 15; i++) {
        DB.customers.push({
            id: `cust_${i}`,
            name: chance.name(),
            email: chance.email({domain: "example.com"}),
            phone: chance.phone(),
        });
    }

    // Work Orders
    const statuses = Object.values(WorkOrderStatus);
    for (let i = 0; i < 205; i++) { // Increased to 200+
        const customer = chance.pickone(DB.customers);
        // FIX: Add type annotation to ensure createdAt is treated as a Date object.
        const createdAt: Date = chance.date({ year: new Date().getFullYear() });
        // FIX: Add type annotation to ensure lastUpdatedAt is treated as a Date object.
        const lastUpdatedAt: Date = chance.date({ year: createdAt.getFullYear(), month: createdAt.getMonth(), day: createdAt.getDate() + chance.integer({min: 0, max: 5})});
        const isUrgent = chance.bool({ likelihood: 20 });
        
        const lineItems: WorkOrderLineItem[] = [];
        const numItems = chance.integer({ min: 1, max: 5 });
        let subtotal = 0;
        for (let j = 0; j < numItems; j++) {
            const type: LineItemType = chance.pickone(['part', 'labour', 'fee']);
            let quantity: number;
            let unitPrice: number;
            let description: string;
            
            switch (type) {
                case 'part':
                    quantity = chance.integer({ min: 1, max: 4 });
                    // FIX: Removed incorrect `parseFloat` call. `chance.floating` already returns a number.
                    unitPrice = chance.floating({ min: 1000, max: 25000, fixed: 0 }); // Pence
                    description = `Part - ${chance.capitalize(chance.word())} ${chance.capitalize(chance.word())}`;
                    break;
                case 'labour':
                    // FIX: Removed incorrect `parseFloat` call. `chance.floating` already returns a number.
                    quantity = chance.floating({ min: 0.5, max: 4, fixed: 2 });
                    unitPrice = 7500; // Pence
                    description = `Labour - ${chance.sentence({ words: 3 })}`;
                    break;
                case 'fee':
                    quantity = 1;
                    unitPrice = chance.pickone([500, 1000, 2500]); // Pence
                    description = chance.pickone(['Environmental Fee', 'Disposal Fee', 'Sundries']);
                    break;
            }

            subtotal += quantity * unitPrice;
            lineItems.push({
                id: `li_${i}_${j}`,
                description,
                quantity,
                unitPrice,
                type,
                isVatable: type !== 'fee',
            });
        }
        
        const timeLogs: TimeLog[] = [];
        const numLogs = chance.integer({min: 0, max: 4});
        for(let k=0; k < numLogs; k++) {
            const startDate = new Date(createdAt);
            startDate.setHours(chance.integer({min: 9, max: 16}));
            const duration = chance.integer({min: 15, max: 180});
            const endDate = new Date(startDate.getTime() + duration * 60000);
            timeLogs.push({
                id: `tl_${i}_${k}`,
                technicianName: chance.pickone(TECHNICIANS),
                startTime: startDate.toISOString(),
                endTime: endDate.toISOString(),
                durationMinutes: duration,
            });
        }

        const notes: WorkOrderNote[] = [];
        const numNotes = chance.integer({min: 0, max: 3});
        for (let k = 0; k < numNotes; k++) {
            notes.push({
                id: `note_${i}_${k}`,
                author: chance.pickone(['Alex Workshop', 'Bob M.']),
                content: chance.sentence(),
                // FIX: `chance.date` returns a Date object, so `toISOString()` can be called. This was fixed by typing `createdAt`.
                timestamp: chance.date({year: createdAt.getFullYear(), month: createdAt.getMonth(), day: createdAt.getDate() + k}).toISOString()
            });
        }
        
        const vrm = `${chance.character({pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', casing: 'upper'})}${chance.character({pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', casing: 'upper'})}${chance.natural({ min: 10, max: 99 })} ${chance.character({pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', casing: 'upper'})}${chance.character({pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', casing: 'upper'})}${chance.character({pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', casing: 'upper'})}`;

        DB.workOrders.push({
            id: `WO-${1000 + i}`,
            status: chance.pickone(statuses),
            // FIX: Type annotations on createdAt and lastUpdatedAt ensure `toISOString` is available.
            createdAt: createdAt.toISOString(),
            lastUpdatedAt: lastUpdatedAt.toISOString(),
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            vehicle: `${chance.pickone(['Ford', 'VW', 'BMW', 'Audi', 'Vauxhall'])} ${chance.pickone(['Focus', 'Golf', '3 Series', 'A4', 'Corsa'])}`,
            vrm: vrm,
            issue: chance.sentence(),
            total: subtotal / 100, // For display only
            isUrgent,
            lineItems,
            timeLogs,
            notes,
        });
    }

    // Inventory
    const brands = ['Bosch', 'Mann', 'Filtron', 'NGK', 'Brembo', 'TRW', 'Febi Bilstein'];
    const partTypes = ['Brake Pads', 'Oil Filter', 'Air Filter', 'Spark Plug', 'Brake Disc', 'Wiper Blade', 'Timing Belt Kit'];
    for (let i = 0; i < 50; i++) {
        const brand = chance.pickone(brands);
        const type = chance.pickone(partTypes);
        const stockQty = chance.integer({ min: 0, max: 50 });
        const lowStockThreshold = chance.integer({ min: 5, max: 10 });
        DB.inventory.push({
            id: `inv_${i}`,
            sku: `${brand.substring(0,3).toUpperCase()}-${type.split(' ')[0].substring(0,2).toUpperCase()}-${chance.string({ pool: '0123456789', length: 4 })}`,
            name: `${type} ${chance.word({capitalize: true})}`,
            brand: brand,
            stockQty: stockQty,
            lowStockThreshold: lowStockThreshold,
            price: chance.integer({min: 500, max: 15000}), // pence
        });
    }

    // Garage Settings
    DB.garageSettings = {
        companyName: 'AutoRepair Pros',
        address: '123 Fake Street, Anytown, AB1 2CD, United Kingdom',
        phone: '01234 567890',
        email: 'contact@autorepairpros.example.com',
        vatRate: 20,
        invoiceNotes: 'Thank you for your business! Payment is due within 30 days. Please contact us with any questions.'
    };
};

seedData();


// --- MOCK API IMPLEMENTATION ---
class MockApi {
    private currentUser: User | null = null;
    
    constructor() {
        try {
            const storedUser = sessionStorage.getItem('currentUser');
            if (storedUser) {
                this.currentUser = JSON.parse(storedUser);
            }
        } catch(e) { console.error("Could not parse session user", e); }
    }

    async getCurrentUser(): Promise<User | null> {
        await delay(200);
        return this.currentUser;
    }

    async login(email: string): Promise<User | null> {
        await delay(500);
        const user = DB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (user) {
            this.currentUser = user;
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return user;
        }
        return null;
    }

    logout(): void {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
    }

    async getSubscription(tenantId: string): Promise<Subscription | null> {
        await delay(400);
        return DB.subscriptions.find(s => s.tenantId === tenantId) || null;
    }

    async updateSubscriptionPlan(tenantId: string, planId: PlanId): Promise<Subscription> {
        await delay(1000);
        const sub = DB.subscriptions.find(s => s.tenantId === tenantId);
        if (!sub) throw new Error("Subscription not found");
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        sub.planId = planId;
        sub.status = SubscriptionStatus.ACTIVE;
        sub.trialEnds = null;
        sub.renewalDate = renewalDate.toISOString();
        return sub;
    }
    
    async expireTrial(tenantId: string): Promise<Subscription> {
        await delay(800);
        const sub = DB.subscriptions.find(s => s.tenantId === tenantId);
        if (!sub) throw new Error("Subscription not found");
        sub.status = SubscriptionStatus.PAST_DUE;
        sub.trialEnds = new Date().toISOString();
        return sub;
    }
    
    processDashboardData(workOrders: WorkOrder[]) {
        const workOrderStats: Record<string, number> = {};
        const revenueBreakdownMap: Record<string, number> = { Labour: 0, Parts: 0 };
        const allLineItems: WorkOrderLineItem[] = [];
        
        workOrders.forEach(wo => {
            workOrderStats[wo.status] = (workOrderStats[wo.status] || 0) + 1;
            if (wo.status === WorkOrderStatus.COMPLETED || wo.status === WorkOrderStatus.INVOICED) {
                 wo.lineItems.forEach(li => {
                    allLineItems.push(li); // Collect all items for total calculation
                    const itemTotal = li.quantity * li.unitPrice;
                    if (li.type === 'labour') revenueBreakdownMap['Labour'] += itemTotal;
                    else if (li.type === 'part') revenueBreakdownMap['Parts'] += itemTotal;
                });
            }
        });
        
        const { net, vat, gross } = calculateWorkOrderTotals(allLineItems, DB.garageSettings.vatRate);

        return {
            totalNet: net / 100,
            totalVat: vat / 100,
            totalGross: gross / 100,
            workOrderStats,
            revenueBreakdown: Object.entries(revenueBreakdownMap).map(([name, value]) => ({ name, value: value / 100 })),
        };
    }

    async getDashboardData(range: 'day' | 'week' | 'month'): Promise<DashboardData> {
        await delay(1200);
        const now = new Date();
        let startDate: Date;
        if (range === 'day') {
            startDate = new Date(now.setHours(0,0,0,0));
        } else if (range === 'week') {
            startDate = getStartOfWeek(now);
        } else {
            startDate = getStartOfMonth(now);
        }
        
        const relevantWorkOrders = DB.workOrders.filter(wo => new Date(wo.createdAt) >= startDate);
        const processedData = this.processDashboardData(relevantWorkOrders);

        const techProductivity = TECHNICIANS.map(name => ({
             name,
             logged: range === 'day' ? 0 : chance.integer({min: 25, max: 40}),
             billed: range === 'day' ? 0 : chance.integer({min: 30, max: 45})
        }));

        if (range === 'day' && relevantWorkOrders.length === 0) {
            return {
                totalNet: 0, totalVat: 0, totalGross: 0,
                workOrderStats: {},
                revenueBreakdown: [],
                techProductivity: TECHNICIANS.map(name => ({name, logged: 0, billed: 0}))
            }
        }
        
        return { ...processedData, techProductivity, };
    }

    async getWorkOrders(): Promise<WorkOrder[]> {
        await delay(800);
        return [...DB.workOrders];
    }

    async getWorkOrder(id: string): Promise<(WorkOrder & { vehicleDetails: VehicleDetails | null }) | null> {
        await delay(500);
        const wo = DB.workOrders.find(wo => wo.id === id);
        if (!wo) return null;
        
        const vehicleDetails = await this.getVehicleDetails(wo.vrm);
        
        return { ...wo, vehicleDetails };
    }

    async updateWorkOrderStatus(id: string, status: WorkOrderStatus): Promise<WorkOrder> {
        await delay(400);
        const wo = DB.workOrders.find(wo => wo.id === id);
        if (!wo) throw new Error("Work order not found");
        wo.status = status;
        wo.lastUpdatedAt = new Date().toISOString();
        return wo;
    }

    async addLineItem(workOrderId: string, item: Omit<WorkOrderLineItem, 'id'>): Promise<WorkOrder> {
        await delay(500);
        const wo = DB.workOrders.find(wo => wo.id === workOrderId);
        if (!wo) throw new Error("Work order not found");
        const newItem: WorkOrderLineItem = { ...item, id: `li_${workOrderId}_${wo.lineItems.length}` };
        wo.lineItems.push(newItem);
        wo.lastUpdatedAt = new Date().toISOString();
        return wo;
    }
    
    async updateLineItem(workOrderId: string, itemId: string, updates: Partial<WorkOrderLineItem>): Promise<WorkOrder> {
        await delay(500);
        const wo = DB.workOrders.find(wo => wo.id === workOrderId);
        if (!wo) throw new Error("Work order not found");
        const itemIndex = wo.lineItems.findIndex(li => li.id === itemId);
        if (itemIndex === -1) throw new Error("Line item not found");
        wo.lineItems[itemIndex] = { ...wo.lineItems[itemIndex], ...updates };
        wo.lastUpdatedAt = new Date().toISOString();
        return wo;
    }

    async deleteLineItem(workOrderId: string, itemId: string): Promise<WorkOrder> {
        await delay(500);
        const wo = DB.workOrders.find(wo => wo.id === workOrderId);
        if (!wo) throw new Error("Work order not found");
        wo.lineItems = wo.lineItems.filter(li => li.id !== itemId);
        wo.lastUpdatedAt = new Date().toISOString();
        return wo;
    }

    async startTimeLog(workOrderId: string, technicianName: string): Promise<WorkOrder> {
        await delay(300);
        const wo = DB.workOrders.find(wo => wo.id === workOrderId);
        if (!wo) throw new Error("Work order not found");

        const hasActiveLog = wo.timeLogs.some(tl => tl.technicianName === technicianName && tl.endTime === null);
        if (hasActiveLog) throw new Error("Technician already has an active log on this work order.");

        const newLog: TimeLog = {
            id: `tl_${workOrderId}_${wo.timeLogs.length}`,
            technicianName,
            startTime: new Date().toISOString(),
            endTime: null,
            durationMinutes: 0
        };
        wo.timeLogs.push(newLog);
        wo.lastUpdatedAt = new Date().toISOString();
        return wo;
    }
    
    async stopTimeLog(workOrderId: string, technicianName: string): Promise<{ workOrder: WorkOrder, stoppedLog: TimeLog }> {
        await delay(300);
        const wo = DB.workOrders.find(wo => wo.id === workOrderId);
        if (!wo) throw new Error("Work order not found");

        const logIndex = wo.timeLogs.findIndex(tl => tl.technicianName === technicianName && tl.endTime === null);
        if (logIndex === -1) throw new Error("No active time log found for this technician.");
        
        const log = wo.timeLogs[logIndex];
        const endTime = new Date();
        const startTime = new Date(log.startTime);
        const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        log.endTime = endTime.toISOString();
        log.durationMinutes = durationMinutes;
        
        wo.lastUpdatedAt = new Date().toISOString();
        return { workOrder: wo, stoppedLog: log };
    }

    
    async getVehicleDetails(vrm: string): Promise<VehicleDetails | null> {
        await delay(1000);
        const upperVrm = vrm.toUpperCase();
        if (upperVrm.includes('NOTFOUND')) return null;

        if (DB.vehicles[upperVrm]) {
            return DB.vehicles[upperVrm];
        }

        const motHistory: MotHistoryItem[] = [
            { date: '15/03/2023', status: 'Pass', mileage: 72104 },
            { date: '12/03/2022', status: 'Pass', mileage: 65231 },
            { date: '20/03/2021', status: 'Fail', mileage: 58992, defects: ['Brake pads worn'] },
        ];
        
        const isMotValid = chance.bool({likelihood: 85});
        const isTaxed = chance.bool({likelihood: 95});

        const details: VehicleDetails = {
            vrm: upperVrm,
            make: chance.pickone(['Ford', 'VW', 'BMW', 'Audi', 'Vauxhall']),
            model: chance.pickone(['Focus', 'Golf', '3 Series', 'A4', 'Corsa']),
            // FIX: chance.year() returns a string, but the type expects a number. Parse it to an integer.
            year: parseInt(chance.year({min: 2010, max: 2022})),
            colour: chance.color({format: 'name'}),
            motStatus: isMotValid ? 'Valid' : 'Expired',
            motExpiry: isMotValid ? formatISO(chance.date({year: new Date().getFullYear() + 1 }), { representation: 'date' }) : formatISO(chance.date({year: new Date().getFullYear() -1 }), { representation: 'date' }),
            taxStatus: isTaxed ? 'Taxed' : 'Untaxed',
            motHistory,
        };
        DB.vehicles[upperVrm] = details;
        return details;
    }
    
    async checkForOpenWorkOrders(vrm: string): Promise<boolean> {
        await delay(300);
        const openStatuses = [WorkOrderStatus.NEW, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.AWAITING_CUSTOMER, WorkOrderStatus.AWAITING_PARTS, WorkOrderStatus.READY];
        return DB.workOrders.some(wo => wo.vrm.toUpperCase() === vrm.toUpperCase() && openStatuses.includes(wo.status));
    }
    
    async findCustomer(query: string): Promise<Customer[]> {
        await delay(400);
        const q = query.toLowerCase();
        return DB.customers.filter(c => 
            c.name.toLowerCase().includes(q) || 
            c.email.toLowerCase().includes(q) ||
            c.phone.includes(q)
        );
    }
    
    async createCustomer(newCustomer: Omit<Customer, 'id'>): Promise<Customer> {
        await delay(700);
        const customer: Customer = {
            id: `cust_${DB.customers.length + 1}`,
            ...newCustomer
        };
        DB.customers.push(customer);
        return customer;
    }

    async createWorkOrder(data: { customerId: string, vehicleDetails: VehicleDetails, issue: string, isUrgent: boolean }): Promise<WorkOrder> {
        await delay(1200);
        const customer = DB.customers.find(c => c.id === data.customerId);
        if (!customer) throw new Error('Customer not found');

        const now = new Date().toISOString();

        const newWorkOrder: WorkOrder = {
            id: `WO-${1000 + DB.workOrders.length}`,
            status: WorkOrderStatus.NEW,
            createdAt: now,
            lastUpdatedAt: now,
            customerName: customer.name,
            customerEmail: customer.email,
            customerPhone: customer.phone,
            vehicle: `${data.vehicleDetails.make} ${data.vehicleDetails.model} (${data.vehicleDetails.year})`,
            vrm: data.vehicleDetails.vrm,
            issue: data.issue,
            total: 0,
            isUrgent: data.isUrgent,
            lineItems: [],
            timeLogs: [],
            notes: [],
        };
        DB.workOrders.unshift(newWorkOrder);
        return newWorkOrder;
    }

    // --- Inventory Methods ---
    async getInventory(): Promise<InventoryItem[]> {
        await delay(600);
        return [...DB.inventory];
    }

    async updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem> {
        await delay(400);
        const itemIndex = DB.inventory.findIndex(item => item.id === itemId);
        if (itemIndex === -1) throw new Error("Inventory item not found");
        
        if (updates.stockQty !== undefined && updates.stockQty < 0) {
            throw new Error("Stock quantity cannot be negative.");
        }

        DB.inventory[itemIndex] = { ...DB.inventory[itemIndex], ...updates };
        return DB.inventory[itemIndex];
    }

    // --- Settings Methods ---
    async getGarageSettings(): Promise<GarageSettings> {
        await delay(300);
        return { ...DB.garageSettings };
    }

    async updateGarageSettings(settings: GarageSettings): Promise<GarageSettings> {
        await delay(800);
        DB.garageSettings = { ...settings };
        return { ...DB.garageSettings };
    }
}

export const mockApi = new MockApi();
export const TECHNICIANS_LIST = TECHNICIANS;