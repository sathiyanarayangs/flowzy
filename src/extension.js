const vscode = require('vscode');
const StorageManager = require('./storageManager');
const RecordsManager = require('./recordsManager');
const FlowzySidebarProvider = require('./flowzyProvider');

async function activate(context) {
  const storage = new StorageManager(context);
  const records = new RecordsManager(storage);

  const provider = new FlowzySidebarProvider(context.extensionUri, storage, records);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('flowzy.mainView', provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('flowzy.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.flowzy-sidebar');
    }),
    vscode.commands.registerCommand('flowzy.clearStorage', () => {
      const keys = storage.listAll();
      keys.forEach(id => storage.delete(id));
      storage.storage.update('flowzy_config', undefined);
      storage.storage.update('flowzy_records', undefined);
      vscode.window.showInformationMessage('Flowzy: All data cleared!');
      provider.postMessage({ type: 'init', config: null, records: null });
    })
  );

  // Status bar button
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.text = '⚡ Flowzy';
  statusBar.tooltip = 'Open Flowzy';
  statusBar.command = 'flowzy.open';
  statusBar.show();
  context.subscriptions.push(statusBar);
}

function deactivate() {}
module.exports = { activate, deactivate };