const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Invite = require('../../models/Invite');
const { createErrorEmbed } = require('../../utils/helpers');
const { DISCO_ICONS } = require('../../utils/icons');
const { getPrefix } = require('../../utils/guildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Check invite statistics')
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View invite stats for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check stats for')))
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Show the invite leaderboard'))
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add regular invites to a user (Admin only)')
                .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
                .addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)))
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove regular invites from a user (Admin only)')
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
                message.reply(`Usage: ${prefix}invites <add/remove> <user> <amount>`);
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
            const stats = await Invite.findOne({ guildId, userId: user.id });

            const regular = stats ? stats.regular : 0;
            const fake = stats ? stats.fake : 0;
            const rejoins = stats ? stats.rejoins : 0;
            const leaves = stats ? stats.leaves : 0;
            const total = (regular + rejoins) - leaves;

            const embed = new EmbedBuilder()
                .setDescription(
                    `<:information:1448485880623927468> **Invite Stats for ${user.username}**\n` +
                    `<a:15136blackdot:1448143887699804252> **Regular:** ${regular}\n` +
                    `<a:15136blackdot:1448143887699804252> **Rejoins:** ${rejoins}\n` +
                    `<a:15136blackdot:1448143887699804252> **Leaves:** ${leaves}\n` +
                    `<a:15136blackdot:1448143887699804252> **Fake:** ${fake}\n` +
                    `──────────────\n` +
                    `<a:15136blackdot:1448143887699804252> **Total:** ${total}`
                )
                .setColor(0x2B2D31)
                .setThumbnail(user.displayAvatarURL());

            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await reply({ embeds: [createErrorEmbed('Failed to fetch invite stats.')], ephemeral: true });
        }
    },

    async handleTop(source) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        try {
            const topUsers = await Invite.find({ guildId })
                .sort({ total: -1 })
                .limit(10);

            if (!topUsers.length) {
                return reply({ embeds: [createErrorEmbed('No invite stats found yet.')] });
            }

            const description = topUsers.map((stat, index) => {
                const tot = (stat.regular + stat.rejoins + (stat.bonus || 0)) - stat.leaves;
                return `\`${index + 1}.\`<@${stat.userId}> - ${tot} invites`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.TOP} Invite Leaderboard`)
                .setDescription(description)
                .setColor(0x2B2D31)
                .setFooter({ text: source.guild.name, iconURL: source.guild.iconURL() });

            await reply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await reply({ embeds: [createErrorEmbed('Failed to fetch invite leaderboard.')], ephemeral: true });
        }
    },

    async handleManage(source, action, user, amount) {
        const guildId = source.guild.id;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        try {
            const val = action === 'add' ? amount : -amount;
            const doc = await Invite.findOneAndUpdate(
                { guildId, userId: user.id },
                { $inc: { bonus: val } },
                { upsert: true, new: true }
            );
            // Updating total explicitly if needed by your app logic, or relying on calculation
            // Mongoose pre-save hooks can calculate 'total', but for atomic updates like $inc we should probably update 'total' too if it's stored.
            // But since 'total' is derived, it's safer to just $inc total as well.
            await Invite.updateOne(
                { _id: doc._id },
                { $inc: { total: val } }
            );

            await reply({ content: `✅ Successfully ${action}ed **${amount}** bonus invites to ${user.tag}.`, ephemeral: true });
        } catch (e) {
            await reply({ content: `Error: ${e.message}`, ephemeral: true });
        }
    }
};











