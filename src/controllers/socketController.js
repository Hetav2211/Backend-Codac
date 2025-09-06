import axios from "axios";

const editor = (io) => {
  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User Connected", socket.id);

    let currentRoom = null;
    let currentUser = null;

    // Helper function to validate room/user
    const validateRoomUser = () => {
      if (!currentRoom || !currentUser || !rooms.has(currentRoom)) {
        socket.emit("error", "Invalid room or user");
        return false;
      }
      return true;
    };

    // Join a room
    socket.on("join", ({ roomId, userName }) => {
      if (!roomId || !userName) {
        socket.emit("error", "Room ID and username are required");
        return;
      }

      // Leave previous room if any
      if (currentRoom) {
        socket.leave(currentRoom);
        const prevRoom = rooms.get(currentRoom);
        if (prevRoom) {
          prevRoom.users.delete(currentUser);
          io.to(currentRoom).emit("userJoined", Array.from(prevRoom.users));
        }
      }

      // Initialize new room if needed
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Set(),
          code: "// start code here",
          typingLock: null,
          typingTimeout: null,
          output: "",
        });
      }

      // Join new room
      currentRoom = roomId;
      currentUser = userName;
      socket.join(roomId);

      const room = rooms.get(roomId);
      room.users.add(userName);

      // Send current state to new user
      socket.emit("initState", {
        code: room.code,
        users: Array.from(room.users),
        lockedBy: room.typingLock,
        output: room.output,
      });

      // Notify others
      io.to(roomId).emit("userJoined", Array.from(room.users));
      io.to(roomId).emit("toastMessage", {
        type: "success",
        message: `${userName} joined the room!`,
      });
    });

    // Handle typing lock requests
    socket.on("lockTyping", ({ isLocked }) => {
      if (!validateRoomUser()) return;

      const room = rooms.get(currentRoom);

      if (isLocked) {
        // If lock is already taken by someone else
        if (room.typingLock && room.typingLock !== currentUser) {
          socket.emit("toastMessage", {
            type: "warning",
            message: `${room.typingLock} already has typing control`,
          });
          return;
        }

        // Acquire lock
        room.typingLock = currentUser;
        setupLockTimeout();
      } else {
        // Release lock if this user has it
        if (room.typingLock === currentUser) {
          clearLockTimeout();
          room.typingLock = null;
        }
      }

      io.to(currentRoom).emit("typingLocked", {
        user: room.typingLock,
        isLocked: !!room.typingLock,
      });
    });

    // Helper function to setup lock timeout
    const setupLockTimeout = () => {
      const room = rooms.get(currentRoom);
      clearLockTimeout();

      room.typingTimeout = setTimeout(() => {
        if (room.typingLock === currentUser) {
          room.typingLock = null;
          io.to(currentRoom).emit("typingLocked", {
            user: null,
            isLocked: false,
          });
          io.to(currentRoom).emit("toastMessage", {
            type: "info",
            message: "Typing lock released due to inactivity",
          });
        }
      }, 10000);
    };

    // Helper function to clear lock timeout
    const clearLockTimeout = () => {
      const room = rooms.get(currentRoom);
      if (room.typingTimeout) {
        clearTimeout(room.typingTimeout);
        room.typingTimeout = null;
      }
    };

    // Code changes
    socket.on("codeChange", ({ code }) => {
      if (!validateRoomUser()) return;

      const room = rooms.get(currentRoom);

      // Initialize warnedUsers map if not present
      if (!room.warnedUsers) room.warnedUsers = new Map();

      // Check typing lock
      if (room.typingLock && room.typingLock !== currentUser) {
        // Send warning only once
        if (!room.warnedUsers.get(currentUser)) {
          socket.emit("toastMessage", {
            type: "warning",
            message: `You can't edit while ${room.typingLock} is typing`,
          });
          room.warnedUsers.set(currentUser, true);
        }
        return;
      }

      // If no lock exists, acquire it
      if (!room.typingLock) {
        room.typingLock = currentUser;
        room.warnedUsers = new Map(); // Clear previous warnings
        io.to(currentRoom).emit("typingLocked", {
          user: currentUser,
          isLocked: true,
        });
      }

      // Update code and reset timeout
      room.code = code;
      setupLockTimeout();
      socket.to(currentRoom).emit("codeUpdate", code);
    });

    // Leave a room
    socket.on("leaveRoom", () => {
      if (!validateRoomUser()) return;

      const room = rooms.get(currentRoom);

      // Release lock if held
      if (room.typingLock === currentUser) {
        clearLockTimeout();
        room.typingLock = null;
        io.to(currentRoom).emit("typingLocked", {
          user: null,
          isLocked: false,
        });
      }

      // Update users list
      room.users.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(room.users));
      io.to(currentRoom).emit("toastMessage", {
        type: "info",
        message: `${currentUser} left the room!`,
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      }

      // Reset state
      socket.leave(currentRoom);
      currentRoom = null;
      currentUser = null;
    });

    // Typing events
    socket.on("typing", () => {
      if (!validateRoomUser()) return;
      socket.to(currentRoom).emit("userTyping", currentUser);
    });

    // Language changes
    socket.on("languageChange", ({ language }) => {
      if (!validateRoomUser()) return;
      io.to(currentRoom).emit("languageUpdate", language);
      io.to(currentRoom).emit("toastMessage", {
        type: "info",
        message: `Language changed to ${language}`,
      });
    });

    // Compile code
    socket.on("compileCode", async ({ language, version, userInput }) => {
      if (!validateRoomUser()) return;

      const room = rooms.get(currentRoom);
      try {
        const response = await axios.post(
          "https://emkc.org/api/v2/piston/execute",
          {
            language,
            version,
            files: [{ content: room.code }],
            stdin: userInput,
          }
        );

        room.output = response.data.run.output;
        io.to(currentRoom).emit("codeResponse", response.data);
        io.to(currentRoom).emit("toastMessage", {
          type: "success",
          message: "Code compiled successfully!",
        });
      } catch (error) {
        console.error("Compilation error:", error);
        io.to(currentRoom).emit(
          "codeError",
          error.response?.data?.message || "Compilation failed"
        );
        io.to(currentRoom).emit("toastMessage", {
          type: "error",
          message: "Compilation failed!",
        });
      }
    });

    // --- Real-time Chat Events ---
    socket.on("chatMessage", ({ roomId, message, userName }) => {
      if (!roomId || !userName || !message) return;
      const time = new Date().toLocaleTimeString();
      io.to(roomId).emit("chatMessage", { userName, message, time });
    });
    socket.on("clearChat", ({ roomId }) => {
      io.to(roomId).emit("clearChat");
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      if (!validateRoomUser()) return;

      const room = rooms.get(currentRoom);

      // Release lock if held
      if (room.typingLock === currentUser) {
        clearLockTimeout();
        room.typingLock = null;
        io.to(currentRoom).emit("typingLocked", {
          user: null,
          isLocked: false,
        });
      }

      // Update users list
      room.users.delete(currentUser);
      io.to(currentRoom).emit("userJoined", Array.from(room.users));
      io.to(currentRoom).emit("toastMessage", {
        type: "warning",
        message: `${currentUser} disconnected!`,
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      }

      console.log("User Disconnected:", currentUser);
    });
  });
};

export default editor;
