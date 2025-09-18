
import { WorkOrderLineItem } from '../types';

/**
 * Formats an amount in pence into a GBP string.
 * @param amountInPence - The amount in pence.
 * @returns A string formatted as £xx.xx
 */
export const formatGbp = (amountInPence: number): string => {
    if (typeof amountInPence !== 'number' || isNaN(amountInPence)) {
        amountInPence = 0;
    }
    return `£${(amountInPence / 100).toFixed(2)}`;
};

/**
 * Calculates the total cost of a single line item in pence.
 * @param item - The work order line item.
 * @returns The total cost in pence.
 */
export const calculateLineItemTotal = (item: WorkOrderLineItem): number => {
    return Math.round(item.quantity * item.unitPrice);
};

/**
 * Calculates the net, VAT, and gross totals for a list of line items.
 * @param lineItems - An array of work order line items.
 * @param vatRate - The VAT rate as a percentage (e.g., 20 for 20%).
 * @returns An object with net, vat, and gross totals in pence.
 */
export const calculateWorkOrderTotals = (lineItems: WorkOrderLineItem[], vatRate: number): { net: number, vat: number, gross: number } => {
    let net = 0;
    let vatableAmount = 0;

    lineItems.forEach(item => {
        const lineTotal = calculateLineItemTotal(item);
        net += lineTotal;
        if (item.isVatable) {
            vatableAmount += lineTotal;
        }
    });

    const vat = Math.round(vatableAmount * (vatRate / 100));
    const gross = net + vat;

    return { net, vat, gross };
};