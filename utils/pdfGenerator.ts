import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { WorkOrder, GarageSettings } from '../types';
import { formatGbp } from './money';

// FIX: The manual module augmentation for 'jspdf' was removed from here.
// It was causing a type error because the 'jspdf-autotable' library now 
// includes its own type definitions that automatically augment jsPDF.
// Extend jsPDF with the autoTable method
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePdf = (
  workOrder: WorkOrder,
  settings: GarageSettings,
  totals: { net: number; vat: number; gross: number }
) => {
  const doc = new jsPDF();
  const pageHeight = doc.internal.pageSize.height;
  let finalY = 0; // Keep track of the last y position

  // --- HEADER ---
  const drawHeader = () => {
    // Company Info
    doc.setFontSize(10);
    doc.text(settings.companyName, 14, 20);
    doc.text(settings.address.split(', ')[0], 14, 25);
    doc.text(settings.address.split(', ').slice(1).join(', '), 14, 30);
    doc.text(settings.phone, 14, 35);
    doc.text(settings.email, 14, 40);

    // Invoice Info
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 200, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice #: ${workOrder.id}`, 200, 28, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 33, { align: 'right' });
  };
  
  drawHeader();

  // --- CUSTOMER & VEHICLE INFO ---
  doc.setLineWidth(0.5);
  doc.line(14, 45, 200, 45);

  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.customerName, 14, 60);

  doc.setFont('helvetica', 'bold');
  doc.text('VEHICLE:', 100, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(workOrder.vehicle, 100, 60);
  doc.text(workOrder.vrm, 100, 65);

  // --- LINE ITEMS TABLE ---
  const tableColumn = ['Description', 'Quantity', 'Unit Price', 'Total'];
  const tableRows = workOrder.lineItems.map(item => [
    item.description,
    item.quantity.toFixed(2),
    formatGbp(item.unitPrice),
    formatGbp(item.quantity * item.unitPrice)
  ]);

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 75,
    headStyles: { fillColor: [22, 160, 133] },
    didDrawPage: (data) => {
        // Redraw header on new pages
        if(data.pageNumber > 1) {
            drawHeader();
        }
    }
  });

  // Get the y position of the last row
  // FIX: Updated to use the modern `lastAutoTable` property from `jspdf-autotable`
  // instead of the deprecated `autoTable.previous` to get the table's final Y position.
  finalY = (doc as any).lastAutoTable.finalY;

  // --- TOTALS ---
  const totalsX = 140;
  const totalsY = finalY + 10;
  doc.setFontSize(10);
  doc.text('Net Total:', totalsX, totalsY, { align: 'right' });
  doc.text(formatGbp(totals.net), 200, totalsY, { align: 'right' });
  
  doc.text(`VAT @ ${settings.vatRate}%:`, totalsX, totalsY + 5, { align: 'right' });
  doc.text(formatGbp(totals.vat), 200, totalsY + 5, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Gross Total:', totalsX, totalsY + 12, { align: 'right' });
  doc.text(formatGbp(totals.gross), 200, totalsY + 12, { align: 'right' });

  finalY = totalsY + 20;

  // --- FOOTER / NOTES ---
  doc.setFontSize(9);
  doc.setTextColor(100);
  const splitNotes = doc.splitTextToSize(settings.invoiceNotes, 180);

  // Check if notes fit on the current page, otherwise add a new page
  const notesHeight = splitNotes.length * 5;
  if (finalY + notesHeight > pageHeight - 20) {
    doc.addPage();
    drawHeader();
    finalY = 20;
  }
  
  doc.text(splitNotes, 14, finalY);

  // --- SAVE ---
  doc.save(`Invoice-${workOrder.id}.pdf`);
};
