/**
 * Auto Build Marlin - with Configurator
 *
 * NOTE: If it says 'command failed' check declarations!
 */

'use strict';

var vscode = require('vscode');

exports.activate = (context) => {
  //console.log(vscode);

  // Figure out where auto_build.py is located
  var fs = require('fs');
  var AUTO_CMD = 'buildroot/share/atom/auto_build.py';
  fs.access(vscode.workspace.rootPath + '/' + AUTO_CMD, fs.constants.F_OK, (err) => {
    if (err) AUTO_CMD = 'buildroot/share/vscode/auto_build.py';
    fs.access(vscode.workspace.rootPath + '/' + AUTO_CMD, fs.constants.F_OK, (err) => {
      if (err) vscode.window.showErrorMessage("Open a Marlin folder!");
    });
  });

  var NEXT_TERM_ID = 1;
  var abm_command = function(cmd, nosave) {
    if (!nosave) vscode.commands.executeCommand('workbench.action.files.saveAll');
    var title = cmd.charAt(0).toUpperCase() + cmd.slice(1);
    var terminal = vscode.window.createTerminal(`Marlin ${title} #${NEXT_TERM_ID++}`);
    terminal.show(true);
    terminal.sendText(`python ${AUTO_CMD} ${cmd}`);
  };

  context.subscriptions.push(vscode.commands.registerCommand('mfbuild', () => { abm_command('build'); }));
  context.subscriptions.push(vscode.commands.registerCommand('mfupload', () => { abm_command('upload'); }));
  context.subscriptions.push(vscode.commands.registerCommand('mftraceback', () => { abm_command('traceback'); }));
  context.subscriptions.push(vscode.commands.registerCommand('mfclean', () => { abm_command('clean', true); }));

  var configVisible = false;

  context.subscriptions.push(vscode.commands.registerCommand('mfconfig', () => {
    if (configVisible) return;
    configVisible = true;
    vscode.window.showInformationMessage("Opening Configurator...");

    var panel = vscode.window.createWebviewPanel(
      'marlinConfig', 'Marlin Configurator',
      vscode.ViewColumn.One,
      {
        enableCommandUris: true,
        enableScripts: true
      }
    );

    panel.webview.html = getConfiguratorContent();

    panel.onDidDispose(
      () => { configVisible = false },
      null, context.subscriptions
    );

    //fs.open(url?: DOMString, target?: DOMString, features?: DOMString, replace?: boolean)
  }));
};

exports.deactivate = () => {

};

function getConfiguratorContent() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Marlin Configurator</title>
    <script><![CDATA[
      const counter = document.getElementById('test-counter');

      let count = 0;
      setInterval(function() { counter.textContent = count++; }, 100);

      // Handle the message inside the webview
      window.addEventListener('message', event => {
        const message = event.data; // JSON sent by the extension
        switch (message.command) {
          case 'hello':
            count = 0;
            counter.textContent = count;
            break;
        }
      });
    ]]></script>
</head>
<body>
    <h1>Marlin Configurator</h1>
    <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
    <h2 id="test-counter">---</h2>
</body>
</html>`;
}
