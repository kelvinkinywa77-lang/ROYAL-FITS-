
/* =====================================================
   ROYAL FITS BOUTIQUE254
   Supabase products, authentication, cart and orders
===================================================== */

/* 1. SUPABASE CONNECTION */

const SUPABASE_URL =
  "https://rutpxicmpjdqvrfoicnv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_iUUvMivOvVBbk4XvCCDWtQ_iOWSra5g";

let db = null;

if (window.supabase) {
  db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
} else {
  console.error("Supabase library did not load.");
}

/* 2. PRODUCT DATA */

const localProducts = [];

let products = [...localProducts];
let cart = [];
let selectedCategory = "All";
let searchTerm = "";
let isRegistering = false;

/* 3. HELPER FUNCTIONS */

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
  if (!toast) {
    console.log(message);
    return;
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

function openOverlay(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

function closeOverlay(id) {
  document.getElementById(id)?.classList.add("hidden");
}

/* 4. LOAD PRODUCTS FROM SUPABASE */

async function loadProducts() {
  if (!db) {
    displayProducts();
    updateCart();
    return;
  }

  try {
    const { data, error } = await db
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) throw error;

    if (data && data.length) {
      products = data.map(row => ({
        id: Number(row.id),
        name: row.name,
        category: row.category === "Womens" ? "Women" : row.category,
        price: Number(row.price || 0),
        old: Number(row.old_price || 0),
        image: row.image_url || "",
        color: row.color || "#eeeeee",
        rating: Number(row.rating || 4.5),
        stock: row.stock == null ? null : Number(row.stock)
      }));
    } else {
      products = [...localProducts];
    }
  } catch (error) {
    console.error("Could not load products:", error);
    products = [...localProducts];
    showToast("Could not load products from the database.");
  }

  displayProducts();
  updateCart();
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

    const hasStock =
      product.stock !== undefined && product.stock !== null;

    const stock = hasStock ? Number(product.stock) : null;
    const soldOut = hasStock && stock <= 0;

    const discount =
      oldPrice > price && oldPrice > 0
        ? Math.round((1 - price / oldPrice) * 100)
        : 0;

    return `
      <article class="product-card">
        <div
          class="product-image-wrap"
          style="background:${escapeHTML(product.color || "#eeeeee")}"
        >
          <img
            src="${escapeHTML(product.image)}"
            alt="${escapeHTML(product.name)}"
            class="product-image"
            loading="lazy"
            style="cursor:pointer"
            onclick="showImage(this.src, this.alt)"
            onerror="this.onerror=null; this.style.opacity='0.4';"
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
            ${oldPrice > price
              ? `<del>${formatPrice(oldPrice)}</del>`
              : ""}
          </div>

          <p class="stock-label">
            ${!hasStock
              ? "Stock not synced"
              : stock > 0
                ? `${stock} in stock`
                : "Out of stock"}
          </p>

          <button
            class="primary-btn full-width"
            onclick="addToCart(${Number(product.id)})"
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

/* 7. SHOPPING CART */

function addToCart(id) {
  const product = products.find(
    item => Number(item.id) === Number(id)
  );

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const hasStock =
    product.stock !== undefined && product.stock !== null;

  const existing = cart.find(
    item => Number(item.id) === Number(id)
  );

  if (
    hasStock &&
    (existing?.quantity || 0) >= Number(product.stock)
  ) {
    showToast("Sorry, there is not enough stock available.");
    return;
  }

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  updateCart();
  showToast("Product added to your cart!");
}

function removeFromCart(id) {
  cart = cart.filter(
    item => Number(item.id) !== Number(id)
  );

  updateCart();
}

function updateCart() {
  const count = document.getElementById("cartCount");
  const itemsElement = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * item.quantity,
    0
  );

  if (count) count.textContent = totalItems;

  if (totalElement) {
    totalElement.textContent = formatPrice(total);
  }

  if (!itemsElement) return;

  if (!cart.length) {
    itemsElement.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  itemsElement.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img
        class="cart-image"
        src="${escapeHTML(item.image || "")}"
        alt="${escapeHTML(item.name)}"
      >

      <div class="cart-item-details">
        <h4>${escapeHTML(item.name)}</h4>
        <p>${formatPrice(item.price)}</p>
        <p>Quantity: ${item.quantity}</p>
        <p>Subtotal: ${formatPrice(item.price * item.quantity)}</p>

        <button
          class="text-btn"
          onclick="removeFromCart(${Number(item.id)})"
        >
          Remove
        </button>
      </div>
    </div>
  `).join("");
}

