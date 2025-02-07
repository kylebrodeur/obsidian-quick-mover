# Obsidian Quick Mover

This plugin allows you to quickly move notes to different folders within your Obsidian vault.

## Why I Created This

I created this plugin to quickly move files to my Archives and Resources folders. I use the PARA and Johnny Decimal systems, and the manual moving process was taking too long.

This plugin works well with Note Toolbar, Commander, and other tools that utilize commands for macros, allowing for a streamlined workflow.

## Features

*   Move the current note to a different folder with a simple command.
*   Configure a list of frequently used folders for even faster moving.
*   Customize the plugin settings to suit your workflow.

## Installation

1.  Download the latest release from the [Releases](https://github.com/your-username/obsidian-quick-mover/releases) page.
2.  Extract the plugin folder (`obsidian-quick-mover`) to your Obsidian plugins folder (`.obsidian/plugins`).
3.  Reload Obsidian.
4.  Go to Settings -> Community plugins and enable the "Quick Mover" plugin.

## Usage

1.  Open a note you want to move.
2.  Use the command "Quick Move Note" to move the note to a different folder. You can access this command via the command palette (Ctrl/Cmd+P).
3.  Select the destination folder from the list.

## Settings

The following settings are available in the plugin settings tab:

*   **Frequently Used Folders:** Add or remove folders that you frequently move notes to. These folders will appear at the top of the folder selection list.

## Development

To contribute to this plugin, follow these steps:

1.  Clone this repository into a local directory.
2.  Install dependencies: `npm install`
3.  For active development:
    *   Ideally, create or use a test vault within your Obsidian plugins folder.
    *   Run `npm run dev` to start the development server with live reloading.
4.  When you're ready to update the plugin:
    *   Run `npm run build`.
    *   Copy the built files to your Obsidian plugins folder (or your test vault's plugins folder).
5.  Reload Obsidian to see your changes.

## Support

If you find this plugin helpful, consider supporting its development by:

*   Starring the repository on GitHub.
*   Reporting issues and suggesting improvements.

## License

MIT License

Copyright (c) [2025] [kylebrodeur]

