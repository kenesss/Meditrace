document.addEventListener('DOMContentLoaded', () => {
    const profileTrigger = document.getElementById('profileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');

    // Проверяем, существуют ли элементы на странице, чтобы избежать ошибок
    if (profileTrigger && profileDropdown) {
        
        // Переключаем меню при клике на профиль
        profileTrigger.addEventListener('click', (event) => {
            // Останавливаем всплытие, чтобы клик не дошел до window
            event.stopPropagation();
            profileDropdown.classList.toggle('show');
        });

        // Закрываем меню, если кликнули в любое другое место экрана
        window.addEventListener('click', (event) => {
            // Проверяем, не был ли клик совершен внутри самого меню
            if (!profileDropdown.contains(event.target) && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        });
    }
});