# Banner fonts

DejaVu Sans 2.37, regular and bold, from the [DejaVu Fonts project](https://dejavu-fonts.github.io/).
The unmodified font files are distributed with their license in this directory.

The banner renderer registers these files explicitly through Sharp's `text.fontfile` option
before rendering SVG text. `scripts/prepare-runtime.ts` copies this directory into the production
runtime, so banners do not depend on fonts installed by the container's operating system.
