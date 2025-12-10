import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

const uploadDir = path.join(__dirname, "uploads");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  }
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function createUser(username) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, online) VALUES (?, 1)",
      [username],
      function (err) {
        if (err) reject(err);
        else {
          resolve({
            id: this.lastID,
            username,
            online: 1
          });
        }
      }
    );
  });
}

function setUserOnline(id, online) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE users SET online = ? WHERE id = ?",
      [online ? 1 : 0, id],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function updateUsername(id, username) {
  return new Promise((resolve, reject) => {
    const trimmed = (username || "").trim();
    if (!trimmed) {
      reject(new Error("username obligatoire"));
      return;
    }

    db.run(
      "UPDATE users SET username = ? WHERE id = ?",
      [trimmed, id],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get("SELECT id, username, online FROM users WHERE id = ?", [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function getUsers() {
  return new Promise((resolve, reject) => {
    db.all("SELECT id, username, online FROM users ORDER BY username", [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getMessagesBetween(user1, user2) {
  return new Promise((resolve, reject) => {
    db.all(
      `
      SELECT * FROM messages
      WHERE (senderId = ? AND receiverId = ?)
      OR (senderId = ? AND receiverId = ?)
      ORDER BY datetime(createdAt) ASC
    `,
      [user1, user2, user2, user1],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function insertMessage(senderId, receiverId, type, content) {
  return new Promise((resolve, reject) => {
    const createdAt = new Date().toISOString();
    db.run(
      `
      INSERT INTO messages (senderId, receiverId, type, content, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `,
      [senderId, receiverId, type, content, createdAt],
      function (err) {
        if (err) reject(err);
        else {
          resolve({
            id: this.lastID,
            senderId,
            receiverId,
            type,
            content,
            createdAt
          });
        }
      }
    );
  });
}

app.post("/api/login", async (req, res) => {
  const username = (req.body.username || "").trim();
  if (!username) {
    return res.status(400).json({ error: "username obligatoire" });
  }

  try {
    let user = await getUserByUsername(username);
    if (!user) {
      user = await createUser(username);
    } else {
      await setUserOnline(user.id, 1);
      user.online = 1;
    }
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "login impossible" });
  }
});

app.post("/api/logout", async (req, res) => {
  const id = req.body.userId;
  if (!id) {
    return res.status(400).json({ error: "userId manquant" });
  }
  try {
    await setUserOnline(id, 0);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "logout impossible" });
  }
});

app.post("/api/username", async (req, res) => {
  const id = req.body.userId;
  const username = (req.body.username || "").trim();

  if (!id || !username) {
    return res.status(400).json({ error: "userId et username obligatoires" });
  }

  try {
    await updateUsername(id, username);
    const updated = await getUserById(id);
    res.json(updated);
  } catch (e) {
    if (e && e.code === "SQLITE_CONSTRAINT") {
      return res.status(400).json({ error: "username déjà utilisé" });
    }
    res.status(500).json({ error: "erreur mise à jour username" });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: "erreur users" });
  }
});

app.get("/api/messages", async (req, res) => {
  const user1 = parseInt(req.query.user1, 10);
  const user2 = parseInt(req.query.user2, 10);

  if (!user1 || !user2) {
    return res.status(400).json({ error: "user1 et user2 obligatoires" });
  }

  try {
    const rows = await getMessagesBetween(user1, user2);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: "erreur messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  const senderId = req.body.senderId;
  const receiverId = req.body.receiverId;
  const content = (req.body.content || "").toString();
  const type = req.body.type || "text";

  if (!senderId || !receiverId || !content) {
    return res.status(400).json({ error: "champs manquants" });
  }

  try {
    const msg = await insertMessage(senderId, receiverId, type, content);
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: "erreur envoi message" });
  }
});

app.post("/api/upload/image", upload.single("file"), async (req, res) => {
  const senderId = req.body.senderId;
  const receiverId = req.body.receiverId;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId et receiverId obligatoires" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "fichier manquant" });
  }

  const url = "/uploads/" + req.file.filename;

  try {
    const msg = await insertMessage(senderId, receiverId, "image", url);
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: "erreur upload image" });
  }
});

app.post("/api/upload/audio", upload.single("file"), async (req, res) => {
  const senderId = req.body.senderId;
  const receiverId = req.body.receiverId;

  if (!senderId || !receiverId) {
    return res.status(400).json({ error: "senderId et receiverId obligatoires" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "fichier manquant" });
  }

  const url = "/uploads/" + req.file.filename;

  try {
    const msg = await insertMessage(senderId, receiverId, "audio", url);
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: "erreur upload audio" });
  }
});

app.post("/api/location", async (req, res) => {
  const senderId = req.body.senderId;
  const receiverId = req.body.receiverId;
  const lat = req.body.lat;
  const lng = req.body.lng;

  if (!senderId || !receiverId || typeof lat === "undefined" || typeof lng === "undefined") {
    return res.status(400).json({ error: "données localisation manquantes" });
  }

  const content = JSON.stringify({ lat, lng });

  try {
    const msg = await insertMessage(senderId, receiverId, "location", content);
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: "erreur localisation" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "route inconnue" });
});

app.use((err, req, res, next) => {
  res.status(500).json({ error: "erreur serveur" });
});

app.listen(port, () => {
  console.log("server on " + port);
});
