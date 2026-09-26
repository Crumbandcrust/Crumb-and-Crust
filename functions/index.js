const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
initializeApp();
const db = getFirestore();
const { defineSecret } = require("firebase-functions/params");
const { Resend } = require("resend");
const logger = require("firebase-functions/logger");

const resendApiKey = defineSecret("RESEND_API_KEY");

const RECIPIENTS = [
  "jake.smith2013@icloud.com",
  "neil.f.driscoll26@gmail.com"
];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return "<p>No item details were provided.</p>";
  }

  return items
    .map((item) => {
      const name = escapeHtml(item.name || "Item");
      const quantity = Number(item.quantity) || 0;
      const subtotal = formatMoney(item.subtotal);
      return `<li><strong>${quantity}× ${name}</strong> — ${subtotal}</li>`;
    })
    .join("");
}

const MAX_WEEKEND_LOAVES = 8;
const MIN_NOTICE_HOURS = 72;
const MAX_ADVANCE_DAYS = 21;

function pacificTodayKey() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function validatePreferredDate(preferredDate) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(preferredDate)) throw new HttpsError("invalid-argument", "Choose a valid Saturday or Sunday.");
  const [year, month, day] = preferredDate.split("-").map(Number);
  const target = new Date(year, month - 1, day);
  const [todayYear, todayMonth, todayDay] = pacificTodayKey().split("-").map(Number);
  const today = new Date(todayYear, todayMonth - 1, todayDay);
  const dayOfWeek = target.getDay();
  if (dayOfWeek !== 0 && dayOfWeek !== 6) throw new HttpsError("invalid-argument", "Pickup and delivery are available Saturday and Sunday only.");
  const diffHours = (target.getTime() - today.getTime()) / 3600000;
  if (diffHours < MIN_NOTICE_HOURS) throw new HttpsError("failed-precondition", "That weekend is too soon to order. Orders require at least 72 hours' notice.");
  if (diffHours > MAX_ADVANCE_DAYS * 24) throw new HttpsError("failed-precondition", "Orders can be scheduled up to 21 days in advance.");
}

function weekendKey(preferredDate) {
  const date = new Date(String(preferredDate || "") + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() - 1);
  else if (day !== 6) date.setDate(date.getDate() - ((day + 1) % 7));
  return date.toISOString().slice(0, 10);
}

function validateItems(items) {
  if (!Array.isArray(items) || !items.length) throw new HttpsError("invalid-argument", "Add at least one item.");
  const normalized = items.map(item => ({
    name: String(item.name || "Item"),
    quantity: Math.max(0, Number(item.quantity) || 0),
    price: Number(item.price) || 0,
    subtotal: Number(item.subtotal) || 0
  })).filter(item => item.quantity > 0);
  const count = normalized.reduce((sum, item) => sum + item.quantity, 0);
  if (!count || count > 4) throw new HttpsError("invalid-argument", "Orders are limited to 4 items.");
  return { normalized, count };
}

exports.getWeekendCapacity = onCall({ region: "us-west1" }, async (request) => {
  const key = weekendKey(request.data?.preferredDate);
  if (!key) throw new HttpsError("invalid-argument", "Choose a valid Saturday or Sunday.");
  const snap = await db.collection("weeklyCapacity").doc(key).get();
  const reserved = Number(snap.data()?.reservedLoaves || 0);
  return { weekendKey: key, remaining: Math.max(0, MAX_WEEKEND_LOAVES - reserved), maxLoaves: MAX_WEEKEND_LOAVES };
});

