import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyDrqltlq7LiRPH84y1-2lH0ISPsEhEQjak",
  authDomain: "crumb-and-crust.firebaseapp.com",
  projectId: "crumb-and-crust",
  storageBucket: "crumb-and-crust.firebasestorage.app",
  messagingSenderId: "514675143126",
  appId: "1:514675143126:web:3f47f98c476b4b0f96f477"
};


const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

document.documentElement.style.visibility = "hidden";


const state = {
  activePage: "dashboard",
  orders: [],
  products: [],
  coupons: [],
  inventory: { breadFlourGrams: 0, apFlourGrams: 0 },

  vacation: {
    enabled: false,
    message: "We are temporarily closed for orders.",
    reopenDate: ""
  },

  settings: {
    bakeryName: "Crumb & Crust",
    email: "",
    phone: ""
  }
};


onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.replace("/admin/login.html");
    return;
  }

  document.documentElement.style.visibility = "visible";
  startAdminDashboard();
});


function startAdminDashboard() {
  const initialize = () => {
    const app = document.getElementById("app");

    if (!app) {
      console.error('Could not find an element with id="app".');
      return;
    }

    installOrderStyles();


    function escapeHtml(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }


    function normalizeOrderStatus(value) {
      return String(value ?? "").trim().toLowerCase();
    }


    function formatMoney(value) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
      }).format(Number(value) || 0);
    }


    function showToast(message, type = "success") {
      document.querySelector(".admin-toast")?.remove();

      const toast = document.createElement("div");
      toast.className = `admin-toast admin-toast-${type}`;
      toast.textContent = message;

      document.body.appendChild(toast);

      window.setTimeout(() => {
        toast.classList.add("visible");
      }, 10);

      window.setTimeout(() => {
        toast.classList.remove("visible");

        window.setTimeout(() => {
          toast.remove();
        }, 250);
      }, 2500);
    }


    function reportError(message, error) {
      console.error(message, error);
      showToast(message, "error");
    }


    function getPageTitle() {
      const titles = {
        dashboard: "Dashboard",
        orders: "Orders",
        orderHistory: "Order History",
        vacation: "Vacation Mode",
        products: "Products",
        coupons: "Coupons",
        analytics: "Analytics",
        settings: "Settings",
        inventory: "Inventory",
        today: "Today",
        customers: "Customers"
      };

      return titles[state.activePage] || "Dashboard";
    }


    function createNavButton(page, label, icon) {
      return `
        <button
          class="nav-button ${state.activePage === page ? "active" : ""}"
          data-page="${page}"
          type="button"
        >
          <span class="nav-icon" aria-hidden="true">${icon}</span>
          <span class="nav-label">${label}</span>
        </button>
      `;
    }


    function createEmptyState(title, message) {
      return `
        <div class="empty-state">
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(message)}</p>
        </div>
      `;
    }


    /*
    ==========================================================
    ORDER HELPERS
    ==========================================================
    */

    function getCustomerName(order) {
      if (
        order.customer &&
        typeof order.customer === "object"
      ) {
        return (
          order.customer.name ||
          order.customer.fullName ||
          ""
        );
      }

      return (
        order.customerName ||
        order.name ||
        order.customer ||
        ""
      );
    }


    function getCustomerPhone(order) {
      if (
        order.customer &&
        typeof order.customer === "object"
      ) {
        return order.customer.phone || "";
      }

      return (
        order.phone ||
        order.phoneNumber ||
        order.customerPhone ||
        ""
      );
    }


    function getCustomerEmail(order) {
      if (
        order.customer &&
        typeof order.customer === "object"
      ) {
        return order.customer.email || "";
      }

      return (
        order.email ||
        order.customerEmail ||
        ""
      );
    }


    function getFulfillmentType(order) {
      const rawValue = String(
        order.fulfillmentType ||
        order.orderType ||
        order.fulfillment ||
        order.deliveryMethod ||
        order.method ||
        order.type ||
        ""
      ).toLowerCase();

      if (rawValue.includes("deliver")) {
        return "Delivery";
      }

      if (rawValue.includes("pickup") || rawValue.includes("pick up")) {
        return "Pickup";
      }

      if (
        order.deliveryAddress ||
        order.address
      ) {
        return "Delivery";
      }

      return "Pickup";
    }


    function getRequestedDate(order) {
      return (
        order.requestedDate ||
        order.fulfillmentDate ||
        order.deliveryDate ||
        order.pickupDate ||
        order.orderDate ||
        order.date ||
        ""
      );
    }


    function getRequestedTime(order) {
      return (
        order.requestedTime ||
        order.fulfillmentTime ||
        order.deliveryTime ||
        order.pickupTime ||
        order.time ||
        ""
      );
    }


    function formatOrderDate(value) {
      if (!value) {
        return "Date not provided";
      }

      try {
        let date;

        if (typeof value?.toDate === "function") {
          date = value.toDate();
        } else if (
          typeof value === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(value)
        ) {
          const [year, month, day] = value.split("-").map(Number);
          date = new Date(year, month - 1, day);
        } else {
          date = new Date(value);
        }

        if (Number.isNaN(date.getTime())) {
          return String(value);
        }

        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const sameDay = (a, b) =>
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate();

        const formatted = new Intl.DateTimeFormat("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric"
        }).format(date);

        if (sameDay(date, today)) {
          return `Today · ${formatted}`;
        }

        if (sameDay(date, tomorrow)) {
          return `Tomorrow · ${formatted}`;
        }

        return formatted;
      } catch {
        return String(value);
      }
    }


    function formatOrderTime(value) {
      if (!value) {
        return "Time not provided";
      }

      const stringValue = String(value).trim();

      const twentyFourHourMatch =
        stringValue.match(/^(\d{1,2}):(\d{2})$/);

      if (!twentyFourHourMatch) {
        return stringValue;
      }

      let hour = Number(twentyFourHourMatch[1]);
      const minutes = twentyFourHourMatch[2];

      const suffix = hour >= 12 ? "PM" : "AM";

      hour = hour % 12;

      if (hour === 0) {
        hour = 12;
      }

      return `${hour}:${minutes} ${suffix}`;
    }


    function getDeliveryAddress(order) {
      const address =
        order.deliveryAddress ||
        order.address ||
        order.shippingAddress ||
        null;

      if (!address) {
        return "";
      }

      if (typeof address === "string") {
        return address;
      }

      const line1 =
        address.street ||
        address.address1 ||
        address.line1 ||
        address.streetAddress ||
        "";

      const line2 =
        address.address2 ||
        address.line2 ||
        address.unit ||
        address.apartment ||
        "";

      const city = address.city || "";

      const region =
        address.state ||
        address.region ||
        "";

      const postalCode =
        address.zip ||
        address.zipCode ||
        address.postalCode ||
        "";

      const firstLine = [line1, line2]
        .filter(Boolean)
        .join(", ");

      const secondLine = [
        city,
        region,
        postalCode
      ]
        .filter(Boolean)
        .join(" ");

      return [firstLine, secondLine]
        .filter(Boolean)
        .join("\n");
    }


    function renderOrderItems(order) {
      const items = order.items;

      if (Array.isArray(items) && items.length) {
        return items
          .map(item => {
            if (typeof item === "string") {
              return `
                <div class="order-item-row">
                  <span>${escapeHtml(item)}</span>
                </div>
              `;
            }

            const quantity =
              Number(
                item.quantity ||
                item.qty ||
                item.count ||
                1
              ) || 1;

            const name =
              item.name ||
              item.productName ||
              item.item ||
              item.title ||
              "Item";

            return `
              <div class="order-item-row">
                <span class="order-item-quantity">
                  ${quantity}×
                </span>

                <span>
                  ${escapeHtml(name)}
                </span>
              </div>
            `;
          })
          .join("");
      }

      const summary =
        order.itemsSummary ||
        order.item ||
        order.product ||
        "";

      if (summary) {
        return `
          <div class="order-item-row">
            <span>${escapeHtml(summary)}</span>
          </div>
        `;
      }

      return `
        <div class="order-item-row order-muted">
          Item details unavailable
        </div>
      `;
    }


    function statusClass(status) {
      switch (normalizeOrderStatus(status)) {
        case "new":
          return "order-status-new";

        case "preparing":
          return "order-status-preparing";

        case "ready":
          return "order-status-ready";

        case "completed":
          return "order-status-completed";

        case "cancelled":
          return "order-status-cancelled";

        default:
          return "order-status-new";
      }
    }


    function renderOrderCard(order) {
      const fulfillment = getFulfillmentType(order);

      const customerName =
        getCustomerName(order) || "Customer";

      const phone = getCustomerPhone(order);
      const email = getCustomerEmail(order);

      const date = formatOrderDate(
        getRequestedDate(order)
      );

      const time = formatOrderTime(
        getRequestedTime(order)
      );

      const address =
        fulfillment === "Delivery"
          ? getDeliveryAddress(order)
          : "";

      const status = order.status || "New";

      return `
        <article class="modern-order-card">

          <div class="order-card-header">

            <div>
              <div class="order-badge-row">

                <span class="fulfillment-badge ${
                  fulfillment === "Delivery"
                    ? "delivery-badge"
                    : "pickup-badge"
                }">
                  ${
                    fulfillment === "Delivery"
                      ? "🚚 Delivery"
                      : "🛍 Pickup"
                  }
                </span>

                <span class="order-status-badge ${statusClass(status)}">
                  ${escapeHtml(status)}
                </span>

              </div>

              <p class="order-number">
                ${escapeHtml(
                  order.orderNumber ||
                  order.id
                )}
              </p>
            </div>

            <div class="order-total-block">
              <span>Total</span>
              <strong>${formatMoney(order.total)}</strong>
            </div>

          </div>


          <div class="order-time-box">
            <div>
              <span class="order-section-label">
                ${
                  fulfillment === "Delivery"
                    ? "DELIVER BY"
                    : "PICKUP TIME"
                }
              </span>

              <strong>${escapeHtml(date)}</strong>
            </div>

            <div class="order-time-value">
              ${escapeHtml(time)}
            </div>
          </div>


          <div class="order-info-grid">

            <section class="order-info-section">
              <span class="order-section-label">
                CUSTOMER
              </span>

              <strong class="customer-name">
                ${escapeHtml(customerName)}
              </strong>

              ${
                phone
                  ? `
                    <a href="tel:${escapeHtml(phone)}">
                      📞 ${escapeHtml(phone)}
                    </a>
                  `
                  : ""
              }

              ${
                email
                  ? `
                    <a href="mailto:${escapeHtml(email)}">
                      ✉️ ${escapeHtml(email)}
                    </a>
                  `
                  : ""
              }
            </section>


            ${
              fulfillment === "Delivery"
                ? `
                  <section class="order-info-section">
                    <span class="order-section-label">
                      DELIVERY ADDRESS
                    </span>

                    ${
                      address
                        ? `
                          <div class="delivery-address">
                            📍 ${escapeHtml(address)
                              .replaceAll("\n", "<br>")}
                          </div>
                        `
                        : `
                          <div class="order-warning">
                            ⚠️ No delivery address provided
                          </div>
                        `
                    }
                  </section>
                `
                : `
                  <section class="order-info-section">
                    <span class="order-section-label">
                      FULFILLMENT
                    </span>

                    <strong>
                      Customer pickup
                    </strong>
                  </section>
                `
            }

          </div>


          <section class="order-items-section">

            <span class="order-section-label">
              ITEMS
            </span>

            <div class="order-items-list">
              ${renderOrderItems(order)}
            </div>

          </section>


          <div class="order-card-footer">

            <label class="status-control">
              <span>Status</span>

              <select
                data-order-status="${escapeHtml(order.id)}"
                class="order-status-select"
              >
                ${[
                  "New",
                  "Preparing",
                  "Ready",
                  "Completed",
                  "Cancelled"
                ]
                  .map(
                    option => `
                      <option
                        value="${option}"
                        ${
                          status === option
                            ? "selected"
                            : ""
                        }
                      >
                        ${option}
                      </option>
                    `
                  )
                  .join("")}
              </select>
            </label>


            <button
              class="danger-button small-button"
              data-delete-order="${escapeHtml(order.id)}"
              type="button"
            >
              Delete
            </button>

          </div>

        </article>
      `;
    }


    /*
    ==========================================================
    MAIN APP
    ==========================================================
    */

    function renderApp() {
      app.innerHTML = `
        <div class="admin-layout">

          <aside class="sidebar">

            <div class="sidebar-brand">
              <span class="brand-mark">C&amp;C</span>

              <div>
                <h2>${escapeHtml(state.settings.bakeryName)}</h2>
                <p>Admin workspace</p>
              </div>
            </div>


            <nav class="sidebar-nav" aria-label="Admin navigation">
              <div class="nav-group">
                <p class="nav-group-label">Manage</p>
                ${createNavButton("dashboard", "Dashboard", "⌂")}
                ${createNavButton("orders", "Orders", "▤")}
                ${createNavButton("orderHistory", "Order History", "◷")}
                ${createNavButton("products", "Products", "◇")}
                ${createNavButton("coupons", "Coupons", "%")}
                ${createNavButton("analytics", "Analytics", "↗")}
                ${createNavButton("today", "Today", "☀")}
                ${createNavButton("customers", "Customers", "♙")}
                ${createNavButton("inventory", "Inventory", "▥")}
              </div>

              <div class="nav-group">
                <p class="nav-group-label">Store</p>
                ${createNavButton("vacation", "Vacation Mode", "◷")}
                ${createNavButton("settings", "Settings", "⚙")}
              </div>
            </nav>


            <div class="sidebar-footer">

              <div>
                <span class="status-dot"></span>
                <span>Live · Firebase connected</span>
              </div>

              <button
                class="secondary-button small-button"
                id="logoutButton"
                type="button"
              >
                Sign out
              </button>

            </div>

          </aside>


          <main class="main-content">

            <header class="topbar">

              <div>
                <p class="eyebrow">
                  Crumb &amp; Crust
                </p>

                <h1>${getPageTitle()}</h1>
              </div>

              <button
                class="mobile-menu-button"
                id="mobileMenuButton"
                type="button"
              >
                Open menu
              </button>

            </header>

            <section
              id="pageContent"
              class="page-content"
            ></section>

          </main>

        </div>
      `;


      document.querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", () => {
          state.activePage = button.dataset.page;
          renderApp();
        });
      });


      document
        .getElementById("mobileMenuButton")
        ?.addEventListener("click", () => {
          document.querySelector(".sidebar")?.classList.toggle("open");
          document.querySelector(".mobile-menu-button")?.classList.toggle("active");
        });

      document
        .querySelectorAll(".sidebar [data-page]")
        .forEach(button => {
          button.addEventListener("click", () => {
            document.querySelector(".sidebar")?.classList.remove("open");
            document.querySelector(".mobile-menu-button")?.classList.remove("active");
          });
        });


      document
        .getElementById("logoutButton")
        ?.addEventListener("click", async () => {
          try {
            await signOut(auth);
            window.location.replace("/admin/login.html");
          } catch (error) {
            reportError(
              "Could not sign out.",
              error
            );
          }
        });


      renderPage();
    }


    function renderPage() {
      const container =
        document.getElementById("pageContent");

      if (!container) return;

      switch (state.activePage) {
        case "orders":
          renderOrders(container);
          break;

        case "orderHistory":
          renderOrderHistory(container);
          break;

        case "vacation":
          renderVacation(container);
          break;

        case "products":
          renderProducts(container);
          break;

        case "coupons":
          renderCoupons(container);
          break;

        case "analytics":
          renderAnalytics(container);
          break;

        case "settings":
          renderSettings(container);
          break;

        case "today":
          renderToday(container);
          break;

        case "customers":
          renderCustomers(container);
          break;

        case "inventory":
          renderInventory(container);
          break;

        default:
          renderDashboard(container);
      }
    }


    /*
    ==========================================================
    DASHBOARD
    ==========================================================
    */

    function renderDashboard(container) {
      const openOrders = state.orders.filter(order => {
        const status = normalizeOrderStatus(order.status);
        return status !== "completed" && status !== "cancelled";
      });

      const availableProducts =
        state.products.filter(product =>
          product.available
        );

      const activeCoupons =
        state.coupons.filter(coupon =>
          coupon.active
        );


      container.innerHTML = `
        <div class="welcome-panel">

          <div>
            <p class="eyebrow">Overview</p>
            <h2>Welcome back.</h2>
            <p>
              Your dashboard is connected to Cloud Firestore.
            </p>
          </div>

          <button
            class="primary-button"
            id="viewOrdersButton"
            type="button"
          >
            View orders
          </button>

        </div>


        <div class="dashboard-cards">

          <article class="dashboard-card">
            <p class="card-label">Open orders</p>
            <strong>${openOrders.length}</strong>
            <span>${state.orders.length} total orders</span>
          </article>


          <article class="dashboard-card">
            <p class="card-label">Vacation mode</p>

            <strong>
              ${state.vacation.enabled ? "On" : "Off"}
            </strong>

            <span>
              ${
                state.vacation.enabled
                  ? "Ordering is paused"
                  : "Ordering is open"
              }
            </span>
          </article>


          <article class="dashboard-card">
            <p class="card-label">Available products</p>
            <strong>${availableProducts.length}</strong>
            <span>${state.products.length} total products</span>
          </article>


          <article class="dashboard-card">
            <p class="card-label">Active coupons</p>
            <strong>${activeCoupons.length}</strong>
            <span>${state.coupons.length} total coupons</span>
          </article>

        </div>
      `;


      document
        .getElementById("viewOrdersButton")
        ?.addEventListener("click", () => {
          state.activePage = "orders";
          renderApp();
        });
    }


    /*
    ==========================================================
    ORDERS
    ==========================================================
    */

    function renderOrders(container) {
      const activeOrders = state.orders.filter(
        order =>
          normalizeOrderStatus(order.status) !== "completed"
      );

      const completedOrders = state.orders.filter(
        order =>
          normalizeOrderStatus(order.status) === "completed"
      );

      container.innerHTML = `
        <div class="panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Order management
              </p>

              <h2>
                Customer orders
              </h2>

              <p class="order-count">
                ${activeOrders.length}
                ${
                  activeOrders.length === 1
                    ? "order"
                    : "orders"
                }
              </p>
            </div>

            <button
              class="primary-button"
              id="addOrderButton"
              type="button"
            >
              Add order
            </button>

          </div>


          <div id="orderFormArea"></div>


          ${
            activeOrders.length
              ? `
                <div class="modern-orders-grid">
                  ${activeOrders
                    .map(renderOrderCard)
                    .join("")}
                </div>
              `
              : createEmptyState(
                  "No active orders",
                  "New orders will appear here."
                )
          }

        </div>

        <div class="panel completed-orders-panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Order history
              </p>

              <h2>
                Completed orders
              </h2>

              <p class="order-count">
                ${completedOrders.length}
                ${
                  completedOrders.length === 1
                    ? "completed order"
                    : "completed orders"
                }
              </p>
            </div>

          </div>

          ${
            completedOrders.length
              ? `
                <div class="modern-orders-grid">
                  ${completedOrders
                    .map(renderOrderCard)
                    .join("")}
                </div>
              `
              : createEmptyState(
                  "No completed orders yet",
                  "Orders marked Completed will appear here."
                )
          }

        </div>
      `;


      document
        .getElementById("addOrderButton")
        ?.addEventListener(
          "click",
          renderOrderForm
        );


      document
        .querySelectorAll("[data-order-status]")
        .forEach(select => {

          select.addEventListener(
            "change",
            async () => {
              const orderId = select.dataset.orderStatus;
              const nextStatus = select.value;
              const order = state.orders.find(
                item => item.id === orderId
              );
              const previousStatus = order?.status;

              // Update the local source of truth first. This makes a completed
              // order leave the active Orders view immediately, independent of
              // Firestore/network timing.
              if (order) {
                order.status = nextStatus;
              }

              renderApp();

              try {
                await updateDoc(
                  doc(db, "orders", orderId),
                  {
                    status: nextStatus,
                    updatedAt: serverTimestamp()
                  }
                );

                showToast("Order status updated.");
              } catch (error) {
                // Restore the order if Firestore rejected the change.
                if (order) {
                  order.status = previousStatus;
                }

                renderApp();

                reportError(
                  "Could not update the order.",
                  error
                );
              }
            }
          );
        });


      document
        .querySelectorAll("[data-delete-order]")
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              if (
                !window.confirm(
                  "Delete this order?"
                )
              ) {
                return;
              }

              try {
                await deleteDoc(
                  doc(
                    db,
                    "orders",
                    button.dataset.deleteOrder
                  )
                );

                showToast(
                  "Order deleted."
                );

              } catch (error) {
                reportError(
                  "Could not delete the order.",
                  error
                );
              }
            }
          );
        });
    }


    function renderOrderHistory(container) {
      const completedOrders = state.orders.filter(order =>
        normalizeOrderStatus(order.status) === "completed"
      );

      container.innerHTML = `
        <div class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Order history</p>
              <h2>Completed orders</h2>
              <p class="order-count">${completedOrders.length} ${completedOrders.length === 1 ? "completed order" : "completed orders"}</p>
            </div>
          </div>
          ${completedOrders.length
            ? `<div class="modern-orders-grid">${completedOrders.map(renderOrderCard).join("")}</div>`
            : createEmptyState("No completed orders yet", "Orders marked Completed will appear here.")
          }
        </div>
      `;

      document.querySelectorAll("[data-order-status]").forEach(select => {
        select.addEventListener("change", async () => {
          const orderId = select.dataset.orderStatus;
          const nextStatus = select.value;
          const order = state.orders.find(item => item.id === orderId);
          const previousStatus = order?.status;
          if (order) order.status = nextStatus;
          renderApp();
          try {
            await updateDoc(doc(db, "orders", orderId), { status: nextStatus, updatedAt: serverTimestamp() });
            showToast("Order status updated.");
          } catch (error) {
            if (order) order.status = previousStatus;
            renderApp();
            reportError("Could not update the order.", error);
          }
        });
      });

      document.querySelectorAll("[data-delete-order]").forEach(button => {
        button.addEventListener("click", async () => {
          if (!window.confirm("Delete this order?")) return;
          try {
            await deleteDoc(doc(db, "orders", button.dataset.deleteOrder));
            showToast("Order deleted.");
          } catch (error) {
            reportError("Could not delete the order.", error);
          }
        });
      });
    }


    function renderOrderForm() {
      const formArea =
        document.getElementById("orderFormArea");

      if (!formArea) return;


      formArea.innerHTML = `
        <form
          class="admin-form inline-form"
          id="orderForm"
        >

          <label>
            Customer name

            <input
              name="customer"
              required
              maxlength="80"
            >
          </label>


          <label>
            Item

            <input
              name="item"
              required
              maxlength="100"
            >
          </label>


          <label>
            Total

            <input
              name="total"
              type="number"
              required
              min="0"
              step="0.01"
            >
          </label>


          <div class="form-actions">

            <button
              class="primary-button"
              type="submit"
            >
              Save order
            </button>

            <button
              class="secondary-button"
              id="cancelOrderButton"
              type="button"
            >
              Cancel
            </button>

          </div>

        </form>
      `;


      document
        .getElementById("cancelOrderButton")
        ?.addEventListener("click", () => {
          formArea.innerHTML = "";
        });


      document
        .getElementById("orderForm")
        ?.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            const formData =
              new FormData(event.currentTarget);

            try {
              await addDoc(
                collection(db, "orders"),
                {
                  orderNumber:
                    `CC-${Date.now()
                      .toString()
                      .slice(-6)}`,

                  customer:
                    String(
                      formData.get("customer")
                    ).trim(),

                  item:
                    String(
                      formData.get("item")
                    ).trim(),

                  total:
                    Number(
                      formData.get("total")
                    ),

                  status: "New",

                  createdAt:
                    serverTimestamp(),

                  updatedAt:
                    serverTimestamp()
                }
              );

              showToast("Order added.");
              formArea.innerHTML = "";

            } catch (error) {
              reportError(
                "Could not add the order.",
                error
              );
            }
          }
        );
    }


    /*
    ==========================================================
    VACATION MODE
    ==========================================================
    */

    function renderVacation(container) {
      container.innerHTML = `
        <div class="panel narrow-panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Store availability
              </p>

              <h2>
                Vacation mode
              </h2>
            </div>

            <span class="status-badge ${
              state.vacation.enabled
                ? "status-cancelled"
                : "status-completed"
            }">
              ${
                state.vacation.enabled
                  ? "Enabled"
                  : "Disabled"
              }
            </span>

          </div>


          <form
            class="admin-form"
            id="vacationForm"
          >

            <label class="toggle-row">

              <span>
                <strong>
                  Pause customer orders
                </strong>

                <small>
                  Customers will see your closure message.
                </small>
              </span>

              <input
                name="enabled"
                type="checkbox"
                ${
                  state.vacation.enabled
                    ? "checked"
                    : ""
                }
              >

            </label>


            <label>
              Closure message

              <textarea
                name="message"
                rows="4"
                maxlength="250"
                required
              >${escapeHtml(
                state.vacation.message
              )}</textarea>
            </label>


            <label>
              Reopening date

              <input
                name="reopenDate"
                type="date"
                value="${escapeHtml(
                  state.vacation.reopenDate
                )}"
              >
            </label>


            <button
              class="primary-button"
              type="submit"
            >
              Save vacation settings
            </button>

          </form>

        </div>
      `;


      document
        .getElementById("vacationForm")
        ?.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            const formData =
              new FormData(event.currentTarget);

            try {
              await setDoc(
                doc(db, "settings", "store"),
                {
                  vacation: {
                    enabled:
                      formData.get("enabled") === "on",

                    message:
                      String(
                        formData.get("message")
                      ).trim(),

                    reopenDate:
                      String(
                        formData.get("reopenDate") ||
                        ""
                      )
                  },

                  updatedAt:
                    serverTimestamp()
                },
                {
                  merge: true
                }
              );

              showToast(
                "Vacation settings saved."
              );

            } catch (error) {
              reportError(
                "Could not save Vacation Mode.",
                error
              );
            }
          }
        );
    }


    /*
    ==========================================================
    PRODUCTS
    ==========================================================
    */

    function renderProducts(container) {
      container.innerHTML = `
        <div class="panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Menu management
              </p>

              <h2>Products</h2>
            </div>

            <button
              class="primary-button"
              id="addProductButton"
              type="button"
            >
              Add product
            </button>

          </div>


          <div id="productFormArea"></div>


          <div class="product-grid">

            ${
              state.products.length
                ? state.products
                    .map(
                      product => `
                        <article class="product-card">

                          <div>

                            <span class="status-badge ${
                              product.available
                                ? "status-completed"
                                : "status-cancelled"
                            }">
                              ${
                                product.available
                                  ? "Available"
                                  : "Unavailable"
                              }
                            </span>

                            <h3>
                              ${escapeHtml(product.name)}
                            </h3>

                            <strong>
                              ${formatMoney(product.price)}
                            </strong>

                          </div>


                          <div class="card-actions">

                            <button
                              class="secondary-button small-button"
                              data-toggle-product="${escapeHtml(product.id)}"
                              type="button"
                            >
                              ${
                                product.available
                                  ? "Mark unavailable"
                                  : "Mark available"
                              }
                            </button>

                            <button
                              class="danger-button small-button"
                              data-delete-product="${escapeHtml(product.id)}"
                              type="button"
                            >
                              Delete
                            </button>

                          </div>

                        </article>
                      `
                    )
                    .join("")
                : createEmptyState(
                    "No products yet",
                    "Add your first bakery product."
                  )
            }

          </div>

        </div>
      `;


      document
        .getElementById("addProductButton")
        ?.addEventListener(
          "click",
          renderProductForm
        );


      document
        .querySelectorAll("[data-toggle-product]")
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              const product =
                state.products.find(
                  item =>
                    item.id ===
                    button.dataset.toggleProduct
                );

              if (!product) return;

              try {
                await updateDoc(
                  doc(
                    db,
                    "products",
                    product.id
                  ),
                  {
                    available:
                      !product.available,

                    updatedAt:
                      serverTimestamp()
                  }
                );

                showToast(
                  "Product availability updated."
                );

              } catch (error) {
                reportError(
                  "Could not update the product.",
                  error
                );
              }
            }
          );
        });


      document
        .querySelectorAll("[data-delete-product]")
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              if (
                !window.confirm(
                  "Delete this product?"
                )
              ) {
                return;
              }

              try {
                await deleteDoc(
                  doc(
                    db,
                    "products",
                    button.dataset.deleteProduct
                  )
                );

                showToast(
                  "Product deleted."
                );

              } catch (error) {
                reportError(
                  "Could not delete the product.",
                  error
                );
              }
            }
          );
        });
    }


    function renderProductForm() {
      const formArea =
        document.getElementById(
          "productFormArea"
        );

      if (!formArea) return;


      formArea.innerHTML = `
        <form
          class="admin-form inline-form"
          id="productForm"
        >

          <label>
            Product name

            <input
              name="name"
              required
              maxlength="100"
            >
          </label>

          <label>
            Price

            <input
              name="price"
              type="number"
              required
              min="0"
              step="0.01"
            >
          </label>

          <div class="form-actions">

            <button
              class="primary-button"
              type="submit"
            >
              Save product
            </button>

            <button
              class="secondary-button"
              id="cancelProductButton"
              type="button"
            >
              Cancel
            </button>

          </div>

        </form>
      `;


      document
        .getElementById("cancelProductButton")
        ?.addEventListener("click", () => {
          formArea.innerHTML = "";
        });


      document
        .getElementById("productForm")
        ?.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            const formData =
              new FormData(event.currentTarget);

            try {
              await addDoc(
                collection(db, "products"),
                {
                  name:
                    String(
                      formData.get("name")
                    ).trim(),

                  price:
                    Number(
                      formData.get("price")
                    ),

                  available: true,

                  createdAt:
                    serverTimestamp(),

                  updatedAt:
                    serverTimestamp()
                }
              );

              showToast("Product added.");
              formArea.innerHTML = "";

            } catch (error) {
              reportError(
                "Could not add the product.",
                error
              );
            }
          }
        );
    }


    /*
    ==========================================================
    COUPONS
    ==========================================================
    */

    function renderCoupons(container) {
      container.innerHTML = `
        <div class="panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Promotions
              </p>

              <h2>Coupons</h2>
            </div>

          </div>


          <form
            class="admin-form inline-form"
            id="couponForm"
          >

            <label>
              Coupon code

              <input
                name="code"
                required
                maxlength="25"
              >
            </label>


            <label>
              Discount percentage

              <input
                name="discount"
                type="number"
                required
                min="1"
                max="100"
              >
            </label>


            <button
              class="primary-button"
              type="submit"
            >
              Add coupon
            </button>

          </form>


          <div class="coupon-list">

            ${
              state.coupons.length
                ? state.coupons
                    .map(
                      coupon => `
                        <article class="coupon-card">

                          <div>

                            <span class="status-badge ${
                              coupon.active
                                ? "status-completed"
                                : "status-cancelled"
                            }">
                              ${
                                coupon.active
                                  ? "Active"
                                  : "Inactive"
                              }
                            </span>

                            <h3>
                              ${escapeHtml(coupon.code)}
                            </h3>

                            <p>
                              ${Number(coupon.discount) || 0}% off
                            </p>

                          </div>


                          <div class="card-actions">

                            <button
                              class="secondary-button small-button"
                              data-toggle-coupon="${escapeHtml(coupon.id)}"
                              type="button"
                            >
                              ${
                                coupon.active
                                  ? "Deactivate"
                                  : "Activate"
                              }
                            </button>

                            <button
                              class="danger-button small-button"
                              data-delete-coupon="${escapeHtml(coupon.id)}"
                              type="button"
                            >
                              Delete
                            </button>

                          </div>

                        </article>
                      `
                    )
                    .join("")
                : createEmptyState(
                    "No coupons yet",
                    "Create your first discount code."
                  )
            }

          </div>

        </div>
      `;


      document
        .getElementById("couponForm")
        ?.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            const formData =
              new FormData(event.currentTarget);

            try {
              await addDoc(
                collection(db, "coupons"),
                {
                  code:
                    String(
                      formData.get("code")
                    )
                      .trim()
                      .toUpperCase(),

                  discount:
                    Number(
                      formData.get("discount")
                    ),

                  active: true,

                  createdAt:
                    serverTimestamp()
                }
              );

              event.currentTarget.reset();

              showToast(
                "Coupon added."
              );

            } catch (error) {
              reportError(
                "Could not add the coupon.",
                error
              );
            }
          }
        );


      document
        .querySelectorAll("[data-toggle-coupon]")
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              const coupon =
                state.coupons.find(
                  item =>
                    item.id ===
                    button.dataset.toggleCoupon
                );

              if (!coupon) return;

              try {
                await updateDoc(
                  doc(
                    db,
                    "coupons",
                    coupon.id
                  ),
                  {
                    active:
                      !coupon.active
                  }
                );

                showToast(
                  "Coupon updated."
                );

              } catch (error) {
                reportError(
                  "Could not update the coupon.",
                  error
                );
              }
            }
          );
        });


      document
        .querySelectorAll("[data-delete-coupon]")
        .forEach(button => {

          button.addEventListener(
            "click",
            async () => {

              try {
                await deleteDoc(
                  doc(
                    db,
                    "coupons",
                    button.dataset.deleteCoupon
                  )
                );

                showToast(
                  "Coupon deleted."
                );

              } catch (error) {
                reportError(
                  "Could not delete the coupon.",
                  error
                );
              }
            }
          );
        });
    }


    /*
    ==========================================================
    ANALYTICS
    ==========================================================
    */

    function renderAnalytics(container) {
      const completed = state.orders.filter(order => order.status === "Completed");
      const cancelled = state.orders.filter(order => order.status === "Cancelled");
      const revenue = completed.reduce((sum, order) => sum + Number(order.total || 0), 0);
      const average = completed.length ? revenue / completed.length : 0;
      const statusNames = ["New", "Preparing", "Ready", "Completed", "Cancelled"];
      container.innerHTML = "<div class=\"dashboard-cards\">"
        + "<article class=\"dashboard-card\"><p class=\"card-label\">Completed revenue</p><strong>" + formatMoney(revenue) + "</strong><span>Completed orders only</span></article>"
        + "<article class=\"dashboard-card\"><p class=\"card-label\">Average order</p><strong>" + formatMoney(average) + "</strong><span>Across " + completed.length + " completed orders</span></article>"
        + "<article class=\"dashboard-card\"><p class=\"card-label\">Completion rate</p><strong>" + (state.orders.length ? Math.round(completed.length / state.orders.length * 100) : 0) + "%</strong><span>" + cancelled.length + " cancelled</span></article>"
        + "<article class=\"dashboard-card\"><p class=\"card-label\">Total orders</p><strong>" + state.orders.length + "</strong><span>All loaded orders</span></article></div>"
        + "<div class=\"analytics-grid\"><section class=\"panel\"><div class=\"panel-header\"><div><p class=\"eyebrow\">Order pipeline</p><h2>Status breakdown</h2></div></div><div class=\"bar-list\">"
        + statusNames.map(status => { const count = state.orders.filter(order => order.status === status).length; const pct = state.orders.length ? Math.round(count / state.orders.length * 100) : 0; return "<div class=\"bar-row\"><div><span>" + status + "</span><strong>" + count + "</strong></div><div class=\"bar-track\"><i style=\"width:" + pct + "%\"></i></div></div>"; }).join("")
        + "</div></section><section class=\"panel\"><div class=\"panel-header\"><div><p class=\"eyebrow\">Store health</p><h2>At a glance</h2></div></div><div class=\"health-list\">"
        + "<div><span>Available products</span><strong>" + state.products.filter(product => product.available).length + "</strong></div>"
        + "<div><span>Unavailable products</span><strong>" + state.products.filter(product => !product.available).length + "</strong></div>"
        + "<div><span>Active coupons</span><strong>" + state.coupons.filter(coupon => coupon.active).length + "</strong></div>"
        + "<div><span>Ordering</span><strong>" + (state.vacation.enabled ? "Paused" : "Open") + "</strong></div></div></section></div>";
    }

    /*
    ==========================================================
    INVENTORY
    ==========================================================
    */



    function getOrderItemsCount(order) {
      if (Array.isArray(order.items)) return order.items.reduce((sum,item)=>sum+(Number(item.quantity)||0),0);
      return Number(order.itemCount)||0;
    }

    function getFlourForOrder(order) {
      if (!Array.isArray(order.items)) return 0;
      return order.items.reduce((sum,item)=>{
        const name=String(item.name||"").toLowerCase();
        const qty=Number(item.quantity)||0;
        if(name.includes("focaccia")) return sum+575*qty;
        if(name.includes("sourdough")) return sum+500*qty;
        return sum;
      },0);
    }

    function renderToday(container) {
      const todayKey=new Date().toISOString().slice(0,10);
      const orders=state.orders.filter(order=>String(getRequestedDate(order)).slice(0,10)===todayKey && normalizeOrderStatus(order.status)!=="cancelled");
      const production=orders.filter(order=>normalizeOrderStatus(order.status)!=="completed");
      const sourdough=production.reduce((s,o)=>s+(o.items||[]).filter(i=>String(i.name||"").toLowerCase().includes("sourdough")).reduce((n,i)=>n+(Number(i.quantity)||0),0),0);
      const focaccia=production.reduce((s,o)=>s+(o.items||[]).filter(i=>String(i.name||"").toLowerCase().includes("focaccia")).reduce((n,i)=>n+(Number(i.quantity)||0),0),0);
      const flour=production.reduce((s,o)=>s+getFlourForOrder(o),0);
      const stock=(Number(state.inventory.breadFlourGrams)||0)+(Number(state.inventory.apFlourGrams)||0);
      container.innerHTML='<div class="dashboard-cards">'+
        '<article class="dashboard-card"><p class="card-label">Orders today</p><strong>'+orders.length+'</strong><span>Pickup and delivery</span></article>'+
        '<article class="dashboard-card"><p class="card-label">Sourdough</p><strong>'+sourdough+'</strong><span>Loaves to make</span></article>'+
        '<article class="dashboard-card"><p class="card-label">Focaccia</p><strong>'+focaccia+'</strong><span>Recipes to make</span></article>'+
        '<article class="dashboard-card"><p class="card-label">Flour needed</p><strong>'+flour.toLocaleString()+' g</strong><span>'+stock.toLocaleString()+' g currently in inventory</span></article></div>'+\
        '<div class="panel"><div class="panel-header"><div><p class="eyebrow">Production</p><h2>Today\'s orders</h2></div></div>'+ (orders.length?'<div class="modern-orders-grid">'+orders.map(renderOrderCard).join('')+'</div>':createEmptyState("Nothing scheduled today","Orders for today will appear here."))+'</div>';
      document.querySelectorAll("[data-order-status]").forEach(select=>select.addEventListener("change",handleOrderStatusChange));
    }

    function renderCustomers(container) {
      const map=new Map();
      state.orders.forEach(order=>{
        const email=getCustomerEmail(order).trim().toLowerCase();
        const name=getCustomerName(order).trim()||"Customer";
        const key=email||name.toLowerCase(); if(!key)return;
        const current=map.get(key)||{name,email,phone:getCustomerPhone(order),orders:0,spent:0,lastOrder:""};
        current.orders++; current.spent+=Number(order.total)||0;
        const date=String(getRequestedDate(order)||""); if(date>current.lastOrder)current.lastOrder=date;
        map.set(key,current);
      });
      const customers=Array.from(map.values()).sort((a,b)=>b.spent-a.spent);
      container.innerHTML='<div class="panel"><div class="panel-header"><div><p class="eyebrow">Customer database</p><h2>Customers</h2><p class="order-count">'+customers.length+' '+(customers.length===1?'customer':'customers')+'</p></div></div>'+(customers.length?'<div class="product-grid">'+customers.map(customer=>'<article class="product-card"><div><span class="status-badge status-completed">'+customer.orders+' '+(customer.orders===1?'order':'orders')+'</span><h3>'+escapeHtml(customer.name)+'</h3><p>'+escapeHtml(customer.email||customer.phone||'No contact information')+'</p><strong>'+formatMoney(customer.spent)+'</strong><p>Last order: '+escapeHtml(customer.lastOrder||'Not provided')+'</p></div></article>').join('')+'</div>':createEmptyState('No customers yet','Customers will appear here after their first order.'))+'</div>';
    }

    async function handleOrderStatusChange(event) {
      const select=event.currentTarget; const orderId=select.dataset.orderStatus; const nextStatus=select.value;
      const order=state.orders.find(item=>item.id===orderId); const previousStatus=order?.status; if(order)order.status=nextStatus; renderApp();
      try {
        const patch={status:nextStatus,updatedAt:serverTimestamp()};
        if(nextStatus==="Ready" && !order?.inventoryDeducted){
          const flourUsed=getFlourForOrder(order||{});
          if(flourUsed>0){
            const bread=Number(state.inventory.breadFlourGrams)||0; const ap=Number(state.inventory.apFlourGrams)||0; let remaining=flourUsed;
            const apUsed=Math.min(ap,remaining); remaining-=apUsed; const breadUsed=Math.min(bread,remaining); remaining-=breadUsed;
            if(remaining>0) throw new Error("Not enough flour in inventory to mark this order Ready.");
            await setDoc(doc(db,"settings","store"),{inventory:{breadFlourGrams:bread-breadUsed,apFlourGrams:ap-apUsed}},{merge:true});
            patch.inventoryDeducted=true; patch.flourUsedGrams=flourUsed;
          }
        }
        await updateDoc(doc(db,"orders",orderId),patch); showToast("Order status updated.");
      } catch(error){if(order)order.status=previousStatus;renderApp();reportError(error.message||"Could not update the order.",error);}
    }

    function renderInventory(container) {
      const bread=Number(state.inventory.breadFlourGrams)||0; const ap=Number(state.inventory.apFlourGrams)||0; const total=bread+ap;
      const open=state.orders.filter(order=>!['cancelled','completed'].includes(normalizeOrderStatus(order.status)));
      const needed=open.reduce((sum,order)=>sum+getFlourForOrder(order),0); const projected=total-needed;
      container.innerHTML='<div class="dashboard-cards">'+
        '<article class="dashboard-card"><p class="card-label">Bread flour</p><strong>'+bread.toLocaleString()+' g</strong><span>Current stock</span></article>'+
        '<article class="dashboard-card"><p class="card-label">AP flour</p><strong>'+ap.toLocaleString()+' g</strong><span>Current stock</span></article>'+
        '<article class="dashboard-card"><p class="card-label">Open-order need</p><strong>'+needed.toLocaleString()+' g</strong><span>500 g sourdough · 575 g focaccia</span></article>'+
        '<article class="dashboard-card"><p class="card-label">Projected remaining</p><strong>'+Math.max(0,projected).toLocaleString()+' g</strong><span>'+(projected<0?'⚠️ More flour needed':'Enough for current orders')+'</span></article></div>'+
        '<div class="panel narrow-panel"><div class="panel-header"><div><p class="eyebrow">Inventory</p><h2>Flour inventory</h2></div></div><form class="admin-form" id="inventoryForm">'+
        '<label>Bread flour (grams)<input name="breadFlour" type="number" min="0" step="1" required value="'+bread+'"></label>'+\
        '<label>AP flour (grams)<input name="apFlour" type="number" min="0" step="1" required value="'+ap+'"></label>'+\
        '<button class="primary-button" type="submit">Save inventory</button></form></div>'+\
        '<div class="panel"><div class="panel-header"><div><p class="eyebrow">Shopping list</p><h2>What you need to buy</h2></div></div>'+\
        (projected<0?'<p><strong>Flour:</strong> '+Math.abs(projected).toLocaleString()+' g more needed for current open orders.</p>':'<p>Nothing extra needed for the current open orders.</p>')+'</div>';
      document.getElementById("inventoryForm")?.addEventListener("submit",async event=>{event.preventDefault();const formData=new FormData(event.currentTarget);try{await setDoc(doc(db,"settings","store"),{inventory:{breadFlourGrams:Math.max(0,Number(formData.get("breadFlour"))||0),apFlourGrams:Math.max(0,Number(formData.get("apFlour"))||0)},updatedAt:serverTimestamp()},{merge:true});showToast("Inventory saved.");}catch(error){reportError("Could not save inventory.",error);}});
    }

    function renderSettings(container) {
      container.innerHTML = `
        <div class="panel narrow-panel">

          <div class="panel-header">

            <div>
              <p class="eyebrow">
                Business details
              </p>

              <h2>Settings</h2>
            </div>

          </div>


          <form
            class="admin-form"
            id="settingsForm"
          >

            <label>
              Bakery name

              <input
                name="bakeryName"
                required
                maxlength="80"
                value="${escapeHtml(
                  state.settings.bakeryName
                )}"
              >
            </label>


            <label>
              Contact email

              <input
                name="email"
                type="email"
                maxlength="120"
                value="${escapeHtml(
                  state.settings.email
                )}"
              >
            </label>


            <label>
              Phone number

              <input
                name="phone"
                type="tel"
                maxlength="30"
                value="${escapeHtml(
                  state.settings.phone
                )}"
              >
            </label>


            <button
              class="primary-button"
              type="submit"
            >
              Save settings
            </button>

          </form>

        </div>
      `;


      document
        .getElementById("settingsForm")
        ?.addEventListener(
          "submit",
          async event => {

            event.preventDefault();

            const formData =
              new FormData(event.currentTarget);

            try {
              await setDoc(
                doc(db, "settings", "store"),
                {
                  business: {
                    bakeryName:
                      String(
                        formData.get("bakeryName")
                      ).trim(),

                    email:
                      String(
                        formData.get("email")
                      ).trim(),

                    phone:
                      String(
                        formData.get("phone")
                      ).trim()
                  },

                  updatedAt:
                    serverTimestamp()
                },
                {
                  merge: true
                }
              );

              showToast(
                "Settings saved."
              );

            } catch (error) {
              reportError(
                "Could not save the settings.",
                error
              );
            }
          }
        );
    }


    /*
    ==========================================================
    FIREBASE REALTIME LISTENERS
    ==========================================================
    */

    function startRealtimeListeners() {
      const ordersQuery = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc")
      );


      onSnapshot(
        ordersQuery,

        snapshot => {
          state.orders =
            snapshot.docs.map(
              documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
              })
            );

          renderApp();
        },

        error => {
          reportError(
            "Could not load orders from Firebase.",
            error
          );
        }
      );


      onSnapshot(
        collection(db, "products"),

        snapshot => {
          state.products =
            snapshot.docs.map(
              documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
              })
            );

          renderApp();
        },

        error => {
          reportError(
            "Could not load products from Firebase.",
            error
          );
        }
      );


      onSnapshot(
        collection(db, "coupons"),

        snapshot => {
          state.coupons =
            snapshot.docs.map(
              documentSnapshot => ({
                id: documentSnapshot.id,
                ...documentSnapshot.data()
              })
            );

          renderApp();
        },

        error => {
          reportError(
            "Could not load coupons from Firebase.",
            error
          );
        }
      );


      onSnapshot(
        doc(db, "settings", "store"),

        documentSnapshot => {
          if (documentSnapshot.exists()) {
            const data =
              documentSnapshot.data();

            state.vacation = {
              ...state.vacation,
              ...(data.vacation || {})
            };

            state.settings = {
              ...state.settings,
              ...(data.business || {})
            };
            state.inventory = {
              ...state.inventory,
              ...(data.inventory || {})
            };
          }

          renderApp();
        },

        error => {
          reportError(
            "Could not load store settings.",
            error
          );
        }
      );
    }


    renderApp();
    startRealtimeListeners();
  };


  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }
}


