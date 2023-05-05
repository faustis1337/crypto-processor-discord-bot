const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require("discord.js");
const colors = require("../../assets/colors.json");
const config = require("../../config");
const responseService = require("../../src/services/response-service")
module.exports = {
    id: 'change-payment-method-confirm', execute: async (interaction, args) => {
        const messageId = args[0];
        const usdAmount = args[1];
        const message = await interaction.channel.messages.fetch(messageId);
        if (message) {
            await interaction.deferUpdate();
            await interaction.deleteReply();

            const response = await responseService.selectCryptosResponse(usdAmount);

            await message.edit(response);
        }
    },
};