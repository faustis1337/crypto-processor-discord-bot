const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require("discord.js");
const colors = require("../../assets/colors.json");
const config = require("../../config");
const time = require("../../util/time");
const cryptoService = require("./crypto-service");
const idGenerator = require("../../util/id-generator")

async function selectCryptosResponse(usdAmount) {
    const cryptoPendingPaymentEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle('Payment processor')
        .setDescription(`Choose payment method\n\n Total Amount: **$${usdAmount}**`);

    const btcButton = new ButtonBuilder()
        .setCustomId(`select-crypto:BTC:${usdAmount}`)
        .setLabel('Bitcoin')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.btc);

    const ethButton = new ButtonBuilder()
        .setCustomId(`select-crypto:ETH:${usdAmount}`)
        .setLabel('Ethereum')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.eth);

    const ltcButton = new ButtonBuilder()
        .setCustomId(`select-crypto:LTC:${usdAmount}`)
        .setLabel('Litecoin')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.ltc);

    const cryptoButtonsRow = new ActionRowBuilder()
        .addComponents(btcButton,ethButton,ltcButton);

    return {
        embeds: [cryptoPendingPaymentEmbed],
        components: [cryptoButtonsRow]
    };
}

async function waitingPaymentResponse(token,cryptoLongName,address,usdAmount,cryptoAmount,messageId){
    if (address == null) {
        const savedAddressEmbed = new EmbedBuilder()
            .setColor(colors.error)
            .setTitle(`${token} address is not set!`)
        await interaction.reply({
            embeds: [savedAddressEmbed], ephemeral: true
        });
        return;
    }

    const cryptoPendingAmount = (usdAmount / cryptoAmount).toFixed(8);

    const cryptoPendingPaymentEmbed = new EmbedBuilder()
        .setColor(colors.pending)
        .setTitle('Payment processor')
        .setDescription(`Please send exact ${token} amount to avoid delays.`)
        .addFields(
            {name: 'Method:', value: cryptoLongName, inline: true},
            {name: token, value: cryptoPendingAmount, inline: true},
            {name: 'USD:', value: `$${usdAmount}`, inline: true},
            {name: 'Address:', value: address, inline: false},
            {name: 'Status:', value: `Waiting for payment...`, inline: false},
        );

    const currentEpochUTC = time.getEpochTimestamp();

    const checkPaymentButton = new ButtonBuilder()
        .setCustomId(`check-payment:${idGenerator.generateId()}:${token}:${cryptoLongName}:${cryptoPendingAmount}:${usdAmount}:${currentEpochUTC}`)
        .setLabel('Check Transaction')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.get_confirmations);

    const copyAddressButton = new ButtonBuilder()
        .setCustomId(`copy-address:${token}`)
        .setLabel('Copy Address')
        .setStyle(ButtonStyle.Secondary).setEmoji('📋');

    const copyAmountButton = new ButtonBuilder()
        .setCustomId(`copy-amount:${cryptoPendingAmount}`)
        .setLabel('Copy Amount')
        .setStyle(ButtonStyle.Secondary).setEmoji('📋');

    const changePaymentMethodButton = new ButtonBuilder()
        .setCustomId(`change-payment-method:${usdAmount}:${messageId}`)
        .setLabel('Change Payment Method')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.left_arrow);

    const firstButtonRow = new ActionRowBuilder()
        .addComponents(checkPaymentButton,copyAddressButton, copyAmountButton);

    const secondButtonRow = new ActionRowBuilder()
        .addComponents(changePaymentMethodButton);

    return {
        embeds: [cryptoPendingPaymentEmbed],
        components: [firstButtonRow,secondButtonRow]
    };
}

module.exports = {selectCryptosResponse,waitingPaymentResponse};