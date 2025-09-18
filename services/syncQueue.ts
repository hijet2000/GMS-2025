import { SyncAction } from '../types';

const SYNC_QUEUE_KEY = 'gms_sync_queue';

class SyncQueue {
    private queue: SyncAction[] = [];
    private subscribers: (() => void)[] = [];

    constructor() {
        this.loadQueue();
    }

    private loadQueue() {
        try {
            const storedQueue = localStorage.getItem(SYNC_QUEUE_KEY);
            if (storedQueue) {
                this.queue = JSON.parse(storedQueue);
            }
        } catch (e) {
            console.error("Could not load sync queue from localStorage", e);
            this.queue = [];
        }
    }

    private saveQueue() {
        try {
            localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
            this.notifySubscribers();
        } catch (e) {
            console.error("Could not save sync queue to localStorage", e);
        }
    }

    private notifySubscribers() {
        this.subscribers.forEach(callback => callback());
    }

    subscribe(callback: () => void) {
        this.subscribers.push(callback);
    }

    unsubscribe(callback: () => void) {
        this.subscribers = this.subscribers.filter(cb => cb !== callback);
    }

    addAction(actionPayload: Omit<SyncAction, 'id' | 'timestamp'>) {
        const action: SyncAction = {
            ...actionPayload,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
        };
        this.queue.push(action);
        this.saveQueue();
    }

    getQueue(): SyncAction[] {
        return [...this.queue];
    }

    removeAction(actionId: string) {
        this.queue = this.queue.filter(action => action.id !== actionId);
        this.saveQueue();
    }

    clearQueue() {
        this.queue = [];
        this.saveQueue();
    }
}

export const syncQueue = new SyncQueue();
