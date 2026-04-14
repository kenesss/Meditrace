const form = document.querySelector('form');
if (!form) return; // выходим если формы нет на странице

form.addEventListener('submit', function(e) {
    const name = this.querySelector('input[name="full_name"]');
    const email = this.querySelector('input[name="email"]');
    const password = this.querySelector('input[name="password"]');

    if (name && name.value.trim().length < 2) {
        e.preventDefault();
        alert('Имя минимум 2 символа');
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
        e.preventDefault();
        alert('Введите корректный email');
        return;
    }
    if (password && password.value.length < 6) {
        e.preventDefault();
        alert('Пароль минимум 6 символов');
        return;
    }

    const rePassword = document.getElementById('re_password');
    if (rePassword) rePassword.value = password.value;
});