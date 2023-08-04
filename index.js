require('dotenv').config();

const axios = require('axios');
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents:
          [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.MessageContent
          ] });

client.on('ready', () => {
  console.log('bot is ready');
})

client.on('messageCreate', async (message) => {
  const wikiRoleRegex = '^!role ([^ ]*)$';
  const storytellerRole = message.guild.roles.cache.find(r => r.name === 'botc-storyteller');
  const activeStorytellerRole = message.guild.roles.cache.find(r => r.name === 'active-botc-storyteller');
  const { nonPrefixedDisplayName, isSpecTagged, isStTagged } = getNonPrefixedName(message.member.displayName);
  
  if (message.content === '!dbotc help') {
    message.channel.send({content:
    'commands:\n\
    `!dbotc help` : this info block\n\
    `!role undertaker` : list with any character role, and a link to the wiki page will be presented if found\n\
    `*!` : set a "spectator" tag (an exclamation mark in front of your name)\n\
    `*st` : a user with the appropriate role may enable/disable the active-ST role and tag "(ST)"'
    });
  } else if (message.content === '*!') {
    specToggle(nonPrefixedDisplayName, isSpecTagged, isStTagged, message, activeStorytellerRole);
  } else if (message.content === '*st') {
    stToggle(nonPrefixedDisplayName, isStTagged, message, storytellerRole, activeStorytellerRole);
  } else if (message.content.startsWith('!role ')) {
    wikiCharacterLinkRequest(message);
  } else if (1==2) {
    let resp = await axios.get(`https://api.jsonapi.io/random`);
    const outMsg = resp.data.content;
    message.reply({content:outMsg});
  }
})

function specToggle(nonPrefixedDisplayName, isSpecTagged, isStTagged, message, activeStorytellerRole) {
  if (!isSpecTagged) {
    if (isStTagged) {
      message.member.roles.remove(activeStorytellerRole).catch(console.error);
    }
    message.member.setNickname('!' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '!' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
}

function stToggle(nonPrefixedDisplayName, isStTagged, message, storytellerRole, activeStorytellerRole) {
  if (!message.member.roles.cache.has(activeStorytellerRole.id)) {
    if (message.member.roles.cache.has(storytellerRole.id)) {
      message.member.roles.add(activeStorytellerRole).catch(console.error);
      if (!isStTagged) {
        message.member.setNickname('(ST) ' + nonPrefixedDisplayName)
          .catch((err) => replyUnableToChangeNick(message, '(ST) ' + nonPrefixedDisplayName, err));
      }
    } else {
      message.channel.send({content: '`you lack permission to claim the active storyteller role`'});
    }
  } else {
    message.member.roles.remove(activeStorytellerRole).catch(console.error);
    if (isStTagged) {
      message.member.setNickname(nonPrefixedDisplayName)
        .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
    }
  }
}

async function wikiCharacterLinkRequest(message) {
  const wikiUrl = 'https://wiki.bloodontheclocktower.com/'
  const characterRoleName = message.content.substring(6);
  // ALSO CHECK IF CHAR ROLE NAME HAS "-", and re-join appropriately..
  const formattedCharacterRoleName = capitalizeRoleNameWithUnderscores(characterRoleName);
//    console.log(formattedCharacterRoleName);
  let resp = await axios
          .head(wikiUrl + formattedCharacterRoleName)
//            .catch (console.error());
  if (resp.status && resp.status === 200) {
    message.channel.send({content: wikiUrl + formattedCharacterRoleName});
  } else {
    message.channel({content: '`character role not found`'});
  }
}

function getNonPrefixedName(displayName) {
  let formattedName = displayName;
  let isSpecTagged = false;
  let isStTagged = false;
  if (displayName.startsWith('!')) {
    formattedName = displayName.substring(1);
    isSpecTagged = true;
  } else if(displayName.startsWith('(ST) ')) {
    formattedName = displayName.substring(5);
    isStTagged = true;
  }
  return { nonPrefixedDisplayName: formattedName, isSpecTagged: isSpecTagged, isStTagged: isStTagged };
}

function replyUnableToChangeNick(message, intendedNick, err) {
  message.reply({content: 'couldn\'t change your nick, type this to change it yourself (only copypaste your name including any prefix):\n\
    `/nick ' + intendedNick + '`'});
  console.error(err);
}

function capitalizeRoleNameWithUnderscores(phrase, dash=false) {
  const splitDelimiter = dash ? '-' : ' ';
  const joinDelimiter = dash ? '-' : '_';
  const words = phrase.toLowerCase().split(splitDelimiter);
  return words.map((word) => {
    if (!dash) {
      word = capitalizeRoleNameWithUnderscores(word, true);
    }
    return word[0].toUpperCase() + word.substring(1);
  }).join(joinDelimiter);
}

client.login(process.env.DISCORD_BOT_ID);
