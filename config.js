const dotenv = require('dotenv');
dotenv.config({path: '.env'})
const environment = process.env.NODE_ENV;

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
};

const emojis = {
    btc: '1103987332698357770',
    eth: '1103987336410320916',
    ltc: '1103987337630863447',
    get_confirmations:'868599453081288746',
    left_arrow:'1104076625315893371'
}

module.exports = {
    config: config, environment: environment,emojis:emojis
};