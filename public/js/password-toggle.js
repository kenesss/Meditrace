(() => {
  function isElement(node) {
    return node && typeof node === "object" && node.nodeType === Node.ELEMENT_NODE;
  }

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!isElement(target)) return;

    const icon = target.closest(".js-password-toggle");
    if (!icon) return;

    const wrapper = icon.closest(".auth-register__input, .auth-login__input, .input-wrapper");
    if (!wrapper) return;

    const input = wrapper.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;

    const nextType = input.type === "password" ? "text" : "password";
    input.type = nextType;

    // Swap icon classes (FontAwesome)
    icon.classList.toggle("fa-eye", nextType === "password");
    icon.classList.toggle("fa-eye-slash", nextType === "text");
  });
})();

