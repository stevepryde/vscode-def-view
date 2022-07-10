# Definition View

VS Code extension that displays the full code definition of the current symbol in the sidebar or panel.

## Special Thanks To

This extension is adapted/modified from `Docs View`: https://github.com/mattbierner/vscode-docs-view

Special thanks go to all contributors of Docs View. It made creating this extension much easier!

Please check out that extension if you just want documentation in the panel or sidebar.

## Features

- Automatically displays definition for the symbol at the current cursor position.
- Language independent. Works in any language.
- The "Definition" view shows in the panel by default. Move to other views or the panel just by dragging.
- Supports syntax highlighting in the definition view.

## Configuration

- `defView.definitionView.updateMode` — Controls how the documentation view is updated when the cursor moves. Possible values:

    - `live` — (default) The definition always tracks the current cursor position.
    - `sticky` — The definition tracks the current cursor position. However if there is no symbol at the current position, it continues showing the previous definition.

## Commands

- `Pin current def` — Stop live updating of the definition view. Keeps the currently visible definition. 
- `Unpin current def` — Make the definition view start tracking the cursor again.
