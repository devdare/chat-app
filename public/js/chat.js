const socket = io();

//Elements
const $messageForm = document.querySelector(".msg-form");
const $messageFormInput = $messageForm.querySelector("input");
const $messageFormButton = $messageForm.querySelector("button");
const $sendLocation = document.querySelector("#send-location");
const $messages = document.querySelector("#messages");
const locationMessages = document.querySelector("#location");

//Templates
const messageTemplate = document.querySelector("#message-template").innerHTML;
const locationTemplate = document.querySelector("#location-template").innerHTML;
const sidebarTemplate = document.querySelector("#sidebar-template").innerHTML;

//Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true
});

const autoscroll = () => {
  const $newMessage = $messages.lastElementChild;

  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  const visibleHeight = $messages.offsetHeight;

  const contentHeight = $messages.scrollHeight;

  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (contentHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", message => {
  console.log(message);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    message: message.text,
    createdAt: moment(message.createdAt).format("h:mm a")
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("locationMessage", location => {
  console.log(location);
  const html = Mustache.render(locationTemplate, {
    username: location.username,
    location: location.location,
    createdAt: moment(location.createdAt).format("h:mm a")
  });
  $messages.insertAdjacentHTML("beforeend", html);
  autoscroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users
  });
  document.querySelector("#sidebar").innerHTML = html;
});
$messageForm.addEventListener("submit", e => {
  e.preventDefault();

  $messageFormButton.setAttribute("disabled", "disabled");
  const message = e.target.elements.message.value;
  socket.emit("sendmessage", message, error => {
    $messageFormButton.removeAttribute("disabled");
    $messageFormInput.value = "";
    $messageFormInput.focus();
    if (error) {
      return console.log(error);
    }
    console.log("The message was delivered");
  });
});

$sendLocation.addEventListener("click", e => {
  e.preventDefault();

  if (!navigator.geolocation) {
    return alert("Geolocation not supported by your browser");
  }
  $sendLocation.setAttribute("disabled", "disabled");
  navigator.geolocation.getCurrentPosition(position => {
    lat = position.coords.latitude;
    lon = position.coords.longitude;
    socket.emit("sendLocation", { lat, lon }, error => {
      $sendLocation.removeAttribute("disabled");
      if (error) {
        return console.log("Unable to share location");
      }
      console.log("Location shared");
    });
  });
});

socket.emit("join", { username, room }, error => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
