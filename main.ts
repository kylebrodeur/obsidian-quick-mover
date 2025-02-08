import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, TFolder, AbstractInputSuggest, TAbstractFile, MarkdownView, WorkspaceLeaf } from 'obsidian';

class FolderSuggest extends AbstractInputSuggest<TFolder> {
    constructor(public app: App, public inputEl: HTMLInputElement) {
        super(app, inputEl);
    }

    getSuggestions(inputStr: string): TFolder[] {
        return this.app.vault.getAllLoadedFiles()
            .filter((file): file is TFolder => 
                file instanceof TFolder && 
                file.path.toLowerCase().includes(inputStr.toLowerCase())
            );
    }

    renderSuggestion(folder: TFolder, el: HTMLElement) {
        el.setText(folder.path);
    }

    selectSuggestion(folder: TFolder) {
        this.inputEl.value = folder.path;
        this.inputEl.trigger("input");
        this.close();
    }
}

interface QuickMoveDestination {
    id: string;  // Add unique identifier
    name: string;
    path: string;
    action: 'close' | 'advance' | 'none';
}

interface QuickMoverSettings {
    destinations: QuickMoveDestination[];
}

const DEFAULT_SETTINGS: QuickMoverSettings = {
    destinations: []
};

export default class QuickMoverPlugin extends Plugin {
    settings!: QuickMoverSettings;

    async onload() {
        // Remove super.onload() as it's not needed
        
        // Load settings first
        await this.loadSettings();
        
        // Add setting tab
        this.addSettingTab(new QuickMoverSettingTab(this.app, this));
        
        // Register commands only after workspace is ready
        this.app.workspace.onLayoutReady(() => {
            this.registerCommands();
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private async moveFile(dest: QuickMoveDestination): Promise<void> {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile?.parent) {
            new Notice('No active file or parent folder found');
            return;
        }

        const newPath = `${dest.path}/${activeFile.name}`;
        if (activeFile.path === newPath) {
            new Notice('File is already in the destination folder');
            return;
        }

        const nextFile = await this.findNextFile(activeFile, dest.action);

        try {
            await this.app.vault.adapter.mkdir(dest.path);
            await this.app.fileManager.renameFile(activeFile, newPath);
            await this.handlePostMoveAction(dest.action, activeFile, nextFile);
            new Notice(`Moved to ${dest.name}`);
        } catch (error) {
            console.error('Error moving file:', error);
            const errorMessage = (error instanceof Error) ? error.message : 'Unknown error';
            new Notice(`Error moving file: ${errorMessage}`);
        }
    }

    private async findNextFile(currentFile: TFile, action: QuickMoveDestination['action']): Promise<TFile | null> {
        if (action !== 'advance' || !currentFile.parent) return null;

        // Get fresh list of files in the folder
        const getFreshFileList = () => this.app.vault.getMarkdownFiles()
            .filter(f => f.parent?.path === currentFile.parent?.path)
            .sort((a, b) => a.path.localeCompare(b.path)); // Ensure consistent ordering

        let filesInFolder = getFreshFileList();

        // Return early if this is the only file in the folder
        if (filesInFolder.length <= 1) {
            new Notice('No more files in the folder');
            return null;
        }

        const currentIndex = filesInFolder.findIndex(f => f.path === currentFile.path);
        if (currentIndex === -1) return null;
        
        if (currentIndex < filesInFolder.length - 1) {
            return filesInFolder[currentIndex + 1];
        }
        
        if (window.confirm("Reached end of folder. Restart from top?")) {
            // Refresh the file list before returning the first file
            filesInFolder = getFreshFileList();
            return filesInFolder.length > 0 ? filesInFolder[0] : null;
        }
        
        return null;
    }

    private async handlePostMoveAction(action: QuickMoveDestination['action'], currentFile: TFile, nextFile: TFile | null): Promise<void> {
        const leaves = this.app.workspace.getLeavesOfType('markdown');
        
        switch (action) {
            case 'close':
                this.closeFile(currentFile, leaves);
                break;
            case 'advance':
                if (nextFile) {
                    const newLeaf = this.app.workspace.getLeaf('tab');
                    await newLeaf.openFile(nextFile);
                    this.closeFile(currentFile, leaves);
                } else {
                    // If no next file, behave like 'close' action
                    this.closeFile(currentFile, leaves);
                    new Notice('No more files in the folder');
                }
                break;
            case 'none':
                // Do nothing after moving
                break;
        }
    }

    private closeFile(file: TFile, leaves: WorkspaceLeaf[]): void {
        if (!leaves?.length) return;

        leaves.forEach(leaf => {
            if (leaf?.view instanceof MarkdownView && leaf.view.file === file) {
                leaf.detach();
            }
        });
    }

    public registerCommands(): void {
        // Remove existing commands first
        this.settings.destinations.forEach(dest => {
            const commandId = `quick-mover:move-to-${dest.id}`;
            (this.app as any).commands.removeCommand(commandId);
        });

        // Register new commands
        this.settings.destinations.forEach(dest => {
            this.addCommand({
                id: `quick-mover:move-to-${dest.id}`,
                name: `Move to ${dest.name}`,
                callback: () => this.moveFile(dest)
            });
        });
    }
}

class QuickMoverSettingTab extends PluginSettingTab {
    plugin: QuickMoverPlugin;

    constructor(app: App, plugin: QuickMoverPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        this.containerEl.addClass('quick-mover-plugin');
        containerEl.createEl('h2', { text: 'Quick Mover Settings' });
        this.addSectionDescription(containerEl);
        this.addAddDestinationButton(containerEl);

        const destinationsContainer = containerEl.createDiv('quick-mover-destinations');
        this.renderDestinationList(destinationsContainer);
    }

    private addSectionDescription(containerEl: HTMLElement): void {
        containerEl.createEl('p', {
            text: 'Configure your quick move destinations. Each destination needs a name, folder path, and what action to take after moving.',
            cls: 'setting-item-description'
        });
    }

    private addAddDestinationButton(containerEl: HTMLElement): void {
        new Setting(containerEl)
            .setName('Add New Destination')
            .setDesc('Create a new quick move destination')
            .addButton(button => button
                .setButtonText('Add Destination')
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.destinations.push({
                        id: Date.now().toString(),
                        name: '',
                        path: '',
                        action: 'none'
                    });
                    await this.plugin.saveSettings();
                    this.plugin.registerCommands();
                    this.display();
                }));
    }

