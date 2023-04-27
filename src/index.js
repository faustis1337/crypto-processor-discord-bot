const fs = require('node:fs');
const path = require('node:path');
const {Client, GatewayIntentBits, Collection} = require('discord.js');
const config = require('../config');


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
    ],
});

const slashcmds = new Collection();
const btnresponses = new Collection();
client.container = {
    slashcmds,
    btnresponses,
};
//load button responses
const bPath = path.join(__dirname, 'buttonClick');
const buttonFiles = fs
    .readdirSync(bPath)
    .filter((file) => file.endsWith('.js'));
for (const file of buttonFiles) {
    const filePath = path.join(bPath, file);
    const response = require(filePath);

    client.container.btnresponses.set(response.id, response);
}
//load slash commands
const sPath = path.join(__dirname, 'slashcmds/commands');

const slashFiles = fs
    .readdirSync(sPath)
    .filter((file) => file.endsWith('.js'));

for (const file of slashFiles) {
    const filePath = path.join(sPath, file);

    const command = require(filePath);

    client.container.slashcmds.set(command.data.name, command);
    console.log(
        `[SLASH COMMANDS] ${command.data.name} Application command is added for being registered to client`,
    );
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
    .readdirSync(eventsPath)
    .filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    }
    else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`[EVENTS] Client event named ${event.name} loaded`);
}

(async () => {
    await client.login(config.config.token)
        .then(console.log('Bot is running...'));
})();