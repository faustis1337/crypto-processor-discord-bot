const cryptoService = require('../services/crypto-service');
const {EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder} = require('discord.js');
const colors = require('../../assets/colors.json');
const time = require('../../util/time');
const config = require('../../config');

const responseService = require('../services/response-service');

module.exports = {
    id: 'select-crypto', execute: async (interaction, args) => {
        const token = args[0];
        const usdAmount = args[1];
        const address = cryptoService.getCryptoAddress(token);
        const crypto = await cryptoService.getCryptoInfo(token);
        const longName = crypto.longName;
        const cryptoAmount = await crypto.getCurrentValue();
        const image = await crypto.image;

        if (token!==undefined) {
            const response = await responseService.waitingPaymentResponse(interaction,token, image,longName, address, usdAmount, cryptoAmount, interaction.message.id)
            if(address!=null){
             await interaction.deferUpdate();
             await interaction.editReply(response);
        }}
    },
};