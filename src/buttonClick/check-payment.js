const crypto = require('../services/crypto-service');
const {EmbedBuilder} = require('discord.js');
const colors = require('../../assets/colors.json');
const time = require('../../util/time');
const config = require('../../config');

const waitSecondsBetweenClicks = 20;
const clickWaitingCollection = {};

module.exports = {
    id: 'check-payment', execute: async (interaction, args) => {
        try {
        const buttonId = args[0];
        const token = args[1];
        const longName = args[2];
        const cryptoAmount = args[3];
        const usdAmount = args[4];
        const startEpochTime = args[5];

        const explorerUrls = {
            BTC: 'https://www.blockchain.com/explorer/transactions/btc',
            ETH: 'https://www.blockchain.com/explorer/transactions/eth',
            LTC: 'https://blockchair.com/litecoin/transaction',
        };

        const secondsLeft = secondsLeftToClick(buttonId, clickWaitingCollection[buttonId]);
        if (secondsLeft > 0) {
            await interaction.reply({
                content: `You can click in ${secondsLeft} seconds!`,
                ephemeral: true,
            });
            return;
        }
        const paymentInfo = {
            id: buttonId,
            hash: null,
            address: null,
            token: token,
            CryptoLongName: longName,
            value: cryptoAmount,
            valueUSD: usdAmount,
            startPaymentCreationEpoch: startEpochTime,
            transactionFoundLink: null,
            requiredConfirmations: null,
            currentConfirmations: null,
        };

        paymentInfo.address = crypto.getCryptoAddress(token);
        if (paymentInfo.address == null) return;

        let tx;
        await interaction.deferUpdate();
        switch (token) {
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

            await handlePayment(interaction, paymentInfo);
        } catch (err) {
            console.log(err);
        }
    },
};

async function handlePayment(interaction, paymentInfo) {

    let paymentConfirmed = false;
    const date = new Date();
    const options = {timeZoneName: 'short'};
    const dateString = date.toLocaleString('en-US', options);

    const cryptoPendingPaymentEmbed = new EmbedBuilder().setTitle('Payment processor').setColor(colors.pending).setDescription(paymentInfo.hash == null ? `Please send exact ${paymentInfo.token} amount to avoid delays.` : paymentInfo.transactionFoundLink).addFields({
        name: 'Method', value: paymentInfo.CryptoLongName, inline: true,
    }, {name: paymentInfo.token, value: paymentInfo.value, inline: true}, {
        name: 'USD', value: `$${paymentInfo.valueUSD}`, inline: true,
    }).setFooter({text: `Last updated ${dateString}`});
    await interaction.followUp({
        content: `Transaction status updated`,
        ephemeral: true,
    });
    if (paymentInfo.hash == null) {
        cryptoPendingPaymentEmbed
            .addFields({name: 'Address', value: paymentInfo.address, inline: false}, {
                name: 'Status', value: 'Waiting for payment', inline: true,
            });
        await interaction.editReply({
            embeds: [cryptoPendingPaymentEmbed],
        });
        return;
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
        await interaction.editReply({
            embeds: [cryptoPendingPaymentEmbed], components: [],
        });
    } else {
        const actionRow = interaction.message.components[0];
        actionRow.components = actionRow.components.splice(0,1);
        actionRow.components[0].data.label = 'Get Confirmations';

        await interaction.editReply({
            embeds: [cryptoPendingPaymentEmbed],components:[actionRow]
        });
    }

}

function secondsLeftToClick(buttonId, lastTimeClickedEpoch) {
    if (lastTimeClickedEpoch == null) {
        clickWaitingCollection[buttonId] = time.getEpochTimestamp();
    } else {
        const timeElapsed = time.getEpochTimestamp() - lastTimeClickedEpoch;
        if (timeElapsed < waitSecondsBetweenClicks) {
            return waitSecondsBetweenClicks - timeElapsed;
        }
    }
    clickWaitingCollection[buttonId] = time.getEpochTimestamp();
    return 0;
}