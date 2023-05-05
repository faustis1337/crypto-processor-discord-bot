const {ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder} = require("discord.js");
const colors = require("../../assets/colors.json");
module.exports = {
    id: 'change-payment-method', execute: async (interaction, args) => {
        const usdAmount = args[0];
        const messageId = args[1];

        const changePaymentMethodEmbed = new EmbedBuilder()
            .setColor(colors.error)
            .setTitle('Cancel this transaction?')
            .setDescription(`Do you really want to cancel this transaction and choose other payment method?`);

        const confirmChangeMethod = new ButtonBuilder()
            .setCustomId(`change-payment-method-confirm:${messageId}:${usdAmount}`)
            .setLabel('Yes')
            .setStyle(ButtonStyle.Success);

        const declineChangeMethod = new ButtonBuilder()
            .setCustomId(`change-payment-method-decline`)
            .setLabel('No, I do not want to cancel this transaction')
            .setStyle(ButtonStyle.Danger);

        const changeMethodRow = new ActionRowBuilder()
            .addComponents(confirmChangeMethod,declineChangeMethod);

        await interaction.reply({
            embeds: [changePaymentMethodEmbed], components: [changeMethodRow],
            ephemeral: true,
        });
    },
};