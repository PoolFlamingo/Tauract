# Plan de desarrollo de Tauract

## Descripción general
Tauract es una aplicación de escritorio construida con Tauri y React. El objetivo de este proyecto es crear una plantilla básica para aplicaciones de escritorio utilizando estas tecnologías, proporcionando una base sólida para futuros desarrollos.

## Funcionalidades principales
1. **Interfaz de usuario**: Utilizar React para construir una interfaz de usuario moderna y responsiva. Con un ejemplo de una lista de TODOS.
2. **Sqlite y su ORM**: Integrar una base de datos SQLite utilizando un ORM para gestionar los datos de manera eficiente. Se puede integrar en el propio node o en el backend de Rust o en un sidecar de node ya preparado y completo en typescript con comandos de compilación con 'deno'.
3. **Comunicación entre el frontend y el backend**: Utilizar Tauri para facilitar la comunicación entre el frontend de React y el backend de Rust, permitiendo la ejecución de comandos y la gestión de datos.

## Plan de desarrollo
1. **Configuración del proyecto**: Configurar el entorno de desarrollo para Tauri y React, asegurando que ambos estén correctamente integrados de forma eficiente y listo para futuras aplicaciones.
2. **Desarrollo del frontend**: Crear la interfaz de usuario utilizando React, incluyendo componentes básicos como una lista de TODOs, formularios de entrada y botones de acción con la SQLite.
3. **Desarrollo del backend**: Implementar la lógica SQL que permita la gestión de los datos de la aplicación, incluyendo operaciones CRUD (Crear, Leer, Actualizar, Eliminar) para los TODOs.