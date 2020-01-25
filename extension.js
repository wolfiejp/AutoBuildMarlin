/**
 * Auto Build Marlin - with Configurator
 *
 * NOTE: If it says 'command failed' check declarations!
 *
 * TODO:
 * - Move parsing Javascript to this file and read
 *   configurations directly from the Marlin folder.
 * - Parse in an asynchronous way and progressively
 *   build the interface. It seems better to make the
 *   UI using Javascript that has most direct access
 *   to the DOM.
 * - The UI could contain just what it needs for the
 *   visible "tab" and get populated through message-
 *   passing.
 * - The main thing is that the configurator view can't
 *   modify the configuration files. But it can send
 *   commands back to extension.js and have it make the
 *   changes using a simple protocol. The UI fields just
 *   need option data and the ability to call back whenever
 *   something gets edited.
 * - We can also add the Prusa calculator.
 *
 *
 */

'use strict';

var vscode = require('vscode');

exports.deactivate = () => {};

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

  var path = require('path');
  var panel;

  context.subscriptions.push(vscode.commands.registerCommand('mfconfig', () => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.One);
    }
    else {
      //vscode.window.showInformationMessage("Opening Configurator...");

      panel = vscode.window.createWebviewPanel(
        'marlinConfig', 'Marlin Configurator',
        vscode.ViewColumn.One,
        {
          enableCommandUris: true,         // The view can accept commands?
          retainContextWhenHidden: true,   // getState / setState require more work
          enableScripts: true,             // Scripts are needed for command passing, at least?
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'configurator'))
          ]
        }
      );

      vscode.window.showInformationMessage(
        panel.webview.asWebviewUri(
          vscode.Uri.file(
            path.join(context.extensionPath, 'configurator', 'css')
          )
        )
      );

      panel.webview.html = getConfiguratorContent();

      panel.onDidDispose(
        () => { panel = undefined; },
        null, context.subscriptions
      );
    }
    //fs.open(url?: DOMString, target?: DOMString, features?: DOMString, replace?: boolean)
  }));

  function subpath(folder, filename) {
    var uri = path.join(context.extensionPath, 'configurator', folder);
    if (filename !== undefined) uri = path.join(uri, filename);
    return panel.webview.asWebviewUri(vscode.Uri.file(uri));
  }

  function js_path(filename) { return subpath('js', filename); }
  function css_path(filename) { return subpath('css', filename); }

  function getConfiguratorContent() {
    var p1 = js_path('jquery-3.3.1.min.js'),
        p2 = js_path('configurator.js'),
        c1 = css_path('configurator.css'),
        cp = subpath('config');

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>Marlin Configurator</title>
    <link href='https://fonts.googleapis.com/css?family=Fira+Mono&amp;subset=latin,latin-ext' rel='stylesheet' type='text/css' />
    <script> document.config_path = "${cp}"; </script>
    <script src="${p1}"></script>
    <script src="${p2}"></script>
    <link rel="stylesheet" href="${c1}" type="text/css" media="all" />
  </head>
  <body>
    <section id="main">
      <h1>Marlin Configurator</h1>
      <p class="info">User interface to configure and build Marlin Firmware.</p>

      <div id="message"></div>
      <div id="tabs"></div>

      <form id="config_form">

        <div id="tooltip"></div>

        <label id="tipson"><input type="checkbox" checked /> ?</label>

        <fieldset id="info">
          <legend>Info</legend>
        </fieldset>

        <fieldset id="machine">
          <legend>Machine</legend>

          <label class="newline">Serial Port:</label><select name="SERIAL_PORT"></select><div id="serial_stepper"></div>

          <label>Baud Rate:</label><select name="BAUDRATE"></select>

          <label>AT90USB BT IF:</label>
            <input name="BLUETOOTH" type="checkbox" value="1" checked />

          <label class="newline">Motherboard:</label><select name="MOTHERBOARD"></select>

          <label class="newline">Custom Name:</label><input name="CUSTOM_MACHINE_NAME" type="text" size="14" maxlength="12" value="" />

          <label class="newline">Machine UUID:</label><input name="MACHINE_UUID" type="text" size="38" maxlength="36" value="" />

          <label class="newline">Extruders:</label><select name="EXTRUDERS"></select>

          <label class="newline">Power Supply:</label><select name="POWER_SUPPLY"></select>

          <label>PS Default Off:</label>
            <input name="PS_DEFAULT_OFF" type="checkbox" value="1" checked />
        </fieldset>

        <fieldset id="homing">
          <legend>Homing</legend>
        </fieldset>

        <fieldset id="temperature">
          <legend>Temperature</legend>
          <label class="newline">Temp Sensor 0:</label><select name="TEMP_SENSOR_0"></select>
          <label class="newline">Temp Sensor 1:</label><select name="TEMP_SENSOR_1"></select>
          <label class="newline">Temp Sensor 2:</label><select name="TEMP_SENSOR_2"></select>
          <label class="newline">Bed Temp Sensor:</label><select name="TEMP_SENSOR_BED"></select>

          <label>Max Diff:</label>
            <input name="MAX_REDUNDANT_TEMP_SENSOR_DIFF" type="text" size="3" maxlength="2" />

          <label>Temp Residency Time (s):</label>
            <input name="TEMP_RESIDENCY_TIME" type="text" size="3" maxlength="2" />
        </fieldset>

        <fieldset id="extruder">
          <legend>Extruder</legend>
        </fieldset>

        <fieldset id="bedlevel">
          <legend>Bed Leveling</legend>
        </fieldset>

        <fieldset id="lcd">
          <legend>LCD / SD</legend>
        </fieldset>

        <fieldset id="fwretract">
          <legend>FW Retract</legend>
        </fieldset>

        <fieldset id="tmc">
          <legend>TMC</legend>
        </fieldset>

        <fieldset id="l6470">
          <legend>L6470</legend>
        </fieldset>

        <fieldset id="extras">
          <legend>Extras</legend>
        </fieldset>

        <fieldset id="more">
          <legend>More…</legend>
        </fieldset>

        <section id="config_text">
          <h2>Configuration.h</h2>
          <span class="disclose"></span>
          <pre class="hilightable config"></pre>
        </section>

        <section id="config_adv_text">
          <h2>Configuration_adv.h</h2>
          <span class="disclose"></span>
          <pre class="hilightable config"></pre>
        </section>

        <br class="clear" />
      </form>
    </section>
  </body>
</html>`;
  }

  function getTestContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Marlin Configurator</title>
  <script src="configurator/js/configurator.js" type="text/javascript"></script>
  <script>
  //<![CDATA[

    document.addEventListener('DOMContentLoaded', (event) => {
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
    });

  // ]]>
  </script>
</head>
<body>
  <h1>Marlin Configurator</h1>
  <img src="https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif" width="300" />
  <h2 id="test-counter">---</h2>
</body>
</html>`;
  }

}; // activate(context)
