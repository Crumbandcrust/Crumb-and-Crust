const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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
