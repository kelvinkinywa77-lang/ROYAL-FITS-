
/* =====================================================
   ROYAL FITS BOUTIQUE254
   Supabase, products, accounts, cart, orders and M-Pesa
===================================================== */

/* 1. SUPABASE CONNECTION */

const SUPABASE_URL =
  "https://rutpxicmpjdqvrfoicnv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_iUUvMivOvVBbk4XvCCDWtQ_iOWSra5g";

const db = window.supabase
  ? window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    )
  : null;

/* 2. STATE */

const localProducts = [];

let products = [...localProducts];
let cart = [];
let selectedCategory = "All";
let searchTerm = "";
let isRegistering = false;
let checkoutBusy = false;

/* 3. HELPERS */

function formatPrice(value) {
  return "KSh " + Number(value || 0).toLocaleString("en-KE");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3500);
}


function openOverlay(id) {
  // Close other open overlays first
  document.querySelectorAll(".overlay").forEach(overlay => {
    if (overlay.id !== id) {
      overlay.classList.add("hidden");
    }
  });

  // Open only the requested overlay
  const overlay = document.getElementById(id);

  if (overlay) {
    overlay.classList.remove("hidden");
  }
}


function getCartTotal() {
  return Math.round(
    cart.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    )
  );
}

async function getCurrentUser() {
  if (!db) throw new Error("Supabase is unavailable.");

  const { data, error } = await db.auth.getSession();
  if (error) throw error;

  return data.session?.user || null;
}

function normalizeKenyanPhone(rawPhone) {
  return String(rawPhone || "")
    .trim()
    .replace(/[\s()-]/g, "")
    .replace(/^\+/, "")
    .replace(/^0/, "254");
}

/* 4. LOAD PRODUCTS */

async function loadProducts() {
  if (!db) {
    displayProducts();
    updateCart();
    showToast("Database connection unavailable.");
    return;
  }

  try {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) throw error;

    products = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      category: row.category === "Womens" ? "Women" : row.category,
      price: Number(row.price || 0),
      old: Number(row.old_price || 0),
      image: row.image_url || "",
      color: row.color || "#eeeeee",
      rating: Number(row.rating || 4.5),
      stock: row.stock == null ? null : Number(row.stock)
    }));

    displayProducts();
    updateCart();
  } catch (error) {
    console.error("Product loading error:", error);
    products = [...localProducts];
    displayProducts();
    updateCart();
    showToast("Could not load products from the database.");
  }
}

/* 5. DISPLAY PRODUCTS */

