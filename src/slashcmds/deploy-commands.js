const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const config = require('../../config');

const clientId = config.config.clientId;
const guildId = config.config.guildId;
const token = config.config.token;

const commands = [];
// Grab all the command files from the commands directory you created earlier
const sPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(`${sPath}`).filter(file => file.endsWith('.js'));
for (const commandFileAsString of commandFiles) {
    const command = require(`${sPath}/${commandFileAsString}`);
    console.log(command);
    commands.push(command.data.toJSON());
}

// Construct and prepare an instance of the REST module
const rest = new REST({ version: '10' }).setToken(token);

// and deploy your commands!
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();