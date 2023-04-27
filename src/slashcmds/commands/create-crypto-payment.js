const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const colors = require('../../../assets/colors.json');
const cryptoService = require('../../../src/services/crypto-service');
const config = require('../../../config');

// 2 hours difference between Denmark, and 4 hours difference between GMT

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypto_payment')
        .setDescription('Listens to crypto payment')
        .addStringOption((option) => option
            .setName('token')
            .setDescription('Select token')
            .setRequired(true)
            .addChoices({ name: 'BTC', value: 'BTC' }, { name: 'ETH', value: 'ETH' }, { name: 'LTC', value: 'LTC' }))
        .addNumberOption((option) => option
            .setName('usd_amount')
            .setDescription('Enter amount value')
            .setRequired(true)),
    async execute(interaction) {
        const token = interaction.options.getString('token');
        const usdAmount = interaction.options.getNumber('usd_amount');
        let address = null;
        switch (token) {
            case 'BTC':
                address = config.crypto.btc;
                break;
            case 'ETH':
                address = config.crypto.eth;
                break;
            case 'LTC':
                address = config.crypto.ltc;
                break;
        }

        const crypto = await cryptoService.getCryptoInfo(token);

        if (crypto == null || address == null) return;

        const cryptoPendingAmount = (usdAmount / crypto.currentValue).toFixed(8);

        const cryptoPendingPaymentEmbed = new EmbedBuilder()
            .setColor(colors.pending)
            .setTitle('Payment processor')
            .setDescription(`Please send exact ${token} amount to avoid delays.`)
            .addFields(
                { name: 'Method:', value: crypto.longName, inline: true },
                { name: token, value: cryptoPendingAmount, inline: true },
                { name: 'USD:', value: `$${usdAmount}`, inline: true },
                { name: 'Address:', value: address, inline: false },
                { name: 'Status:', value: `Waiting for payment...`, inline: false },
            );

        const date = new Date();
        const denmarkTime = date.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' });
        const epochTime = Date.parse(denmarkTime) / 1000;

        const checkPaymentButton = new ButtonBuilder()
            .setCustomId(`check-payment:${generateId()}:${token}:${crypto.longName}:${cryptoPendingAmount}:${usdAmount}:${epochTime}`)
            .setLabel('Check status')
            .setStyle(ButtonStyle.Secondary);

        const paymentButtonsRow = new ActionRowBuilder()
            .addComponents(checkPaymentButton);

        await interaction.reply({
            embeds: [cryptoPendingPaymentEmbed], components: [paymentButtonsRow],
        });
    },
}
;
function generateId() {
    let id = '';
    const digits = '0123456789';
    for (let i = 0; i < 30; i++) {
        const index = Math.floor(Math.random() * digits.length);
        id += digits[index];
    }
    return id;
}