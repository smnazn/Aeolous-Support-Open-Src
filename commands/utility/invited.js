const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');
const Invite = require('../../models/Invite');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invited')
        .setDescription('Shows the list of users invited by someone')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),

    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        await this.showInvited(interaction, user);
    },

    async messageRun(message, args) {
        let user = message.mentions.users.first();
        if (!user && args[0] && /^\d{17,19}$/.test(args[0])) {
            try {
                user = await message.client.users.fetch(args[0]);
            } catch { }
        }
        if (!user) user = message.author;
        await this.showInvited(message, user);
    },

    async showInvited(source, user) {
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);
        const guildId = source.guild?.id || source.guildId;

        try {
            // Find all users who were invited by this user
            const invitedUsers = await Invite.find({ guildId, inviterId: user.id });

            if (!invitedUsers || invitedUsers.length === 0) {
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.WARNING} ${user.tag} no ha invitado a nadie.`)
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed] });
            }

            // Build the list - only show members still in the server
            let description = '';
            let count = 0;
            let stillInServer = 0;

            for (const inv of invitedUsers.slice(0, 30)) {
                // Check if user is still in the guild
                const member = await source.guild.members.fetch(inv.userId).catch(() => null);

                if (member) {
                    count++;
                    stillInServer++;
                    description += `\`#${count}\` • ${member.user} ✅\n`;
                }
            }

            // If no one is still in server, show message
            if (stillInServer === 0) {
                const embed = new EmbedBuilder()
                    .setDescription(`${DISCO_ICONS.WARNING} ${user.tag} ha invitado a ${invitedUsers.length} usuarios, pero ninguno sigue en el servidor.`)
                    .setColor(0x2B2D31);
                return reply({ embeds: [embed] });
            }

            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.REPEAT} Invited list of ${user.tag}`)
                .setDescription(description || 'No users found')
                .setColor(0x2B2D31)
                .setFooter({ text: `En servidor: ${stillInServer} | Total invitados: ${invitedUsers.length}` });

            await reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in invited command:', error);
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} Error al obtener la lista.`)
                .setColor(0x2B2D31);
            await reply({ embeds: [embed] });
        }
    }
};
