/* ==========================================================================
   Crumb & Crust — shared behavior
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Sticky header shadow ---------- */
  const header = document.querySelector(".site-header");

  if (header) {
    const onScroll = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    onScroll();

    window.addEventListener("scroll", onScroll, {
      passive: true
    });
  }

  /* ---------- Desktop menu dropdown ---------- */
  document.querySelectorAll("[data-dropdown-toggle]").forEach(button => {
    const menu = button.nextElementSibling;

    if (!menu) {
      return;
    }

    button.addEventListener("click", event => {
      event.stopPropagation();

      const isOpen = menu.classList.toggle("open");

      button.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    });
  });

  document.addEventListener("click", () => {
    document
      .querySelectorAll(".dropdown-menu.open")
      .forEach(menu => {
        menu.classList.remove("open");
      });

    document
      .querySelectorAll("[data-dropdown-toggle]")
      .forEach(button => {
        button.setAttribute(
          "aria-expanded",
          "false"
        );
      });
  });

  /* ---------- Mobile hamburger navigation ---------- */
  const hamburger =
    document.querySelector(".hamburger");

  const mobileNav =
    document.querySelector(".mobile-nav");

  if (hamburger && mobileNav) {
    hamburger.addEventListener("click", () => {
      const isOpen =
        mobileNav.classList.toggle("open");

      hamburger.classList.toggle(
        "is-active",
        isOpen
      );

      hamburger.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

      document.body.style.overflow =
        isOpen ? "hidden" : "";
    });

    mobileNav
      .querySelectorAll("a")
      .forEach(link => {
        link.addEventListener("click", () => {
          mobileNav.classList.remove("open");

          hamburger.classList.remove(
            "is-active"
          );

          hamburger.setAttribute(
            "aria-expanded",
            "false"
          );

          document.body.style.overflow = "";
        });
      });
  }

  /* ---------- Mobile menu accordion ---------- */
  document
    .querySelectorAll("[data-mobile-toggle]")
    .forEach(button => {
      const submenu =
        button.nextElementSibling;

      if (!submenu) {
        return;
      }

      button.addEventListener("click", () => {
        submenu.classList.toggle("open");
      });
    });

  /* ---------- Scroll reveal ---------- */
  const revealElements =
    document.querySelectorAll(".reveal");

  if (
    "IntersectionObserver" in window &&
    revealElements.length
  ) {
    const observer =
      new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add(
                "is-visible"
              );

              observer.unobserve(
                entry.target
              );
            }
          });
        },
        {
          threshold: 0.12
        }
      );

    revealElements.forEach(element => {
      observer.observe(element);
    });
  } else {
    revealElements.forEach(element => {
      element.classList.add(
        "is-visible"
      );
    });
  }

  /* ---------- Order page ---------- */
  const orderForm =
    document.getElementById("orderForm");

  if (orderForm) {
    initializeOrderForm(orderForm);
  }
});

/* ==========================================================================
   Order settings
   ========================================================================== */

const ORDER_SETTINGS = {
  acceptingOrders: true,
  limitedCapacityNote: true
};

const MAX_ITEMS_PER_ORDER = 4;
const DELIVERY_FEE = 4;
const MAX_WEEKEND_LOAVES = 8;
let weekendCapacity = { key: "", remaining: MAX_WEEKEND_LOAVES };
let capacityUnsubscribe = null;
let storeClosed = false;

/* ==========================================================================
   Firebase configuration
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey:
    "AIzaSyDrqltlq7LiRPH84y1-2lH0ISPsEhEQjak",

  authDomain:
    "crumb-and-crust.firebaseapp.com",

  projectId:
    "crumb-and-crust",

  storageBucket:
    "crumb-and-crust.firebasestorage.app",

  messagingSenderId:
    "514675143126",

  appId:
    "1:514675143126:web:3f47f98c476b4b0f96f477"
};

/* ==========================================================================
   Order-form initialization
   ========================================================================== */

function initializeOrderForm(form) {
  renderStatusBanner();

  listenForVacationMode();

  populatePickupDates();
  wireWeekendCapacity();

  wireDeliveryToggle();

  wireQuantitySteppers();

  wireSubmit(form);
}

/* ==========================================================================
   Firebase helpers
   ========================================================================== */

