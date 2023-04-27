module.exports = {

    name: 'interactionCreate',
    execute(interaction) {
        if (!interaction.isButton()) return;

        const customId = interaction.customId.split(':');

        const buttonId = customId[0];
        const args = customId.length >= 2 ? customId.slice(1) : [];

        const response = interaction.client.container.btnresponses.get(
            buttonId,
        );

        if (!response) return;

        try {
            response.execute(interaction, args);
        } catch (error) {
            console.error(error);
        }
    },
};