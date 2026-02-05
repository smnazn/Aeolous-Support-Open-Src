const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { DISCO_ICONS } = require('../../utils/icons');

// FAQ Database - Preguntas y respuestas predefinidas
const FAQ_DATABASE = {
    // Música
    'música': {
        title: `${DISCO_ICONS.POINT} Comandos de Música`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **MÚSICA**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`/play\` o \`.play\`
Uso: \`.play <canción o URL>\`
Reproduce música de YouTube, Spotify o SoundCloud

**2.** \`/skip\` o \`.skip\`
Salta a la siguiente canción en la cola

**3.** \`/stop\` o \`.stop\`
Detiene la música y desconecta el bot

**4.** \`/pause\` y \`/resume\`
Pausa o reanuda la reproducción

**5.** \`/queue\` o \`.queue\`
Muestra la cola de reproducción actual

**6.** \`/volume\` o \`.volume\`
Uso: \`.volume <1-100>\`
Ajusta el volumen de la música

**7.** \`/loop\`
Uso: \`.loop <track/queue/off>\`
Activa repetición de canción o cola

**8.** \`/filter\`
Uso: \`.filter <nombre>\`
Filtros: \`bassboost\`, \`nightcore\`, \`8d\`, \`vaporwave\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'play': { alias: 'música' },
    'skip': { alias: 'música' },
    'queue': { alias: 'música' },

    // Moderación
    'moderación': {
        title: `${DISCO_ICONS.POINT} Comandos de Moderación`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **MODERACIÓN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`/ban\` o \`.ban\`
Uso: \`.ban @usuario [razón]\`
Banea permanentemente a un usuario

**2.** \`/kick\` o \`.kick\`
Uso: \`.kick @usuario [razón]\`
Expulsa a un usuario del servidor

**3.** \`/timeout\` o \`.timeout\`
Uso: \`.timeout @usuario <duración>\`
Silencia temporalmente a un usuario

**4.** \`/warn\` o \`.warn\`
Uso: \`.warn @usuario [razón]\`
Advierte a un usuario

**5.** \`/purge\` o \`.purge\`
Uso: \`.purge <cantidad>\`
Elimina múltiples mensajes (máx 100)

**6.** \`/role\`
Uso: \`.role add @usuario @rol\`
      \`.role remove @usuario @rol\`
      \`.role all @rol\` (da rol a todos)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'ban': { alias: 'moderación' },
    'kick': { alias: 'moderación' },
    'timeout': { alias: 'moderación' },
    'role': { alias: 'moderación' },

    // Giveaways
    'giveaways': {
        title: `${DISCO_ICONS.POINT} Sistema de Giveaways`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **GIVEAWAYS**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`.gstart\`
Uso: \`.gstart <duración> <premio>\`
Ejemplo: \`.gstart 1h Discord Nitro\`
Duraciones: \`1m\` (minutos), \`1h\` (horas), \`1d\` (días)

**2.** \`.gend\`
Uso: \`.gend [messageId]\`
Finaliza un sorteo activo antes de tiempo
Si no especificas ID, finaliza el del canal actual

**3.** \`.greroll\`
Uso: \`.greroll [messageId]\`
Elige un nuevo ganador si el anterior no reclamó

**4.** \`.gstats\`
Muestra estadísticas de sorteos del servidor

**5.** \`.glogs\`
Configura el canal de logs para sorteos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'giveaway': { alias: 'giveaways' },
    'gstart': { alias: 'giveaways' },
    'sorteo': { alias: 'giveaways' },

    // Tickets
    'tickets': {
        title: `${DISCO_ICONS.POINT} Sistema de Tickets`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **TICKETS**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`/ticketsetup panel\`
Configura y envía el panel de tickets
Requiere: canal, rol de soporte, categoría

**2.** \`/ticketsetup blacklist\`
Gestiona usuarios bloqueados del sistema
Acciones: \`add\`, \`remove\`, \`list\`

**3.** \`/ticketsetup limite\`
Establece máximo de tickets por usuario

**4.** \`/close\` o \`.close\`
Cierra el ticket actual (solo staff)

**5.** \`/add\` y \`/remove\`
Añade o quita usuarios de un ticket

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'ticket': { alias: 'tickets' },
    'close': { alias: 'tickets' },
    'ticketsetup': { alias: 'tickets' },

    // Utilidad
    'utilidad': {
        title: `${DISCO_ICONS.POINT} Comandos de Utilidad`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **UTILIDAD**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`/help\` o \`.help\`
Muestra la lista completa de comandos

**2.** \`/userinfo\` o \`.ui\`
Uso: \`.ui @usuario\`
Información detallada de un usuario

**3.** \`/serverinfo\` o \`.server\`
Información del servidor actual

**4.** \`/snipe\` o \`.snipe\`
Ver el último mensaje eliminado

**5.** \`/afk\` o \`.afk\`
Uso: \`.afk <razón>\`
Ponerte en modo AFK

**6.** \`/remind\` o \`.remind\`
Uso: \`.remind <tiempo> <mensaje>\`
Crear un recordatorio

**7.** \`/timediff\` o \`.timediff\`
Uso: \`.timediff <id1> <id2>\`
      \`.timediff <id>\` (respondiendo)
Calcula diferencia de tiempo entre IDs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'help': { alias: 'utilidad' },
    'snipe': { alias: 'utilidad' },

    // Config
    'config': {
        title: `${DISCO_ICONS.POINT} Configuración del Bot`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **CONFIGURACIÓN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** \`/setserverlogs\`
Configura los logs del servidor
${DISCO_ICONS.POINT} \`channel\` - Canal de logs
${DISCO_ICONS.POINT} \`toggle\` - Activar/desactivar tipos
${DISCO_ICONS.POINT} \`ignore\` - Ignorar canales
${DISCO_ICONS.POINT} \`status\` - Ver configuración

**2.** \`/prefix\` o \`.setprefix\`
Uso: \`.setprefix <nuevo>\`
Cambia el prefijo del bot

**3.** \`/antilink\`
Configura el sistema anti-links
Bloquea invites, links, imágenes

**4.** \`/setupautoroles\`
Configura roles de reacción

**5.** \`/staffrole\`
Define el rol de staff del servidor

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'configuración': { alias: 'config' },
    'logs': { alias: 'config' },
    'prefix': { alias: 'config' },

    // Info general
    'bot': {
        title: `${DISCO_ICONS.POINT} Sobre Aeolous Support`,
        response: `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **AEOLOUS SUPPORT**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${DISCO_ICONS.POINT} Bot multifuncional para Discord

**Características principales:**

${DISCO_ICONS.SUCCESS} Sistema de música con Lavalink
${DISCO_ICONS.SUCCESS} Moderación completa
${DISCO_ICONS.SUCCESS} Sistema de giveaways
${DISCO_ICONS.SUCCESS} Sistema de tickets
${DISCO_ICONS.SUCCESS} Logs del servidor
${DISCO_ICONS.SUCCESS} Invites tracker
${DISCO_ICONS.SUCCESS} Sistema de backups

**Prefijo por defecto:** \`.\`

**Ayuda:** Usa \`.ask <tema>\` para info
Temas: \`música\`, \`moderación\`, \`giveaways\`,
       \`tickets\`, \`utilidad\`, \`config\`, \`bot\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    },
    'info': { alias: 'bot' },
    'aeolous': { alias: 'bot' }
};

function findAnswer(query) {
    const normalizedQuery = query.toLowerCase().trim();

    // Búsqueda exacta primero
    if (FAQ_DATABASE[normalizedQuery]) {
        const entry = FAQ_DATABASE[normalizedQuery];
        if (entry.alias) {
            return FAQ_DATABASE[entry.alias];
        }
        return entry;
    }

    // Búsqueda por palabras clave
    for (const [key, value] of Object.entries(FAQ_DATABASE)) {
        if (value.alias) continue;
        if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
            return value;
        }
    }

    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Pregunta sobre el bot y sus comandos')
        .addStringOption(opt => opt
            .setName('tema')
            .setDescription('Tema o comando sobre el que preguntar')
            .setRequired(true)
            .addChoices(
                { name: '🎵 Música', value: 'música' },
                { name: '🛡️ Moderación', value: 'moderación' },
                { name: '🎁 Giveaways', value: 'giveaways' },
                { name: '🎫 Tickets', value: 'tickets' },
                { name: '⚙️ Utilidad', value: 'utilidad' },
                { name: '📊 Config', value: 'config' },
                { name: 'ℹ️ Sobre el Bot', value: 'bot' }
            )
        ),

    async execute(interaction) {
        const tema = interaction.options.getString('tema');
        await this.handleAsk(interaction, tema);
    },

    async messageRun(message, args) {
        if (!args.length) {
            const embed = new EmbedBuilder()
                .setColor('#2B2D31')
                .setDescription(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           **TEMAS DISPONIBLES**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${DISCO_ICONS.POINT} \`música\` - Comandos de música
${DISCO_ICONS.POINT} \`moderación\` - Comandos de moderación
${DISCO_ICONS.POINT} \`giveaways\` - Sistema de sorteos
${DISCO_ICONS.POINT} \`tickets\` - Sistema de tickets
${DISCO_ICONS.POINT} \`utilidad\` - Comandos útiles
${DISCO_ICONS.POINT} \`config\` - Configuración del bot
${DISCO_ICONS.POINT} \`bot\` - Información del bot

**Uso:** \`.ask <tema>\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            return message.reply({ embeds: [embed] });
        }

        await this.handleAsk(message, args.join(' '));
    },

    async handleAsk(source, query) {
        const isInteraction = !!source.deferReply;

        const answer = findAnswer(query);

        if (!answer) {
            const embed = new EmbedBuilder()
                .setColor('#FFA500')
                .setDescription(`${DISCO_ICONS.WARNING} No encontré información sobre \`${query}\`

**Temas disponibles:**
\`música\`, \`moderación\`, \`giveaways\`, \`tickets\`, \`utilidad\`, \`config\`, \`bot\``);

            return isInteraction
                ? source.reply({ embeds: [embed], ephemeral: true })
                : source.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor('#2B2D31')
            .setDescription(answer.response);

        return isInteraction
            ? source.reply({ embeds: [embed] })
            : source.reply({ embeds: [embed] });
    }
};
