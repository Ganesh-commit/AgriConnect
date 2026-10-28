/**
 * PDF Invoice Generator for Completed Orders (Integration 10)
 * Uses `pdfkit` if installed, with a built-in standards-compliant PDF 1.4 generator
 * so downloadable PDF invoices work reliably with zero external dependencies.
 */

let PDFDocument = null;
try {
  PDFDocument = require('pdfkit');
} catch {
  PDFDocument = null;
}

function escapePdfText(str = '') {
  return String(str)
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * Builds a valid PDF 1.4 Buffer containing the formatted AgriConnect Invoice.
 */
async function generateInvoicePdfBuffer(order) {
  const invoiceNo =
    order.invoiceNumber ||
    `INV-${new Date(order.createdAt || Date.now()).getFullYear()}-${String(order._id)
      .slice(-6)
      .toUpperCase()}`;

  const orderDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const farmerName = order.farmer?.name || 'Farmer';
  const farmerPhone = order.farmer?.phone || 'N/A';
  const farmerLoc = [
    order.farmer?.location?.village,
    order.farmer?.location?.district,
    order.farmer?.location?.state
  ]
    .filter(Boolean)
    .join(', ') || 'India';

  const buyerName = order.buyer?.name || 'Buyer';
  const buyerPhone = order.buyer?.phone || 'N/A';
  const deliveryAddr = order.deliveryLocation || 'Direct Pickup / Delivery';

  const cropName = order.crop?.name || 'Agricultural Produce';
  const category = order.crop?.category || 'Produce';
  const unit = order.crop?.unit || 'kg';
  const qty = order.quantity || 1;
  const rate = order.pricePerUnit || 0;
  const total = order.totalPrice || qty * rate;
  const paymentMethod = (order.paymentMethod || 'cash').toUpperCase();
  const paymentStatus = (order.paymentStatus || 'paid').toUpperCase();

  if (PDFDocument) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).fillColor('#15803d').text('AgriConnect - Direct Farm Invoice', { align: 'left' });
      doc.fontSize(10).fillColor('#475569').text('Farmer-to-Buyer Direct Agricultural Marketplace', { align: 'left' });
      doc.moveDown(1);

      doc.fontSize(11).fillColor('#0f172a');
      doc.text(`Invoice Number: ${invoiceNo}`);
      doc.text(`Order ID: ${order._id}`);
      doc.text(`Date: ${orderDate}`);
      doc.text(`Order Status: ${String(order.status).toUpperCase()}`);
      doc.text(`Payment: ${paymentMethod} (${paymentStatus})`);
      doc.moveDown(1);

      doc.fontSize(12).fillColor('#15803d').text('Farmer (Seller) Details');
      doc.fontSize(10).fillColor('#1e293b');
      doc.text(`Name: ${farmerName}`);
      doc.text(`Phone: ${farmerPhone}`);
      doc.text(`Location: ${farmerLoc}`);
      if (order.farmer?.upiId) doc.text(`UPI ID: ${order.farmer.upiId}`);
      doc.moveDown(1);

      doc.fontSize(12).fillColor('#15803d').text('Buyer (Consignee) Details');
      doc.fontSize(10).fillColor('#1e293b');
      doc.text(`Name: ${buyerName}`);
      doc.text(`Phone: ${buyerPhone}`);
      doc.text(`Delivery Location: ${deliveryAddr}`);
      doc.moveDown(1.5);

      doc.fontSize(12).fillColor('#15803d').text('Order Line Items');
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#0f172a');
      doc.text(`Produce: ${cropName} (${category})`);
      doc.text(`Quantity: ${qty} ${unit}`);
      doc.text(`Unit Rate: INR ${rate} / ${unit}`);
      doc.moveDown(0.5);
      doc.fontSize(14).fillColor('#15803d').text(`Total Amount: INR ${total.toLocaleString('en-IN')}`);
      doc.moveDown(2);

      doc.fontSize(9).fillColor('#64748b').text(
        'Note: Payments are settled directly between Farmer and Buyer via UPI or Cash. AgriConnect charges 0% middleman commission.',
        { align: 'center' }
      );

      doc.end();
    });
  }

  // Standards-compliant PDF 1.4 builder
  const lines = [
    { size: 18, y: 770, text: 'AGRICONNECT - DIRECT FARM TAX/TRADE INVOICE' },
    { size: 10, y: 752, text: 'Zero-Middleman Farmer-to-Buyer Marketplace' },
    { size: 10, y: 730, text: '--------------------------------------------------------------------------------' },
    { size: 11, y: 710, text: `Invoice Number : ${invoiceNo}` },
    { size: 11, y: 694, text: `Order Reference: ${order._id}` },
    { size: 11, y: 678, text: `Invoice Date   : ${orderDate}` },
    { size: 11, y: 662, text: `Order Status   : ${String(order.status).toUpperCase()}   |   Payment: ${paymentMethod} (${paymentStatus})` },
    { size: 10, y: 642, text: '--------------------------------------------------------------------------------' },
    { size: 12, y: 620, text: 'SELLER (FARMER) DETAILS:' },
    { size: 10, y: 604, text: `Name     : ${farmerName}` },
    { size: 10, y: 588, text: `Phone    : ${farmerPhone}` },
    { size: 10, y: 572, text: `Location : ${farmerLoc}` },
    { size: 10, y: 556, text: `UPI ID   : ${order.farmer?.upiId || 'Direct Settlement'}` },
    { size: 12, y: 528, text: 'BUYER (CONSIGNEE) DETAILS:' },
    { size: 10, y: 512, text: `Name     : ${buyerName}` },
    { size: 10, y: 496, text: `Phone    : ${buyerPhone}` },
    { size: 10, y: 480, text: `Delivery : ${deliveryAddr}` },
    { size: 10, y: 458, text: '--------------------------------------------------------------------------------' },
    { size: 12, y: 438, text: 'ITEMIZED PRODUCE SUMMARY:' },
    { size: 11, y: 416, text: `1. ${cropName} (${category})` },
    { size: 11, y: 398, text: `   Quantity : ${qty} ${unit}` },
    { size: 11, y: 380, text: `   Unit Rate: INR ${rate} per ${unit}` },
    { size: 10, y: 358, text: '--------------------------------------------------------------------------------' },
    { size: 14, y: 336, text: `GRAND TOTAL: INR ${Number(total).toFixed(2)}` },
    { size: 10, y: 314, text: '--------------------------------------------------------------------------------' },
    { size: 9, y: 280, text: 'Declaration: This invoice records a direct farmer-to-buyer agricultural transaction.' },
    { size: 9, y: 266, text: 'Payments are settled directly between buyer and farmer without middlemen.' }
  ];

  const streamOps = ['BT', '/F1 12 Tf'];
  for (const line of lines) {
    streamOps.push(`/F1 ${line.size} Tf`);
    streamOps.push(`1 0 0 1 50 ${line.y} Tm`);
    streamOps.push(`(${escapePdfText(line.text)}) Tj`);
  }
  streamOps.push('ET');
  const contentStream = streamOps.join('\n');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf-8')} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf-8'));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, 'utf-8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf-8');
}

module.exports = {
  generateInvoicePdfBuffer
};

