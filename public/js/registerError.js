document.querySelector('form').addEventListener('submit', function(e) {
    const name = this.querySelector('input[name="full_name"]');
    const email = this.querySelector('input[name="email"]');
    const password = this.querySelector('input[name="password"]');

    if (name.value.trim().length < 2) {
        e.preventDefault();
        alert('Имя минимум 2 символа');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        e.preventDefault();
        alert('Введите корректный email');
        return;
    }
    if (password.value.length < 6) {
        e.preventDefault();
        alert('Пароль минимум 6 символов');
        return;
    }

    document.getElementById('re_password').value = password.value;
});