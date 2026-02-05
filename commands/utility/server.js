const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('Provides information about the server.'),
    async execute(interaction) {
        await this.showServerInfo(interaction);
    },
    async messageRun(message, args) {
        await this.showServerInfo(message);
    },
    async showServerInfo(source) {
        const guild = source.guild;
        const reply = source.reply ? source.reply.bind(source) : source.channel.send.bind(source.channel);

        // Fetch more data
        const owner = await guild.fetchOwner();
        const channels = guild.channels.cache;
        const textChannels = channels.filter(c => c.type === 0).size;
        const voiceChannels = channels.filter(c => c.type === 2).size;
        const categories = channels.filter(c => c.type === 4).size;
        const roles = guild.roles.cache.size - 1; // Exclude @everyone
        const emojis = guild.emojis.cache.size;
        const stickers = guild.stickers.cache.size;
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;

        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };

        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.INFO} ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 512 }))
            .addFields(
                { name: `${DISCO_ICONS.CROWN} Owner`, value: `${owner.user}`, inline: true },
                { name: `${DISCO_ICONS.MEMBER} Members`, value: `\`${guild.memberCount}\``, inline: true },
                { name: `${DISCO_ICONS.BOOSTER} Boosts`, value: `\`${boostCount}\` (Tier ${boostLevel})`, inline: true },
                { name: `${DISCO_ICONS.INFO} Channels`, value: `\`${textChannels}\` Text • \`${voiceChannels}\` Voice • \`${categories}\` Categories`, inline: false },
                { name: `${DISCO_ICONS.INFO} Roles`, value: `\`${roles}\``, inline: true },
                { name: `${DISCO_ICONS.EMOJIS} Emojis`, value: `\`${emojis}\``, inline: true },
                { name: `${DISCO_ICONS.INFO} Stickers`, value: `\`${stickers}\``, inline: true },
                { name: `${DISCO_ICONS.INFO} Verification`, value: verificationLevels[guild.verificationLevel] || 'Unknown', inline: true },
                { name: `${DISCO_ICONS.INFO} Created`, value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
                { name: `${DISCO_ICONS.INFO} Server ID`, value: `\`${guild.id}\``, inline: true }
            )
            .setColor(0x2B2D31)
            .setFooter({ text: `Requested by ${(source.user || source.author).tag}` });

        // Add banner if exists
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ size: 512 }));
        }

        await reply({ embeds: [embed] });
    }
};












