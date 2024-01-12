const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Filter = require("bad-words");
const { generateMessage, generateLocationMessage } = require("./utils/messages");
const { removeUser, addUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
const server = createServer(app);
const io = new Server(server, {
  /* options */
  path: "/api/socket_io",
  addTrailingSlash: false,
});

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "..", "public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  console.log("New Websocket connection");

  socket.on("join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.emit("message", generateMessage("Admin", "Welcome!"));

    socket.broadcast.to(user.room).emit("message", generateMessage("Admin", `${user.username} has join!`));

    io.to(user.room).emit("room", { users: getUsersInRoom(user.room), room: user.room });

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    if (!user) {
      return;
    }

    const filter = new Filter();

    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit("message", generateMessage(user.username, message));
    callback();
  });

  socket.on("sendLocation", ({ long, lat }, callback) => {
    const user = getUser(socket.id);

    if (!user) {
      return;
    }

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(user.username, `https://www.google.com/maps/@${lat},${long}`)
    );

    callback("Location shared!");
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", generateMessage("Admin", `${user.username} has left!`));
      io.to(user.room).emit("room", { users: getUsersInRoom(user.room), room: user.room });
    }
  });
});

server.listen(port, () => {
  console.log("listening on port http://localhost:" + port);
});

module.exports = server;
