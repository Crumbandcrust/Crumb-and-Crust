(() => {
  const STORAGE_KEY = "crumb-crust-admin-theme";
  const THEMES = ["light", "dark", "auto"];

  function getStoredTheme() {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(value) ? value : "auto";
  }

  function getEffectiveTheme(theme) {
    if (theme === "auto") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  }

  function applyTheme(theme = getStoredTheme()) {
    const effective = getEffectiveTheme(theme);
    document.documentElement.dataset.adminTheme = effective;
    document.documentElement.style.colorScheme = effective;
    document.documentElement.dataset.adminThemePreference = theme;
  }

  function saveTheme(theme) {
    if (!THEMES.includes(theme)) return;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function installStyles() {
    if (document.getElementById("admin-theme-styles")) return;

    const style = document.createElement("style");
    style.id = "admin-theme-styles";
    style.textContent = `
      html[data-admin-theme="dark"] body {
        background: #171411 !important;
        color: #eee7df !important;
      }

      html[data-admin-theme="dark"] .admin-layout,
      html[data-admin-theme="dark"] .main-content {
        background: #171411 !important;
      }

      html[data-admin-theme="dark"] .sidebar {
        background: #211c18 !important;
        border-color: #3b332d !important;
        color: #eee7df !important;
      }

      html[data-admin-theme="dark"] .sidebar h2,
      html[data-admin-theme="dark"] .sidebar p,
      html[data-admin-theme="dark"] .sidebar span,
      html[data-admin-theme="dark"] .nav-button {
        color: #eee7df !important;
      }

      html[data-admin-theme="dark"] .nav-button:hover,
      html[data-admin-theme="dark"] .nav-button.active {
        background: #342b25 !important;
      }

      html[data-admin-theme="dark"] .topbar {
        background: #171411 !important;
        border-color: #3b332d !important;
      }

      html[data-admin-theme="dark"] h1,
      html[data-admin-theme="dark"] h2,
      html[data-admin-theme="dark"] h3,
      html[data-admin-theme="dark"] strong,
      html[data-admin-theme="dark"] label,
      html[data-admin-theme="dark"] .customer-name {
        color: #f4eee7 !important;
      }

      html[data-admin-theme="dark"] p,
      html[data-admin-theme="dark"] .eyebrow,
      html[data-admin-theme="dark"] .card-label,
      html[data-admin-theme="dark"] .order-section-label,
      html[data-admin-theme="dark"] .order-number,
      html[data-admin-theme="dark"] .order-info-section a,
      html[data-admin-theme="dark"] .order-muted,
      html[data-admin-theme="dark"] .order-count,
      html[data-admin-theme="dark"] .status-control span {
        color: #bdb2a8 !important;
      }

      html[data-admin-theme="dark"] .panel,
      html[data-admin-theme="dark"] .dashboard-card,
      html[data-admin-theme="dark"] .modern-order-card,
      html[data-admin-theme="dark"] .coupon-card,
      html[data-admin-theme="dark"] .empty-state {
        background: #211c18 !important;
        border-color: #3b332d !important;
        color: #eee7df !important;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.22) !important;
      }

      html[data-admin-theme="dark"] input,
      html[data-admin-theme="dark"] textarea,
      html[data-admin-theme="dark"] select {
        background: #171411 !important;
        color: #eee7df !important;
        border-color: #4a4038 !important;
      }

      html[data-admin-theme="dark"] input::placeholder,
      html[data-admin-theme="dark"] textarea::placeholder {
        color: #81766d !important;
      }

      html[data-admin-theme="dark"] .order-time-box {
        background: #2a231e !important;
      }

      html[data-admin-theme="dark"] .order-items-section {
        border-color: #3b332d !important;
      }

      html[data-admin-theme="dark"] .order-item-row,
      html[data-admin-theme="dark"] .delivery-address {
        color: #d3c8bf !important;
      }

      html[data-admin-theme="dark"] .order-status-select {
        background: #171411 !important;
        color: #eee7df !important;
        border-color: #4a4038 !important;
      }

      html[data-admin-theme="dark"] .secondary-button {
        background: #2a231e !important;
        color: #eee7df !important;
        border-color: #4a4038 !important;
      }

      html[data-admin-theme="dark"] .theme-setting {
        background: #211c18 !important;
        border-color: #3b332d !important;
      }

      html[data-admin-theme="dark"] .theme-option {
        background: #171411 !important;
        color: #eee7df !important;
        border-color: #4a4038 !important;
      }

      html[data-admin-theme="dark"] .theme-option.selected {
        background: #342b25 !important;
        border-color: #b87333 !important;
      }

      .theme-setting {
        margin-top: 24px;
        padding: 20px;
        border: 1px solid #e9e5df;
        border-radius: 14px;
        background: #fff;
      }

      .theme-setting h3 {
        margin: 0 0 6px;
      }

      .theme-setting p {
        margin: 0 0 16px;
        color: #777;
      }

      .theme-options {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .theme-option {
        appearance: none;
        border: 1px solid #d8d2cc;
        border-radius: 10px;
        background: #fff;
        color: #302923;
        padding: 12px 10px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .theme-option:hover {
        border-color: #a96b38;
      }

      .theme-option.selected {
        border-color: #a96b38;
        box-shadow: 0 0 0 2px rgba(169, 107, 56, 0.15);
      }

      @media (max-width: 600px) {
        .theme-options {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function addThemeSetting() {
    if (document.documentElement.dataset.adminThemePreference === "dark" ||
        document.documentElement.dataset.adminThemePreference === "light" ||
        document.documentElement.dataset.adminThemePreference === "auto") {
      // Preference is already initialized.
    }

    const form = document.getElementById("settingsForm");
    if (!form || document.getElementById("themeSetting")) return;

    const setting = document.createElement("section");
    setting.id = "themeSetting";
    setting.className = "theme-setting";
    setting.innerHTML = `
      <h3>Admin appearance</h3>
      <p>Choose how the admin dashboard should look. Auto follows your device's light or dark setting.</p>
      <div class="theme-options" role="group" aria-label="Admin appearance">
        <button type="button" class="theme-option" data-theme-option="light">☀️ Light</button>
        <button type="button" class="theme-option" data-theme-option="dark">🌙 Dark</button>
        <button type="button" class="theme-option" data-theme-option="auto">🖥 Auto</button>
      </div>
    `;

    form.insertAdjacentElement("afterend", setting);

    setting.querySelectorAll("[data-theme-option]").forEach(button => {
      button.addEventListener("click", () => {
        saveTheme(button.dataset.themeOption);
        updateThemeButtons();
      });
    });

    updateThemeButtons();
  }

  function updateThemeButtons() {
    const current = getStoredTheme();
    document.querySelectorAll("[data-theme-option]").forEach(button => {
      const selected = button.dataset.themeOption === current;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  installStyles();
  applyTheme();

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener?.("change", () => {
    if (getStoredTheme() === "auto") applyTheme("auto");
  });

  const observer = new MutationObserver(() => {
    addThemeSetting();
    updateThemeButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  addThemeSetting();
})();
