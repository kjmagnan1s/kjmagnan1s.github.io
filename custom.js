// custom.js
function toggleMenu() {
  var menu = document.getElementById("nav-menu");
  if (menu.style.display === "flex") {
    menu.style.display = "none";
  } else {
    menu.style.display = "flex";
  }
}