async function getStorefrontDatabase() {
  const {
    initializeApp,
    getApps,
    getApp
  } = await import(
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"
  );

  const {
    getFirestore
  } = await import(
    "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
  );

  const firebaseApp =
    getApps().length
      ? getApp()
      : initializeApp(
          FIREBASE_CONFIG
        );

  return getFirestore(
    firebaseApp
  );
}

/* ==========================================================================
   Vacation Mode
   ========================================================================== */

async function listenForVacationMode() {
  try {
    const {
      initializeApp,
      getApps,
      getApp
    } = await import(
      "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"
    );

    const {
      getFirestore,
      doc,
      onSnapshot
    } = await import(
      "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"
    );

    const firebaseApp =
      getApps().length
        ? getApp()
        : initializeApp(
            FIREBASE_CONFIG
          );

    const database =
      getFirestore(firebaseApp);

    const settingsDocument =
      doc(
        database,
        "settings",
        "store"
      );

    onSnapshot(
      settingsDocument,

      snapshot => {
        if (!snapshot.exists()) {
          renderStatusBanner();
          return;
        }

        const data =
          snapshot.data();

        renderStatusBanner(
          data.vacation || null
        );
      },

      error => {
        console.error(
          "Could not load Vacation Mode:",
          error
        );

        renderStatusBanner();
      }
    );
  } catch (error) {
    console.error(
      "Could not connect the storefront to Firebase:",
      error
    );

    renderStatusBanner();
  }
}

function renderStatusBanner(
  vacationSettings = null
) {
  const banner =
    document.getElementById(
      "orderStatus"
    );

  const formWrapper =
    document.getElementById(
      "orderFormWrap"
    );

  if (!banner) {
    return;
  }

  const vacationEnabled =
    vacationSettings?.enabled === true;

  const manuallyClosed =
    ORDER_SETTINGS.acceptingOrders === false;

  const orderingClosed =
    vacationEnabled ||
    manuallyClosed;

  storeClosed = orderingClosed;

  if (orderingClosed) {
    banner.className =
      "status-banner closed";

    if (vacationEnabled) {
      banner.textContent =
        vacationSettings.message ||
        "We are temporarily closed for orders.";

      if (
        vacationSettings.reopenDate
      ) {
        const formattedDate =
          formatReopeningDate(
            vacationSettings.reopenDate
          );

        banner.textContent +=
          ` We plan to reopen ${formattedDate}.`;
      }
    } else {
      banner.innerHTML =
        "We&rsquo;re not taking new orders this week &mdash; " +
        "check back soon, or email us at " +
        '<a href="mailto:crumbandcrustca@gmail.com">' +
        "crumbandcrustca@gmail.com</a>.";
    }

    if (formWrapper) {
      formWrapper.style.display =
        "none";
    }

    return;
  }

  if (formWrapper) {
    formWrapper.style.display =
      "";
  }

  let message =
    "Now accepting orders for pickup and delivery this weekend.";

  if (
    ORDER_SETTINGS.limitedCapacityNote
  ) {
    message +=
      " We bake in small batches, so get your order in early in the week.";
  }

  banner.className =
    "status-banner open";

  banner.textContent =
    message;
}

function getWeekendKey(preferredDate) {
  const date = new Date(String(preferredDate || "") + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "";
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() - 1);
  else if (day !== 6) date.setDate(date.getDate() - ((day + 1) % 7));
  return date.toISOString().slice(0, 10);
}

