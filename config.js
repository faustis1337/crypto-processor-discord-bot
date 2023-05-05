const dotenv = require('dotenv');
dotenv.config({path: '.env'})
const environment = process.env.NODE_ENV;

const config = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,
};

const emojis = {
    btc: process.env.EMOJI_BTC,
    eth: process.env.EMOJI_ETH,
    ltc: process.env.EMOJI_LTC,
    get_confirmations:process.env.EMOJI_GET_CONFIRMATIONS,
    left_arrow:process.env.EMOJI_LEFT_ARROW
}

module.exports = {
    config: config, environment: environment,emojis:emojis
};