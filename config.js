const dotenv = require('dotenv');
const environment = process.env.NODE_ENV;

switch (environment) {
    case 'prod':
        dotenv.config({ path: '.env.prod' });
        break;
    case 'dev':
        dotenv.config({ path: '.env.dev' });
        break;
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

const config = {
    prod: {
        token: token,
        clientId: clientId,
        guildId: guildId,
    },
    dev: {
        token: token,
        clientId: clientId,
        guildId: guildId,
    },
};

module.exports = {
    config: config[environment]
};