const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

mongoose.connect("mongodb://127.0.0.1:27017/collab-doc", {
  useNewUrlParser: true, useUnifiedTopology: true
});
const VersionSchema = new mongoose.Schema({ content: String, ts: Date });
const DocSchema = new mongoose.Schema({
  room: String,
  content: String,
  versions: [VersionSchema]
});
const Document = mongoose.model("Document", DocSchema);

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", socket => {
  let currentRoom;

  socket.on("join-room", async room => {
    socket.join(room);
    currentRoom = room;
    const [doc] = await Document.find({ room });
    if (!doc) {
      await Document.create({ room, content: "", versions: [] });
    }
    io.to(room).emit("user-presence", Array.from(await io.in(room).allSockets()));
  });

  socket.on("get-document", async room => {
    const doc = await Document.findOne({ room });
    socket.emit("load-document", doc?.content || "");
  });

  socket.on("send-changes", async ({ room, delta, full }) => {
    socket.to(room).emit("receive-changes", delta);
    await Document.findOneAndUpdate(
      { room },
      { content: full, $push: { versions: { content: full, ts: new Date() } } }
    );
  });

  socket.on("undo", async room => {
    const doc = await Document.findOne({ room });
    if (doc && doc.versions.length >= 2) {
      const last = doc.versions.pop();
      const prev = doc.versions[doc.versions.length - 1];
      await doc.save();
      io.to(room).emit("load-document", prev.content);
    }
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      io.to(currentRoom).emit("user-presence", Array.from(io.sockets.adapter.rooms.get(currentRoom)) || []);
    }
  });
});

server.listen(5000, () => console.log("Backend on port 5000"));
