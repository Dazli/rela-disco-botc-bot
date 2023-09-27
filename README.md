This discord bot partially emulates the capabilities found on the "Unofficial official Blood on the Clocktower" discord.
The code is mine, but many of the ideas originate on the mentioned server.

:::::

'To start using, install npm packages: discord.js, axios, dotenv.

Requires a .env file with the discord bot id (the token created on the discord app site).

To run:
- in the project folder run: node index.js

To run as background service:
- setup the machine root folder /discordbot/rela-disco-botc-bot
- copy the relabotc.service file into the folder /etc/systemd/system
- ensure the relabotc.service file is owned by root:root or appropriate variant
- start with the command: systemctl start relabotc
- enable running on startup: systemctl enable relabotc
- logs should be visible by running: journalctl -u relabotc