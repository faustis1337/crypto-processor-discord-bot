const crypto = require('../services/crypto-service');

const waitSecondsBetweenClicks = 20;
const clickWaitingCollection = {};

module.exports = {
    id: 'copy-address', execute: async (interaction, args) => {
        const token = args[0];
        const address = crypto.getCryptoAddress(token);

        await interaction.reply({
            content: address,
            ephemeral: true,
        });
    },
};