exports.placeOrder = onCall({ region: "us-west1" }, async (request) => {
  const data = request.data || {};
  const preferredDate = String(data.preferredDate || "");
  const key = weekendKey(preferredDate);
  if (!key) throw new HttpsError("invalid-argument", "Choose a valid Saturday or Sunday.");
  validatePreferredDate(preferredDate);
  const { normalized, count } = validateItems(data.items);
  const capacityRef = db.collection("weeklyCapacity").doc(key);
  const orderRef = db.collection("orders").doc();
  const orderNumber = "CC-" + Date.now().toString().slice(-8);

  let remainingAfter = MAX_WEEKEND_LOAVES;
  await db.runTransaction(async transaction => {
    const capacitySnap = await transaction.get(capacityRef);
    const reserved = Number(capacitySnap.data()?.reservedLoaves || 0);
    if (reserved + count > MAX_WEEKEND_LOAVES) {
      throw new HttpsError("resource-exhausted", "Only " + Math.max(0, MAX_WEEKEND_LOAVES - reserved) + " loaves remain for this weekend.");
    }
    remainingAfter = MAX_WEEKEND_LOAVES - reserved - count;
    transaction.set(capacityRef, {
      reservedLoaves: reserved + count,
      maxLoaves: MAX_WEEKEND_LOAVES,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(orderRef, {
      orderNumber,
      customer: String(data.customerName || ""),
      customerName: String(data.customerName || ""),
      phone: String(data.phone || ""),
      email: String(data.email || ""),
      fulfillment: String(data.fulfillment || "Pickup"),
      deliveryAddress: String(data.deliveryAddress || ""),
      preferredDate,
      notes: String(data.notes || ""),
      items: normalized,
      itemsSummary: normalized.map(item => item.quantity + "× " + item.name).join(", "),
      itemCount: count,
      deliveryFee: Number(data.deliveryFee) || 0,
      total: Number(data.total) || 0,
      status: "New",
      source: "website",
      weekendKey: key,
      capacityUnits: count,
      inventoryDeducted: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  return { orderId: orderRef.id, orderNumber, remaining: remainingAfter };
});

exports.releaseCancelledOrderCapacity = onDocumentUpdated({ document: "orders/{orderId}", region: "us-west1" }, async event => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!before || !after) return;
  const wasCancelled = String(before.status || "").toLowerCase() === "cancelled";
  const isCancelled = String(after.status || "").toLowerCase() === "cancelled";
  if (wasCancelled === isCancelled || !after.weekendKey) return;
  const ref = db.collection("weeklyCapacity").doc(after.weekendKey);
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const reserved = Number(snap.data()?.reservedLoaves || 0);
    const units = Number(after.capacityUnits || after.itemCount || 0);
    transaction.set(ref, { reservedLoaves: Math.max(0, reserved + (isCancelled ? -units : units)), maxLoaves: MAX_WEEKEND_LOAVES, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
});

exports.releaseDeletedOrderCapacity = onDocumentDeleted({ document: "orders/{orderId}", region: "us-west1" }, async event => {
  const order = event.data?.data();
  if (!order?.weekendKey || String(order.status || "").toLowerCase() === "cancelled") return;
  const ref = db.collection("weeklyCapacity").doc(order.weekendKey);
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const reserved = Number(snap.data()?.reservedLoaves || 0);
    const units = Number(order.capacityUnits || order.itemCount || 0);
    transaction.set(ref, { reservedLoaves: Math.max(0, reserved - units), maxLoaves: MAX_WEEKEND_LOAVES, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
});

exports.sendNewOrderEmail = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "us-west1",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      logger.warn("Order trigger ran without document data.");
      return;
    }

    const order = snapshot.data() || {};
    const orderNumber = order.orderNumber || event.params.orderId;

    const subject = `🍞 New Crumb & Crust Order — ${orderNumber}`;

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#222;max-width:700px">
        <h1>🍞 New Crumb & Crust Order</h1>
        <h2>${escapeHtml(orderNumber)}</h2>

        <h3>Customer</h3>
        <p>
          <strong>Name:</strong> ${escapeHtml(order.customerName || order.customer)}<br>
          <strong>Email:</strong> ${escapeHtml(order.email)}<br>
          <strong>Phone:</strong> ${escapeHtml(order.phone)}
        </p>

        <h3>Order</h3>
        <ul>${formatItems(order.items)}</ul>

        <p>
          <strong>Fulfillment:</strong> ${escapeHtml(order.fulfillment)}<br>
          <strong>Preferred date:</strong> ${escapeHtml(order.preferredDate)}<br>
          <strong>Delivery fee:</strong> ${formatMoney(order.deliveryFee)}<br>
          <strong>Total:</strong> ${formatMoney(order.total)}
        </p>

        ${order.deliveryAddress
          ? `<h3>Delivery address</h3><p>${escapeHtml(order.deliveryAddress)}</p>`
          : ""}

        ${order.notes
          ? `<h3>Notes</h3><p>${escapeHtml(order.notes)}</p>`
          : ""}

        <hr>
        <p style="color:#666;font-size:13px">
          This notification was automatically sent from the Crumb & Crust website.
        </p>
      </div>
    `;

    const text = `New Crumb & Crust Order — ${orderNumber}

Customer:
Name: ${order.customerName || order.customer || ""}
Email: ${order.email || ""}
Phone: ${order.phone || ""}

Order:
${Array.isArray(order.items)
    ? order.items.map((item) => `${item.quantity}× ${item.name} — ${formatMoney(item.subtotal)}`).join("\n")
    : "No item details provided."}

Fulfillment: ${order.fulfillment || ""}
Preferred date: ${order.preferredDate || ""}
Delivery fee: ${formatMoney(order.deliveryFee)}
Total: ${formatMoney(order.total)}

${order.deliveryAddress ? `Delivery address: ${order.deliveryAddress}\n` : ""}
${order.notes ? `Notes: ${order.notes}\n` : ""}
`;

    const resend = new Resend(resendApiKey.value());

    const { data, error } = await resend.emails.send({
      from: "Crumb & Crust <crumbandcrustca@gmail.com>",
      to: RECIPIENTS,
      subject,
      html,
      text,
    });

    if (error) {
      logger.error("Resend failed to send the order notification.", error);
      throw new Error(error.message || "Resend failed.");
    }

    logger.info("New order notification sent.", {
      orderNumber,
      resendEmailId: data?.id || null,
    });
  }
);
