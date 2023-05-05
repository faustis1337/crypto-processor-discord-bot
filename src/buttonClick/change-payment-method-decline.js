module.exports = {
    id: 'change-payment-method-decline', execute: async (interaction, args) => {
        await interaction.deferUpdate();
        await interaction.deleteReply();
    },
};