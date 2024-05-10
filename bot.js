const { Telegraf, Markup, Scenes, session } = require("telegraf");
const axios = require("axios");
const { message } = require("telegraf/filters");

// обозначение токена/иниц телеграфа
const bot = new Telegraf("6731214516:AAGzeIU4hiJlzgleuVdebR64XGfYlFcNBxY");

const keyboard = Markup.keyboard([
  ["🔍 Помощь", "📝 Шаблон"],
  ["📓 Просмотр присланных сообщений", "🖋 Предложить"],
]).resize();

const keyboardDecline = Markup.keyboard([["🚫 Отмена"]]).resize();

// регистрация сессия с хуесосом
bot.use(session());

// айди сцен
const ADD_ADMIN_SCENE = "add_admin_scene";
const DELETE_ADMIN_SCENE = "delete_admin_scene";
const SUGGEST_SCENE = "suggest_scene";

// сцена для + админа
const addAdminScene = new Scenes.WizardScene(
  ADD_ADMIN_SCENE,
  (ctx) => {
    ctx.reply("Пришлите id админа (системное id, а не @)", keyboardDecline);
    return ctx.wizard.next();
  },
  async (ctx) => {
    let messageText = ctx.message.text;
    if (messageText === "🚫 Отмена") {
      ctx.reply("Отменено.", keyboard);
      return ctx.scene.leave();
    }
    const adminId = ctx.message.text;
    try {
      await axios.post("http://localhost:4000/admin", {
        adminId: adminId,
      });
      ctx.reply(`Админ ${adminId} добавлен.`, keyboard);
    } catch (error) {
      ctx.reply("Ошибка при отправке.", keyboard);
      console.error(error);
    }
    return ctx.scene.leave();
  }
);

// сцена для - админа
const deleteAdminScene = new Scenes.WizardScene(
  DELETE_ADMIN_SCENE,
  (ctx) => {
    ctx.reply("Введите ID админа для удаления:", keyboardDecline);
    return ctx.wizard.next();
  },
  async (ctx) => {
    let messageText = ctx.message.text;
    if (messageText === "🚫 Отмена") {
      ctx.reply("Отменено.", keyboard);
      return ctx.scene.leave();
    }
    const adminId = ctx.message.text;
    try {
      await axios.post("http://localhost:4000/admin/delete", { adminId });
      ctx.reply(`Админ с ID ${adminId} успешно удален.`, keyboard);
    } catch (error) {
      ctx.reply("Ошибка при удалении админа.", keyboard);
      console.error(error);
    }
    return ctx.scene.leave();
  }
);

