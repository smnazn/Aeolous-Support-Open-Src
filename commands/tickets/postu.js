const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('postu')
        .setDescription('Envía el formulario de postulación para Helper'),

    async execute(interaction) {
        await this.sendForm(interaction);
    },

    async messageRun(message) {
        await this.sendForm(message);
    },

    async sendForm(source) {
        const formText = `### Postulación , Helper

Preguntas generales:
1 • Edad

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
2 • Cuantas horas puede aportar el servidor?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
3 • Porque usted decidió ser helper?

R/

✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦

## Preguntas Helper
1 • Que harias como helper?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
2 • Si ves a algún staff/usuario peleando que harías?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
3 • Si ves a un superior peleando con otro que harías?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
4 • Mencione 5 cosas importantes que los helpers hacen

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
5 • Mencione 5 cosas importantes para ser helper

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
6 • Porque decidió postular aquí?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
7 • Está dispuesto a seguir todas la reglas?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
8 • ¿Usted está dispuesto a pagar tickets?

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
9 • ¿Cuál es tu stock? Has una lista

R/
✦ . 　⁺ 　 . ✦ . 　⁺ 　 . ✦
10 • ¿Has sido staff en algun otro servidor? Si es asi especifica en cual y que roles llegaste.

**Cuando termines usa el comando \`.finish\` para notificar al staff.**`;

        const channel = source.channel;

        // Delete the command message if it's a prefix command
        if (source.delete) {
            try { await source.delete(); } catch { }
        }

        await channel.send(formText);

        // For slash commands, send ephemeral confirmation
        if (source.reply && source.deferred === undefined) {
            await source.reply({ content: `${DISCO_ICONS.CHECKMARK} Formulario enviado.`, ephemeral: true });
        }
    }
};