/*
==========================================================
ORDER CARD CSS
This is injected by admin.js, so you don't need to edit
admin.css yet.
==========================================================
*/

function installOrderStyles() {
  if (
    document.getElementById(
      "modern-order-styles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id = "modern-order-styles";

  style.textContent = `
    .modern-orders-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(340px, 1fr));
      gap: 22px;
      margin-top: 24px;
    }

    .modern-order-card {
      background: #ffffff;
      border: 1px solid #e9e5df;
      border-radius: 18px;
      padding: 22px;
      box-shadow:
        0 4px 18px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .order-card-header {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-start;
    }

    .order-badge-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 9px;
    }

    .fulfillment-badge,
    .order-status-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 11px;
      font-size: 0.76rem;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .delivery-badge {
      background: #e8f2ff;
      color: #19559a;
    }

    .pickup-badge {
      background: #f3ecff;
      color: #633995;
    }

    .order-status-new {
      background: #e9f8ee;
      color: #216b38;
    }

    .order-status-preparing {
      background: #fff4d7;
      color: #8a5d00;
    }

    .order-status-ready {
      background: #e5f1ff;
      color: #175a9c;
    }

    .order-status-completed {
      background: #eeeeee;
      color: #444444;
    }

    .order-status-cancelled {
      background: #ffe8e8;
      color: #9b2525;
    }

    .order-number {
      margin: 0;
      color: #777;
      font-size: 0.84rem;
      font-weight: 600;
    }

    .order-total-block {
      text-align: right;
      flex-shrink: 0;
    }

    .order-total-block span {
      display: block;
      color: #777;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 3px;
    }

    .order-total-block strong {
      font-size: 1.45rem;
      color: #2c2119;
    }

    .order-time-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      background: #f8f5f0;
      border-radius: 14px;
      padding: 16px 18px;
    }

    .order-time-box strong {
      display: block;
      margin-top: 5px;
      color: #33261d;
    }

    .order-time-value {
      font-weight: 800;
      font-size: 1.3rem;
      color: #8c4d23;
      white-space: nowrap;
    }

    .order-section-label {
      display: block;
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      font-weight: 800;
      color: #8b817a;
      margin-bottom: 8px;
    }

    .order-info-grid {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .order-info-section {
      min-width: 0;
    }

    .order-info-section strong {
      display: block;
      margin-bottom: 7px;
      color: #33261d;
    }

    .order-info-section a {
      color: #605852;
      display: block;
      text-decoration: none;
      margin-top: 5px;
      overflow-wrap: anywhere;
    }

    .customer-name {
      font-size: 1.05rem;
    }

    .delivery-address {
      color: #4e4742;
      line-height: 1.55;
    }

    .order-warning {
      color: #9c541c;
      font-weight: 600;
    }

    .order-items-section {
      border-top: 1px solid #eee8e2;
      border-bottom: 1px solid #eee8e2;
      padding: 17px 0;
    }

    .order-items-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .order-item-row {
      display: flex;
      gap: 10px;
      color: #3d352f;
      line-height: 1.4;
    }

    .order-item-quantity {
      font-weight: 800;
      color: #9a5628;
      min-width: 30px;
    }

    .order-muted {
      color: #888;
    }

    .order-card-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 15px;
    }

    .status-control {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: 0;
    }

    .status-control span {
      font-size: 0.75rem;
      font-weight: 700;
      color: #736b65;
    }

    .order-status-select {
      min-width: 145px;
      padding: 9px 12px;
      border: 1px solid #d8d2cc;
      border-radius: 9px;
      background: white;
      color: #302923;
      font: inherit;
      cursor: pointer;
    }

    .order-count {
      margin-top: 4px;
      color: #7b746e;
      font-size: 0.9rem;
    }

    @media (max-width: 720px) {

      .modern-orders-grid {
        grid-template-columns: 1fr;
      }

      .modern-order-card {
        padding: 17px;
      }

      .order-info-grid {
        grid-template-columns: 1fr;
      }

      .order-card-header {
        align-items: flex-start;
      }

      .order-time-box {
        align-items: flex-start;
        flex-direction: column;
        gap: 8px;
      }

      .order-time-value {
        font-size: 1.2rem;
      }
    }
  `;

  document.head.appendChild(style);
}
