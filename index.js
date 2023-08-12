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
});

client.on('messageCreate', async (message) => {
  const storytellerRole = message.guild.roles.cache.find(r => r.name === 'botc-storyteller');
  const activeStorytellerRole = message.guild.roles.cache.find(r => r.name === 'active-botc-storyteller');
  const {
    nonPrefixedDisplayName,
    isSpecTagged,
    isStTagged,
    isCoStTagged,
    isTravellerTagged,
    isNewPlayerTagged,
    isBrbTagged
  } = getNonPrefixedName(message.member.displayName);
  
  if (message.content === '!dbotc help') {
    message.channel.send({content:
    'commands:\n\
    `!dbotc help` : this info block\n\
    `*!` : toggle a "spectator" tag and remove active game role (an exclamation mark is placed in front of your name)\n\
    `*st` : a user with the appropriate role may enable/disable the active-ST role and tag "(ST)"\n\
    `*cost` : toggle on or off a "co-storyteller" tag prefixing your nickname "(Co-ST)", this will not give you active-ST capabilities\n\
    `*t` : toggle on or off a "traveller" tag prefixing your nickname "(T)"\n\
    `*new` : toggle on or off a "new player" tag at the end of your name: "playerName [N]"\n\
    `*brb` : toggle on or off a "brb" tag at the end of your name: "playerName [BRB]"\n\
    `!role undertaker` : list with any character role, and a link to the wiki page will be presented if found\n\
    `!remindme` : set a timer in minutes with a message.. example for 6min timer stating "nominations": !remindme 6 nominations'
    });
  } else if (message.content === '*!') {
    specToggle(nonPrefixedDisplayName, isSpecTagged, isStTagged, message, activeStorytellerRole);
  } else if (message.content === '*st') {
    stToggle(nonPrefixedDisplayName, isStTagged, message, storytellerRole, activeStorytellerRole);
  } else if (message.content === '*cost') {
    coStToggle(nonPrefixedDisplayName, isStTagged, isCoStTagged, message, activeStorytellerRole);
  } else if (message.content === '*t') {
    travellerToggle(nonPrefixedDisplayName, isStTagged, isTravellerTagged, message, activeStorytellerRole);
  } else if (message.content === '*new') {
    newPlayerToggle(isNewPlayerTagged, message);
  } else if (message.content === '*brb') {
    brbToggle(isBrbTagged, message);
//  } else if (message.content === '*TODO_ANYTHING') {
//    togglePrefix(message);
  } else if (message.content.startsWith('!role')) {
    //TODO: add "!role" vs "!role " error handling and "usage" info response within linkRequest function
    wikiCharacterLinkRequest(message);
  } else if (message.content.startsWith('!remindme')) {
    remindMe(message);
  }
});

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
      message.channel.send({/*ephemeral: true, */content: '`you lack permission to claim the active storyteller role`'});
      // ephemeral responses only function with slashcommands, consider looking into this
    }
  } else {
    message.member.roles.remove(activeStorytellerRole).catch(console.error);
    if (isStTagged) {
      message.member.setNickname(nonPrefixedDisplayName)
        .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
    }
  }
}

function coStToggle(nonPrefixedDisplayName, isStTagged, isCoStTagged, message, activeStorytellerRole) {
  if (!isCoStTagged) {
    if (isStTagged) {
      message.member.roles.remove(activeStorytellerRole).catch(console.error);
    }
    message.member.setNickname('(Co-ST) ' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '(Co-ST) ' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
}

function travellerToggle(nonPrefixedDisplayName, isStTagged, isTravellerTagged, message, activeStorytellerRole) {
  if (!isTravellerTagged) {
    if (isStTagged) {
      message.member.roles.remove(activeStorytellerRole).catch(console.error);
    }
    message.member.setNickname('(T) ' + nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, '(T) ' + nonPrefixedDisplayName, err));
  } else {
    message.member.setNickname(nonPrefixedDisplayName)
      .catch((err) => replyUnableToChangeNick(message, nonPrefixedDisplayName, err));
  }
}

function newPlayerToggle(isNewPlayerTagged, message) {
  if (!isNewPlayerTagged) {
    message.member.setNickname(message.member.displayName + ' [N]')
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' [N]', err));
  } else {
    message.member.setNickname(message.member.displayName.slice(0, -4))
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' :: without the trailing [N]', err));
  }
}

function brbToggle(isBrbTagged, message) {
  if (!isBrbTagged) {
    message.member.setNickname(message.member.displayName + ' [BRB]')
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' [BRB]', err));
  } else {
    message.member.setNickname(message.member.displayName.slice(0, -6))
      .catch((err) => replyUnableToChangeNick(message, message.member.displayName + ' :: without the trailing [BRB]', err));
  }
}

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
  const wikiUrl = 'https://wiki.bloodontheclocktower.com/'
  const characterRoleName = message.content.substring(6);
  const formattedCharacterRoleName = capitalizeRoleNameWithUnderscores(characterRoleName);
  let resp = await axios
          .head(wikiUrl + formattedCharacterRoleName)
          .then(resp => {
            if (resp.status && resp.status === 200) {
              message.channel.send({content: wikiUrl + formattedCharacterRoleName});
            } else {
              message.channel.send({content: '`query success - character role not found`'});
            }
          })
          .catch(error =>  {
            if  (error.response.status === 404) {
              message.channel.send({content: '`query failure - character role not found`'});
            } else if (error.response.status === 503) {
              message.channel.send({content: '`503 - wiki unavailable`'});
            } else if ([400,500,501,502,504].includes(error.response.status)) {
              message.channel.send({content: '`unexpected error, please contact maintainer`'});
            } else {
              message.channel.send({content: '`unexpected error, please contact maintainer`'});
            }
          });
}

async function remindMe(message) {
  
  //TODO: check that \w was actually the regular alphanumerical checkup
  const remindMeRegex = /^!remindme ([0-9][0-9]{0,2}) ([\w][\w\s]{1,100})$/
  const matchResult = message.content.match(remindMeRegex);
  console.log(matchResult);
  if (message.content.startsWith('!remindme ') && matchResult) {
    const minutes = matchResult[1];
    const reminderMessage = matchResult[2];
    message.channel.send({content: "```" + message.member.displayName + " set a reminder in\n\
        -- " + minutes + " minutes```"});
    setTimeout(() => {
      message.channel.send({content: "```REMINDER:\n\
        -- " + reminderMessage + "```"});
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
  let isTravellerTagged = false;
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
    isTravellerTagged = true;
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
    isTravellerTagged: isTravellerTagged,
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