function displayProducts() {
  const grid = document.getElementById("productGrid");
  const count = document.getElementById("productCount");

  if (!grid) return;

  const filtered = products.filter(product => {
    const categoryMatches =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    const searchMatches =
      String(product.name).toLowerCase().includes(searchTerm) ||
      String(product.category).toLowerCase().includes(searchTerm);

    return categoryMatches && searchMatches;
  });

  if (count) {
    count.textContent =
      `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  }

  if (!filtered.length) {
    grid.innerHTML =
      '<p class="empty-message">No products found.</p>';
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const price = Number(product.price || 0);
    const oldPrice = Number(product.old || 0);
    const hasStock = product.stock !== null;
    const soldOut = hasStock && product.stock <= 0;
    const discount = oldPrice > price && oldPrice > 0
      ? Math.round((1 - price / oldPrice) * 100)
      : 0;

    return `
      <article class="product-card">
        <div class="product-image-wrap"
             style="background:${escapeHTML(product.color)}">
          <img
            src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)}"
            class="product-image"
            loading="lazy"
            onclick="showImage(this.src, this.alt)"
            onerror="this.style.opacity='0.4'"
          >
          ${discount > 0
            ? `<span class="discount-badge">${discount}% OFF</span>`
            : ""}
        </div>

        <div class="product-info">
          <p class="product-category">
            ${escapeHTML(product.category)}
          </p>

          <h3>${escapeHTML(product.name)}</h3>

          <p class="product-rating">
            ⭐ ${Number(product.rating || 4.5)} / 5
          </p>

          <div class="product-prices">
            <strong>${formatPrice(price)}</strong>
            ${oldPrice > price ? `<del>${formatPrice(oldPrice)}</del>` : ""}
          </div>

          <p class="stock-label">
            ${!hasStock
              ? "Stock not synced"
              : product.stock > 0
                ? `${product.stock} in stock`
                : "Out of stock"}
          </p>

          <button
            class="primary-btn full-width"
            onclick="addToCart('${String(product.id).replace(/'/g, "\\'")}')"
            ${soldOut ? "disabled" : ""}
          >
            ${soldOut ? "OUT OF STOCK" : "ADD TO CART 🛍"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

/* 6. PRODUCT IMAGE POPUP */

function showImage(image, name) {
  const popup = document.getElementById("imagePopup");
  const popupImage = document.getElementById("popupImage");
  const popupName = document.getElementById("popupName");

  if (!popup || !popupImage || !popupName) return;

  popupImage.src = image;
  popupImage.alt = name;
  popupName.textContent = name;
  popup.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeImage() {
  const popup = document.getElementById("imagePopup");
  if (popup) popup.style.display = "none";
  document.body.style.overflow = "";
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeImage();
});

/* 7. CART */

function addToCart(id) {
  const product = products.find(p => String(p.id) === String(id));

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const existing = cart.find(item => String(item.id) === String(id));
  const quantityInCart = existing?.quantity || 0;

  if (
    product.stock !== null &&
    quantityInCart >= Number(product.stock)
  ) {
    showToast("Not enough stock available.");
    return;
  }

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCart();
  showToast("Product added to your cart.");
}

function removeFromCart(id) {
  cart = cart.filter(item => String(item.id) !== String(id));
  updateCart();
}

function updateCart() {
  const count = document.getElementById("cartCount");
  const itemsElement = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (count) count.textContent = totalItems;
  if (totalElement) totalElement.textContent = formatPrice(getCartTotal());
  if (!itemsElement) return;

  if (!cart.length) {
    itemsElement.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  itemsElement.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img
        class="cart-image"
        src="${escapeHTML(item.image)}"
        alt="${escapeHTML(item.name)}"
        onerror="this.style.visibility='hidden'"
      >

      <div class="cart-item-details">
        <h4>${escapeHTML(item.name)}</h4>
        <p>Price: ${formatPrice(item.price)}</p>
        <p>Quantity: ${item.quantity}</p>
        <p>Subtotal: ${formatPrice(item.price * item.quantity)}</p>

        <button
          class="text-btn"
          type="button"
          onclick="removeFromCart('${String(item.id).replace(/'/g, "\\'")}')"
        >
          Remove
        </button>
      </div>
    </div>
  `).join("");
}

/* 8. CATEGORY FILTERS */

document.querySelectorAll(".category[data-category]").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category[data-category]").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    selectedCategory = button.dataset.category || "All";
    displayProducts();
  });
});

/* 9. SEARCH */

document.getElementById("searchForm")?.addEventListener("submit", event => {
  event.preventDefault();
  searchTerm = document.getElementById("searchInput").value.trim().toLowerCase();
  displayProducts();
  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("searchInput")?.addEventListener("input", event => {
  searchTerm = event.target.value.trim().toLowerCase();
  displayProducts();
});

/* 10. NAVIGATION AND OVERLAYS */

document.getElementById("shopBtn")?.addEventListener("click", () => {
  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("cartBtn")?.addEventListener("click", () => {
  updateCart();
  openOverlay("cartOverlay");
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => closeOverlay(button.dataset.close));
});

document.querySelectorAll(".overlay").forEach(overlay => {
  overlay.addEventListener("click", event => {
    if (event.target === overlay) overlay.classList.add("hidden");
  });
});

/* 11. LOGIN AND REGISTRATION */

function setAccountMode(registering) {
  isRegistering = registering;

  document.getElementById("accountTitle").textContent =
    registering ? "Create Your Account" : "Customer Login";

  document.getElementById("accountSubmit").textContent =
    registering ? "REGISTER" : "LOGIN";

  document.getElementById("registerFields").classList.toggle(
    "hidden", !registering
  );

  document.getElementById("switchPrompt").textContent =
    registering ? "Already have an account?" : "New customer?";

  document.getElementById("switchAccount").textContent =
    registering ? "Login here" : "Register here";

  document.getElementById("passwordHint").textContent =
    registering
      ? "Choose a password with at least 12 characters."
      : "Use your registered email and password.";

  document.getElementById("password").autocomplete =
    registering ? "new-password" : "current-password";

  document.getElementById("fullName").required = registering;
  document.getElementById("phone").required = registering;
  document.getElementById("formError").textContent = "";
}

document.getElementById("accountBtn")?.addEventListener("click", () => {
  setAccountMode(false);
  openOverlay("accountOverlay");
});

document.getElementById("footerAccount")?.addEventListener("click", () => {
  setAccountMode(false);
  openOverlay("accountOverlay");
});

document.getElementById("registerBtn")?.addEventListener("click", () => {
  setAccountMode(true);
  openOverlay("accountOverlay");
});

document.getElementById("switchAccount")?.addEventListener("click", () => {
  setAccountMode(!isRegistering);
});

document.getElementById("accountForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const errorElement = document.getElementById("formError");
  const submitButton = document.getElementById("accountSubmit");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fullName = document.getElementById("fullName").value.trim();
  const phone = document.getElementById("phone").value.trim();

  errorElement.textContent = "";

  if (!db) {
    errorElement.textContent = "Supabase did not load. Refresh the page.";
    return;
  }

  if (isRegistering && password.length < 12) {
    errorElement.textContent = "Use a password of at least 12 characters.";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "PLEASE WAIT...";

  try {
    if (isRegistering) {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone }
        }
      });

      if (error) throw error;

      if (data.session) {
        showToast("Registration successful.");
        closeOverlay("accountOverlay");
        await updateAccountStatus(data.user);
      } else {
        errorElement.textContent =
          "Account created. Check your email for a confirmation link.";
      }
    } else {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showToast("Login successful.");
      closeOverlay("accountOverlay");
      await updateAccountStatus(data.user);
    }
  } catch (error) {
    console.error("Authentication error:", error);
    errorElement.textContent = error.message || "Authentication failed.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = isRegistering ? "REGISTER" : "LOGIN";
  }
});

/* 12. ACCOUNT STATUS, LOGOUT AND PASSWORD RESET */

async function updateAccountStatus(user) {
  const status = document.getElementById("accountStatus");
  const logoutButton = document.getElementById("logoutBtn");

  if (status) {
    status.textContent = user
      ? `Signed in as ${user.email}`
      : "You are not signed in.";
  }

  logoutButton?.classList.toggle("hidden", !user);
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    showToast("Could not log out. Please try again.");
    console.error(error);
    return;
  }

  await updateAccountStatus(null);
  showToast("You have logged out.");
});

document.getElementById("resetPasswordBtn")?.addEventListener("click", async () => {
  if (!db) return;

  const email = document.getElementById("email").value.trim();
  const errorElement = document.getElementById("formError");

  if (!email) {
    errorElement.textContent = "Enter your email address first.";
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  errorElement.textContent = error
    ? error.message
    : "If the email is registered, a password reset link will be sent.";
});

/* 13. CHECKOUT: CREATE ORDER, SAVE ITEMS, REQUEST M-PESA */

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  if (checkoutBusy) return;

  if (!db) {
    showToast("Database connection failed.");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  const user = await getCurrentUser().catch(error => {
    console.error(error);
    return null;
  });

  if (!user) {
    closeOverlay("cartOverlay");
    setAccountMode(false);
    openOverlay("accountOverlay");
    showToast("Please log in before placing your order.");
    return;
  }

  const phoneInput = document.getElementById("mpesa-phone");
  const message = document.getElementById("mpesa-message");
  const checkoutButton = document.getElementById("checkoutBtn");

  const phone = normalizeKenyanPhone(phoneInput?.value);
  const amount = getCartTotal();

  if (!/^254[17]\d{8}$/.test(phone)) {
    if (message) {
      message.textContent =
        "Enter a valid Kenyan M-Pesa number, e.g. 0712345678.";
    } else {
      showToast("Enter a valid M-Pesa phone number.");
    }
    return;
  }

  if (!Number.isSafeInteger(amount) || amount < 1) {
    showToast("The order total is invalid.");
    return;
  }

  checkoutBusy = true;
  checkoutButton.disabled = true;
  checkoutButton.textContent = "PROCESSING...";

  if (message) message.textContent = "Saving your order...";

  let orderId = null;

  // Snapshot the cart so changes during checkout cannot alter this order.
  const snapshot = cart.map(item => ({ ...item }));

  try {
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: amount,
        status: "pending"
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    orderId = order.id;

    const orderItems = snapshot.map(item => ({
      order_id: orderId,
      product_name: item.name,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      image_url: item.image || null
    }));

    const { error: itemsError } = await db
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      throw new Error(
        "The order was created, but its items could not be saved. Order ID: " +
        orderId + ". " + itemsError.message
      );
    }

    if (message) {
      message.textContent = "Requesting M-Pesa payment...";
    }

    // The Edge Function must validate this order and associate its
    // CheckoutRequestID with orderId for the trusted callback.
    const { data, error } = await db.functions.invoke(
      "initiate-stk-push",
      {
        body: {
          phone,
          amount,
          order_id: orderId
        }
      }
    );

    if (error) {
      let detail = error.message || "Could not initiate payment.";

      if (error.context) {
        try {
          const response = await error.context.json();
          detail = response.error || response.message || detail;
        } catch (_) {}
      }

      throw new Error(detail);
    }

    if (!data || data.error) {
      throw new Error(data?.error || "The payment request was rejected.");
    }

    // A successful STK request is not proof of payment.
    if (message) {
      message.textContent =
        data.CustomerMessage ||
        data.customerMessage ||
        "Payment request sent. Enter your M-Pesa PIN on your phone. " +
        "Your order will remain pending until payment is confirmed.";
    }

    // Only clear the cart after the order and payment request were accepted.
    cart = [];
    updateCart();
    closeOverlay("cartOverlay");

    showToast(
      "Order #" + orderId +
      " saved. Waiting for M-Pesa payment confirmation."
    );

    console.log("Order and STK request submitted:", {
      orderId,
      response: data
    });
  } catch (error) {
    console.error("Checkout/payment error:", error);

    if (message) {
      message.textContent =
        "Could not complete checkout: " +
        (error.message || "Please try again.");
    } else {
      showToast(error.message || "Checkout failed.");
    }

    // Do not mark the order as paid here.
    // Do not automatically delete an order that may already have a payment request.
  } finally {
    checkoutBusy = false;
    checkoutButton.disabled = false;
    checkoutButton.textContent = "LOGIN TO PLACE ORDER";
  }
});

/* 14. MY ORDERS */

const myOrdersBtn = document.getElementById("myOrdersBtn");
const myOrdersSection = document.getElementById("myOrdersSection");
const myOrdersList = document.getElementById("myOrdersList");
const shopContent = document.getElementById("shopContent");

async function loadMyOrders() {
  if (!db) throw new Error("Supabase database connection failed.");

  myOrdersList.innerHTML = "<p>Loading your orders...</p>";

  const user = await getCurrentUser();

  if (!user) {
    myOrdersList.innerHTML = "<p>Please log in to view your orders.</p>";
    setAccountMode(false);
    openOverlay("accountOverlay");
    return;
  }

  const { data: orders, error: ordersError } = await db
    .from("orders")
    .select("id, user_id, total_amount, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (ordersError) throw ordersError;

  const activeOrders = (orders || []).filter(
    order => order.status !== "cancelled"
  );

  if (!activeOrders.length) {
    myOrdersList.innerHTML = "<p>You have no active orders yet.</p>";
    return;
  }

  const orderIds = activeOrders.map(order => order.id);

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select("order_id, product_name, quantity, unit_price, image_url")
    .in("order_id", orderIds);

  if (itemsError) throw itemsError;

  const { data: payments, error: paymentsError } = await db
    .from("payment_attempts")
    .select("order_id, status, receipt_number")
    .in("order_id", orderIds);

  // Payment history is optional for display; the orders and items remain visible
  // if this table does not expose these columns or the query is denied.
  if (paymentsError) {
    console.warn("Payment history could not be loaded:", paymentsError.message);
  }

  const itemsByOrder = {};
  (items || []).forEach(item => {
    const key = String(item.order_id);
    if (!itemsByOrder[key]) itemsByOrder[key] = [];
    itemsByOrder[key].push(item);
  });

  const paymentsByOrder = {};
  (payments || []).forEach(payment => {
    paymentsByOrder[String(payment.order_id)] = payment;
  });

  myOrdersList.innerHTML = activeOrders.map(order => {
    const orderItems = itemsByOrder[String(order.id)] || [];
    const payment = paymentsByOrder[String(order.id)];
    const status = order.status || "pending";

    return `
      <article class="customer-order">
        <h3>Order #${escapeHTML(order.id)}</h3>

        <p><strong>Date:</strong>
          ${escapeHTML(order.created_at
            ? new Date(order.created_at).toLocaleString()
            : "Unavailable")}
        </p>

        <p><strong>Order status:</strong> ${escapeHTML(status)}</p>

        <p><strong>Payment status:</strong>
          ${escapeHTML(payment?.status || "Awaiting confirmation")}
        </p>

        ${payment?.receipt_number
          ? `<p><strong>M-Pesa receipt:</strong>
               ${escapeHTML(payment.receipt_number)}</p>`
          : ""}

        <div class="customer-order-items">
          ${orderItems.length
            ? orderItems.map(item => `
              <div class="customer-order-item">
                ${item.image_url
                  ? `<img
                       src="${escapeHTML(item.image_url)}"
                       alt="${escapeHTML(item.product_name)}"
                       loading="lazy"
                       onerror="this.style.display='none'">`
                  : ""}

                <div>
                  <strong>${escapeHTML(item.product_name)}</strong>
                  <p>Quantity: ${Number(item.quantity)}</p>
                  <p>Price: ${formatPrice(item.unit_price)}</p>
                  <p>Subtotal: ${formatPrice(
                    Number(item.unit_price) * Number(item.quantity)
                  )}</p>
                </div>
              </div>
            `).join("")
            : "<p>No items found for this order.</p>"}
        </div>

        <p class="customer-order-total">
          <strong>Total: ${formatPrice(order.total_amount)}</strong>
        </p>

        ${status === "pending"
          ? `<button
               type="button"
               class="cancel-order-btn"
               data-order-id="${escapeHTML(order.id)}">
               Cancel Order
             </button>`
          : ""}
      </article>
    `;
  }).join("");
}

myOrdersBtn?.addEventListener("click", async () => {
  myOrdersSection?.classList.remove("hidden");
  shopContent?.classList.add("hidden");

  myOrdersSection?.scrollIntoView({ behavior: "smooth", block: "start" });

  myOrdersBtn.disabled = true;

  try {
    await loadMyOrders();
  } catch (error) {
    console.error("My Orders error:", error);
    myOrdersList.innerHTML = `
      <p>Could not load your orders.</p>
      <p class="error">${escapeHTML(error.message)}</p>
    `;
  } finally {
    myOrdersBtn.disabled = false;
  }
});

document.getElementById("backToShopBtn")?.addEventListener("click", () => {
  myOrdersSection?.classList.add("hidden");
  shopContent?.classList.remove("hidden");
  document.getElementById("categories")?.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

/* 15. CANCEL PENDING ORDER */

myOrdersList?.addEventListener("click", async event => {
  const button = event.target.closest(".cancel-order-btn");
  if (!button || !db) return;

  const orderId = button.dataset.orderId;
  if (!orderId) return;

  if (!confirm("Are you sure you want to cancel this order?")) return;

  button.disabled = true;
  button.textContent = "Cancelling...";

  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Please log in first.");

    const { data, error } = await db
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      throw new Error(
        "Order could not be cancelled. It may already be processed."
      );
    }

    showToast("Order cancelled.");
    await loadMyOrders();
  } catch (error) {
    console.error("Cancellation error:", error);
    alert(error.message || "Could not cancel this order.");

    if (button.isConnected) {
      button.disabled = false;
      button.textContent = "Cancel Order";
    }
  }
});

/* 16. FOOTER YEAR */

const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

/* 17. START WEBSITE */

displayProducts();
updateCart();
loadProducts();

if (db) {
  db.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error("Could not check session:", error);
      return;
    }

    updateAccountStatus(data.session?.user || null);
  });

  db.auth.onAuthStateChange((_event, session) => {
    updateAccountStatus(session?.user || null);
  });
} else {
  console.error("Supabase library did not load.");
}

