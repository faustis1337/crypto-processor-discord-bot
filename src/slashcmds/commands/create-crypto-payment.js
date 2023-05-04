const {SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const colors = require('../../../assets/colors.json');
const cryptoService = require('../../../src/services/crypto-service');
const config = require('../../../config');
const time = require('../../../util/time')

// 2 hours difference between Denmark, and 4 hours difference between GMT

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crypto_payment')
        .setDescription('Listens to crypto payment')
        .addStringOption((option) => option
            .setName('token')
            .setDescription('Select token')
            .setRequired(true)
            .addChoices({name: 'BTC', value: 'BTC'}, {name: 'ETH', value: 'ETH'}, {name: 'LTC', value: 'LTC'}))
        .addNumberOption((option) => option
            .setName('usd_amount')
            .setDescription('Enter amount value')
            .setRequired(true)),
    async execute(interaction) {
        const token = interaction.options.getString('token');
        const usdAmount = interaction.options.getNumber('usd_amount');
        let address = cryptoService.getCryptoAddress(token);

        if (address == null) {
            const savedAddressEmbed = new EmbedBuilder()
                .setColor(colors.error)
                .setTitle(`${token} address is not set!`)
            await interaction.reply({
                embeds: [savedAddressEmbed], ephemeral: true
            });
            return;
        }

        const crypto = await cryptoService.getCryptoInfo(token);

        if (crypto == null) return;

        const cryptoPendingAmount = (usdAmount / crypto.currentValue).toFixed(8);

        const cryptoPendingPaymentEmbed = new EmbedBuilder()
            .setColor(colors.pending)
            .setTitle('Payment processor')
            .setDescription(`Please send exact ${token} amount to avoid delays.`)
            .addFields(
                {name: 'Method:', value: crypto.longName, inline: true},
                {name: token, value: cryptoPendingAmount, inline: true},
                {name: 'USD:', value: `$${usdAmount}`, inline: true},
                {name: 'Address:', value: address, inline: false},
                {name: 'Status:', value: `Waiting for payment...`, inline: false},
            );

        const currentEpochUTC = time.getEpochTimestamp();

        const checkPaymentButton = new ButtonBuilder()
            .setCustomId(`check-payment:${generateId()}:${token}:${crypto.longName}:${cryptoPendingAmount}:${usdAmount}:${currentEpochUTC}`)
            .setLabel('Check status')
            .setStyle(ButtonStyle.Secondary);

        const copyAddressButton = new ButtonBuilder()
            .setCustomId(`copy-address:${token}`)
            .setLabel('Copy address')
            .setStyle(ButtonStyle.Secondary);

        const copyAmountButton = new ButtonBuilder()
            .setCustomId(`copy-amount:${cryptoPendingAmount}`)
            .setLabel('Copy amount')
            .setStyle(ButtonStyle.Secondary);

        const paymentButtonsRow = new ActionRowBuilder()
            .addComponents(checkPaymentButton);

        const copyButtonsRow = new ActionRowBuilder()
            .addComponents(copyAddressButton,copyAmountButton);

        await interaction.reply({
            embeds: [cryptoPendingPaymentEmbed], components: [paymentButtonsRow,copyButtonsRow],
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