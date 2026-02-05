# Contributing to Aeolous Bot

[English](#english) | [Español](#español)

---

## English

Thank you for considering contributing to Aeolous! We welcome contributions from the community.

### How to Contribute

#### Reporting Bugs

If you find a bug, please open an issue with:
- A clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (Node.js version, OS, etc.)

#### Suggesting Features

Feature requests are welcome! Please open an issue with:
- A clear description of the feature
- Why it would be useful
- Any implementation ideas you have

#### Pull Requests

1. Fork the repository and create your branch from `main`
2. Make your changes following our code style
3. Test your changes thoroughly
4. Update documentation if needed
5. Submit a pull request with a clear description

### Code Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow existing code patterns
- Use async/await instead of promises where possible
- Keep functions focused and modular

### Command Development

When adding new commands:

1. Place them in the appropriate category folder in `commands/`
2. Use the standard command structure:
   ```javascript
   const { SlashCommandBuilder } = require('discord.js');

   module.exports = {
       data: new SlashCommandBuilder()
           .setName('commandname')
           .setDescription('Command description'),
       async execute(interaction) {
           // Your code here
       },
   };
   ```
3. Handle errors gracefully
4. Add proper permission checks
5. Update the README if it's a major feature

### Testing

Before submitting:
- Test your command in a development server
- Verify it works with different inputs
- Check for edge cases and errors
- Ensure it doesn't break existing functionality

### Questions?

Feel free to open an issue for any questions about contributing!

---

## Español

Gracias por considerar contribuir a Aeolous! Damos la bienvenida a las contribuciones de la comunidad.

### Cómo Contribuir

#### Reportar Errores

Si encuentras un error, por favor abre un issue con:
- Una descripción clara del problema
- Pasos para reproducir
- Comportamiento esperado vs real
- Tu entorno (versión de Node.js, SO, etc.)

#### Sugerir Características

Las solicitudes de características son bienvenidas! Por favor abre un issue con:
- Una descripción clara de la característica
- Por qué sería útil
- Cualquier idea de implementación que tengas

#### Pull Requests

1. Haz fork del repositorio y crea tu rama desde `main`
2. Realiza tus cambios siguiendo nuestro estilo de código
3. Prueba tus cambios exhaustivamente
4. Actualiza la documentación si es necesario
5. Envía un pull request con una descripción clara

### Estilo de Código

- Usa nombres significativos para variables y funciones
- Añade comentarios para lógica compleja
- Sigue los patrones de código existentes
- Usa async/await en lugar de promesas cuando sea posible
- Mantén las funciones enfocadas y modulares

### Desarrollo de Comandos

Al añadir nuevos comandos:

1. Colócalos en la carpeta de categoría apropiada en `commands/`
2. Usa la estructura estándar de comando:
   ```javascript
   const { SlashCommandBuilder } = require('discord.js');

   module.exports = {
       data: new SlashCommandBuilder()
           .setName('nombrecomando')
           .setDescription('Descripción del comando'),
       async execute(interaction) {
           // Tu código aquí
       },
   };
   ```
3. Maneja errores de forma elegante
4. Añade verificaciones de permisos apropiadas
5. Actualiza el README si es una característica importante

### Pruebas

Antes de enviar:
- Prueba tu comando en un servidor de desarrollo
- Verifica que funcione con diferentes entradas
- Revisa casos extremos y errores
- Asegúrate de que no rompa funcionalidad existente

### Preguntas?

Siéntete libre de abrir un issue para cualquier pregunta sobre contribuir!