const suggestScene = new Scenes.WizardScene(
  SUGGEST_SCENE,
  (ctx) => {
    ctx.reply("Пришлите ваш текст:", keyboardDecline);
    return ctx.wizard.next();
  },
  async (ctx) => {
    let messageText = ctx.message.text;
    let userId = ctx.message.chat.username;
    if (messageText === "🚫 Отмена") {
      ctx.reply("Отменено.", keyboard);
      return ctx.scene.leave();
    }
    ctx.session.suggestion = { text: messageText, userId: userId };
    ctx.reply(
      `Ваш текст:\n${messageText}`,
      Markup.keyboard([["Отправить", "Изменить", "🚫 Отмена"]]).resize()
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    const { suggestion } = ctx.session;
    if (ctx.message.text === "🚫 Отмена") {
      ctx.scene.leave();
      ctx.reply("Отменено", keyboard);
      delete ctx.session.suggestion;
    }
    if (ctx.message.text === "Отправить") {
      try {
        await axios.post("http://localhost:4000/message", {
          sender: suggestion.userId,
          message: suggestion.text,
        });
        ctx.reply("Отправлено.", keyboard);
      } catch (error) {
        ctx.reply("Ошибка при отправке текста.", keyboard);
        console.error(error);
      }
    } else if (ctx.message.text === "Изменить") {
      ctx.reply("Пришлите измененный текст:", keyboardDecline);
      return ctx.wizard.selectStep(1);
    }
    delete ctx.session.suggestion;
    return ctx.scene.leave();
  }
);

// регистрация сцен
const stage = new Scenes.Stage([addAdminScene, suggestScene, deleteAdminScene]);
bot.use(stage.middleware());

// хендл комманд
bot.command("addadmin", async (ctx) => {
  const userId = ctx.message.from.id;
  // проверка на пидора (админа)
  const isAdminResponse = await axios.post("http://localhost:4000/checkadmin", {
    id: userId,
  });
  if (isAdminResponse.data) {
    ctx.scene.enter(ADD_ADMIN_SCENE);
  } else {
    ctx.reply("Вы не имеете доступа к этой функции.", keyboard);
  }
});
bot.command("suggest", (ctx) => ctx.scene.enter(SUGGEST_SCENE));
bot.command("deleteadmin", async (ctx) => {
  const userId = ctx.message.from.id;
  // проверка на пидора (админа)
  const isAdminResponse = await axios.post("http://localhost:4000/checkadmin", {
    id: userId,
  });
  if (isAdminResponse.data) {
    ctx.scene.enter(DELETE_ADMIN_SCENE);
  } else {
    ctx.reply("Вы не имеете доступа к этой функции.", keyboard);
  }
});

// старт бота
bot.start((ctx) => {
  ctx.reply("стартовое сообщ", keyboard);
});

bot.hears("🖋 Предложить", (ctx) => ctx.scene.enter(SUGGEST_SCENE));
bot.command("help", (ctx) => ctx.reply("бла бла бла тут всякая хуйня"));
bot.hears("🔍 Помощь", (ctx) =>
  ctx.reply("бла бла бла тут всякая хуйня сюда тоже можно ссылку телеграф")
);
bot.command("template", (ctx) =>
  ctx.reply(
    "бла бла бла тут всякая хуйня про шаблон (ссылка телеграф для удобного копирования"
  )
);
bot.hears("📝 Шаблон", (ctx) =>
  ctx.reply(
    "бла бла бла тут всякая хуйня про шаблон (ссылка телеграф для удобного копирования)"
  )
);
bot.hears("📓 Просмотр присланных сообщений", async (ctx) => {
  const userId = ctx.message.from.id;

  try {
    // проверка на пидора (админа)
    const isAdminResponse = await axios.post(
      "http://localhost:4000/checkadmin",
      { id: userId }
    );
    if (isAdminResponse.data) {
      // дергает айди с базы данных
      try {
        const response = await axios.get("http://localhost:4000/messages");
        const messages = response.data;

        // алгоритм сброса сообщ админам

        // склейка говна в одно сообщ
        if (messages.length > 0) {
          let messageText = "Прислано:\n";
          messages.forEach((msg, index) => {
            messageText += `<b>${index + 1}. @${msg.sender}:</b>\n<code>${
              msg.message
            }</code>\n\n`;
          });

          // финал отправка
          ctx.replyWithHTML(messageText);
        } else {
          ctx.reply("Ничего нового не найдено.");
        }
      } catch (error) {
        ctx.reply("Ошибка при получении сообщений после проверки.");
        console.error(error);
      }

      ctx.reply(messageText);
    } else {
      ctx.reply("Вы не имеете доступа к этой функции.");
    }
  } catch (error) {
    console.error(error);
  }
});

bot.command("viewmessages", async (ctx) => {
  const userId = ctx.message.from.id;

  try {
    // проверка на пидора (админа)
    const isAdminResponse = await axios.post(
      "http://localhost:4000/checkadmin",
      { id: userId }
    );
    if (isAdminResponse.data) {
      // дергает айди с базы данных
      try {
        const response = await axios.get("http://localhost:4000/messages");
        const messages = response.data;

        // алгоритм сброса сообщ админам

        // склейка говна в одно сообщ
        if (messages.length > 0) {
          let messageText = "Прислано:\n";
          messages.forEach((msg, index) => {
            messageText += `<b>${index + 1}. @${msg.sender}:</b>\n<code>${
              msg.message
            }</code>\n\n`;
          });

          // финал отправка
          ctx.replyWithHTML(messageText);
        } else {
          ctx.reply("Ничего нового не найдено.", keyboard);
        }
      } catch (error) {
        ctx.reply("Ошибка при получении сообщений после проверки.", keyboard);
        console.error(error);
      }

      ctx.reply(messageText);
    } else {
      ctx.reply("Вы не имеете доступа к этой функции.", keyboard);
    }
  } catch (error) {
    console.error(error);
  }
});

// Start the bot
bot.launch();

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
