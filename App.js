import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import "react-toastify/dist/ReactToastify.css";
import "./styles.css";
import { ToastContainer, toast } from "react-toastify";
import QuillCursors from "quill-cursors";

Quill.register("modules/cursors", QuillCursors);

const socket = io("http://localhost:5000");

function App() {
  const [room, setRoom] = useState("default");
  const [users, setUsers] = useState([]);
  const [quill, setQuill] = useState();
  const [content, setContent] = useState("");

  useEffect(() => {
    socket.emit("join-room", room);
    socket.on("user-presence", u => setUsers(u));
    socket.on("load-document", doc => quill && quill.setContents(quill.clipboard.convert(doc)));
    socket.on("receive-changes", delta => quill.updateContents(delta));

    return () => socket.disconnect();
  }, [room, quill]);

  const modules = {
    toolbar: [["bold","italic","underline"], [{ list: "ordered" }, { list: "bullet" }], ["link"]],
    cursors: true,
    history: { userOnly: true },
  };

  const handleChange = (value, delta, _, editor) => {
    setContent(editor.getContents());
    socket.emit("send-changes", { room, delta, full: editor.getContents() });
  };

  return (
    <div className="editor-container">
      <h1>Collaborative Editor</h1>
      <div className="top-bar">
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room name"/>
        <button onClick={() => socket.emit("undo", room)}>Undo</button>
        <span>{users.length} user{users.length !== 1 ? "s" : ""} online</span>
      </div>
      <ReactQuill
        theme="snow"
        modules={modules}
        onChange={handleChange}
        ref={el => { if (el) setQuill(el.getEditor()); }}
      />
      <ToastContainer position="bottom-right" />
    </div>
  );
}

export default App;
