# Guía Bariloche

Sitio estático con casas de té, bares, bodegones, playas y lugares para visitar en Bariloche.
Cada lugar tiene un botón para abrirlo en Google Maps y otro para guardarlo en una lista.

## Estructura

```
guia-bariloche/
├── index.html            Portada con las 5 secciones y Mis listas
├── pages/
│   ├── casas-de-te.html
│   ├── bares.html
│   ├── bodegones.html
│   ├── playas.html
│   ├── lugares.html
│   └── mis-listas.html   Las listas de cada visitante
├── scss/                 Fuente de los estilos (acá se edita)
│   ├── main.scss         Junta todas las partes
│   ├── _mixins.scss      Breakpoints y mixins down() / up()
│   ├── _tokens.scss      Paleta, tipografías y modo oscuro
│   ├── _base.scss
│   ├── _nav.scss
│   ├── _hero.scss
│   ├── _cards.scss
│   ├── _tiles.scss
│   ├── _listas.scss
│   ├── _responsive.scss
│   └── _animations.scss
├── css/
│   └── styles.css        Compilado desde scss/ (no editar a mano)
└── js/
    ├── places.js         Catálogo de lugares con ids y links de Maps
    ├── main.js           Animaciones al scrollear y transición entre páginas
    └── listas.js         Guardar en lista, panel y página Mis listas
```

## Editar los estilos

Los cambios se hacen en `scss/` y se compilan a `css/styles.css`:

```bash
npm install -g sass
sass --watch scss/main.scss css/styles.css --no-source-map
```

`--watch` recompila cada vez que guardás. Con la extensión *Live Sass Compiler* de VS Code también funciona:
configurá la salida en `css/`.

## Cómo funcionan las listas

Cada visitante tiene sus propias listas, guardadas en `localStorage` de su navegador: no hace falta backend.
Para compartir, el link lleva la lista codificada después del `#` (por ejemplo `pages/mis-listas.html#l.eyJu...`).
Quien lo abre ve la lista y puede guardarse una copia.

## Publicarlo con GitHub Pages

1. Subí todo el contenido de esta carpeta a la raíz del repo.
2. En el repo: Settings → Pages → Source: *Deploy from a branch* → rama `main`, carpeta `/ (root)`.
3. En unos minutos queda online en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.
