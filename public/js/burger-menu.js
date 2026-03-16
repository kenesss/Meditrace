function ChangeMenu(event) {
  var clickedBox = event.currentTarget.closest(".box");
  var menu = clickedBox.querySelector(".box_bar #burger-menu");
  menu.classList.toggle("open-menu");
}
