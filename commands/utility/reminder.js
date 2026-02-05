const { SlashCommandBuilder } = require('discord.js');
const { createErrorEmbed, createSuccessEmbed, ICONS, parseTime } = require('../../utils/helpers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminder')
        .setDescription('Set a reminder.')
        .addStringOption(option => option.setName('time').setDescription('Time (e.g., 10s, 1m, 1h)').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('Reminder message').setRequired(true)),
    async execute(interaction) {
        const time = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        await this.handleReminder(interaction, time, message);
    },
    async messageRun(message, args) {
        if (args.length < 2) {
            const { EmbedBuilder } = require('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('<:reminder:1448489924083843092> Set Reminder')
                .setDescription(`**Usage:** \`.reminder <time> <message>\` or \`.rm <time> <message>\`\n**Example:** \`.rm 10m Buy milk\`\n\n${ICONS.POINT} Time format: \`10s\`, \`5m\`, \`2h\``)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        const time = args[0];
        const msg = args.slice(1).join(' ');
        await this.handleReminder(message, time, msg);
    },
    async handleReminder(source, time, message) {
        const duration = parseTime(time);
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        if (!duration) {
            const embed = createErrorEmbed(`**Invalid time format**\n\n${ICONS.POINT} Use: \`s\` (seconds), \`m\` (minutes), \`h\` (hours)`);
            return reply({ embeds: [embed], ephemeral: true });
        }

        const embed = createSuccessEmbed('Reminder Set',
            `> **Time:** \`${time}\`\n> **Message:** ${message}\n\n${ICONS.POINT} I will remind you!`
        );

        if (source.reply) await source.reply({ embeds: [embed] });
        else await source.channel.send({ embeds: [embed] });

        setTimeout(async () => {
            try {
                const user = source.user || source.author;
                const { EmbedBuilder } = require('discord.js');
                const reminderEmbed = new EmbedBuilder()
                    .setDescription(`<:reminder:1448489924083843092> **¡Recordatorio!** <@${user.id}>\n\n> ${message}`)
                    .setColor(0x2B2D31)
                    .setTimestamp();
                await source.channel.send({ content: `<@${user.id}>`, embeds: [reminderEmbed] });
            } catch (e) {
                console.error('Reminder error:', e);
            }
        }, duration);
    }
};











