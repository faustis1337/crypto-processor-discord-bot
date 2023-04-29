const dotenv = require('dotenv');
dotenv.config({path: '.env'})
const environment = process.env.NODE_ENV;

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
};

module.exports = {
    config: config, environment: environment
};