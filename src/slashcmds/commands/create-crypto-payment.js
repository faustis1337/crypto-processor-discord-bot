const {SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const responseService = require('../../services/response-service');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypto_payment')
        .setDescription('Listens to crypto payment')
        .addNumberOption((option) => option
            .setName('usd')
            .setDescription('Enter amount value')
            .setRequired(true)),
    async execute(interaction) {
        const usdAmount = interaction.options.getNumber('usd');

        const response = await responseService.selectCryptosResponse(usdAmount);

        await interaction.reply(response);
    },
}
;