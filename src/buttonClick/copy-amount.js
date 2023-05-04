const crypto = require('../services/crypto-service');

const waitSecondsBetweenClicks = 20;
const clickWaitingCollection = {};

module.exports = {
    id: 'copy-amount', execute: async (interaction, args) => {
        const amount = args[0];

        await interaction.reply({
            content: amount,
            ephemeral: true,
        });
    },
};