const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserStats = require('../../models/UserStats');
const { createErrorEmbed } = require('../../utils/helpers');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('messages')
        .setDescription('Check message statistics')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View message stats for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check stats for')))
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Show the message leaderboard'))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add messages to a user (Admin only)')
                .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
                .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove messages from a user (Admin only)')
                .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
                .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true))),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'top') {
            await this.handleTop(interaction);
        } else if (sub === 'view') {
            const user = interaction.options.getUser('user') || interaction.user;
            await this.handleStats(interaction, user);
        } else if (sub === 'add' || sub === 'remove') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'You do not have permission.', ephemeral: true });
            }
            const user = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            await this.handleManage(interaction, sub, user, amount);
        }
    },

    async messageRun(message, args) {
        const sub = args[0]?.toLowerCase();

        if (sub === 'top') {
            await this.handleTop(message);
        } else if (sub === 'add' || sub === 'remove') {
            if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
            const user = message.mentions.users.first();
            const amount = parseInt(args[2]);
            if (user && !isNaN(amount)) {
                await this.handleManage(message, sub, user, amount);
            } else {
                const prefix = await getPrefix(message.guild.id);
                message.reply(`Usage: ${prefix}messages <add/remove> <user> <amount>`);
            }
        } else {
            const user = message.mentions.users.first() || message.author;
            await this.handleStats(message, user);
        }
    },

    async handleStats(source, user) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const stats = await UserStats.findOne({ guildId, userId: user.id });
            const count = stats ? stats.messageCount : 0;
            const daily = stats ? stats.dailyMessageCount : 0;

            const embed = new EmbedBuilder()
                .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
                .setDescription(
                    `${DISCO_ICONS.POINT} ${DISCO_ICONS.MESSAGE} **Total Messages:** ${count.toLocaleString()}\n` +
                    `${DISCO_ICONS.POINT} ${DISCO_ICONS.MESSAGE} **Messages Today:** ${daily.toLocaleString()}`
                )
                .setColor(0x2B2D31)
                .setTimestamp();

            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await reply({ embeds: [createErrorEmbed('Failed to fetch message stats.')], ephemeral: true });
        }
    },

    async handleTop(source) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const topUsers = await UserStats.find({ guildId })
                .sort({ messageCount: -1 })
                .limit(10);

            if (!topUsers.length) {
                return reply({ embeds: [createErrorEmbed('No message stats found yet.')] });
            }

            const description = topUsers.map((stat, index) => {
                return `\`${index + 1}.\` <@${stat.userId}> - **${stat.messageCount.toLocaleString()}** messages`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.TOP} Message Leaderboard`)
                .setDescription(description)
                .setColor(0x2B2D31)
                .setFooter({ text: source.guild.name, iconURL: source.guild.iconURL() });

            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await reply({ embeds: [createErrorEmbed('Failed to fetch leaderboard.')], ephemeral: true });
        }
    },

    async handleManage(source, action, user, amount) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        try {
            const val = action === 'add' ? amount : -amount;
            await UserStats.findOneAndUpdate(
                { guildId, userId: user.id },
                { $inc: { messageCount: val } },
                { upsert: true, new: true }
            );
            await reply({ content: `✅ Successfully ${action}ed **${amount}** messages to ${user.tag}.`, ephemeral: true });
        } catch (e) {
            await reply({ content: `Error: ${e.message}`, ephemeral: true });
        }
    }
};











