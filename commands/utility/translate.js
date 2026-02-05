const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('translate')
        .setDescription('Translate text.')
        .addStringOption(option => option.setName('text').setDescription('Text to translate').setRequired(true))
        .addStringOption(option => option.setName('target').setDescription('Target language code (e.g., es, fr)').setRequired(true)),
    async execute(interaction) {
        const text = interaction.options.getString('text');
        const target = interaction.options.getString('target');
        await this.handleTranslate(interaction, text, target);
    },
    async messageRun(message, args) {
        if (args.length < 2) {
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.INFO} Translate`)
                .setDescription(`**Usage:** \`.translate <target> <text>\`\n**Example:** \`.translate es Hello World\`\n\n${DISCO_ICONS.POINT} Target = language code (es, fr, de, etc.)`)
                .setColor(0x2B2D31);
            return message.reply({ embeds: [embed] });
        }
        const target = args[0];
        const text = args.slice(1).join(' ');
        await this.handleTranslate(message, text, target);
    },
    async handleTranslate(source, text, target) {
        try {
            const response = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${target}`);
            const data = await response.json();

            if (data.responseStatus === 200) {
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.INFO} Translation`)
                    .addFields(
                        { name: `${DISCO_ICONS.POINT} Original`, value: `\`\`\`${text}\`\`\`` },
                        { name: `${DISCO_ICONS.POINT} Translated`, value: `\`\`\`${data.responseData.translatedText}\`\`\`` }
                    )
                    .setColor(0x2B2D31);
                if (source.reply) await source.reply({ embeds: [embed] });
                else await source.channel.send({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle(`${DISCO_ICONS.CROSSMARK} Error`)
                    .setDescription('**Translation failed**')
                    .setColor(0x2B2D31);
                if (source.reply) await source.reply({ embeds: [embed] });
                else await source.channel.send({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            const embed = new EmbedBuilder()
                .setTitle(`${DISCO_ICONS.CROSSMARK} Error`)
                .setDescription('**Error fetching translation**')
                .setColor(0x2B2D31);
            if (source.reply) await source.reply({ embeds: [embed] });
            else await source.channel.send({ embeds: [embed] });
        }
    }
};












