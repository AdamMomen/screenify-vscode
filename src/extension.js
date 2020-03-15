const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const { homedir } = require("os");

const writeSerializedBlobToFile = (serializeBlob, fileName) => {
  const bytes = new Uint8Array(serializeBlob.split(","));
  fs.writeFileSync(fileName, Buffer.from(bytes));
};

const P_TITLE = "screenify 📸";

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const htmlPath = path.resolve(context.extensionPath, "webview/index.html");
  vscode.window.showInformationMessage("Hello World!");
  let lastUsedImageUri = vscode.Uri.file(
    path.resolve(homedir(), "Desktop/code.png")
  );
  let panel;

  vscode.window.registerWebviewPanelSerializer("screenify", {
    async deserializeWebviewPanel(_panel, state) {
      panel = _panel;
      panel.webview.html = getHtmlContent(htmlPath);
      panel.webview.postMessage({
        type: "restore",
        innerHTML: state.innerHTML,
        bgColor: context.globalState.get("screenify.bgColor", "#2e3440")
      });
      const selectionListener = setupSelectionSync();
      panel.onDidDispose(() => {
        selectionListener.dispose();
      });
      setupMessageListeners();
    }
  });

  vscode.commands.registerCommand("screenify.activate", () => {
    panel = vscode.window.createWebviewPanel("screenify", P_TITLE, 2, {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(context.extensionPath, "webview"))
      ]
    });

    panel.webview.html = getHtmlContent(htmlPath);

    const selectionListener = setupSelectionSync();
    panel.onDidDispose(() => {
      selectionListener.dispose();
    });

    setupMessageListeners();

    const fontFamily = vscode.workspace.getConfiguration("editor").fontFamily;
    const bgColor = context.globalState.get("screenify.bgColor", "#2e3440");
    panel.webview.postMessage({
      type: "init",
      fontFamily,
      bgColor
    });

    syncSettings();
  });

  vscode.workspace.onDidChangeConfiguration(e => {
    if (
      e.affectsConfiguration("screenify") ||
      e.affectsConfiguration("editor")
    ) {
      syncSettings();
    }
  });

  function setupMessageListeners() {
    panel.webview.onDidReceiveMessage(({ type, data }) => {
      switch (type) {
        case "shoot":
          vscode.window
            .showSaveDialog({
              defaultUri: lastUsedImageUri,
              filters: {
                Images: ["png"]
              }
            })
            .then(uri => {
              if (uri) {
                writeSerializedBlobToFile(data.serializedBlob, uri.fsPath);
                lastUsedImageUri = uri;
              }
            });
          break;
        case "getAndUpdateCacheAndSettings":
          panel.webview.postMessage({
            type: "restoreBgColor",
            bgColor: context.globalState.get("screenify.bgColor", "#2e3440")
          });

          syncSettings();
          break;
        case "updateBgColor":
          context.globalState.update("screenify.bgColor", data.bgColor);
          break;
        case "invalidPasteContent":
          vscode.window.showInformationMessage(
            "Pasted content is invalid. Only copy from VS Code and check if your shortcuts for copy/paste have conflicts."
          );
          break;
      }
    });
  }

  function syncSettings() {
    const settings = vscode.workspace.getConfiguration("screenify");
    const editorSettings = vscode.workspace.getConfiguration("editor", null);
    panel.webview.postMessage({
      type: "updateSettings",
      shadow: settings.get("shadow"),
      transparentBackground: settings.get("transparentBackground"),
      backgroundColor: settings.get("backgroundColor"),
      target: settings.get("target"),
      ligature: editorSettings.get("fontLigatures")
    });
  }

  function setupSelectionSync() {
    return vscode.window.onDidChangeTextEditorSelection(e => {
      if (e.selections[0] && !e.selections[0].isEmpty) {
        vscode.commands.executeCommand(
          "editor.action.clipboardCopyWithSyntaxHighlightingAction"
        );
        panel.postMessage({
          type: "update"
        });
      }
    });
  }
}

function getHtmlContent(htmlPath) {
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");
  return htmlContent.replace(/script src="([^"]*)"/g, (match, src) => {
    const realSource = "vscode-resource:" + path.resolve(htmlPath, "..", src);
    return `script src="${realSource}"`;
  });
}

exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
};