const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const crypto = require('../../../src/services/crypto-service');
const colors = require("../../../assets/colors.json");

// 2 hours difference between Denmark, and 4 hours difference between GMT

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set_crypto')
        .setDescription('Sets crypto address')
        .addStringOption((option) => option
            .setName('token')
            .setDescription('Select token')
            .setRequired(true)
            .addChoices({ name: 'BTC', value: 'BTC' }, { name: 'ETH', value: 'ETH' }, { name: 'LTC', value: 'LTC' }))
        .addStringOption(option =>
            option.setName('address')
                .setDescription('Address of the crypto')
                .setRequired(true)),
    async execute(interaction) {
        const token = interaction.options.getString('token');
        const address = interaction.options.getString('address');
        crypto.saveCryptoAddress(token,address);

        const savedAddressEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('Address Changed')
            .addFields(
                { name: 'Token:', value: token, inline: false },
                { name: 'New Address', value: address, inline: false },
            );

        await interaction.reply({
            embeds: [savedAddressEmbed],ephemeral:true
        });
    },
}