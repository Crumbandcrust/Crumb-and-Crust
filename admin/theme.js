(() => {
  const STORAGE_KEY = "crumb-crust-admin-theme";
  const THEMES = ["light", "dark", "auto"];

  const getStoredTheme = () => {
    const value = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(value) ? value : "auto";
  };

  const getEffectiveTheme = theme =>
    theme === "auto"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme;

  function applyTheme(theme = getStoredTheme()) {
    const effective = getEffectiveTheme(theme);
    document.documentElement.dataset.adminTheme = effective;
    document.documentElement.dataset.adminThemePreference = theme;
    document.documentElement.style.colorScheme = effective;
  }

  function saveTheme(theme) {
    if (!THEMES.includes(theme)) return;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    updateThemeButtons();
  }

  function installStyles() {
    if (document.getElementById("admin-theme-styles")) return;

    const style = document.createElement("style");
    style.id = "admin-theme-styles";
    style.textContent = `
      /*
       * Crumb & Crust admin dark theme
       * Designed as a warm bakery palette, not a generic black overlay.
       */
      html[data-admin-theme="dark"] {
        --theme-bg: #14110f;
        --theme-bg-soft: #1a1613;
        --theme-surface: #211c18;
        --theme-surface-2: #28211c;
        --theme-surface-3: #30271f;
        --theme-border: #40362e;
        --theme-border-strong: #55483d;
        --theme-text: #f7f1ea;
        --theme-text-soft: #d0c4b9;
        --theme-muted: #a99a8d;
        --theme-accent: #d58a4d;
        --theme-accent-soft: #3a2a20;
        --theme-input: #181411;
        --theme-success-bg: #183021;
        --theme-success-text: #8bd39f;
        --theme-danger-bg: #351d1b;
        --theme-danger-text: #f0aaa3;
        --theme-info-bg: #172a3a;
        --theme-info-text: #9bc9f4;
        --theme-purple-bg: #2b2036;
        --theme-purple-text: #cdb0ed;
        --theme-shadow: 0 16px 40px rgba(0, 0, 0, .26);
      }

      html[data-admin-theme="dark"] body {
        background:
          radial-gradient(circle at 90% 0%, rgba(213, 138, 77, .08), transparent 30rem),
          var(--theme-bg) !important;
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .admin-layout,
      html[data-admin-theme="dark"] .main-content {
        background: transparent !important;
        color: var(--theme-text) !important;
      }

      /* Sidebar + navigation */
      html[data-admin-theme="dark"] .sidebar {
        background: rgba(29, 24, 21, .97) !important;
        border-right-color: var(--theme-border) !important;
        box-shadow: 8px 0 30px rgba(0, 0, 0, .18) !important;
      }

      html[data-admin-theme="dark"] .sidebar-brand h2,
      html[data-admin-theme="dark"] .topbar h1,
      html[data-admin-theme="dark"] .panel-header h2,
      html[data-admin-theme="dark"] .welcome-panel h2,
      html[data-admin-theme="dark"] .sidebar-brand p,
      html[data-admin-theme="dark"] .nav-button,
      html[data-admin-theme="dark"] .nav-label {
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .sidebar-brand p,
      html[data-admin-theme="dark"] .nav-group-label {
        color: var(--theme-muted) !important;
      }

      html[data-admin-theme="dark"] .nav-button {
        background: transparent !important;
        border-color: transparent !important;
      }

      html[data-admin-theme="dark"] .nav-button:hover {
        background: var(--theme-surface-3) !important;
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .nav-button.active {
        background: var(--theme-accent-soft) !important;
        border-color: #654532 !important;
        color: #f2c59e !important;
      }

      html[data-admin-theme="dark"] .nav-icon,
      html[data-admin-theme="dark"] .sidebar-footer > div:first-child {
        color: var(--theme-muted) !important;
      }

      html[data-admin-theme="dark"] .nav-button.active .nav-icon {
        color: var(--theme-accent) !important;
      }

      html[data-admin-theme="dark"] .sidebar-footer {
        border-top-color: var(--theme-border) !important;
      }

      /* Header + shared surfaces */
      html[data-admin-theme="dark"] .topbar {
        border-bottom-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .panel,
      html[data-admin-theme="dark"] .dashboard-card,
      html[data-admin-theme="dark"] .coupon-card,
      html[data-admin-theme="dark"] .product-card,
      html[data-admin-theme="dark"] .user-card,
      html[data-admin-theme="dark"] .order-card,
      html[data-admin-theme="dark"] .modern-order-card,
      html[data-admin-theme="dark"] .theme-setting {
        background: var(--theme-surface) !important;
        color: var(--theme-text) !important;
        border-color: var(--theme-border) !important;
        box-shadow: var(--theme-shadow) !important;
      }

      html[data-admin-theme="dark"] .welcome-panel {
        background:
          linear-gradient(135deg, #272019, #211a16) !important;
        color: var(--theme-text) !important;
        border-color: var(--theme-border) !important;
        box-shadow: var(--theme-shadow) !important;
      }

      html[data-admin-theme="dark"] .dashboard-card {
        box-shadow: 0 8px 24px rgba(0, 0, 0, .16) !important;
      }

      html[data-admin-theme="dark"] .dashboard-card .card-label,
      html[data-admin-theme="dark"] .panel-header p:not(.eyebrow),
      html[data-admin-theme="dark"] .welcome-panel p:not(.eyebrow),
      html[data-admin-theme="dark"] .dashboard-card > span,
      html[data-admin-theme="dark"] .coupon-card p,
      html[data-admin-theme="dark"] .product-card p,
      html[data-admin-theme="dark"] .activity-main small,
      html[data-admin-theme="dark"] .activity-side span,
      html[data-admin-theme="dark"] .health-list span,
      html[data-admin-theme="dark"] .settings-info span {
        color: var(--theme-muted) !important;
      }

      html[data-admin-theme="dark"] .dashboard-card strong,
      html[data-admin-theme="dark"] .coupon-card h3,
      html[data-admin-theme="dark"] .product-card h3,
      html[data-admin-theme="dark"] .product-card strong,
      html[data-admin-theme="dark"] .health-list strong,
      html[data-admin-theme="dark"] .settings-info strong,
      html[data-admin-theme="dark"] .activity-main strong,
      html[data-admin-theme="dark"] .activity-side strong {
        color: var(--theme-text) !important;
      }

      /* Forms */
      html[data-admin-theme="dark"] .admin-form label,
      html[data-admin-theme="dark"] .form-section-title {
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] input,
      html[data-admin-theme="dark"] select,
      html[data-admin-theme="dark"] textarea,
      html[data-admin-theme="dark"] .order-status-select {
        background: var(--theme-input) !important;
        color: var(--theme-text) !important;
        border-color: var(--theme-border-strong) !important;
      }

      html[data-admin-theme="dark"] input::placeholder,
      html[data-admin-theme="dark"] textarea::placeholder {
        color: #897c70 !important;
      }

      html[data-admin-theme="dark"] input:focus,
      html[data-admin-theme="dark"] select:focus,
      html[data-admin-theme="dark"] textarea:focus {
        border-color: var(--theme-accent) !important;
        box-shadow: 0 0 0 4px rgba(213, 138, 77, .14) !important;
      }

      html[data-admin-theme="dark"] .inline-form {
        background: var(--theme-surface-2) !important;
        border-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .search-wrap {
        background: var(--theme-input) !important;
        border-color: var(--theme-border-strong) !important;
        color: var(--theme-muted) !important;
      }

      /* Buttons */
      html[data-admin-theme="dark"] .secondary-button,
      html[data-admin-theme="dark"] .mobile-menu-button,
      html[data-admin-theme="dark"] .filter-tab {
        background: var(--theme-surface-2) !important;
        color: var(--theme-text-soft) !important;
        border-color: var(--theme-border-strong) !important;
      }

      html[data-admin-theme="dark"] .secondary-button:hover,
      html[data-admin-theme="dark"] .mobile-menu-button:hover,
      html[data-admin-theme="dark"] .filter-tab:hover {
        background: var(--theme-surface-3) !important;
        color: var(--theme-text) !important;
        border-color: #6a5749 !important;
      }

      html[data-admin-theme="dark"] .primary-button,
      html[data-admin-theme="dark"] .button {
        background: var(--theme-accent) !important;
        border-color: var(--theme-accent) !important;
        color: #1b120c !important;
        box-shadow: 0 6px 18px rgba(213, 138, 77, .18) !important;
      }

      html[data-admin-theme="dark"] .primary-button:hover,
      html[data-admin-theme="dark"] .button:hover {
        background: #e39a5d !important;
        border-color: #e39a5d !important;
      }

      html[data-admin-theme="dark"] .danger-button {
        background: var(--theme-danger-bg) !important;
        border-color: #6b3732 !important;
        color: var(--theme-danger-text) !important;
      }

      html[data-admin-theme="dark"] .danger-button:hover {
        background: #45221f !important;
        border-color: #82443d !important;
      }

      html[data-admin-theme="dark"] .filter-tab.active {
        background: #f0e8df !important;
        border-color: #f0e8df !important;
        color: #2a1e17 !important;
      }

      html[data-admin-theme="dark"] .filter-tab.active b {
        color: #2a1e17 !important;
      }

      /* Empty states, activity, analytics and dividers */
      html[data-admin-theme="dark"] .empty-state {
        background: rgba(33, 28, 24, .65) !important;
        border-color: var(--theme-border-strong) !important;
      }

      html[data-admin-theme="dark"] .empty-state h3,
      html[data-admin-theme="dark"] .empty-state p {
        color: var(--theme-text-soft) !important;
      }

      html[data-admin-theme="dark"] .activity-row:hover {
        background: var(--theme-surface-2) !important;
      }

      html[data-admin-theme="dark"] .activity-row,
      html[data-admin-theme="dark"] .health-list > div,
      html[data-admin-theme="dark"] .settings-info > div,
      html[data-admin-theme="dark"] hr {
        border-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .activity-icon {
        background: var(--theme-accent-soft) !important;
        color: var(--theme-accent) !important;
      }

      html[data-admin-theme="dark"] .bar-track {
        background: var(--theme-surface-3) !important;
      }

      html[data-admin-theme="dark"] .bar-track i {
        background: var(--theme-accent) !important;
      }

      /* Status badges */
      html[data-admin-theme="dark"] .status-completed,
      html[data-admin-theme="dark"] .badge.open,
      html[data-admin-theme="dark"] .order-status-new {
        background: var(--theme-success-bg) !important;
        color: var(--theme-success-text) !important;
      }

      html[data-admin-theme="dark"] .status-cancelled,
      html[data-admin-theme="dark"] .badge.closed,
      html[data-admin-theme="dark"] .order-status-cancelled {
        background: var(--theme-danger-bg) !important;
        color: var(--theme-danger-text) !important;
      }

      html[data-admin-theme="dark"] .delivery-badge {
        background: var(--theme-info-bg) !important;
        color: var(--theme-info-text) !important;
      }

      html[data-admin-theme="dark"] .pickup-badge {
        background: var(--theme-purple-bg) !important;
        color: var(--theme-purple-text) !important;
      }

      html[data-admin-theme="dark"] .order-status-preparing {
        background: #3a2d18 !important;
        color: #f0c77a !important;
      }

      html[data-admin-theme="dark"] .order-status-ready {
        background: var(--theme-info-bg) !important;
        color: var(--theme-info-text) !important;
      }

      html[data-admin-theme="dark"] .order-status-completed {
        background: #302b26 !important;
        color: #c9c0b8 !important;
      }

      /* Orders: these are hard-coded in admin-v4.js, so override them explicitly. */
      html[data-admin-theme="dark"] .modern-order-card {
        background: var(--theme-surface) !important;
        border-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .order-total-block span,
      html[data-admin-theme="dark"] .order-number,
      html[data-admin-theme="dark"] .order-section-label,
      html[data-admin-theme="dark"] .order-muted,
      html[data-admin-theme="dark"] .order-count,
      html[data-admin-theme="dark"] .status-control span {
        color: var(--theme-muted) !important;
      }

      html[data-admin-theme="dark"] .order-total-block strong,
      html[data-admin-theme="dark"] .order-time-box strong,
      html[data-admin-theme="dark"] .order-info-section strong {
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .order-time-box {
        background: var(--theme-surface-2) !important;
      }

      html[data-admin-theme="dark"] .order-time-value,
      html[data-admin-theme="dark"] .order-warning {
        color: #e0a46f !important;
      }

      html[data-admin-theme="dark"] .order-info-section a {
        color: #c8b9ac !important;
      }

      html[data-admin-theme="dark"] .delivery-address,
      html[data-admin-theme="dark"] .order-item-row {
        color: #d0c4b9 !important;
      }

      html[data-admin-theme="dark"] .order-items-section {
        border-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .order-item-quantity {
        color: var(--theme-accent) !important;
      }

      /* Settings theme picker */
      .theme-setting {
        margin-top: 24px;
        padding: 22px;
        border: 1px solid #e4ded7;
        border-radius: 16px;
        background: #fff;
      }

      .theme-setting h3 {
        margin: 0 0 6px;
        color: #302923;
        font-size: 1.05rem;
      }

      .theme-setting p {
        margin: 0 0 18px;
        color: #706861;
      }

      .theme-options {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .theme-option {
        appearance: none !important;
        -webkit-appearance: none !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 50px !important;
        width: 100% !important;
        padding: 12px 16px !important;
        border: 2px solid #d5cec7 !important;
        border-radius: 12px !important;
        background: #fff !important;
        color: #302923 !important;
        font: inherit !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        opacity: 1 !important;
        visibility: visible !important;
        transition: all 160ms ease !important;
      }

      .theme-option:hover {
        border-color: #a96b38 !important;
        background: #faf7f3 !important;
        transform: translateY(-1px);
      }

      .theme-option.selected {
        border-color: #a96b38 !important;
        background: #f4e8dc !important;
        color: #6e3e1e !important;
        box-shadow: 0 0 0 2px rgba(169, 107, 56, .14) !important;
      }

      html[data-admin-theme="dark"] .theme-setting {
        background: var(--theme-surface) !important;
        border-color: var(--theme-border) !important;
      }

      html[data-admin-theme="dark"] .theme-setting h3 {
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .theme-setting p {
        color: var(--theme-muted) !important;
      }

      html[data-admin-theme="dark"] .theme-option {
        background: var(--theme-surface-2) !important;
        color: var(--theme-text-soft) !important;
        border-color: var(--theme-border-strong) !important;
      }

      html[data-admin-theme="dark"] .theme-option:hover {
        background: var(--theme-surface-3) !important;
        border-color: var(--theme-accent) !important;
        color: var(--theme-text) !important;
      }

      html[data-admin-theme="dark"] .theme-option.selected {
        background: var(--theme-accent-soft) !important;
        color: #f3c89f !important;
        border-color: var(--theme-accent) !important;
        box-shadow: 0 0 0 2px rgba(213, 138, 77, .18) !important;
      }

      @media (max-width: 600px) {
        .theme-options {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function updateThemeButtons() {
    const current = getStoredTheme();
    document.querySelectorAll("[data-theme-option]").forEach(button => {
      const selected = button.dataset.themeOption === current;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function addThemeSetting() {
    const form = document.getElementById("settingsForm");
    if (!form || document.getElementById("themeSetting")) return;

    const setting = document.createElement("section");
    setting.id = "themeSetting";
    setting.className = "theme-setting";
    setting.innerHTML = `
      <h3>Admin appearance</h3>
      <p>Choose how the admin dashboard should look.</p>
      <div class="theme-options" role="group" aria-label="Admin appearance">
        <button type="button" class="theme-option" data-theme-option="light" aria-pressed="false">☀️ Light</button>
        <button type="button" class="theme-option" data-theme-option="dark" aria-pressed="false">🌙 Dark</button>
        <button type="button" class="theme-option" data-theme-option="auto" aria-pressed="false">🖥 Auto</button>
      </div>
    `;

    form.insertAdjacentElement("afterend", setting);

    setting.querySelectorAll("[data-theme-option]").forEach(button => {
      button.addEventListener("click", () => saveTheme(button.dataset.themeOption));
    });

    updateThemeButtons();
  }

  function initialize() {
    installStyles();
    applyTheme();
    addThemeSetting();
    updateThemeButtons();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener?.("change", () => {
      if (getStoredTheme() === "auto") applyTheme("auto");
    });

    const observer = new MutationObserver(() => {
      addThemeSetting();
      updateThemeButtons();
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})();
