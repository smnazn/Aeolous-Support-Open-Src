# Aeolous - Bot de Discord

Un bot de Discord completo construido con Discord.js v14, que ofrece reproducción de música, moderación avanzada, sistema de tickets, sorteos y más.

## Características

### Sistema de Música
- Reproducción de música de alta calidad usando Lavalink
- Soporte para YouTube, Spotify y otras plataformas
- Gestión de cola y reproducción automática
- Filtros de audio y control de volumen
- Comandos: `play`, `pause`, `resume`, `skip`, `stop`, `queue`, `nowplaying`, `volume`, `filter`, `loop`, `autoplay`

### Moderación
- Sistema completo de moderación con logs
- Anti-webhook automático
- Anti-link configurable
- Auto-moderación
- Comandos: `ban`, `unban`, `kick`, `timeout`, `untimeout`, `warn`, `purge`, `lock`, `unlock`, `nuke`, `slowmode`, `role`, `setnick`, `hardmute`, `unhardmute`

### Sistema de Tickets
- Paneles de tickets personalizables
- Gestión de tickets con transcripciones
- Sistema de reclamación (claim)
- Comandos: `ticketsetup`, `claim`, `unclaim`, `close`, `finish`, `admin`, `block`, `unblock`, `rename`, `postu`

### Sorteos (Giveaways)
- Creación y gestión de sorteos
- Logs de sorteos
- Re-sorteo de ganadores
- Tiempo de reclamación configurable
- Comandos: `gstart`, `gend`, `greroll`, `gstats`, `glogs`, `claimtime`, `winmsg`

### Utilidades
- Información de servidor y usuarios
- Gestión de roles y canales
- Sistema de invitaciones
- Comandos personalizados
- Mensajes de bienvenida/despedida
- Y más de 40 comandos de utilidad

### Diversión
- Juegos interactivos (adivina la palabra)
- Avatares y embeds personalizados
- Comandos: `avatar`, `say`, `embed`, `guesssetup`, `guessstart`, `guessstop`, `guesshint`

## Requisitos

- Node.js v22.12.0 o superior
- Base de datos MongoDB
- Token de Bot de Discord
- Servidor Lavalink (para funciones de música)

## Instalación

1. Clonar el repositorio
   ```bash
   git clone https://github.com/smnazn/Aeolous-Support-Open-Src.git
   cd Aeolous-Support-Open-Src
   ```

2. Instalar dependencias
   ```bash
   npm install
   ```

3. Configurar variables de entorno
   
   Crear un archivo `.env` en el directorio raíz:
   ```env
   # Configuración de Discord
   BOT_TOKEN=tu_token_del_bot_aqui
   CLIENT_ID=tu_client_id_aqui
   CLIENT_SECRET=tu_client_secret_aqui
   BOT_PREFIX=.
   
   # Base de datos
   MONGODB_URI=tu_cadena_de_conexion_mongodb
   
   # Propietarios del Bot (IDs de usuario separados por comas)
   OWNER_ID=123456789012345678
   
   # Lavalink (para funciones de música)
   LAVALINK_HOST=tu-host-lavalink
   LAVALINK_PASSWORD=tu_contraseña_lavalink
   LAVALINK_SERVER_PASSWORD=tu_contraseña_lavalink
   
   # Spotify (opcional, para reproducción de Spotify)
   SPOTIFY_CLIENT_ID=tu_spotify_client_id
   SPOTIFY_CLIENT_SECRET=tu_spotify_client_secret
   ```

4. Desplegar comandos slash
   ```bash
   npm run deploy
   ```

5. Iniciar el bot
   ```bash
   npm start
   ```

## Estructura del Proyecto

```
aeolous-bot/
├── commands/          # Comandos slash organizados por categoría
│   ├── fun/           # Comandos de diversión
│   ├── giveaway/      # Sistema de sorteos
│   ├── moderation/    # Comandos de moderación
│   ├── music/         # Sistema de música
│   ├── system/        # Comandos del sistema
│   ├── tickets/       # Sistema de tickets
│   └── utility/       # Comandos de utilidad
├── events/            # Manejadores de eventos de Discord
├── models/            # Esquemas de MongoDB
├── utils/             # Funciones auxiliares y utilidades
├── lavalink/          # Configuración del sistema de música
├── index.js           # Archivo principal del bot
└── package.json
```

## Configuración

### Configurar Lavalink

Para las funciones de música, necesitas un servidor Lavalink:
- Alojar tu propio servidor: https://github.com/lavalink-devs/Lavalink
- Usar Railway u otro servicio de hosting

### Configuración de MongoDB

El bot usa MongoDB para almacenar:
- Configuraciones de servidor
- Datos de tickets
- Logs de moderación
- Sorteos
- Configuraciones personalizadas

Puedes usar:
- MongoDB Atlas (nivel gratuito disponible)
- MongoDB auto-alojado

## Lista de Comandos

### Música (11 comandos)
`play`, `pause`, `resume`, `skip`, `stop`, `queue`, `nowplaying`, `volume`, `filter`, `loop`, `autoplay`

### Moderación (19 comandos)
`ban`, `unban`, `kick`, `timeout`, `untimeout`, `warn`, `purge`, `lock`, `unlock`, `nuke`, `slowmode`, `role`, `setnick`, `hardmute`, `unhardmute`, `adminperms`, `antilink`, `audit`, `automod`

### Tickets (10 comandos)
`ticket`, `close`, `add`, `remove`, `claim`, `unclaim`, `rename`, `transcript`, `panel`, `finish`

### Sorteos (7 comandos)
`gstart`, `gend`, `greroll`, `gstats`, `glogs`, `claimtime`, `winmsg`

### Diversión (7 comandos)
`avatar`, `say`, `embed`, `guesssetup`, `guessstart`, `guessstop`, `guesshint`

### Utilidad (42+ comandos)
Incluye comandos de información, gestión de servidor, invitaciones, mensajes personalizados y más.

Usa `/help` en Discord para ver todos los comandos disponibles.

## Contribuir

Las contribuciones son bienvenidas. Por favor lee [CONTRIBUTING.md](CONTRIBUTING.md) para detalles sobre el proceso de contribución.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## Reconocimientos

- Construido con [Discord.js](https://discord.js.org/)
- Música impulsada por [Lavalink](https://github.com/lavalink-devs/Lavalink)
- Base de datos: [MongoDB](https://www.mongodb.com/)

## Soporte

Para soporte, abre un issue en GitHub.

## Descargo de Responsabilidad

Este bot se proporciona tal cual. Asegúrate de cumplir con los Términos de Servicio de Discord y las pautas de uso de la API al alojar tu propia instancia.