/* =====================================================
   ROYAL FITS BOUTIQUE254
   Products, Authentication, Cart and Orders
===================================================== */

/* 1. SUPABASE CONNECTION */

const SUPABASE_URL =
  "https://rutpxicmpjdqvrfoicnv.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_iUUvMivOvVBbk4XvCCDWtQ_iOWSra5g";

const db = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

/* 2. GLOBAL VARIABLES */

let products = [];
let cart = JSON.parse(localStorage.getItem("royalFitsCart") || "[]");
let currentUser = null;
let selectedCategory = "all";

/* 3. HELPER FUNCTIONS */

function getElement(id) {
  return document.getElementById(id);
}

function showMessage(message) {
  alert(message);
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

function formatPrice(price) {
  return "KSh " + Number(price || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function saveCart() {
  localStorage.setItem("royalFitsCart", JSON.stringify(cart));
}

/* 4. LOAD PRODUCTS FROM SUPABASE */

async function loadProducts() {
  const container =
    getElement("productsContainer") ||
    getElement("productContainer") ||
    getElement("products");

  if (!container) {
    console.error("Products container was not found in HTML.");
    return;
  }

  container.innerHTML = "<p>Loading products...</p>";

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Product loading error:", error);
    container.innerHTML =
      "<p>Unable to load products. Please try again later.</p>";
    return;
  }

  products = (data || []).filter(product =>
    product.is_active !== false
  );

  displayProducts(products);
}

/* 5. DISPLAY PRODUCTS */

function displayProducts(list = products) {
  const container =
    getElement("productsContainer") ||
    getElement("productContainer") ||
    getElement("products");

  if (!container) return;

  if (!list.length) {
    container.innerHTML = "<p>No products found.</p>";
    return;
  }

  container.innerHTML = list.map(product => {
    const image = product.image_url || "";
    const name = escapeHTML(product.name);
    const category = escapeHTML(product.category);
    const price = Number(product.price || 0);
    const oldPrice = Number(product.old_price || 0);
    const stock = Number(product.stock ?? 0);
    const colour = escapeHTML(product.colour || product.color || "");

    return `
      <div class="product-card">

        <img
          src="${escapeHTML(image)}"
          alt="${name}"
          class="product-image"
          onclick="showImage('${escapeHTML(image)}')"
          onerror="this.style.display='none'"
        >

        <h3>${name}</h3>

        <p>${category}</p>

        ${colour ? `<p>Colour: ${colour}</p>` : ""}

        <p class="product-price">
          ${formatPrice(price)}
        </p>

        ${
          oldPrice > price
            ? `<p class="old-price">
                 <del>${formatPrice(oldPrice)}</del>
               </p>`
            : ""
        }

        <p>Stock: ${stock}</p>

        <button
          type="button"
          onclick="addToCart(${Number(product.id)})"
          ${stock <= 0 ? "disabled" : ""}
        >
          ${stock <= 0 ? "Out of Stock" : "Add to Cart"}
        </button>

      </div>
    `;
  }).join("");
}

/* 6. PRODUCT IMAGE POPUP */

function showImage(imageUrl) {
  const popup = getElement("imagePopup");
  const popupImage = getElement("popupImage");

  if (popup && popupImage) {
    popupImage.src = imageUrl;
    popup.style.display = "flex";
  } else {
    window.open(imageUrl, "_blank");
  }
}

function closeImage() {
  const popup = getElement("imagePopup");

  if (popup) {
    popup.style.display = "none";
  }
}

/* 7. SEARCH PRODUCTS */

function searchProducts() {
  const input =
    getElement("searchInput") ||
    getElement("searchBar") ||
    getElement("search");

  const term = input ? input.value.toLowerCase().trim() : "";

  const filtered = products.filter(product => {
    const matchesSearch =
      String(product.name || "").toLowerCase().includes(term) ||
      String(product.category || "").toLowerCase().includes(term);

    const matchesCategory =
      selectedCategory === "all" ||
      String(product.category || "").toLowerCase() ===
        selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  displayProducts(filtered);
}

/* 8. FILTER BY CATEGORY */

function filterCategory(category) {
  selectedCategory = category || "all";
  searchProducts();
}

/* 9. ADD PRODUCTS TO CART */

function addToCart(productId) {
  const product = products.find(
    item => Number(item.id) === Number(productId)
  );

  if (!product) {
    showMessage("Product not found.");
    return;
  }

  const stock = Number(product.stock ?? 0);

  if (stock <= 0) {
    showMessage("This product is out of stock.");
    return;
  }

  const existing = cart.find(
    item => Number(item.id) === Number(productId)
  );

  if (existing) {
    if (Number(existing.quantity) >= stock) {
      showMessage("You cannot add more than the available stock.");
      return;
    }

    existing.quantity = Number(existing.quantity) + 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url || "",
      quantity: 1
    });
  }

  saveCart();
  displayCart();

  showMessage(product.name + " added to cart.");
}

/* 10. DISPLAY CART */

function displayCart() {
  const container =
    getElement("cartItems") ||
    getElement("cartContainer");

  if (!container) {
    updateCartCount();
    return;
  }

  if (!cart.length) {
    container.innerHTML = "<p>Your cart is empty.</p>";
    updateCartCount();
    updateCartTotal();
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">

      <img
        src="${escapeHTML(item.image_url)}"
        alt="${escapeHTML(item.name)}"
        width="70"
        onerror="this.style.display='none'"
      >

      <div>
        <h4>${escapeHTML(item.name)}</h4>

        <p>${formatPrice(item.price)}</p>

        <label>
          Quantity:
          <input
            type="number"
            min="1"
            value="${Number(item.quantity)}"
            onchange="updateQuantity(${Number(item.id)}, this.value)"
          >
        </label>

        <p>
          Subtotal:
          ${formatPrice(Number(item.price) * Number(item.quantity))}
        </p>

        <button
          type="button"
          onclick="removeFromCart(${Number(item.id)})"
        >
          Remove
        </button>
      </div>

    </div>
  `).join("");

  updateCartCount();
  updateCartTotal();
}

/* 11. UPDATE CART QUANTITY */

function updateQuantity(productId, quantity) {
  const item = cart.find(
    product => Number(product.id) === Number(productId)
  );

  if (!item) return;

  const requestedQuantity = Math.floor(Number(quantity));

  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    showMessage("Enter a valid quantity.");
    displayCart();
    return;
  }

  const product = products.find(
    product => Number(product.id) === Number(productId)
  );

  if (product && requestedQuantity > Number(product.stock ?? 0)) {
    showMessage("The requested quantity exceeds available stock.");
    displayCart();
    return;
  }

  item.quantity = requestedQuantity;

  saveCart();
  displayCart();
}

/* 12. REMOVE FROM CART */

function removeFromCart(productId) {
  cart = cart.filter(
    item => Number(item.id) !== Number(productId)
  );

  saveCart();
  displayCart();
}

/* 13. CART COUNT */

function updateCartCount() {
  const count = cart.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  const element = getElement("cartCount");

  if (element) {
    element.textContent = count;
  }
}

/* 14. CART TOTAL */

function updateCartTotal() {
  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  const element = getElement("cartTotal");

  if (element) {
    element.textContent = formatPrice(total);
  }

  return total;/* =====================================================
   15. CUSTOMER REGISTRATION AND LOGIN
===================================================== */

/* REGISTER CUSTOMER */

async function registerCustomer(event) {
  if (event) event.preventDefault();

  const email = getElement("registerEmail")?.value.trim();
  const password = getElement("registerPassword")?.value;
  const name = getElement("registerName")?.value.trim();

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }

  if (password.length < 6) {
    showMessage("Password must have at least 6 characters.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name || ""
      }
    }
  });

  if (error) {
    console.error("Registration error:", error);
    showMessage(error.message);
    return;
  }

  if (data.session) {
    currentUser = data.user;
    updateAccountStatus();
    showMessage("Registration successful.");
  } else {
    showMessage(
      "Registration submitted. Check your email to confirm your account if email confirmation is enabled."
    );
  }
}

/* CUSTOMER LOGIN */

async function loginCustomer(event) {
  if (event) event.preventDefault();

  const email = getElement("loginEmail")?.value.trim();
  const password = getElement("loginPassword")?.value;

  if (!email || !password) {
    showMessage("Enter your email and password.");
    return;
  }

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error("Login error:", error);
    showMessage(error.message);
    return;
  }

  currentUser = data.user;

  updateAccountStatus();
  showMessage("Login successful.");

  await loadMyOrders();
}

/* LOGOUT */

async function logoutCustomer() {
  const { error } = await db.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    showMessage(error.message);
    return;
  }

  currentUser = null;
  updateAccountStatus();

  showMessage("You have logged out.");
}

/* PASSWORD RESET */

async function resetCustomerPassword() {
  const email =
    getElement("loginEmail")?.value.trim() ||
    getElement("registerEmail")?.value.trim();

  if (!email) {
    showMessage("Enter your email address first.");
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email);

  if (error) {
    console.error("Password reset error:", error);
    showMessage(error.message);
    return;
  }

  showMessage("Check your email for password reset instructions.");
}

/* UPDATE ACCOUNT STATUS */

function updateAccountStatus() {
  const status = getElement("accountStatus");
  const loginButton = getElement("loginButton");
  const logoutButton = getElement("logoutButton");

  if (status) {
    status.textContent = currentUser
      ? "Logged in: " + currentUser.email
      : "Not logged in";
  }

  if (loginButton) {
    loginButton.style.display = currentUser ? "none" : "";
  }

  if (logoutButton) {
    logoutButton.style.display = currentUser ? "" : "none";
  }
}
}
/* =====================================================
   16. CHECKOUT AND SAVE ORDERS
===================================================== */

async function checkout() {
  if (!currentUser) {
    showMessage("Please log in before placing an order.");
    return;
  }

  if (!cart.length) {
    showMessage("Your cart is empty.");
    return;
  }

  const checkoutButton = getElement("checkoutButton");

  if (checkoutButton) {
    checkoutButton.disabled = true;
    checkoutButton.textContent = "Processing...";
  }

  try {
    /*
      Recheck products and stock before creating an order.
    */

    const productIds = cart.map(item => Number(item.id));

    const { data: latestProducts, error: productError } = await db
      .from("products")
      .select("id, name, price, stock, image_url, is_active")
      .in("id", productIds);

    if (productError) throw productError;

    for (const item of cart) {
      const latestProduct = (latestProducts || []).find(
        product => Number(product.id) === Number(item.id)
      );

      if (!latestProduct || latestProduct.is_active === false) {
        throw new Error(
          item.name + " is no longer available."
        );
      }

      if (
        Number(item.quantity) < 1 ||
        Number(item.quantity) > Number(latestProduct.stock ?? 0)
      ) {
        throw new Error(
          "Insufficient stock for " + latestProduct.name + "."
        );
      }

      item.name = latestProduct.name;
      item.price = Number(latestProduct.price);
      item.image_url = latestProduct.image_url || "";
    }

    saveCart();

    const totalAmount = cart.reduce(
      (sum, item) =>
        sum + Number(item.price) * Number(item.quantity),
      0
    );

    /*
      STEP 1: CREATE THE ORDER.
      orders.user_id must match the logged-in user's UUID.
    */

    const { data: order, error: orderError } = await db
      .from("orders")
      .insert({
        user_id: currentUser.id,
        total_amount: totalAmount,
        status: "pending"
      })
      .select("id, user_id, total_amount, status, created_at")
      .single();

    if (orderError) throw orderError;

    /*
      STEP 2: CREATE THE ORDER ITEMS.
      order_id must match orders.id.
      product_id must match products.id.
      Keep this array and insert statement only once.
    */

    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: Number(item.id),
      product_name: item.name,
      quantity: Number(item.quantity),
      price: Number(item.price),
      unit_price: Number(item.price),
      image_url: item.image_url || ""
    }));

   const { error: itemsError } = await db
  .from("order_items")
  .insert(orderItems);

if (itemsError) {
  console.error("Order items error:", itemsError);

  throw new Error(
    "Order " + order.id +
    " was created, but saving its items failed. " +
    itemsError.message
  );
}
    /*
      STEP 3: CLEAR THE CART AFTER BOTH INSERTS SUCCEED.
    */

    cart = [];
    saveCart();
    displayCart();

    showMessage(
      "Order placed successfully! Order number: " + order.id
    );

    await loadMyOrders();

  } catch (error) {
    console.error("Checkout error:", error);
    showMessage(error.message || "Unable to place your order.");
  } finally {
    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = "Checkout";
    }
  }
}/* =====================================================
   17. LOAD MY ORDERS
===================================================== */

async function loadMyOrders() {
  const container =
    getElement("myOrdersContainer") ||
    getElement("orderList") ||
    getElement("myOrders");

  if (!container) return;

  if (!currentUser) {
    container.innerHTML =
      "<p>Please log in to view your orders.</p>";
    return;
  }

  container.innerHTML = "<p>Loading your orders...</p>";

  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("My Orders error:", error);
    container.innerHTML =
      "<p>Unable to load orders: " +
      escapeHTML(error.message) + "</p>";
    return;
  }

  /*
    Hide cancelled orders from the My Orders list.
  */

  const visibleOrders = (orders || []).filter(
    order => String(order.status).toLowerCase() !== "cancelled"
  );

  if (!visibleOrders.length) {
    container.innerHTML = "<p>You have no active orders.</p>";
    return;
  }

  const orderIds = visibleOrders.map(order => order.id);

  const { data: items, error: itemsError } = await db
    .from("order_items")
    .select(
      "order_id, product_name, quantity, unit_price, image_url"
    )
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("Order items loading error:", itemsError);
    container.innerHTML =
      "<p>Unable to load order items: " +
      escapeHTML(itemsError.message) + "</p>";
    return;
  }

  container.innerHTML = visibleOrders.map(order => {
    const orderItems = (items || []).filter(
      item => String(item.order_id) === String(order.id)
    );

    const status = String(order.status || "pending").toLowerCase();

    return `
      <div class="order-card">

        <h3>Order #${escapeHTML(order.id)}</h3>

        <p>
          Date:
          ${escapeHTML(
            order.created_at
              ? new Date(order.created_at).toLocaleString()
              : "Not available"
          )}
        </p>

        <p>
          Status:
          ${escapeHTML(status)}
        </p>

        <p>
          Total:
          ${formatPrice(order.total_amount)}
        </p>

        <div class="order-items">
          ${
            orderItems.length
              ? orderItems.map(item => `
                  <div class="order-item">

                    ${
                      item.image_url
                        ? `<img
                             src="${escapeHTML(item.image_url)}"
                             alt="${escapeHTML(item.product_name)}"
                             width="60"
                             onerror="this.style.display='none'"
                           >`
                        : ""
                    }

                    <span>
                      ${escapeHTML(item.product_name)}
                    </span>

                    <span>
                      Quantity: ${Number(item.quantity)}
                    </span>

                    <span>
                      ${formatPrice(item.unit_price)}
                    </span>

                  </div>
                `).join("")
              : "<p>No items found for this order.</p>"
          }
        </div>

        ${
          status === "pending"
            ? `<button
                 type="button"
                 onclick="cancelOrder('${escapeHTML(order.id)}')"
               >
                 Cancel Order
               </button>`
            : ""
        }

      </div>
    `;
  }).join("");
}

/* =====================================================
   18. CANCEL A PENDING ORDER
===================================================== */

async function cancelOrder(orderId) {
  if (!currentUser) {
    showMessage("Please log in first.");
    return;
  }

  const confirmed = confirm(
    "Are you sure you want to cancel this order?"
  );

  if (!confirmed) return;

  const { data, error } = await db
    .from("orders")
    .update({
      status: "cancelled"
    })
    .eq("id", orderId)
    .eq("user_id", currentUser.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Order cancellation error:", error);
    showMessage(error.message);
    return;
  }

  if (!data) {
    showMessage(
      "This order could not be cancelled. It may no longer be pending."
    );
    await loadMyOrders();
    return;
  }

  showMessage("Order cancelled successfully.");

  await loadMyOrders();
}/* =====================================================
   19. START THE WEBSITE
===================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();

  displayCart();

  const yearElement = getElement("year");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  const searchInput =
    getElement("searchInput") ||
    getElement("searchBar") ||
    getElement("search");

  if (searchInput) {
    searchInput.addEventListener("input", searchProducts);
  }

  /*
    Check whether a customer is already logged in.
  */

  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error("Session error:", error);
  }

  currentUser = data?.session?.user || null;

  updateAccountStatus();

  if (currentUser) {
    await loadMyOrders();
  }

  /*
    Update account information when login state changes.
  */

  db.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;

    updateAccountStatus();

    if (currentUser) {
      loadMyOrders();
    }
  });
})
