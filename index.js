#!/usr/bin/env node
require('dotenv').config();

// NOTE TO SELF:
// investigate linuxbrew for potentially sorting package management, absolutely not required

const axios = require('axios');
const { Client, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const roles = require('./roles.json');
const emojis = require('./emojis.json');
const client = new Client({ intents:
          [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.MessageContent
          ] });

client.on('ready', () => {
  console.log('bot is ready');
});

client.on('messageCreate', async (message) => {
  const activePlayerRole = message.guild.roles.cache.find(r => r.name === 'botc-current-game');
  const storytellerRole = message.guild.roles.cache.find(r => r.name === 'botc-storyteller');
  const activeStorytellerRole = message.guild.roles.cache.find(r => r.name === 'active-botc-storyteller');
  const {
    nonPrefixedDisplayName,
    isSpecTagged,
    isStTagged,
    isCoStTagged,
    isTravelerTagged,
    isNewPlayerTagged,
    isBrbTagged
  } = getNonPrefixedName(message.member.displayName);
  
  if (message.content === '!dbotc help') {
    message.channel.send({content:
'general commands:\n\
    `!dbotc help` : this info block\n\
    `!howto` : a basic list of info and \n\
    `!role undertaker` : list with any character role, and a link to the wiki page will be presented if found\n\
    `!remindme` : set a timer in minutes with a message.. example for 6min timer stating "nominations": !remindme 6 nominations\n\
\n\
player commands:\n\
    `*!` : toggle a "spectator" tag and remove active game roles (an exclamation mark is placed in front of your name)\n\
    `*join` : add an active player role to yourself, removing any prefix tags and any unrelevant active-game roles\n\
    `*t` : toggle on or off a "traveler" tag prefixing your nickname "(T)" - use after joining with `*join`\n\
    `*new` : toggle on or off a "new player" tag at the end of your name: "playerName [N]"\n\
    `*brb` : toggle on or off a "brb" tag at the end of your name: "playerName [BRB]"\n\
\n\
commands while playing:\n\
    `*consult` : type this to request a storyteller consultation, the ST can click the "OK" reaction and this will pull you both to the storyteller consultation voice channel\n\
    `*grim` : (AVAILABLE SOON™) type this to see if anyone with the active storyteller role has sent out a grimoire link\n\
\n\
storyteller commands:\n\
    `*st` : a user with the appropriate role may enable/disable the active-ST role and tag "(ST)"\n\
    `*cost` : toggle on or off a "co-storyteller" tag prefixing your nickname "(Co-ST)", this will not give you active-ST capabilities'
    });
  } else if (message.content === '!howto') {
    howToInfo(message);
  } else if (message.content.startsWith('!role')) {
    //TODO: add "!role" vs "!role " error handling and "usage" info response within linkRequest function
    wikiCharacterLinkRequest(message);
  } else if (message.content.startsWith('!remindme')) {
    remindMe(message);
  } else if (message.content === '*!') {
    specToggle(nonPrefixedDisplayName, isSpecTagged, message, activePlayerRole, activeStorytellerRole);
  } else if (message.content === '*join') {
    activatePlayer(nonPrefixedDisplayName, message, activePlayerRole, activeStorytellerRole);
  } else if (message.content === '*t') {
    travelerToggle(nonPrefixedDisplayName, isTravelerTagged, message, activeStorytellerRole);
  } else if (message.content === '*new') {
    newPlayerToggle(isNewPlayerTagged, message);
  } else if (message.content === '*brb') {
    brbToggle(isBrbTagged, message);
  } else if (message.content === '*consult') {
    consult(message);
//  } else if (message.content === '*grim') {
//    sendGrimoireLinkToChat(message);
  } else if (message.content === '*st') {
    stToggle(nonPrefixedDisplayName, isStTagged, message, activePlayerRole, storytellerRole, activeStorytellerRole);
  } else if (message.content === '*cost') {
    coStToggle(nonPrefixedDisplayName, isCoStTagged, message, activePlayerRole, activeStorytellerRole);
  } else if (message.content.startsWith === 'https://clocktower.online/' || message.content.startsWith === 'https://clocktower.live/') {
    registerGrimLink(message);
//  } else if (message.content === '*TODO_ANYTHING') {
//    togglePrefix(message);
  }
});

client.on('messageReactionAdd', async (reaction_orig, user) => {
  if (!user.bot && user.username !== 'DBotC' && reaction_orig.message.content === '*consult') {
    const message = reaction_orig.message;
    const activeStorytellerRole = message.guild.roles.cache.find(r => r.name === 'active-botc-storyteller');
    const reactingMember = message.guild.members.cache.get(user.id);
    if (reactingMember.roles.cache.has(activeStorytellerRole.id)) {
      const consultMessageMember = message.guild.members.cache.get(message.author.id);
      const category = message.guild.channels.cache.find(channel => (channel.type === 4 /* GUILD_CATEGORY */ && ["Blood on the Clocktower", 'botdev'].includes(channel.name)));
      const consultChannel = message.guild.channels.cache.find(channel => channel.name === "Storyteller Consultation" && channel.parentId === category.id);
      reactingMember.voice.setChannel(consultChannel);
      consultMessageMember.voice.setChannel(consultChannel);
      setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
    }
  }
});

function howToInfo(message) {
  //CREDIT: this was copypaste from a Unofficial official Blood on the Clocktower discord server bot, I do not know the creator
  message.channel.send({content:
`<[=+----+={ Welcome to Blood On The Clocktower }=+----+=]>
----------------------------
<[=+----+={  Bra1n Tool Basics  }=+----+=]>

1- Click on your name on the grim and choose Claim Seat to claim your seat.
2- Press R to see the Role Sheet.
3- Press V to see the Vote History.
4- Press N to see the roles\' Night Order.

<[=+----+={  Basic BOTC Slang Terminology  }=+----+=]>

Starpass: The Imp can kill themselves, and an alive minion becomes the new Imp.
Mayor Bounce: If the Demon attacks the Mayor in the night, another player might die instead (ST Chooses whether that happens and who gets killed instead).
Three-for-three or Two-for-Two: The players exchange a number of roles, and would typically include their real role.
Hard Claim: A claim of a single role that is supposed to be the player\'s real role.
Pings: A player having pings on them means there\'s information pointing to what their role or alignment might be. (e.g Washerwoman, Investigator, Fortune Teller, etc).
Evil Ping: When information points to someone being potentionally evil. (e.g Investigator, Empath, etc)
Proc: To trigger a trigger-based ability. (e.g Virgin).
Top Four: Top 4 roles of the role sheet, More specifically the roles that get all of their information on the first night of the game.`
  });
}

function specToggle(nonPrefixedDisplayName, isSpecTagged, message, activePlayerRole, activeStorytellerRole) {
  if (!isSpecTagged) {
    message.member.roles.remove(activeStorytellerRole).catch((err) => console.error('Could not remove role: ', 'activeStorytellerRole'));
    message.member.roles.remove(activePlayerRole).catch((err) => console.error('Could not remove role: ', 'activePlayerRole'));
    message.member.setNickname('!' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '!' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function activatePlayer(nonPrefixedDisplayName, message, activePlayerRole, activeStorytellerRole) {
  message.member.roles.remove(activeStorytellerRole).catch((err) => console.error('Could not remove role: ', 'activeStorytellerRole'));
  message.member.roles.add(activePlayerRole).catch((err) => console.error('Could not remove role: ', 'activePlayerRole'));
  message.member.setNickname(nonPrefixedDisplayName)
    .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function stToggle(nonPrefixedDisplayName, isStTagged, message, activePlayerRole, storytellerRole, activeStorytellerRole) {
  if (!message.member.roles.cache.has(activeStorytellerRole.id)) {
    if (message.member.roles.cache.has(storytellerRole.id)) {
      message.member.roles.add(activeStorytellerRole).catch((err) => console.error('Could not add role: ', 'activeStorytellerRole'));
      message.member.roles.remove(activePlayerRole).catch((err) => console.error('Could not remove role: ', 'activePlayerRole'));
      if (!isStTagged) {
        setTimeout(message.member.setNickname('(ST) ' + nonPrefixedDisplayName)
          .catch((err) => replyUnableToChangeNick(message, '(ST) ' + nonPrefixedDisplayName, err)),
          1000);
      }
    } else {
      message.channel.send({/*ephemeral: true, */content: '`you lack permission to claim the active storyteller role`'});
      // ephemeral responses only function with slashcommands, consider looking into this
    }
  } else {
    message.member.roles.remove(activeStorytellerRole).catch((err) => console.error('Could not remove role: ', 'activeStorytellerRole'));
    if (isStTagged) {
      setTimeout(message.member.setNickname(nonPrefixedDisplayName)
        .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err)),
        1000);
    }
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function coStToggle(nonPrefixedDisplayName, isCoStTagged, message, activePlayerRole, activeStorytellerRole) {
  if (!isCoStTagged) {
    message.member.roles.remove(activeStorytellerRole).catch((err) => console.error('Could not remove role: ', 'activeStorytellerRole'));
    message.member.roles.remove(activePlayerRole).catch((err) => console.error('Could not remove role: ', 'activePlayerRole'));
    message.member.setNickname('(Co-ST) ' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '(Co-ST) ' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function travelerToggle(nonPrefixedDisplayName, isTravelerTagged, message, activeStorytellerRole) {
  if (!isTravelerTagged) {
    message.member.roles.remove(activeStorytellerRole).catch((err) => console.error('Could not remove role: ', 'activeStorytellerRole'));
    message.member.setNickname('(T) ' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '(T) ' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function newPlayerToggle(isNewPlayerTagged, message) {
  if (!isNewPlayerTagged) {
    message.member.setNickname(message.member.displayName + ' [N]')
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' [N]', err));
  } else {
    message.member.setNickname(message.member.displayName.slice(0, -4))
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' :: without the trailing [N]', err));
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function brbToggle(isBrbTagged, message) {
  if (!isBrbTagged) {
    message.member.setNickname(message.member.displayName + ' [BRB]')
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' [BRB]', err));
  } else {
    message.member.setNickname(message.member.displayName.slice(0, -6))
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' :: without the trailing [BRB]', err));
  }
  setTimeout(() => message.delete().catch((err) => console.error('Could not delete message by: ', message.member.displayName)), 3000);
}

function consult(message) {
  message.react(emojis['ok']);
}

//function registerGrimLink(message) {
//  //TODO: store grim link and send a reply to it:
//  PUBLICVARGRIMS.push
//  message.reply({content: 'Grim link https://clocktower.online/#trustkills added by ' + message.member.displayName + '\n\
//Players can get the link by using the command *grim'});
//}
//
//function sendGrimoireLinkToChat(message) {
//  const grimResponseArr = [];
//  foreach (PUBLICVARGRIMS)
//    grimResponseArr.push('Online grimoire link from ' + activeSt  + ':\n\
//https://clocktower.online/#harry');
//  if (grimResponseArr.length === 0) {
//    grimResponseArr.push('No online grimoire link available');
//  }
//  message.reply({content: grimResponse});
//  Grim link https://clocktower.online/#trustkills added by (ST) Trusty (beans) #SMP
//Players can get the link by using the command *grim
//}

//TODO: this would still require st flagged handling.. potential scrap? or leave st requests separated and remove active-st role by default?
////function togglePrefix(message) {
////  const storytellerRole = message.guild.roles.cache.find(r => r.name === 'botc-storyteller');
////  const activeStorytellerRole = message.guild.roles.cache.find(r => r.name === 'active-botc-storyteller');
////  const {
////    nonPrefixedDisplayName,
////    prefix,
////    suffix,
////    isStRequest,
////    isStTagged,
////    isTaggedAsRequest,
////  } = getNonPrefixedName(message.member.displayName);
////
////  if (!isTaggedAsRequest) {
////    if (isStTagged) {
////      message.member.roles.remove(activeStorytellerRole).catch(console.error);
////    }
////    message.member.setNickname(prefix + nonPrefixedDisplayName + suffix)
////      .catch((err) => replyUnableToChangeNick(message, prefix + nonPrefixedDisplayName + suffix, err));
////  } else {
////    message.member.setNickname(nonPrefixedDisplayName)
////      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
////  }
////}

async function wikiCharacterLinkRequest(message) {
  const wikiUrl = 'https://wiki.bloodontheclocktower.com/';
  const characterRoleName = message.content.substring(6);
  const formattedCharacterRoleName = capitalizeRoleNameWithUnderscores(characterRoleName);
  const cleanCharacterRoleName = formattedCharacterRoleName.split('_').join(' ');
//  let resp = 
  await axios
          .get(wikiUrl + formattedCharacterRoleName)
          .then(resp => {
            if (resp.status && resp.status === 200) {
              const requestedRole = roles.filter(obj => {
                return obj.name === cleanCharacterRoleName;
              })[0];
              const wikiEmbed = new EmbedBuilder()
                      .setTitle(cleanCharacterRoleName + ' (' + requestedRole.team[0].toUpperCase() + requestedRole.team.substring(1) + ')')
                      .setColor(characterTeamColor(requestedRole.team))
                      .setURL(wikiUrl + formattedCharacterRoleName)
//                      .setAuthor() // N/A
                      .setDescription(requestedRole.ability)
                      .setThumbnail(characterThumbNail(resp.data), characterRoleName);

              message.channel.send({embeds: [wikiEmbed]});
            } else {
              message.channel.send({content: '`query success - character role not found`'});
            }
          })
          .catch(error =>  {
            if (error.response) {
              if  (error.response.status === 404) {
                message.channel.send({content: '`query failure - character role not found`'});
              } else if (error.response.status === 503) {
                message.channel.send({content: '`503 - wiki unavailable`'});
              } else if ([400,500,501,502,504].includes(error.response.status)) {
                message.channel.send({content: '`unexpected error, please contact maintainer`'});
              } else {
                message.channel.send({content: '`unexpected error, please contact maintainer`'});
              }
            }
          });
}

function characterThumbNail(responseData, characterRoleName) {
  // TODO: consider swapping the images to utilize a manual list of official wiki images
  const htmlRoleImgRegex = /<div id="character-details">[^<]*<p[^>]*>[^<]*<a[^>]+>[^<]*<img [\w=". ]* src="(https:\/\/[\w/ ]*)"[^>]*>/g;
  const thumbnailUriArray = responseData.match(htmlRoleImgRegex);
  if (thumbnailUriArray.length > 0) {
    return 'https://wiki.bloodontheclocktower.com'+thumbnailUriArray[0];
  } else {
    const thumbnailRoleName = lowercaseNoDelimiterRoleName(characterRoleName);
    return 'https://raw.githubusercontent.com/bra1n/townsquare/develop/src/assets/icons/' + thumbnailRoleName + '.png';
  }
}

function characterTeamColor(teamValue) {
  let blockQuoteColor = '#333';
//  let blockQuoteColor = '#333';
  switch(teamValue) {
    case 'townsfolk':
      blockQuoteColor = '#0099FF';
      break;
    case 'outsider':
      blockQuoteColor = '#009999';
      break;
    case 'minion':
      blockQuoteColor = '#EF6600';
      break;
    case 'demon':
      blockQuoteColor = '#EF3300';
      break;
    case 'traveler':
      blockQuoteColor = '#9900CC';
      break;
    case 'fabled':
      blockQuoteColor = '#FFD700';
      break;
    default:
      blockQuoteColor = '#999';
      break;
  }
  return blockQuoteColor;
}

async function remindMe(message) {
  
  //TODO: check that \w was actually the regular alphanumerical checkup
  const remindMeRegex = /^!remindme ([0-9][0-9]{0,2}) ([\w][\w\s]{1,100})$/
  const matchResult = message.content.match(remindMeRegex);
  console.log(matchResult);
  if (message.content.startsWith('!remindme ') && matchResult) {
    const minutes = matchResult[1];
    const reminderMessage = matchResult[2];
    message.channel.send({content: "> ```" + message.member.displayName + " set a reminder in\n\
>        -- " + minutes + " minutes```"});
    setTimeout(() => {
      message.reply({content: "> ```REMINDER:\n\
>        -- " + reminderMessage + "```"});
    }, minutes * 60 * 1000);
  } else {
    message.channel.send({content: 'Usage\n\
    To send a reminder in 6 minutes:\n\
    !remindme 6 My message here'});
  }
}

function getNonPrefixedName(displayName) {
  let formattedName = displayName;
  let isSpecTagged = false;
  let isStTagged = false;
  let isCoStTagged = false;
  let isTravelerTagged = false;
  let isNewPlayerTagged = false;
  let isBrbTagged = false;
  if (displayName.startsWith('!')) {
    formattedName = displayName.substring(1);
    isSpecTagged = true;
  } else if(displayName.startsWith('(ST) ')) {
    formattedName = displayName.substring(5);
    isStTagged = true;
  } else if(displayName.startsWith('(Co-ST) ')) {
    formattedName = displayName.substring(8);
    isCoStTagged = true;
  } else if(displayName.startsWith('(T) ')) {
    formattedName = displayName.substring(4);
    isTravelerTagged = true;
  }
  if(displayName.endsWith(' [N]')) {
    isNewPlayerTagged = true;
  } else if(displayName.endsWith(' [BRB]')) {
    isBrbTagged = true;
  }
  return {
    nonPrefixedDisplayName: formattedName,
    isSpecTagged: isSpecTagged,
    isStTagged: isStTagged,
    isCoStTagged: isCoStTagged,
    isTravelerTagged: isTravelerTagged,
    isNewPlayerTagged: isNewPlayerTagged,
    isBrbTagged: isBrbTagged
  };
}

function replyUnableToChangeNick(message, intendedNick, err) {
  message.reply({
    content: 'couldn\'t change your nick, type this to change it yourself (only copypaste your name including any prefix):\n\
      `/nick ' + intendedNick + '`',
//    ephemeral: true
// ephemeral responses only function with slashcommands, consider looking into this
  });
  console.error('Intended nickname: ', intendedNick);
}

function capitalizeRoleNameWithUnderscores(phrase, dash=false) {
  const splitDelimiter = dash ? '-' : ' ';
  const joinDelimiter = dash ? '-' : '_';
  const words = phrase.toLowerCase().replace(/[^A-Za-z\'\- ]/g, '').split(splitDelimiter);
  return words.map((word) => {
    if (!dash) {
      word = capitalizeRoleNameWithUnderscores(word, true);
    }
    return ['of'].includes(word) ? word : word[0].toUpperCase() + word.substring(1);
  }).join(joinDelimiter);
}

function lowercaseNoDelimiterRoleName(phrase) {
  return phrase.toLowerCase().replace(/[^a-z]/g, '');
}

client.login(process.env.DISCORD_BOT_ID);
