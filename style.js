
/* =====================================================
   ROYAL FITS BOUTIQUE254
   Supabase products, customer authentication and cart
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


/* 2. LOCAL PRODUCT FALLBACK */

const localProducts = [
   
];

let products = [...localProducts];
let cart = [];
let selectedCategory = "All";
let searchTerm = "";
let isRegistering = false;


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
  }, 3000);
}

function openOverlay(id) {
  document.getElementById(id)?.classList.remove("hidden");
}

function closeOverlay(id) {
  document.getElementById(id)?.classList.add("hidden");
}


/* 4. LOAD DATABASE PRODUCTS */

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
    console.error("Could not load Supabase products:", error);
    products = [...localProducts];
    showToast("Using local products because the database could not load.");
  }

  displayProducts();
  updateCart();
}


/* 5. DISPLAY PRODUCTS */


/* 5. DISPLAY PRODUCTS — MATCHES THE PRODUCT CSS */

function displayProducts() {
  const grid = document.getElementById("productGrid");
  const count = document.getElementById("productCount");

  if (!grid) return;

  const filtered = products.filter(product => {
    const category = String(product.category || "").toLowerCase();
    const selected = String(selectedCategory || "All").toLowerCase();

    const categoryMatches =
      selected === "all" || category === selected;

    const searchMatches =
      String(product.name || "").toLowerCase().includes(searchTerm) ||
      category.includes(searchTerm);

    return categoryMatches && searchMatches;
  });

  if (count) {
    count.textContent =
      `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  }

  if (!filtered.length) {
    grid.innerHTML =
      '<p class="empty-message">No products found. Check back soon.</p>';
    return;
  }

  grid.innerHTML = filtered.map(product => {
    const price = Number(product.price || 0);
    const oldPrice = Number(product.old || 0);
    const stockKnown = product.stock !== null &&
                       product.stock !== undefined;
    const stock = stockKnown ? Number(product.stock) : null;
    const soldOut = stockKnown && stock <= 0;

    const discount =
      oldPrice > price && oldPrice > 0
        ? Math.round((oldPrice - price) / oldPrice * 100)
        : 0;

    const image = String(product.image || "").trim();

    return `
      <article class="product-card">

        <div class="product-image-wrap"
             style="background:${escapeHTML(product.color || "#eeeeee")}">

          ${
            image
              ? `<img
                   src="${escapeHTML(image)}"
                   alt="${escapeHTML(product.name)}"
                   class="product-image"
                   loading="lazy"
                   onclick="showImage(this.src, this.alt)"
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                 >`
              : ""
          }

          <div class="image-placeholder"
               style="display:${image ? "none" : "flex"}">
            Image unavailable
          </div>

          ${
            discount > 0
              ? `<span class="discount-badge">${discount}% OFF</span>`
              : ""
          }

        </div>

        <div class="product-info">

          <p class="product-category">
            ${escapeHTML(product.category || "Fashion")}
          </p>

          <h3 class="product-name">
            ${escapeHTML(product.name || "Unnamed product")}
          </h3>

          <p class="product-rating">
            ⭐ ${Number(product.rating || 4.5)} / 5
          </p>

          <div class="product-prices">
            <strong>${formatPrice(price)}</strong>
            ${
              oldPrice > price
                ? `<del>${formatPrice(oldPrice)}</del>`
                : ""
            }
          </div>

          <p class="stock-label">
            ${
              !stockKnown
                ? "Stock not synced"
                : soldOut
                  ? "Out of stock"
                  : `${stock} in stock`
            }
          </p>

          <button
            type="button"
            class="primary-btn full-width add-to-cart-btn"
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
  const product = products.find(p => Number(p.id) === Number(id));

  if (!product) {
    showToast("Product not found.");
    return;
  }

  const hasStock = product.stock !== undefined && product.stock !== null;
  const existing = cart.find(item => Number(item.id) === Number(id));

  if (hasStock && (existing?.quantity || 0) >= Number(product.stock)) {
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
  cart = cart.filter(item => Number(item.id) !== Number(id));
  updateCart();
}

function updateCart() {
  const count = document.getElementById("cartCount");
  const itemsElement = document.getElementById("cartItems");
  const totalElement = document.getElementById("cartTotal");

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity, 0
  );

  if (count) count.textContent = totalItems;
  if (totalElement) totalElement.textContent = formatPrice(total);
  if (!itemsElement) return;

  if (!cart.length) {
    itemsElement.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  itemsElement.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-image"
           src="${escapeHTML(item.image || "")}"
           alt="${escapeHTML(item.name)}">
      <div class="cart-item-details">
        <h4>${escapeHTML(item.name)}</h4>
        <p>${formatPrice(item.price)}</p>
        <p>Quantity: ${item.quantity}</p>
        <p>Subtotal: ${formatPrice(item.price * item.quantity)}</p>
        <button class="text-btn" onclick="removeFromCart(${Number(item.id)})">
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
    searchTerm = searchInput.value.trim().toLowerCase();
    displayProducts();
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  });
}

