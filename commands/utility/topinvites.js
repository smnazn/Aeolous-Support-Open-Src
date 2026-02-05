const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Invite = require('../../models/Invite');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('topinvites')
        .setDescription('Muestra el top de invitaciones del servidor'),

    aliases: ['topi'],

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
            const topUsers = await Invite.find({ guildId })
                .sort({ inviteCount: -1 })
                .limit(15);

            if (!topUsers.length) {
                return reply({
                    embeds: [new EmbedBuilder()
                        .setDescription(`${DISCO_ICONS.INFO} No hay estadísticas de invitaciones todavía.`)
                        .setColor(0x2B2D31)]
                });
            }

            const description = topUsers.map((stat, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `\`${index + 1}.\``;
                return `${medal} <@${stat.userId}> - **${stat.inviteCount.toLocaleString()}** ${DISCO_ICONS.INVITE}`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`<:top:1448490747774111834> Top Invitaciones`)
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
