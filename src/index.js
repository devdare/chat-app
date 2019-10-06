const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, getLocationMessage } = require("./utils/messages");
const {
  addUser,
  getUser,
  getUsersInRoom,
  removeUser
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "../public");

app.use(express.static(publicDirectory));

let msg = "Welcome to the chat app";
io.on("connection", socket => {
  console.log("New websocket connection");

  socket.on("join", ({ username, room }, cb) => {
    const { error, user } = addUser({ id: socket.id, username, room });
    if (error) {
      return cb(error);
    }
    socket.join(user.room);
    socket.emit("message", generateMessage("Admin", msg));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined the room`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    cb();
  });

  socket.on("sendmessage", (message, cb) => {
    const filter = new Filter();
    const user = getUser(socket.id);

    if (filter.isProfane(message)) {
      return cb("Profanity is not allowed");
    }
    io.to(user.room).emit("message", generateMessage(user.username, message));
    cb();
  });
  socket.on("sendLocation", (location, cb) => {
    const user = getUser(socket.id);
    if (!location) cb("error occured");
    io.to(user.room).emit(
      "locationMessage",
      getLocationMessage(
        user.username,
        `https://google.com/maps?q=${location.lat},${location.lon}`
      )
    );
    cb();
  });
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
