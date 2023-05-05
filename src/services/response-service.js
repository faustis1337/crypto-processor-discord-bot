const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, AttachmentBuilder} = require("discord.js");
const colors = require("../../assets/colors.json");
const config = require("../../config");
const time = require("../../util/time");
const cryptoService = require("./crypto-service");
const idGenerator = require("../../util/id-generator")
const crypto = require("./crypto-service");

async function selectCryptosResponse(usdAmount) {
    const cryptoPendingPaymentEmbed = new EmbedBuilder()
        .setColor(colors.invisible)
        .setTitle('Payment processor')
        .setDescription(`Choose payment method\n\n Total Amount: **$${usdAmount}**`);


    const btcButton = new ButtonBuilder()
        .setCustomId(`select-crypto:BTC:${usdAmount}`)
        .setLabel('Bitcoin')
        .setStyle(ButtonStyle.Secondary);

    const ethButton = new ButtonBuilder()
        .setCustomId(`select-crypto:ETH:${usdAmount}`)
        .setLabel('Ethereum')
        .setStyle(ButtonStyle.Secondary);

    const ltcButton = new ButtonBuilder()
        .setCustomId(`select-crypto:LTC:${usdAmount}`)
        .setLabel('Litecoin')
        .setStyle(ButtonStyle.Secondary).setEmoji(config.emojis.ltc);

    const btcEmoji = config.emojis.btc;
    const ethEmoji = config.emojis.eth;
    const ltcEmoji = config.emojis.ltc;

    if (btcEmoji) {
        btcButton.setEmoji(btcEmoji);
    }

    if (ethEmoji) {
        ethButton.setEmoji(ethEmoji);
    }

    if (ltcEmoji) {
        ltcButton.setEmoji(ltcEmoji);
    }

    const cryptoButtonsRow = new ActionRowBuilder()
        .addComponents(btcButton, ethButton, ltcButton);

    return {
        embeds: [cryptoPendingPaymentEmbed],
        components: [cryptoButtonsRow],
        files: []
    };
}

async function waitingPaymentResponse(token, image, cryptoLongName, address, usdAmount, cryptoAmount, messageId) {
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
        .setThumbnail(`attachment://${image}`)
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
        .setStyle(ButtonStyle.Secondary);

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
        .setStyle(ButtonStyle.Secondary);

    const getConfirmationsEmoji = config.emojis.get_confirmations;
    const leftArrowEmoji = config.emojis.left_arrow;

    if (getConfirmationsEmoji) {
        checkPaymentButton.setEmoji(getConfirmationsEmoji);
    }

    if (leftArrowEmoji) {
        changePaymentMethodButton.setEmoji(leftArrowEmoji);
    }


    const firstButtonRow = new ActionRowBuilder()
        .addComponents(checkPaymentButton, copyAddressButton, copyAmountButton);

    const secondButtonRow = new ActionRowBuilder()
        .addComponents(changePaymentMethodButton);
    const file = new AttachmentBuilder(`assets/${image}`);
    return {
        embeds: [cryptoPendingPaymentEmbed],
        components: [firstButtonRow, secondButtonRow],
        files: [file]
    };
}

