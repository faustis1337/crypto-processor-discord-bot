const crypto = require('../services/crypto-service');
const {EmbedBuilder, AttachmentBuilder} = require('discord.js');
const colors = require('../../assets/colors.json');
const time = require('../../util/time');
const config = require('../../config');
const responseService = require('../services/response-service');

const waitSecondsBetweenClicks = 20;
const clickWaitingCollection = {};

module.exports = {
    id: 'check-payment', execute: async (interaction, args) => {
        const buttonId = args[0];
        const token = args[1];
        const longName = args[2];
        const cryptoAmount = args[3];
        const usdAmount = args[4];
        const startEpochTime = args[5];

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
            image: null,
            value: cryptoAmount,
            valueUSD: usdAmount,
            startPaymentCreationEpoch: startEpochTime,
            transactionFoundLink: null,
            requiredConfirmations: null,
            currentConfirmations: null,
        };

        paymentInfo.address = crypto.getCryptoAddress(token);
        paymentInfo.image = (await crypto.getCryptoInfo(token)).image;
        if (paymentInfo.address == null) return;
        await interaction.deferUpdate();

        const response = await responseService.latestPaymentResponse(interaction,paymentInfo);

        await interaction.editReply(response);

        await interaction.followUp({
            content: `Transaction status updated`,
            ephemeral: true,
        });
    },
};

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