const { EmbedBuilder, AuditLogEvent } = require('discord.js');
const ServerLogConfig = require('../models/ServerLogConfig');
const { DISCO_ICONS } = require('./icons');
const cache = require('./cache');

// Colores para los embeds de logs
const LOG_COLORS = {
    CREATE: '#00FF00',   // Verde - creación
    DELETE: '#FF0000',   // Rojo - eliminación
    UPDATE: '#FFA500',   // Naranja - actualización
    INFO: '#5865F2',     // Azul Discord - información
    WARN: '#FFCC00',     // Amarillo - advertencia
    BAN: '#FF0000',      // Rojo - ban
    UNBAN: '#00FF00',    // Verde - unban
    TIMEOUT: '#FF6B6B'   // Rojo claro - timeout
};

// Tipos de log disponibles
const LOG_TYPES = {
    ROLES: 'logRoleChanges',
    NICKS: 'logNickChanges',
    MESSAGE_DELETE: 'logMessageDelete',
    MESSAGE_EDIT: 'logMessageEdit',
    CHANNELS: 'logChannelChanges',
    BANS: 'logBans',
    TIMEOUTS: 'logTimeouts'
};

/**
 * Obtiene la configuración de logs del servidor (con cache)
 * @param {string} guildId - ID del servidor
 * @returns {Promise<Object|null>} Configuración o null
 */
async function getLogConfig(guildId) {
    const cacheKey = `serverlog_${guildId}`;
    let config = cache.get(cacheKey);

    if (config === null) {
        config = await ServerLogConfig.findOne({ guildId }).lean();
        cache.set(cacheKey, config || false, 120); // Cache 2 minutes
    }

    return config || null;
}

/**
 * Obtiene el canal de logs si está configurado y el tipo de log está habilitado
 * @param {Object} guild - Objeto del servidor de Discord
 * @param {string} logType - Tipo de log (de LOG_TYPES)
 * @returns {Promise<Object|null>} { config, channel } o null
 */
async function getLogChannel(guild, logType = null) {
    const config = await getLogConfig(guild.id);
    if (!config || !config.logChannelId) return null;

    // Verificar si el tipo de log está habilitado
    if (logType && config[logType] === false) return null;

    const channel = guild.channels.cache.get(config.logChannelId);
    if (!channel) return null;

    return { config, channel };
}

/**
 * Verifica si un canal está en la lista de ignorados
 * @param {Object} config - Configuración del servidor
 * @param {string} channelId - ID del canal
 * @returns {boolean}
 */
function isChannelIgnored(config, channelId) {
    return config.ignoredChannels?.includes(channelId) || false;
}

/**
 * Obtiene el ejecutor de una acción desde los audit logs
 * @param {Object} guild - Objeto del servidor
 * @param {number} auditType - Tipo de audit log
 * @param {string} targetId - ID del objetivo (puede ser null para bulk delete)
 * @param {number} timeLimit - Límite de tiempo en ms (default 5000)
 * @returns {Promise<Object|null>} { executor, reason } o null
 */
async function getAuditExecutor(guild, auditType, targetId, timeLimit = 5000) {
    try {
        const auditLogs = await guild.fetchAuditLogs({
            type: auditType,
            limit: 5
        });

        // For bulk delete, target matching is unreliable, so just find recent entry
        const log = auditLogs.entries.find(entry => {
            const isRecent = Date.now() - entry.createdTimestamp < timeLimit;
            if (!targetId) return isRecent;
            return entry.target?.id === targetId && isRecent;
        });

        if (log) {
            return { executor: log.executor, reason: log.reason };
        }
    } catch (err) {
        // Silenciar errores de audit logs
    }
    return null;
}

/**
 * Crea un embed base para logs
 * @param {Object} options - Opciones del embed
 * @returns {EmbedBuilder}
 */
function createLogEmbed({ color, title, description = null, author = null, footer = null }) {
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setTimestamp();

    if (description) embed.setDescription(description);
    if (author) embed.setAuthor(author);
    if (footer) embed.setFooter(footer);

    return embed;
}

/**
 * Formatea duración en milisegundos a texto legible
 * @param {number} ms - Milisegundos
 * @returns {string}
 */
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    return `${seconds} segundo${seconds > 1 ? 's' : ''}`;
}

/**
 * Trunca texto si es muy largo
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string}
 */
function truncateText(text, maxLength = 1024) {
    if (!text) return '*Sin contenido*';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

module.exports = {
    LOG_COLORS,
    LOG_TYPES,
    DISCO_ICONS,
    getLogConfig,
    getLogChannel,
    isChannelIgnored,
    getAuditExecutor,
    createLogEmbed,
    formatDuration,
    truncateText,
    AuditLogEvent
};