async function latestPaymentResponse(interaction,paymentInfo) {
    const explorerUrls = {
        BTC: 'https://www.blockchain.com/explorer/transactions/btc',
        ETH: 'https://www.blockchain.com/explorer/transactions/eth',
        LTC: 'https://blockchair.com/litecoin/transaction',
    };

    try {
        let tx;
        switch (paymentInfo.token) {
            case 'BTC':
                paymentInfo.requiredConfirmations = 1;
                tx = await crypto.findBitcoinTransaction(paymentInfo);
                if (tx != null) {
                    paymentInfo.hash = tx.hash;
                    paymentInfo.transactionFoundLink = `Transaction found: ${explorerUrls.BTC}/${tx.hash}`;
                    paymentInfo.currentConfirmations = tx.confirmations;
                }
                break;
            case 'ETH':
                paymentInfo.requiredConfirmations = 20;
                tx = await crypto.findEthereumTransaction(paymentInfo);
                if (tx != null) {
                    paymentInfo.hash = tx.hash;
                    paymentInfo.transactionFoundLink = `Transaction found: ${explorerUrls.ETH}/${tx.hash}`;
                    paymentInfo.currentConfirmations = tx.confirmations;
                }
                break;
            case 'LTC':
                paymentInfo.requiredConfirmations = 3;
                tx = await crypto.findLitecoinTransaction(paymentInfo);
                if (tx != null) {
                    paymentInfo.hash = tx.hash;
                    paymentInfo.transactionFoundLink = `Transaction found: ${explorerUrls.LTC}/${tx.hash}`;
                    paymentInfo.currentConfirmations = tx.confirmations;
                }
                break;
        }

        let paymentConfirmed = false;
        const date = new Date();
        const options = {timeZoneName: 'short'};
        const dateString = date.toLocaleString('en-US', options);
        const file = new AttachmentBuilder(`assets/${paymentInfo.image}`);

        const cryptoPendingPaymentEmbed = new EmbedBuilder().setTitle('Payment processor').setColor(colors.pending).setDescription(paymentInfo.hash == null ? `Please send exact ${paymentInfo.token} amount to avoid delays.` : paymentInfo.transactionFoundLink).addFields({
            name: 'Method', value: paymentInfo.CryptoLongName, inline: true,
        }, {name: paymentInfo.token, value: paymentInfo.value, inline: true}, {
            name: 'USD', value: `$${paymentInfo.valueUSD}`, inline: true,
        }).setFooter({text: `Last updated ${dateString}`}).setThumbnail(`attachment://${paymentInfo.image}`);

        if (paymentInfo.hash == null) {
            cryptoPendingPaymentEmbed
                .addFields({name: 'Address', value: paymentInfo.address, inline: false}, {
                    name: 'Status', value: 'Waiting for payment', inline: true,
                });

            return {
                embeds: [cryptoPendingPaymentEmbed],
                files: [file]
            };
        }


        if (paymentInfo.currentConfirmations == null) {
            cryptoPendingPaymentEmbed
                .addFields({name: 'Confirmations', value: `0/${paymentInfo.requiredConfirmations}`, inline: false}, {
                    name: 'Status', value: 'Waiting for confirmations', inline: true,
                });
        } else if (paymentInfo.currentConfirmations < paymentInfo.requiredConfirmations) {
            cryptoPendingPaymentEmbed.addFields({
                name: 'Confirmations',
                value: `${paymentInfo.currentConfirmations}/${paymentInfo.requiredConfirmations}`,
                inline: false,
            }, {name: 'Status', value: 'Waiting for confirmations', inline: false});
        } else if (paymentInfo.currentConfirmations >= paymentInfo.requiredConfirmations) {
            cryptoPendingPaymentEmbed.setColor(colors.success).addFields({
                name: 'Confirmations',
                value: `${paymentInfo.requiredConfirmations}/${paymentInfo.requiredConfirmations}`,
                inline: false,
            }, {name: 'Status', value: 'Completed', inline: false});
            paymentConfirmed = true;
        }
        if (cryptoPendingPaymentEmbed == null) return;

        if (paymentConfirmed) {
            return {
                embeds: [cryptoPendingPaymentEmbed], components: [], files: [file]
            };
        } else {
            const actionRow = interaction.message.components[0];
            actionRow.components = actionRow.components.splice(0, 1);
            actionRow.components[0].data.label = 'Get Confirmations';

            return {
                embeds: [cryptoPendingPaymentEmbed], components: [actionRow], files: [file]
            };
        }
    } catch (err) {
        console.log(err);
    }
}

module.exports = {selectCryptosResponse, waitingPaymentResponse,latestPaymentResponse};