/* 8. CATEGORY FILTERS */

document.querySelectorAll(".category").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");

    selectedCategory = button.dataset.category || "All";

    displayProducts();
  });
});

/* 9. SEARCH */

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();

    searchTerm = searchInput
      ? searchInput.value.trim().toLowerCase()
      : "";

    displayProducts();

    document.getElementById("shop")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    displayProducts();
  });
}

/* 10. NAVIGATION AND OVERLAYS */

document.getElementById("shopBtn")?.addEventListener("click", () => {
  document.getElementById("shop")?.scrollIntoView({
    behavior: "smooth"
  });
});

document.getElementById("cartBtn")?.addEventListener("click", () => {
  updateCart();
  openOverlay("cartOverlay");
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeOverlay(button.dataset.close);
  });
});

document.querySelectorAll(".overlay").forEach(overlay => {
  overlay.addEventListener("click", event => {
    if (event.target === overlay) {
      overlay.classList.add("hidden");
    }
  });
});

/* 11. LOGIN / REGISTRATION MODE */

function setAccountMode(registering) {
  isRegistering = registering;

  const title = document.getElementById("accountTitle");
  const submit = document.getElementById("accountSubmit");
  const fields = document.getElementById("registerFields");
  const prompt = document.getElementById("switchPrompt");
  const switchButton = document.getElementById("switchAccount");
  const hint = document.getElementById("passwordHint");
  const password = document.getElementById("password");
  const fullName = document.getElementById("fullName");
  const phone = document.getElementById("phone");
  const error = document.getElementById("formError");

  if (title) {
    title.textContent = registering
      ? "Create Your Account"
      : "Customer Login";
  }

  if (submit) {
    submit.textContent = registering ? "REGISTER" : "LOGIN";
  }

  if (fields) {
    fields.classList.toggle("hidden", !registering);
  }

  if (prompt) {
    prompt.textContent = registering
      ? "Already have an account?"
      : "New customer?";
  }

  if (switchButton) {
    switchButton.textContent = registering
      ? "Login here"
      : "Register here";
  }

  if (hint) {
    hint.textContent = registering
      ? "Choose a password with at least 12 characters."
      : "Use your registered email and password.";
  }

  if (password) {
    password.autocomplete = registering
      ? "new-password"
      : "current-password";
  }

  if (fullName) fullName.required = registering;
  if (phone) phone.required = registering;
  if (error) error.textContent = "";
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

/* 12. CUSTOMER REGISTRATION AND LOGIN */

const accountForm = document.getElementById("accountForm");

if (accountForm) {
  accountForm.addEventListener("submit", async event => {
    event.preventDefault();

    const errorElement = document.getElementById("formError");
    const submitButton = document.getElementById("accountSubmit");

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";
    const fullName = document.getElementById("fullName")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";

    if (errorElement) errorElement.textContent = "";

    if (!db) {
      if (errorElement) {
        errorElement.textContent =
          "Supabase did not load. Check your connection.";
      }
      return;
    }

    if (!email || !password) {
      if (errorElement) {
        errorElement.textContent = "Enter your email and password.";
      }
      return;
    }

    if (isRegistering && password.length < 12) {
      if (errorElement) {
        errorElement.textContent =
          "Use a password of at least 12 characters.";
      }
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "PLEASE WAIT...";
    }

    try {
      if (isRegistering) {
        const { data, error } = await db.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          showToast("Registration successful!");
          closeOverlay("accountOverlay");
          await updateAccountStatus(data.user);
        } else {
          if (errorElement) {
            errorElement.textContent =
              "Account created. Check your email for a confirmation link before logging in.";
          }
        }
      } else {
        const { data, error } = await db.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        showToast("Login successful. Welcome!");
        closeOverlay("accountOverlay");
        await updateAccountStatus(data.user);
      }
    } catch (error) {
      console.error("Authentication error:", error);

      if (errorElement) {
        errorElement.textContent =
          error.message || "Authentication failed. Please try again.";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isRegistering ? "REGISTER" : "LOGIN";
      }
    }
  });
}

