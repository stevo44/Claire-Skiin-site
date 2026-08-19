/**
 * WhatsApp Helper for Claire Skiin Admin Notification Feature.
 * Formats Cameroonian phone numbers and builds clean, pre-filled wa.me links.
 */

/**
 * Standardize Cameroonian phone number to international 237 format.
 * Examples:
 *   "675501234"      -> "237675501234"
 *   "+237 675501234" -> "237675501234"
 *   "237675501234"   -> "237675501234"
 *   "0675501234"     -> "237675501234"
 */
export function formatWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  // Strip all non-numeric characters
  let clean = phone.replace(/\D/g, '');
  
  // If starts with 06 or 02, strip leading 0
  if (clean.startsWith('0') && clean.length === 10) {
    clean = clean.substring(1);
  }

  // If 9 digits starting with 6 (standard CM mobile), prepend 237
  if (clean.length === 9 && clean.startsWith('6')) {
    clean = '237' + clean;
  }
  
  return clean;
}

export interface OrderNotificationData {
  id: string | number;
  customerName: string;
  phone: string;
  status: string;
  totalAmount: number;
  deliveryMethod?: 'local_delivery' | 'agency_shipping' | 'pickup' | string;
  agencyName?: string;
  destinationOffice?: string;
  town?: string;
}

export interface AppointmentNotificationData {
  id: string | number;
  customerName: string;
  phone: string;
  serviceName?: string;
  date: string;
  time: string;
  status: string;
}

/**
 * Build pre-filled WhatsApp link for Order status update / customer notification.
 */
export function buildOrderWhatsAppLink(order: OrderNotificationData): string {
  const formattedPhone = formatWhatsAppNumber(order.phone);
  if (!formattedPhone) return '';

  const orderIdStr = `#${String(order.id).slice(-5).toUpperCase()}`;
  let message = `Hello ${order.customerName},\n\n` +
    `This is Claire Skiin Boutique regarding your Order ${orderIdStr}.\n` +
    `Status: *${order.status.toUpperCase()}*\n` +
    `Total: *${order.totalAmount.toLocaleString('fr-CM')} XAF*\n`;

  if (order.deliveryMethod === 'agency_shipping') {
    message += `Delivery: Agency Shipping via *${order.agencyName || 'Selected Agency'}*\n`;
    if (order.town) message += `Destination Town: ${order.town}\n`;
    if (order.destinationOffice) message += `Collection Office: ${order.destinationOffice}\n`;
    message += `Please note: Agency waybill / parcel tracking details will be sent once dispatched.\n`;
  } else if (order.deliveryMethod === 'local_delivery') {
    message += `Delivery: Local Door-to-Door (Buea)\n`;
  } else if (order.deliveryMethod === 'pickup') {
    message += `Delivery: In-Person Pickup at Claire Skiin Sanctuary (Buea)\n`;
  }

  message += `\nThank you for choosing Claire Skiin! If you have any questions, reply to this message.`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Build pre-filled WhatsApp link for Appointment status update / customer notification.
 */
export function buildAppointmentWhatsAppLink(appointment: AppointmentNotificationData): string {
  const formattedPhone = formatWhatsAppNumber(appointment.phone);
  if (!formattedPhone) return '';

  let message = `Hello ${appointment.customerName},\n\n` +
    `This is Claire Skiin Spa regarding your appointment:\n` +
    `Service: *${appointment.serviceName || 'Spa Service'}*\n` +
    `Date: *${appointment.date}*\n` +
    `Time: *${appointment.time}*\n` +
    `Status: *${appointment.status.toUpperCase()}*\n\n` +
    `We look forward to welcoming you to our sanctuary in Buea!\n` +
    `If you need to reschedule or have questions, please reply here.`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
