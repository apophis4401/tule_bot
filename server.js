// обозначение используемого ГОВНА
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const app = express();
const port = 4000;

// дорогой БРАТ корс чтобы все работало
app.use(cors());

// для отправки/принятия rest api
app.use(express.json());

// создание файла для хранения базы данных
const db = new sqlite3.Database("database.db");

// создание базы данных для админов и для хранения сообщений
db.serialize(() => {
  db.run(
    "CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, adminId TEXT)"
  );
  db.run(
    "CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY, sender TEXT, message TEXT)"
  );
});

// добавка админа в базу
app.post("/admin", (req, res) => {
  const { adminId } = req.body;
  db.run("INSERT INTO admins (adminId) VALUES (?)", [adminId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Ошибка при добавлении админа.");
    } else {
      res.send("Админ добавлен успешно.");
    }
  });
});

// удаление админа из базы
app.post("/admin/delete", (req, res) => {
  const { adminId } = req.body;
  db.run("DELETE FROM admins WHERE adminId = ?", [adminId], function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send("Ошибка при удалении админа.");
    } else {
      res.send("Админ успешно удален.");
    }
  });
});

// хендл проверка на ПИДОРА ЛУЛЗ (админа)
app.post("/checkadmin", (req, res) => {
  const { id } = req.body;
  db.get("SELECT * FROM admins WHERE adminId = ?", [String(id)], (err, row) => {
    if (err || !row) {
      res.send(false);
    } else {
      res.send(true);
    }
  });
});

// сохранения сообщ в базу
app.post("/message", (req, res) => {
  const { sender, message } = req.body;
  db.run(
    "INSERT INTO messages (sender, message) VALUES (?, ?)",
    [sender, message],
    function (err) {
      if (err) {
        console.error(err.message);
        res.status(500).send("Ошибка при сохранении сообщений.");
      } else {
        res.send("Сообщение сохранено.");
      }
    }
  );
});

// отправка сообщ => боту => админу
app.get("/messages", (req, res) => {
  db.all("SELECT * FROM messages", (err, rows) => {
    if (err) {
      console.error(err.message);
      res.status(500).send("Возникла ошибка при получении сообщений.");
    } else {
      res.json(rows);
      // db.run("DELETE FROM messages", function (err) {
      //   if (err) {
      //     console.error(err.message);
      //   } else {
      //     console.log("База данных очищена после отсылки сообщений.");
      //   }
      // });
    }
  });
});

// запуск хуйни на выбранном в начале порте (4000 по умолчанию (по моему умолчанию))
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});
