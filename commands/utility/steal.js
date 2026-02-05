const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Steal emojis or stickers.')
        .addStringOption(option => option.setName('emojis').setDescription('Emojis to steal (can paste multiple)').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions),
    async execute(interaction) {
        const emojis = interaction.options.getString('emojis');
        await this.handleSteal(interaction, emojis);
    },
    async messageRun(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** You do not have permission to manage emojis/stickers.`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        // Check if replying to a message
        if (message.reference) {
            const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

            // Check for sticker
            if (repliedMessage.stickers.size > 0) {
                const sticker = repliedMessage.stickers.first();
                const customName = args[0] || sticker.name;
                // Get proper sticker URL
                const stickerUrl = `https://media.discordapp.net/stickers/${sticker.id}.png?size=512`;
                return await this.handleStealSticker(message, stickerUrl, customName, sticker.description || 'Stolen sticker');
            }

            // Check for emojis in replied message
            const emojiRegex = /<a?:(\w+):(\d+)>/g;
            const matches = [...repliedMessage.content.matchAll(emojiRegex)];
            if (matches.length > 0) {
                return await this.handleMultipleEmojis(message, matches);
            }

            // Check for image attachment
            if (repliedMessage.attachments.size > 0) {
                const attachment = repliedMessage.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                    const customName = args[0] || 'stolen';
                    return await this.showStealOptions(message, attachment.url, customName);
                }
            }
        }

        if (args.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.EMOJIS} Steal Emoji/Sticker`)
                .setDescription(`> **Usage:**\n> \`.steal <emoji> [emoji2] [emoji3]...\` - Steal one or more emojis\n> Reply to a message with \`.steal\`\n\n${DISCO_ICONS.POINT} Supports multiple emojis at once!`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        // Find all emojis in the args
        const fullInput = args.join(' ');
        const emojiRegex = /<a?:(\w+):(\d+)>/g;
        const matches = [...fullInput.matchAll(emojiRegex)];

        if (matches.length === 0) {
            const embed = new EmbedBuilder()
                .setDescription(`${DISCO_ICONS.CROSSMARK} **Error:** No valid emojis found.`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }

        if (matches.length === 1) {
            // Single emoji
            const match = matches[0];
            const emojiName = match[1];
            const emojiId = match[2];
            const isAnimated = match[0].startsWith('<a:');
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;
            return await this.handleStealEmoji(message, emojiUrl, emojiName);
        }

        // Multiple emojis
        return await this.handleMultipleEmojis(message, matches);
    },

    async handleMultipleEmojis(source, matches) {
        const loadingEmbed = new EmbedBuilder()
            .setDescription(`<:reminder:1448489924083843092> **Stealing ${matches.length} emojis...**`)
            .setColor(0x2B2D31);

        const msg = await source.reply({ embeds: [loadingEmbed] });

        const results = [];
        const errors = [];

        for (const match of matches) {
            const emojiName = match[1];
            const emojiId = match[2];
            const isAnimated = match[0].startsWith('<a:');
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

            try {
                const sanitizedName = emojiName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 32) || 'stolen';
                const createdEmoji = await source.guild.emojis.create({ attachment: emojiUrl, name: sanitizedName });
                results.push(createdEmoji);
            } catch (error) {
                errors.push({ name: emojiName, error: error.message });
            }

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let description = '';
        if (results.length > 0) {
            description += `${DISCO_ICONS.CHECKMARK} **Stolen ${results.length} emojis:**\n`;
            description += results.map(e => `${e} \`${e.name}\``).join(' ');
        }
        if (errors.length > 0) {
            description += `\n\n${DISCO_ICONS.CROSSMARK} **Failed ${errors.length}:**\n`;
            description += errors.map(e => `\`${e.name}\`: ${e.error}`).slice(0, 5).join('\n');
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.CHECKMARK} Steal Complete`)
            .setDescription(description)
            .setColor(0x2B2D31);

        await msg.edit({ embeds: [resultEmbed] });
    },

    async handleSteal(interaction, emojis) {
        // Handle slash command (similar logic)
        if (!emojis) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.EMOJIS} Steal Emoji`)
                .setDescription(`> Paste emojis in the command to steal them.\n\n${DISCO_ICONS.POINT} Supports multiple emojis!`)
                .setColor(0x2B2D31);
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        const emojiRegex = /<a?:(\w+):(\d+)>/g;
        const matches = [...emojis.matchAll(emojiRegex)];

        if (matches.length === 0) {
            return interaction.reply({ content: 'No valid emojis found.', ephemeral: true });
        }

        await interaction.deferReply();

        const results = [];
        const errors = [];

        for (const match of matches) {
            const emojiName = match[1];
            const emojiId = match[2];
            const isAnimated = match[0].startsWith('<a:');
            const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? 'gif' : 'png'}`;

            try {
                const sanitizedName = emojiName.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 32) || 'stolen';
                const createdEmoji = await interaction.guild.emojis.create({ attachment: emojiUrl, name: sanitizedName });
                results.push(createdEmoji);
            } catch (error) {
                errors.push({ name: emojiName, error: error.message });
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        }

        let description = '';
        if (results.length > 0) {
            description += `${DISCO_ICONS.CHECKMARK} **Stolen ${results.length} emojis:**\n`;
            description += results.map(e => `${e} \`${e.name}\``).join(' ');
        }
        if (errors.length > 0) {
            description += `\n\n${DISCO_ICONS.CROSSMARK} **Failed ${errors.length}:**\n`;
            description += errors.map(e => `\`${e.name}\`: ${e.error}`).slice(0, 5).join('\n');
        }

        const resultEmbed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.CHECKMARK} Steal Complete`)
            .setDescription(description)
            .setColor(0x2B2D31);

        await interaction.editReply({ embeds: [resultEmbed] });
    },

    async showStealOptions(source, imageUrl, name) {
        const embed = new EmbedBuilder()
            .setTitle(`${DISCO_ICONS.EMOJIS} Steal Image`)
            .setDescription(`> **Name:** \`${name}\`\n\n${DISCO_ICONS.POINT} Choose how to add this image`)
            .setImage(imageUrl)
            .setColor(0x2B2D31);

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`steal_emoji_${Date.now()}`)
                    .setLabel('Copy as Emoji')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`steal_sticker_${Date.now()}`)
                    .setLabel('Copy as Sticker')
                    .setStyle(ButtonStyle.Success)
            );

        const msg = await source.reply({ embeds: [embed], components: [row] });

        if (!source.client.stealData) source.client.stealData = new Map();
        source.client.stealData.set(msg.id, { url: imageUrl, name: name, userId: source.author.id });

        const collector = msg.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== source.author.id) {
                return i.reply({ content: 'This button is not for you.', ephemeral: true });
            }

            const data = source.client.stealData.get(msg.id);
            if (!data) return;

            if (i.customId.startsWith('steal_emoji_')) {
                await i.deferUpdate();
                await this.handleStealEmoji(source, data.url, data.name, msg);
            } else if (i.customId.startsWith('steal_sticker_')) {
                await i.deferUpdate();
                await this.handleStealSticker(source, data.url, data.name, 'Stolen sticker', msg);
            }

            collector.stop();
        });

        collector.on('end', () => {
            source.client.stealData.delete(msg.id);
            msg.edit({ components: [] }).catch(() => { });
        });
    },

    async handleStealEmoji(source, url, name, existingMsg = null) {
        try {
            const loadingEmbed = new EmbedBuilder()
                .setDescription(`<:reminder:1448489924083843092> **Stealing as emoji...**`)
                .setColor(0x2B2D31);

            let msg = existingMsg;
            if (!msg) {
                if (source.reply) msg = await source.reply({ embeds: [loadingEmbed] });
                else msg = await source.channel.send({ embeds: [loadingEmbed] });
            } else {
                await msg.edit({ embeds: [loadingEmbed], components: [] });
            }

            const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 32);
            const finalName = sanitizedName || 'stolen';

            const createdEmoji = await source.guild.emojis.create({ attachment: url, name: finalName });

            const successEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CHECKMARK} Emoji Stolen`)
                .setDescription(`> **Name:** \`${createdEmoji.name}\`\n> **ID:** \`${createdEmoji.id}\`\n\n${DISCO_ICONS.POINT} Emoji: ${createdEmoji}`)
                .setColor(0x2B2D31)
                .setThumbnail(createdEmoji.url);

            await msg.edit({ embeds: [successEmbed], components: [] });
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CROSSMARK} Error`)
                .setDescription(`> **Failed to steal emoji**\n\n${DISCO_ICONS.POINT} ${error.message || 'Make sure the server has emoji slots available.'}`)
                .setColor(0x2B2D31);

            if (existingMsg) {
                await existingMsg.edit({ embeds: [errorEmbed], components: [] });
            } else {
                if (source.reply) await source.reply({ embeds: [errorEmbed] });
                else await source.channel.send({ embeds: [errorEmbed] });
            }
        }
    },

    async handleStealSticker(source, url, name, description = 'Stolen sticker', existingMsg = null) {
        try {
            const loadingEmbed = new EmbedBuilder()
                .setDescription(`<:reminder:1448489924083843092> **Stealing as sticker...**`)
                .setColor(0x2B2D31);

            let msg = existingMsg;
            if (!msg) {
                msg = await source.reply({ embeds: [loadingEmbed] });
            } else {
                await msg.edit({ embeds: [loadingEmbed], components: [] });
            }

            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const sanitizedName = name.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 30);
            const finalName = sanitizedName || 'stolen';

            const createdSticker = await source.guild.stickers.create({
                file: buffer,
                name: finalName,
                tags: 'stolen',
                description: description
            });

            const successEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CHECKMARK} Sticker Stolen`)
                .setDescription(`> **Name:** \`${createdSticker.name}\`\n> **ID:** \`${createdSticker.id}\`\n\n${DISCO_ICONS.POINT} Sticker added successfully`)
                .setColor(0x2B2D31)
                .setThumbnail(createdSticker.url);

            await msg.edit({ embeds: [successEmbed], components: [] });
        } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CROSSMARK} Error`)
                .setDescription(`> **Failed to steal sticker**\n\n${DISCO_ICONS.POINT} ${error.message || 'Make sure the image is valid and the server has sticker slots.'}`)
                .setColor(0x2B2D31);

            if (existingMsg) {
                await existingMsg.edit({ embeds: [errorEmbed], components: [] });
            } else {
                await source.reply({ embeds: [errorEmbed] });
            }
        }
    }
};
