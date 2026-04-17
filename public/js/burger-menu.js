function ChangeMenu(event) {
  var clickedBox = event.currentTarget.closest(".box");
  var menu = clickedBox.querySelector(".box_bar #burger-menu");
  menu.classList.toggle("open-menu");
}

// Закрыть dropdown при клике вне него (mobile UX)
document.addEventListener('click', function (e) {
  const trigger = document.getElementById('profileTrigger');
  const dropdown = document.getElementById('profileDropdown');
  if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.remove('show');
  }
});

document.getElementById('profileTrigger').addEventListener('click', function () {
  document.getElementById('profileDropdown').classList.toggle('show');
});