async function wireWeekendCapacity() {
  const select = document.getElementById("pickupDate");
  if (!select) return;
  try {
    const { getFirestore, doc, onSnapshot } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js");
    const { getApps, getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js");
    const firebaseApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const database = getFirestore(firebaseApp);
    const update = () => {
      if (capacityUnsubscribe) { capacityUnsubscribe(); capacityUnsubscribe = null; }
      const key = getWeekendKey(select.value);
      weekendCapacity = { key, remaining: MAX_WEEKEND_LOAVES };
      if (!key) { refreshItemLimits(); return; }
      capacityUnsubscribe = onSnapshot(doc(database, "weeklyCapacity", key), snapshot => {
        const reserved = snapshot.exists() ? Number(snapshot.data().reservedLoaves || 0) : 0;
        weekendCapacity = { key, remaining: Math.max(0, MAX_WEEKEND_LOAVES - reserved) };
        renderCapacityMessage();
        refreshItemLimits();
      }, error => console.error("Could not load weekend capacity:", error));
    };
    select.addEventListener("change", update);
    update();
  } catch (error) {
    console.error("Could not connect to weekend capacity:", error);
  }
}

function renderCapacityMessage() {
  if (storeClosed) return;
  const banner = document.getElementById("orderStatus");
  const select = document.getElementById("pickupDate");
  if (!banner || !select || !select.value) return;
  const remaining = weekendCapacity.remaining;
  if (remaining === 0) {
    banner.className = "status-banner closed";
    banner.textContent = "This weekend is sold out. Please choose another weekend.";
    const wrapper = document.getElementById("orderFormWrap");
    if (wrapper) wrapper.style.display = "none";
    return;
  }
  const wrapper = document.getElementById("orderFormWrap");
  if (wrapper) wrapper.style.display = "";
  banner.className = "status-banner open";
  banner.textContent = remaining <= 2
    ? "Now accepting orders. Only " + remaining + " " + (remaining === 1 ? "loaf" : "loaves") + " remaining."
    : "Now accepting orders. We bake in small batches, so get your order in early.";
}

function formatReopeningDate(value) {
  const date =
    new Date(
      `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );
}

/* ==========================================================================
   Pickup dates
   ========================================================================== */

function populatePickupDates() {
  const select =
    document.getElementById(
      "pickupDate"
    );

  if (!select) {
    return;
  }

  const availableDates = [];

  const cursor =
    new Date();

  cursor.setHours(
    0,
    0,
    0,
    0
  );

  while (
    availableDates.length < 6
  ) {
    cursor.setDate(
      cursor.getDate() + 1
    );

    const dayOfWeek =
      cursor.getDay();

    if (
      dayOfWeek === 6 ||
      dayOfWeek === 0
    ) {
      availableDates.push(
        new Date(cursor)
      );
    }
  }

  select.innerHTML =
    '<option value="" disabled selected>' +
    "Choose a Saturday or Sunday" +
    "</option>";

  availableDates.forEach(date => {
    const option =
      document.createElement(
        "option"
      );

    option.value =
      date
        .toISOString()
        .slice(0, 10);

    option.textContent =
      date.toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          month: "long",
          day: "numeric"
        }
      );

    select.appendChild(
      option
    );
  });
}

/* ==========================================================================
   Delivery fields
   ========================================================================== */

function updateDeliveryFieldsVisibility() {
  const deliveryFields =
    document.getElementById(
      "deliveryFields"
    );

  if (!deliveryFields) {
    return;
  }

  const selectedFulfillment =
    document.querySelector(
      'input[name="Fulfillment"]:checked'
    );

  const deliverySelected =
    selectedFulfillment?.value ===
    "Delivery";

  deliveryFields.classList.toggle(
    "show",
    deliverySelected
  );

  deliveryFields
    .querySelectorAll("input")
    .forEach(input => {
      input.required =
        deliverySelected;
    });

  updateOrderTotal();
}

function wireDeliveryToggle() {
  const fulfillmentOptions =
    document.querySelectorAll(
      'input[name="Fulfillment"]'
    );

  fulfillmentOptions.forEach(
    option => {
      option.addEventListener(
        "change",
        updateDeliveryFieldsVisibility
      );
    }
  );

  updateDeliveryFieldsVisibility();
}

/* ==========================================================================
   Quantity controls
   ========================================================================== */

function wireQuantitySteppers() {
  document
    .querySelectorAll(
      ".qty-stepper"
    )
    .forEach(stepper => {
      const input =
        stepper.querySelector(
          ".qty-input"
        );

      const decreaseButton =
        stepper.querySelector(
          ".qty-minus"
        );

      const increaseButton =
        stepper.querySelector(
          ".qty-plus"
        );

      if (
        !input ||
        !decreaseButton ||
        !increaseButton
      ) {
        return;
      }

      decreaseButton.addEventListener(
        "click",
        () => {
          const currentQuantity =
            Number.parseInt(
              input.value || "0",
              10
            ) || 0;

          input.value =
            String(
              Math.max(
                0,
                currentQuantity - 1
              )
            );

          refreshItemLimits();
        }
      );

      increaseButton.addEventListener(
        "click",
        () => {
          if (
            getCurrentItemTotal() >=
            MAX_ITEMS_PER_ORDER
          ) {
            return;
          }

          const currentQuantity =
            Number.parseInt(
              input.value || "0",
              10
            ) || 0;

          const itemMaximum =
            Number.parseInt(
              input.max || "4",
              10
            ) ||
            MAX_ITEMS_PER_ORDER;

          input.value =
            String(
              Math.min(
                itemMaximum,
                currentQuantity + 1
              )
            );

          refreshItemLimits();
        }
      );
    });

  refreshItemLimits();
}

function getCurrentItemTotal() {
  return Array.from(
    document.querySelectorAll(
      ".qty-input"
    )
  ).reduce(
    (total, input) => {
      return (
        total +
        (
          Number.parseInt(
            input.value,
            10
          ) || 0
        )
      );
    },
    0
  );
}

function refreshItemLimits() {
  const totalItems =
    getCurrentItemTotal();
  const availableForWeekend = Math.max(0, Number(weekendCapacity.remaining));
  const itemLimit = Math.min(MAX_ITEMS_PER_ORDER, availableForWeekend || MAX_ITEMS_PER_ORDER);

  const counter =
    document.getElementById(
      "itemCounter"
    );

  if (counter) {
    counter.textContent = availableForWeekend && availableForWeekend <= 2
      ? `${totalItems} of ${MAX_ITEMS_PER_ORDER} selected · ${availableForWeekend} remaining`
      : `${totalItems} of ${MAX_ITEMS_PER_ORDER} selected`;

    counter.classList.toggle(
      "at-max",
      totalItems >=
        MAX_ITEMS_PER_ORDER
    );
  }

  document
    .querySelectorAll(
      ".qty-stepper"
    )
    .forEach(stepper => {
      const input =
        stepper.querySelector(
          ".qty-input"
        );

      const increaseButton =
        stepper.querySelector(
          ".qty-plus"
        );

      const decreaseButton =
        stepper.querySelector(
          ".qty-minus"
        );

      if (
        !input ||
        !increaseButton ||
        !decreaseButton
      ) {
        return;
      }

      const quantity =
        Number.parseInt(
          input.value,
          10
        ) || 0;

      const itemMaximum =
        Number.parseInt(
          input.max,
          10
        ) ||
        MAX_ITEMS_PER_ORDER;

      increaseButton.disabled =
        quantity >= itemMaximum ||
        totalItems >= itemLimit ||
        (weekendCapacity.key && totalItems >= availableForWeekend);

      decreaseButton.disabled =
        quantity <= 0;
    });

  updateOrderTotal();
}

/* ==========================================================================
   Order total
   ========================================================================== */

function updateOrderTotal() {
  const totalElement =
    document.getElementById(
      "orderTotal"
    );

  if (!totalElement) {
    return;
  }

  let orderTotal = 0;

  document
    .querySelectorAll(
      ".qty-input"
    )
    .forEach(input => {
      const price =
        Number.parseFloat(
          input.dataset.price ||
          "0"
        ) || 0;

      const quantity =
        Number.parseInt(
          input.value,
          10
        ) || 0;

      orderTotal +=
        price * quantity;
    });

  const selectedFulfillment =
    document.querySelector(
      'input[name="Fulfillment"]:checked'
    );

  const deliverySelected =
    selectedFulfillment?.value ===
    "Delivery";

  if (deliverySelected) {
    orderTotal +=
      DELIVERY_FEE;
  }

  totalElement.textContent =
    deliverySelected
      ? `Estimated total: $${orderTotal.toFixed(
          2
        )} (includes $${DELIVERY_FEE.toFixed(
          2
        )} delivery)`
      : `Estimated total: $${orderTotal.toFixed(
          2
        )}`;
}

/* ==========================================================================
   Firestore order submission
   ========================================================================== */

function wireSubmit(form) {
  const messageElement =
    document.getElementById(
      "formMessage"
    );

  const submitButton =
    document.getElementById(
      "submitOrder"
    );

  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      showFormMessage(
        "",
        ""
      );

      const quantityInputs =
        Array.from(
          document.querySelectorAll(
            ".qty-input"
          )
        );

      const items =
        quantityInputs
          .map(input => {
            const quantity =
              Number.parseInt(
                input.value,
                10
              ) || 0;

            const price =
              Number.parseFloat(
                input.dataset.price ||
                "0"
              ) || 0;

            return {
              name:
                input.name ||
                input.dataset.name ||
                "Item",

              quantity,

              price,

              subtotal:
                price * quantity
            };
          })
          .filter(item => {
            return (
              item.quantity > 0
            );
          });

      const totalItems =
        items.reduce(
          (total, item) => {
            return (
              total +
              item.quantity
            );
          },
          0
        );

      if (
        totalItems === 0
      ) {
        showFormMessage(
          "Add at least one item to your order before sending it in.",
          "warning"
        );

        return;
      }

      if (
        totalItems >
        MAX_ITEMS_PER_ORDER
      ) {
        showFormMessage(
          `Orders are limited to ${MAX_ITEMS_PER_ORDER} items at a time. Please adjust your quantities.`,
          "warning"
        );

        return;
      }

      if (
        !form.checkValidity()
      ) {
        form.reportValidity();
        return;
      }

      const formData =
        new FormData(form);

      const fulfillment =
        String(
          formData.get(
            "Fulfillment"
          ) ||
          "Pickup"
        );

      let total =
        items.reduce(
          (sum, item) => {
            return (
              sum +
              item.subtotal
            );
          },
          0
        );

      if (
        fulfillment ===
        "Delivery"
      ) {
        total +=
          DELIVERY_FEE;
      }

      const itemsSummary =
        items
          .map(item => {
            return `${item.quantity}× ${item.name}`;
          })
          .join(", ");

      const orderNumber =
        `CC-${Date.now()
          .toString()
          .slice(-8)}`;

      const customerName =
        getFormValue(
          formData,
          [
            "Name",
            "name",
            "Customer Name",
            "customer"
          ]
        );

      const email =
        getFormValue(
          formData,
          [
            "Email",
            "email"
          ]
        );

      const phone =
        getFormValue(
          formData,
          [
            "Phone",
            "phone"
          ]
        );

      const preferredDate =
        getFormValue(
          formData,
          [
            "Preferred Date",
            "Pickup Date",
            "pickupDate",
            "Date"
          ]
        );

      const deliveryAddress =
        fulfillment ===
        "Delivery"
          ? getFormValue(
              formData,
              [
                "Delivery Address",
                "Address",
                "address"
              ]
            )
          : "";

      const notes =
        getFormValue(
          formData,
          [
            "Notes",
            "notes",
            "Special Instructions"
          ]
        );

      if (submitButton) {
        submitButton.disabled =
          true;

        submitButton.textContent =
          "Sending order…";
      }

      try {
        const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-functions.js");
        const { getApps, getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js");
        const firebaseApp = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
        const functions = getFunctions(firebaseApp, "us-west1");
        const placeOrder = httpsCallable(functions, "placeOrder");
        const result = await placeOrder({
          customerName,
          email,
          phone,
          fulfillment,
          deliveryAddress,
          preferredDate,
          notes,
          items,
          deliveryFee: fulfillment === "Delivery" ? DELIVERY_FEE : 0,
          total
        });
        const savedOrderNumber = result.data?.orderNumber || orderNumber;
        if (typeof result.data?.remaining === "number") weekendCapacity.remaining = result.data.remaining;

        showFormMessage(
          `Thanks! Your order ${savedOrderNumber} has been received.\n\nDate: ${preferredDate}\nItems: ${itemsSummary}\nTotal: ${total.toFixed(2)}\n\nWe'll contact you to confirm pickup or delivery details.`,
          "success"
        );

        form.reset();

        updateDeliveryFieldsVisibility();

        refreshItemLimits();

      } catch (error) {
        console.error(
          "Could not save order to Firebase:",
          error
        );

        showFormMessage(
          "Something went wrong sending your order. Please try again, or email crumbandcrustca@gmail.com.",
          "error"
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;

          submitButton.textContent =
            "Send order";
        }
      }
    }
  );

  function showFormMessage(
    text,
    type
  ) {
    if (!messageElement) {
      return;
    }

    messageElement.textContent =
      text;

    messageElement.className =
      "form-message" +
      (
        type
          ? ` show ${type}`
          : ""
      );
  }
}

/* ==========================================================================
   Form helpers
   ========================================================================== */

function getFormValue(
  formData,
  possibleNames
) {
  for (
    const name
    of possibleNames
  ) {
    const value =
      formData.get(name);

    if (
      value !== null &&
      String(value).trim()
    ) {
      return String(
        value
      ).trim();
    }
  }

  return "";
}
