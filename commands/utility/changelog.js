const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

// Bot changelog - update this when you make changes
const CHANGELOG = [
    {
        version: '2.6.0',
        date: '2025-12-11',
        changes: [
            { type: 'added', text: 'Indices MongoDB para queries mas rapidas' },
            { type: 'added', text: 'Cache de 5 minutos para configuracion' },
            { type: 'fixed', text: 'Antiraid commands optimizados (anti, logchannel, whitelist)' },
            { type: 'fixed', text: 'Fun commands optimizados (avatar, embed, say)' },
            { type: 'fixed', text: 'Moderation commands optimizados (warn, purge)' },
            { type: 'fixed', text: 'Ticket commands optimizados (close)' },
            { type: 'fixed', text: 'Todos los comandos usan DISCO_ICONS' },
            { type: 'fixed', text: 'Inline requires eliminados de messageCreate' },
            { type: 'removed', text: 'Modelo GuildPrefix redundante' },
            { type: 'removed', text: 'Iconos hardcodeados en comandos' },
        ]
    }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('changelog')
        .setDescription('Ver los cambios recientes del bot')
        .addIntegerOption(o => o
            .setName('version')
            .setDescription('Número de versiones a mostrar')
            .setMinValue(1)
            .setMaxValue(5)),

    async execute(interaction) {
        await this.showChangelog(interaction);
    },

    async messageRun(message, args) {
        await this.showChangelog(message);
    },

    async showChangelog(source) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const count = source.options?.getInteger('version') || 3;

        const versionsToShow = CHANGELOG.slice(0, count);

        const embeds = [];

        for (const version of versionsToShow) {
            let diffContent = '';

            for (const change of version.changes) {
                switch (change.type) {
                    case 'added':
                        diffContent += `+ [ADDED] ${change.text}\n`;
                        break;
                    case 'fixed':
                        diffContent += `+ [FIXED] ${change.text}\n`;
                        break;
                    case 'removed':
                        diffContent += `- [REMOVED] ${change.text}\n`;
                        break;
                    default:
                        diffContent += `  ${change.text}\n`;
                }
            }

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} v${version.version}`)
                .setDescription(`**Fecha:** ${version.date}\n\`\`\`diff\n${diffContent}\`\`\``)
                .setColor(0x2B2D31);

            embeds.push(embed);
        }

        await reply({ embeds: embeds.slice(0, 10) });
    }
};