/* 13. ACCOUNT STATUS, LOGOUT AND PASSWORD RESET */

async function updateAccountStatus(user) {
  const status = document.getElementById("accountStatus");
  const logoutButton = document.getElementById("logoutBtn");

  if (status) {
    status.textContent = user
      ? `Signed in as ${user.email}`
      : "You are not signed in.";
  }

  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !user);
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    showToast("Could not log out. Please try again.");
    console.error("Logout error:", error);
    return;
  }

  await updateAccountStatus(null);
  showToast("You have logged out.");
});

document.getElementById("resetPasswordBtn")?.addEventListener("click", async () => {
  if (!db) return;

  const email = document.getElementById("email")?.value.trim() || "";
  const errorElement = document.getElementById("formError");

  if (!email) {
    if (errorElement) {
      errorElement.textContent = "Enter your email address first.";
    }
    return;
  }

  try {
    const redirectTo =
      window.location.origin + window.location.pathname;

    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) throw error;

    if (errorElement) {
      errorElement.textContent =
        "If the email is registered, a password reset link will be sent.";
    }
  } catch (error) {
    console.error("Password reset error:", error);

    if (errorElement) {
      errorElement.textContent =
        error.message || "Could not send the password reset email.";
    }
  }
});

/* 14. CHECKOUT: SAVE ORDERS TO SUPABASE */

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  if (!db) {
    showToast("Database connection failed. Please refresh.");
    return;
  }

  const checkoutButton = document.getElementById("checkoutBtn");

  if (checkoutButton) {
    checkoutButton.disabled = true;
    checkoutButton.textContent = "PLACING ORDER...";
  }

  let orderId = null;

  try {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    const user = sessionData.session?.user;

    if (!user) {
      closeOverlay("cartOverlay");
      setAccountMode(false);
      openOverlay("accountOverlay");
      showToast("Please log in before placing your order.");
      return;
    }

    const cartSnapshot = cart.map(item => ({ ...item }));

    const total = cartSnapshot.reduce(
      (sum, item) =>
        sum + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );

    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("The order total is invalid.");
    }

    // Save the main order.
    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: user.id,
        total_amount: total,
        status: "pending"
      })
      .select("id")
      .single();

    if (orderError) throw orderError;

    orderId = order.id;

    // Save all items belonging to this order.
    const orderItems = cartSnapshot.map(item => ({
      order_id: orderId,
      product_name: item.name,
      quantity: Number(item.quantity),
      unit_price: Number(item.price),
      image_url: item.image || null
    }));

    const { error: itemsError } = await db
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    cart = [];
    updateCart();
    closeOverlay("cartOverlay");

    showToast("Order placed successfully! Order ID: " + orderId);

    console.log("Order saved successfully:", orderId);
  } catch (error) {
    console.error("Checkout error:", error);

    if (orderId) {
      showToast(
        "Order items could not be saved. Contact support with order ID: " +
        orderId
      );
    } else {
      showToast(
        "Could not place your order: " +
        (error.message || "Please try again.")
      );
    }
  } finally {
    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "CHECKOUT";
    }
  }
});

/* 15. FOOTER YEAR */

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}

/* 16. CUSTOMER ORDER HISTORY */

const myOrdersBtn = document.getElementById("myOrdersBtn");
const myOrdersSection = document.getElementById("myOrdersSection");
const myOrdersList = document.getElementById("myOrdersList");

