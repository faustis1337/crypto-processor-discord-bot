module.exports = {
    name: 'interactionCreate',
    execute(interaction) {
        if (!interaction.isCommand()) return;
        const cmd = interaction.client.container.slashcmds.get(
            interaction.commandName,
        );

        if (!cmd) return;

        try {
            cmd.execute(interaction);
        }
        catch (error) {
            console.error(error);
        }
    },
};