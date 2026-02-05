const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Status icons - change these to your emojis
const EMOJI_GREEN = '<:goodsingal:1467577642965532865>';      // Good (< 100ms)
const EMOJI_ORANGE = '<:diamond:1448143873170735116>';   // Medium (100-300ms)
const EMOJI_RED = '<:Deny:1467913698013089953>'; // Bad (> 300ms)
const EMOJI_LOADING = '<:reminder:1448489924083843092>';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Shows bot ping and latency with auto-update.'),
    async execute(interaction) {
        await this.handleStatus(interaction);
    },
    async messageRun(message) {
        await this.handleStatus(message);
    },
    async handleStatus(source) {
        const client = source.client;
        const isInteraction = !!source.deferReply;

        const embed = new EmbedBuilder()
            .setDescription(`${EMOJI_LOADING} Calculando...`)
            .setColor(0x2B2D31);

        let msg;
        if (isInteraction) {
            await source.reply({ embeds: [embed] });
            msg = await source.fetchReply();
        } else {
            msg = await source.reply({ embeds: [embed] });
        }

        // Function to get status emoji based on ping
        const getStatusEmoji = (ping) => {
            if (ping < 100) return EMOJI_GREEN;
            if (ping < 300) return EMOJI_ORANGE;
            return EMOJI_RED;
        };

        // Function to update the status
        const updateStatus = async () => {
            const wsping = client.ws.ping;
            const statusEmoji = getStatusEmoji(wsping);

            const statusText = wsping < 100 ? 'Excelente' : wsping < 300 ? 'Normal' : 'Lento';

            const updatedEmbed = new EmbedBuilder()
                .setDescription(`${statusEmoji} **${wsping}ms** | Estado: **${statusText}**`)
                .setColor(0x2B2D31)
                .setFooter({ text: 'Actualización automática cada 5s' });

            try {
                await msg.edit({ embeds: [updatedEmbed] });
            } catch (e) {
                // Message was deleted, stop updating
                return false;
            }
            return true;
        };

        // Initial update
        await updateStatus();

        // Auto-update every 5 seconds for 30 seconds
        let updates = 0;
        const interval = setInterval(async () => {
            updates++;
            const success = await updateStatus();

            if (!success || updates >= 6) {
                clearInterval(interval);
                // Final message without auto-update footer
                const wsping = client.ws.ping;
                const statusEmoji = getStatusEmoji(wsping);
                const statusText = wsping < 100 ? 'Excelente' : wsping < 300 ? 'Normal' : 'Lento';

                const finalEmbed = new EmbedBuilder()
                    .setDescription(`${statusEmoji} **${wsping}ms** | Estado: **${statusText}**`)
                    .setColor(0x2B2D31);

                try {
                    await msg.edit({ embeds: [finalEmbed] });
                } catch (e) { }
            }
        }, 5000);
    }
};







