(function () {
  try {
    const saved = localStorage.getItem("stellar-micropay:theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const theme = saved || preferred;

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {
    // Ignore storage or media-query failures and fall back to the default theme.
  }
})();
