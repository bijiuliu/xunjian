(() => {
  const refresh = () => {
    document.querySelectorAll("b").forEach(label => {
      label.textContent = label.textContent.replace(/\s*·\s*运行设备\s*\d+/, "");
    });
    const selects = [...document.querySelectorAll("select")];
    for (let index = 0; index < selects.length; index += 2) {
      const [first, second] = selects.slice(index, index + 2);
      if (!first || !second) continue;
      [...first.options].forEach(option => {
        option.disabled = Boolean(option.value && option.value === second.value);
      });
      [...second.options].forEach(option => {
        option.disabled = Boolean(option.value && option.value === first.value);
      });
    }
  };

  document.addEventListener("change", event => {
    if (event.target instanceof HTMLSelectElement) refresh();
  });
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("DOMContentLoaded", refresh);
  window.addEventListener("load", refresh);
  setTimeout(refresh, 500);
  setTimeout(refresh, 1500);
})();