if (searchInput) {
  searchInput.addEventListener("input", event => {
    searchTerm = event.target.value.trim().toLowerCase();
    displayProducts();
  });
}


/* 10. NAVIGATION BUTTONS */

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


/* 11. LOGIN AND REGISTRATION FORM CONTROLS */

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
    submit.textContent = registering
      ? "CREATE ACCOUNT"
      : "LOGIN";
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
      ? "Create a strong password of at least 6 characters."
      : "Enter your registered email and password.";
  }

  if (hint) {
    hint.classList.toggle("hidden", !registering);
  }

  if (password) {
    password.autocomplete = registering
      ? "new-password"
      : "current-password";
    password.minLength = 6;
  }

  if (fullName) fullName.required = registering;
  if (phone) phone.required = registering;

  if (error) error.textContent = "";
}

/* ACCOUNT BUTTONS */

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

/* 12. SUPABASE REGISTRATION AND LOGIN */

const accountForm = document.getElementById("accountForm");

if (accountForm) {
  accountForm.addEventListener("submit", async event => {
    event.preventDefault();

    const errorElement = document.getElementById("formError");
    const statusElement = document.getElementById("accountStatus");
    const submitButton = document.getElementById("accountSubmit");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("fullName").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (errorElement) errorElement.textContent = "";
    if (statusElement) statusElement.textContent = "";

    if (!db) {
      if (errorElement) {
        errorElement.textContent =
          "Connection unavailable. Refresh the page and try again.";
      }
      return;
    }

    if (!email || !password) {
      if (errorElement) {
        errorElement.textContent =
          "Please enter your email and password.";
      }
      return;
    }

    if (isRegistering && (!fullName || !phone)) {
      if (errorElement) {
        errorElement.textContent =
          "Please enter your full name and phone number.";
      }
      return;
    }

    if (password.length < 6) {
      if (errorElement) {
        errorElement.textContent =
          "Your password must contain at least 6 characters.";
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
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        });

        if (error) throw error;

        if (data.session) {
          if (statusElement) {
            statusElement.textContent =
              "Your account has been created successfully.";
          }

          closeOverlay("accountOverlay");
          await updateAccountStatus(data.user);
          showToast("Account created successfully!");
        } else {
          if (statusElement) {
            statusElement.textContent =
              "Registration received. Check your email for the confirmation link, then log in.";
          }

          showToast("Check your email to confirm your account.");
          setAccountMode(false);
        }

      } else {
        const { data, error } = await db.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) throw error;

        closeOverlay("accountOverlay");
        await updateAccountStatus(data.user);
        showToast("Login successful!");
      }

    } catch (error) {
      console.error("Account error:", error);

      let friendlyMessage = error.message || "Something went wrong.";

      if (friendlyMessage.toLowerCase().includes("invalid login")) {
        friendlyMessage =
          "Incorrect email or password. Check your details or register first.";
      } else if (friendlyMessage.toLowerCase().includes("already registered")) {
        friendlyMessage =
          "This email already has an account. Please log in instead.";
      } else if (friendlyMessage.toLowerCase().includes("password")) {
        friendlyMessage =
          "Check your password. It may be too short or not meet the required rules.";
      }

      if (errorElement) {
        errorElement.textContent = friendlyMessage;
      } else {
        showToast(friendlyMessage);
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = isRegistering
          ? "CREATE ACCOUNT"
          : "LOGIN";
      }
    }
  });
}




/* 13. ACCOUNT STATUS AND LOGOUT */

async function updateAccountStatus(user) {
  const status = document.getElementById("accountStatus");
  const logoutButton = document.getElementById("logoutBtn");

  if (status) {
    status.textContent = user
      ? `Logged in as ${user.email}`
      : "You are not logged in.";
  }

  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !user);
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  if (!db) return;

  const { error } = await db.auth.signOut();

  if (error) {
    console.error("Logout error:", error);
    showToast("Could not log out. Please try again.");
    return;
  }

  await updateAccountStatus(null);
  closeOverlay("accountOverlay");
  showToast("You have logged out.");
});