async function loadMyOrders() {
  if (!db) {
    throw new Error("Database connection failed.");
  }

  if (!myOrdersList) {
    throw new Error("My Orders list was not found in the HTML.");
  }

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError) throw sessionError;

  const user = sessionData.session?.user;

  if (!user) {
    setAccountMode(false);
    openOverlay("accountOverlay");
    showToast("Please log in to view your orders.");
    return;
  }

  myOrdersList.innerHTML = "<p>Loading your orders...</p>";

  // IMPORTANT: retrieve only this customer's orders.
  const { data: orders, error } = await db
    .from("orders")
    .select(`
      id,
      user_id,
      total_amount,
      status,
      created_at,
      order_items (
        product_name,
        quantity,
        unit_price,
        image_url
      )
    `)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("My Orders database error:", error);
    throw error;
  }

  if (!orders || orders.length === 0) {
    myOrdersList.innerHTML =
      "<p>You have not placed any orders yet.</p>";
    return;
  }

  myOrdersList.innerHTML = orders.map(order => `
    <article class="customer-order">
      <h3>Order #${escapeHTML(order.id)}</h3>

      <p>
        <strong>Date:</strong>
        ${escapeHTML(
          order.created_at
            ? new Date(order.created_at).toLocaleString()
            : "Unavailable"
        )}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(order.status || "pending")}
      </p>

      <div class="customer-order-items">
        ${(order.order_items || []).map(item => `
          <div class="customer-order-item">
            ${item.image_url ? `
              <img
                src="${escapeHTML(item.image_url)}"
                alt="${escapeHTML(item.product_name)}"
                loading="lazy"
                onerror="this.style.display='none'"
              >
            ` : ""}

            <div>
              <strong>${escapeHTML(item.product_name)}</strong>
              <p>Quantity: ${Number(item.quantity)}</p>
              <p>Price: ${formatPrice(item.unit_price)}</p>
            </div>
          </div>
        `).join("")}
      </div>

      <p class="customer-order-total">
        Total: ${formatPrice(order.total_amount)}
      </p>

      ${order.status === "pending" ? `
        <button
          type="button"
          class="cancel-order-btn"
          data-order-id="${escapeHTML(order.id)}"
        >
          Cancel Order
        </button>
      ` : ""}
    </article>
  `).join("");
}

if (myOrdersBtn) {
  myOrdersBtn.addEventListener("click", async () => {
    myOrdersSection?.classList.remove("hidden");
    myOrdersSection?.scrollIntoView({ behavior: "smooth" });

    myOrdersBtn.disabled = true;

    if (myOrdersList) {
      myOrdersList.innerHTML = "<p>Loading your orders...</p>";
    }

    try {
      await loadMyOrders();
    } catch (error) {
      console.error("Order history error:", error);

      if (myOrdersList) {
        myOrdersList.innerHTML = `
          <p>Could not load your orders.</p>
          <p class="error">
            ${escapeHTML(error.message || "Please try again.")}
          </p>
        `;
      }
    } finally {
      myOrdersBtn.disabled = false;
    }
  });
}

/* 17. CANCEL A PENDING ORDER */

if (myOrdersList) {
  myOrdersList.addEventListener("click", async event => {
    const button = event.target.closest(".cancel-order-btn");

    if (!button || !db) return;

    const orderId = button.dataset.orderId;

    if (!orderId) return;

    if (!confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    button.disabled = true;
    button.textContent = "Cancelling...";

    try {
      const { data: sessionData, error: sessionError } =
        await db.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;

      if (!user) {
        throw new Error("Please log in first.");
      }

      // Only update this customer's pending order.
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
          "This order could not be cancelled. It may already be processed, or database permissions may prevent the update."
        );
      }

      showToast("Order cancelled successfully.");

      // Reload the list so the cancelled order disappears.
      await loadMyOrders();
    } catch (error) {
      console.error("Cancel order error:", error);

      alert(error.message || "Could not cancel this order.");

      if (button.isConnected) {
        button.disabled = false;
        button.textContent = "Cancel Order";
      }
    }
  });
}

/* 18. INITIALIZE WEBSITE */

displayProducts();
updateCart();
loadProducts();

if (db) {
  db.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        console.error("Could not check session:", error);
        return;
      }

      updateAccountStatus(data.session?.user || null);
    })
    .catch(error => {
      console.error("Session initialization error:", error);
    });

  db.auth.onAuthStateChange((_event, session) => {
    updateAccountStatus(session?.user || null);
  });
}
