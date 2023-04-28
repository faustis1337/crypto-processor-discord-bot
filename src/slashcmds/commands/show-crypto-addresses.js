const {SlashCommandBuilder, EmbedBuilder} = require('discord.js');
const crypto = require('../../../src/services/crypto-service');
const colors = require("../../../assets/colors.json");

// 2 hours difference between Denmark, and 4 hours difference between GMT

module.exports = {
    data: new SlashCommandBuilder()
        .setName('show_cryptos')
        .setDescription('Show crypto addresses'),
    async execute(interaction) {
        let addressesString = '';
        const cryptoAddresses = crypto.getCryptoAddresses();
        if(cryptoAddresses == null){
            await interaction.reply({
                content: 'no addresses found',ephemeral:true
            });
            return;
        };
        for (key in cryptoAddresses)
        {
            const addressDetails = `**${key}**: ${cryptoAddresses[key]}\n`;
            addressesString = addressesString + addressDetails;
        }
        const savedAddressEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle('Crypto Addresses')
            .setDescription(addressesString)

        await interaction.reply({
            embeds: [savedAddressEmbed],ephemeral:true
        });
    },
}