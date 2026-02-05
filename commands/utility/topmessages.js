const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserStats = require('../../models/UserStats');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topmessages')
        .setDescription('Muestra el top de mensajes del servidor'),

    aliases: ['topm'],

    async execute(interaction) {
        await this.handleTop(interaction);
    },

    async messageRun(message, args) {
        await this.handleTop(message);
    },

    async handleTop(source) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const topUsers = await UserStats.find({ guildId })
                .sort({ messageCount: -1 })
                .limit(15);

            if (!topUsers.length) {
                return reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.INFO} No hay estadísticas de mensajes todavía.`)
                        .setColor(0x2B2D31)]
                });
            }

            const description = topUsers.map((stat, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `\`${index + 1}.\``;
                return `${medal} <@${stat.userId}> - **${stat.messageCount.toLocaleString()}** ${DISCO_ICONS.MESSAGE}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`<:top:1448490747774111834> Top Mensajes`)
                .setDescription(description)
                .setColor(0x2B2D31)
                .setThumbnail(source.guild.iconURL())
                .setFooter({ text: source.guild.name })
                .setTimestamp();

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await reply({ content: '❌ Error al obtener el leaderboard.', ephemeral: true });
        }
    }
};
