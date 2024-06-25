#!/usr/bin/env node

require("dotenv").config("./.env");
const translate = require("./translate.js");
// const detectLang = require("./detectLang.js");
const { App } = require("@slack/bolt");

var fromToTable = [
  { from: "random", to: "random-auto-translate" },
];

const app = new App({
  token: process.env.BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

(async () => {
  await app.start();
  console.log("⚡️ Bolt app started");
})();

let channelStates = {};

function handleCommand(command, channel, client) {
  switch (command) {
    case 'start':
      // Start translating all messages
      channelStates[channel] = 'translate_all';
      return "Translation started for all messages in this channel.";
    case 'pause':
      // Pause translation
      channelStates[channel] = 'paused';
      return "Translation paused for this channel.";
    case 'manual':
      // Only translate messages forwarded to the bot
      channelStates[channel] = 'manual';
      return "Now only translating messages forwarded to the bot.";
    default:
      return "Unknown command. Available commands: start, pause, manual";
  }
}

app.message(async ({ message, client, say }) => {

  if (message.text.startsWith('!T42cmd ')) {
    const command = message.text.split(' ')[1];
    const response = handleCommand(command, message.channel, client);
    await say(response);
    return;
  }
  const channelState = channelStates[message.channel] || 'manual';
  if (channelState === 'paused') {
    return;
  }
  if (channelState === 'manual' && !message.text.startsWith('!T42 ')) {
    return;
  }

  console.log(`Message received`);
  var msgKeys = Object.keys(message);

  var skip = false;

  if (msgKeys.includes("previous_message")) {
    skip = true;
    console.log(`Message format not recognized, probably an edited message`);
  }
  // console.log(`Message received: ${message.text}`);

  if (!skip) {
    // get id of post channel
    try {
      // get channel list
      var chanList = await client.conversations.list({});

      // get id of channels of interest
      for (let i = 0; i < fromToTable.length; i++) {
        let fromChan = chanList.channels.find(function (chan, index) {
          if (chan.name == fromToTable[i].from) return true;
        });
        if (typeof fromChan !== "undefined") {
          fromToTable[i].fromId = fromChan.id;
        } else {
          fromToTable[i].fromId = "";
        }

        let toChan = chanList.channels.find(function (chan, index) {
          if (chan.name == fromToTable[i].to) return true;
        });
        if (typeof toChan !== "undefined") {
          fromToTable[i].toId = toChan.id;
        } else {
          fromToTable[i].toId = "";
        }
      }
    } catch (error) {
      console.error(error);
      var chanList = "Unidentified";
    }

    console.log(fromToTable);
    // check if message come from channel of interest
    var chanOfInterest = fromToTable.find(function (chan, index) {
      if (chan.fromId == message.channel) return true;
    });
  }

  if (typeof chanOfInterest !== "undefined" && !skip) {
    console.log(`Message is:\n ${JSON.stringify(message)}`);

    // get sender information:
    try {
      // Call the users.info method using the WebClient
      // console.log("get sender information:");
      var fromUser = await client.users.info({
        user: message.user,
        include_locale: true
      });
      console.log(`is this user info? ${fromUser.user.locale}`);
      var fromName = fromUser.user.display_name;
    } catch (error) {
      console.error(error);
      var fromName = "Unidentified User";
    }

    // Detect language:
    // try {
    //   // console.log("translate message");
    //   var fromLanguage = detectLang(
    //     (text = message.text),
    //     (japPropThresh = 0.1),
    //     (verbose = true)
    //   );
    // } catch (error) {
    //   console.error(error);
    //   var fromLanguage = "language detection error";
    // }

    var toLang = "EN";
    var fromLanguage = "no meaning for now"
    // translate message:
    // if (fromLanguage === "JA") {
    //   var toLang = "EN";
    //   var postmsg = ` ---- DeepL API translation, from Japanese to English ----\n`;
    // } else {
    //   var toLang = "JA";
    //   var postmsg = ` ---- DeepL API translation, from English to Japanese ----\n`;
    // }

    const textToTranslate = message.text.startsWith('!T42 ')
    ? message.text.slice('!T42 '.length)
    : message.text;

    try {
      // console.log("translate message");
      var resp = await translate(
        (fromLang = fromLanguage),
        (toLang = toLang),
        (msg = textToTranslate)
      );
      console.log(`translation is:\n ${JSON.stringify(resp)}`);
    } catch (error) {
      console.error(error);
      var resp = { transMsg: "Error during translation" };
    }

    var postmsg = "";

    // post message:
    postmsg = postmsg.concat(`${resp.transMsg}`);

    // detect attatchment:
    if (message.attachments) {
      postmsg = postmsg.concat(`> --- attachement not translated sorry ---`);
    }

    if (channelState === 'translate_all') {
      // Post to the auto-translate channe
      await client.chat.postMessage({
        text: postmsg,
        channel: chanOfInterest.toId,
        username: `AutoTranslate: ${fromUser.user.profile.display_name}`,
        icon_url: fromUser.user.profile.image_48,
      });
    } else if (channelState === 'manual') {
      // Post the translation as a thread reply in the same channel
      await client.chat.postMessage({
        text: postmsg,
        channel: message.channel,
        thread_ts: message.ts,
        username: `AutoTranslate`,
        icon_url: fromUser.user.profile.image_48,
      });
    }
    // await say(resp.transMsg);
  } else {
    console.log("Not tracked channel, or skipped");
  }
});