    private renderDestinationList(destinationsContainer: HTMLElement): void {
        if (this.plugin.settings.destinations.length > 0) {
            const headerEl = destinationsContainer.createEl('div', { cls: 'quick-mover-grid-header' });
            headerEl.createEl('div', { text: 'Name', cls: 'quick-mover-header' });
            headerEl.createEl('div', { text: 'Folder Path', cls: 'quick-mover-header' });
            headerEl.createEl('div', { text: 'After Move Action', cls: 'quick-mover-header' });
            headerEl.createEl('div', { text: '', cls: 'quick-mover-header' });
        }

        this.plugin.settings.destinations.forEach((dest, index) => {
            const setting = new Setting(destinationsContainer)
                .setClass('quick-mover-destination-item')
                .addText(text => text
                    .setPlaceholder('Destination name')
                    .setValue(dest.name)
                    .onChange(async (value) => {
                        this.plugin.settings.destinations[index].name = value;
                        await this.plugin.saveSettings();
                        this.plugin.registerCommands();
                    }))
                .addSearch(search => {
                    new FolderSuggest(this.app, search.inputEl);
                    search
                        .setPlaceholder('Choose folder')
                        .setValue(dest.path)
                        .onChange(async (value) => {
                            this.plugin.settings.destinations[index].path = value;
                            await this.plugin.saveSettings();
                        });
                })
                .addDropdown(dropdown => dropdown
                    .addOption('none', 'Do nothing')
                    .addOption('close', 'Close after move')
                    .addOption('advance', 'Advance to next')
                    .setValue(dest.action)
                    .onChange(async (value) => {
                        const action = value as 'none' | 'close' | 'advance';
                        this.plugin.settings.destinations[index].action = value as 'none' | 'close' | 'advance';
                        await this.plugin.saveSettings();
                    }))
                .addButton(button => button
                    .setClass('clickable-icon')
                    .setIcon('trash')
                    .setTooltip('Delete destination')
                    .onClick(async () => {
                        this.plugin.settings.destinations.splice(index, 1);
                        await this.plugin.saveSettings();
                        this.plugin.registerCommands();
                        this.display();
                    }));
        });
    }
}