import { prisma } from "@/lib/prisma";

const LULU_PRINT_JOBS_URL = "https://api.lulu.com/print-jobs/";

interface ShippingAddr {
  name?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

/**
 * Submit a print job to Lulu for a paid order.
 * Called from the Stripe webhook after checkout.session.completed.
 *
 * If LULU_API_TOKEN is not configured the step is skipped gracefully
 * (order stays PAID) so local development without Lulu credentials works.
 *
 * @returns the Lulu print job id, or null when skipped.
 */
export async function submitPrintOrder(orderId: string): Promise<string | null> {
  const token = process.env.LULU_API_TOKEN;
  if (!token) {
    console.warn(`[lulu] LULU_API_TOKEN not set — skipping print job for order ${orderId}`);
    return null;
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { book: true, user: true },
  });
  if (!order) throw new Error(`Order ${orderId} not found`);

  let addr: ShippingAddr = {};
  try {
    if (order.shippingAddr) addr = JSON.parse(order.shippingAddr) as ShippingAddr;
  } catch {
    console.warn("[lulu] Could not parse shippingAddr JSON; using defaults");
  }

  const payload = {
    external_id: `order-${order.id}`,
    line_items: [
      {
        external_id: `line-${order.id}`,
        title: order.book.title,
        copies: order.quantity,
        retail_cost: order.amount,
        destination_country_code: addr.country || "US",
        product: {
          // A Lulu print SKU that encodes trim size (6x9), paper, binding, etc.
          sku: process.env.LULU_PRINT_SKU || "",
        },
      },
    ],
    contact_email: process.env.LULU_CONTACT_EMAIL || order.user.email || "",
    shipping_address: {
      name: addr.name || order.user.name || "Customer",
      street1: addr.street || "",
      city: addr.city || "",
      state_code: addr.state || "",
      country_code: addr.country || "US",
      postcode: addr.zip || "",
      phone_number: addr.phone || "",
    },
    shipping_option: {
      name: "",
      code: "MAIL",
      delivery_speed: 5,
    },
  };

  const res = await fetch(LULU_PRINT_JOBS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Lulu API error ${res.status}: ${detail.slice(0, 500)}`);
  }

  const data = (await res.json()) as { id?: string | number };
  const printOrderId = data.id != null ? String(data.id) : "";

  await prisma.order.update({
    where: { id: orderId },
    data: { printOrderId, status: "PRINTING" },
  });

  console.log(`[lulu] Print job created for order ${orderId}: ${printOrderId}`);
  return printOrderId;
}
