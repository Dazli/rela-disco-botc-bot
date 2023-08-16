To start using, install npm packages: discord.js, axios, dotenv.

Requires a .env file with the discord bot id (the token created on the discord app site).

To run:
- in the project folder run: node index.js

To run as background service:
- setup the machine root folder /discordbot/rela-disco-botc-bot
- copy the relabotc.service file into the folder /etc/systemd/system
- start with the command: systemctl start relabotc
- enable running on startup: systemctl enable relabotc
- logs should be visible by running: journalctl -u relabotc