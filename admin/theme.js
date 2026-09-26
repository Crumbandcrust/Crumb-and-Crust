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
      html[data-admin-theme="dark"] body,
      html[data-admin-theme="dark"] .admin-layout,
      html[data-admin-theme="dark"] .main-content {
        background: #151210 !important;
        color: #f2ede7 !important;
      }

      html[data-admin-theme="dark"] .sidebar,
      html[data-admin-theme="dark"] .topbar,
      html[data-admin-theme="dark"] .panel,
      html[data-admin-theme="dark"] .dashboard-card,
      html[data-admin-theme="dark"] .modern-order-card,
      html[data-admin-theme="dark"] .coupon-card,
      html[data-admin-theme="dark"] .empty-state,
      html[data-admin-theme="dark"] .theme-setting {
        background: #211c18 !important;
        color: #f2ede7 !important;
        border-color: #40362f !important;
      }

      html[data-admin-theme="dark"] h1,
      html[data-admin-theme="dark"] h2,
      html[data-admin-theme="dark"] h3,
      html[data-admin-theme="dark"] strong,
      html[data-admin-theme="dark"] label,
      html[data-admin-theme="dark"] .nav-button,
      html[data-admin-theme="dark"] .sidebar span {
        color: #f2ede7 !important;
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
        color: #bfb5ac !important;
      }

      html[data-admin-theme="dark"] .nav-button:hover,
      html[data-admin-theme="dark"] .nav-button.active {
        background: #342a23 !important;
      }

      html[data-admin-theme="dark"] input,
      html[data-admin-theme="dark"] textarea,
      html[data-admin-theme="dark"] select,
      html[data-admin-theme="dark"] .order-status-select {
        background: #151210 !important;
        color: #f2ede7 !important;
        border-color: #51463d !important;
      }

      html[data-admin-theme="dark"] .order-time-box {
        background: #2b241f !important;
      }

      html[data-admin-theme="dark"] .order-items-section {
        border-color: #40362f !important;
      }

      .theme-setting {
        margin-top: 24px;
        padding: 22px;
        border: 1px solid #e4ded7;
        border-radius: 16px;
        background: #fff;
      }

      .theme-setting h3 {
        margin: 0 0 6px;
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
        min-height: 48px !important;
        width: 100% !important;
        padding: 12px 16px !important;
        border: 2px solid #d5cec7 !important;
        border-radius: 10px !important;
        background: #fff !important;
        color: #302923 !important;
        font: inherit !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .theme-option:hover {
        border-color: #a96b38 !important;
        background: #faf7f3 !important;
      }

      .theme-option.selected {
        border-color: #a96b38 !important;
        background: #f4e8dc !important;
        color: #6e3e1e !important;
        box-shadow: 0 0 0 2px rgba(169,107,56,.16) !important;
      }

      html[data-admin-theme="dark"] .theme-option {
        background: #171411 !important;
        color: #f2ede7 !important;
        border-color: #51463d !important;
      }

      html[data-admin-theme="dark"] .theme-option:hover {
        background: #2d251f !important;
        border-color: #b87333 !important;
      }

      html[data-admin-theme="dark"] .theme-option.selected {
        background: #3a2c22 !important;
        color: #f4c99d !important;
        border-color: #c47b3d !important;
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
