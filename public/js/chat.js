const socket = io();

// Elements
const $sidebar = document.querySelector("#sidebar");
const $form = document.querySelector("#message-form");
const $messages = document.querySelector("#messages");
const $btnSendMessage = document.querySelector("#send-message");
const $btnSendLocation = document.querySelector("#send-location");

// Templates
const messageTemplate = document.getElementById("message-template").innerHTML;
const locationTemplate = document.getElementById("location-message-template").innerHTML;
const sidebarTemplate = document.getElementById("sidebar-template").innerHTML;

$form.addEventListener("submit", (e) => {
  e.preventDefault();
  // disable
  $btnSendMessage.setAttribute("disabled", "disabled");

  const message = e.target.elements.message.value;
  socket.emit("sendMessage", message, (error) => {
    // enable
    $btnSendMessage.removeAttribute("disabled");
    e.target.elements.message.focus();
    e.target.elements.message.value = "";

    // messageEl
    if (error) {
      return console.log(error);
    }
    console.log("The message was delivered");
  });
});

$btnSendLocation.addEventListener("click", (e) => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser!");
  }

  $btnSendLocation.setAttribute("disabled", "disabled");

  navigator.geolocation.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;

    socket.emit("sendLocation", { long: longitude, lat: latitude }, (message) => {
      $btnSendLocation.removeAttribute("disabled");
    });
  });
});

const autoScroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  // Height of the new message
  const newMessageStyle = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyle.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  // Visible height
  const visibleHeight = $messages.offsetHeight;

  // Height of messages container
  const containerHeight = $messages.scrollHeight;

  // How far have I scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("room", ({ users, room }) => {
  console.log("🚀 ~ socket.on ~ users:", users);
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  $sidebar.innerHTML = html;
});

socket.on("message", ({ text, username, createdAt }) => {
  const html = Mustache.render(messageTemplate, {
    username,
    createdAt: moment(createdAt).format("h:mm a"),
    message: text,
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

socket.on("locationMessage", ({ url, username, createdAt }) => {
  const html = Mustache.render(locationTemplate, {
    username,
    createdAt: moment(createdAt).format("h:mm a"),
    url,
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoScroll();
});

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
socket.emit("join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