document.getElementById("resetPasswordBtn")?.addEventListener(
  "click",
  async () => {
    if (!db) return;

    const email = document.getElementById("email")?.value.trim();
    const errorElement = document.getElementById("formError");

    if (!email) {
      if (errorElement) {
        errorElement.textContent =
          "Enter your email address before requesting a password reset.";
      }
      return;
    }

    const redirectTo =
      window.location.origin + window.location.pathname;

    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo
    });

    if (error) {
      if (errorElement) errorElement.textContent = error.message;
    } else {
      showToast("If the email is registered, a password reset email will be sent.");
    }
  }
);


/* 14. CHECKOUT — CREATE ORDER AND REQUEST M-PESA */

let checkoutBusy = false;

document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
  if (checkoutBusy) return;

  const button = document.getElementById("checkoutBtn");
  const phoneInput = document.getElementById("mpesa-phone");
  const message = document.getElementById("mpesa-message");

  const setMessage = text => {
    if (message) message.textContent = text;
  };

  if (!db) {
    showToast("Database connection is unavailable.");
    return;
  }

  if (!cart.length) {
    showToast("Your cart is empty.");
    return;
  }

  const phone = phoneInput?.value.trim() || "";
  const normalizedPhone = phone.replace(/[\s-]/g, "");

 
if (!/^(?:(?:\+?254|0)(?:7|1)\d{8})$/.test(normalizedPhone)) {
  setMessage("Enter a valid Kenyan M-Pesa number, e.g. 0712345678 or 0112345678.");
  phoneInput?.focus();
  return;
}
     

  const amount = Number(
    cart.reduce(
      (sum, item) => sum + Number(item.price || 0) * item.quantity,
      0
    ).toFixed(2)
  );

  if (amount <= 0) {
    setMessage("Your order total must be greater than zero.");
    return;
  }

  checkoutBusy = true;

  if (button) {
    button.disabled = true;
    button.textContent = "PROCESSING...";
  }

  setMessage("Creating your order. Please wait.");

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
      setMessage("Please log in before placing your order.");
      return;
    }

    /*
      The order total is calculated from the cart here.
      The Edge Function must independently verify the order
      and amount before initiating the M-Pesa request.
    */

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

  
const orderItems = cart.map(item => {
  const productId = item.id ?? item.product_id;
  const price = Number(item.price);
  const quantity = Number(item.quantity);

  if (
    productId == null ||
    !Number.isSafeInteger(Number(productId)) ||
    Number(productId) <= 0
  ) {
    throw new Error(
      `Missing or invalid product ID for ${item.name || "cart item"}.`
    );
  }

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(
      `Invalid price for ${item.name || "cart item"}.`
    );
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error(
      `Invalid quantity for ${item.name || "cart item"}.`
    );
  }

  return {
    order_id: orderId,
    product_id: Number(productId),
    product_name: item.name,
    quantity: quantity,
    price: price,
    unit_price: price,
    image_url: item.image || null
  };
});

console.log("Order items to save:", orderItems);

const { data: savedItems, error: itemsError } = await db
  .from("order_items")
  .insert(orderItems)
  .select();

if (itemsError) {
  console.error("Failed to save order items:", itemsError);
  throw itemsError;
}

console.log("Order items saved successfully:", savedItems);

   
    /*
      Send the actual M-PESA request through Supabase.
      The Edge Function must be deployed first.
    */

    setMessage("Sending M-PESA payment request. Please wait...");

    const { data: paymentData, error: paymentError } =
      await db.functions.invoke("mpesa-stk-push", {
        body: {
          phone: normalizedPhone,
          amount: amount
        }
      });

    console.log("M-PESA function response:", paymentData);
    console.log("M-PESA function error:", paymentError);

    if (paymentError) {
      throw new Error(
        paymentError.message ||
        "Could not contact the M-PESA payment service."
      );
    }

    if (!paymentData || paymentData.error) {
      throw new Error(
        paymentData?.error ||
        paymentData?.message ||
        "The M-PESA request was not accepted."
      );
    }

    // Only clear the cart after the function responds successfully.
    // This does not mean the customer has paid yet.
    cart = [];
    updateCart();

    setMessage(
      paymentData.message ||
      "M-PESA request submitted. Check your phone if a prompt is issued. Your order remains pending until payment is confirmed."
    );

    showToast("M-PESA request submitted. Await payment confirmation.");

    /*
      Do not automatically delete an order here:
      the payment request may have reached the provider even
      if the browser did not receive the response.
    */

  } finally {
    checkoutBusy = false;

    if (button) {
      button.disabled = false;
      button.textContent = "PLACE ORDER & PAY WITH M-PESA";
    }
  }
});

/* 15. FOOTER YEAR */

const yearElement = document.getElementById("year");

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}


/* 16. START WEBSITE */

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
}

