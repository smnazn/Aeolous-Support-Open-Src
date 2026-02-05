const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

// Discord epoch (first second of 2015)
const DISCORD_EPOCH = 1420070400000n;

// Extract timestamp from any Discord snowflake ID
function snowflakeToTimestamp(snowflake) {
    const id = BigInt(snowflake);
    return Number((id >> 22n) + DISCORD_EPOCH);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timediff')
        .setDescription('Calcula la diferencia de tiempo entre dos IDs de Discord (mensajes, usuarios, etc.)')
        .addStringOption(option => option.setName('id1').setDescription('Primer ID').setRequired(true))
        .addStringOption(option => option.setName('id2').setDescription('Segundo ID (opcional)').setRequired(false)),

    async execute(interaction) {
        const id1 = interaction.options.getString('id1');
        const id2 = interaction.options.getString('id2');
        await this.handleTimediff(interaction, id1, id2);
    },

    async messageRun(message, args) {
        // Usage:
        // .timediff <id1> <id2> - Compare two IDs
        // .timediff <id1> (replying to a message) - Compare ID with replied message
        // .timediff <id1> - Compare ID with current time

        if (args.length === 0 && !message.reference) {
            const embed = new EmbedBuilder()
                .setTitle('<:reminder:1448489924083843092> Diferencia de Tiempo')
                .setDescription(`> **Uso:**
> \`.timediff <id1> <id2>\` - Entre dos IDs
> \`.timediff <id>\` (respondiendo) - Entre el ID y el mensaje respondido
> \`.timediff <id>\` - Entre el ID y ahora

<a:15136blackdot:1448143887699804252> Funciona con cualquier ID de Discord (mensajes, usuarios, canales, etc.)`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        let id1 = args[0];
        let id2 = args[1] || null;

        // If replying to a message and no second ID, use replied message ID
        if (message.reference && !id2) {
            id2 = message.reference.messageId;
        }

        await this.handleTimediff(message, id1, id2);
    },

    async handleTimediff(source, id1, id2 = null) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        // Validate ID1
        if (!id1 || !/^\d{17,21}$/.test(id1)) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> **Error:** ID inválido. Debe ser un snowflake de Discord (17-21 dígitos).')
                .setColor(0x2B2D31);
            return reply({ embeds: [embed], ephemeral: true });
        }

        let time1, time2;

        try {
            time1 = snowflakeToTimestamp(id1);
        } catch (e) {
            const embed = new EmbedBuilder()
                .setDescription('<:deny:1448831817963536506> **Error:** No se pudo extraer el timestamp del ID 1.')
                .setColor(0x2B2D31);
            return reply({ embeds: [embed], ephemeral: true });
        }

        if (id2) {
            // Validate ID2
            if (!/^\d{17,21}$/.test(id2)) {
                const embed = new EmbedBuilder()
                    .setDescription('<:deny:1448831817963536506> **Error:** ID 2 inválido. Debe ser un snowflake de Discord (17-21 dígitos).')
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed], ephemeral: true });
            }

            try {
                time2 = snowflakeToTimestamp(id2);
            } catch (e) {
                const embed = new EmbedBuilder()
                    .setDescription('<:deny:1448831817963536506> **Error:** No se pudo extraer el timestamp del ID 2.')
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed], ephemeral: true });
            }
        } else {
            // Use current time
            time2 = Date.now();
        }

        // Calculate difference
        const diff = Math.abs(time2 - time1);

        // Format time
        const totalSeconds = diff / 1000;
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = (totalSeconds % 60).toFixed(3);

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;

        const embed = new EmbedBuilder()
            .setTitle('<:reminder:1448489924083843092> Diferencia de Tiempo')
            .setDescription(`> **ID 1:** \`${id1}\`
> <t:${Math.floor(time1 / 1000)}:F>

> **${id2 ? 'ID 2' : 'Ahora'}:** \`${id2 || 'N/A'}\`
> <t:${Math.floor(time2 / 1000)}:F>

<a:15136blackdot:1448143887699804252> **Diferencia:** \`${timeString}\``)
            .setColor(0x2B2D31);

        await reply({ embeds: [embed] });
    }
};












