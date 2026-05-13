const { contextBridge, ipcRenderer } = require('electron');

var lastSavedFilePath = null;

// Shared helper to resolve and validate write path
function resolveWritePath(file) {
  var path;
  if (!file) {
    path = lastSavedFilePath;
  } else {
    path = file.filePath.toString();
    lastSavedFilePath = path;
  }

  if (!path || path.trim() === '') {
    throw new Error('No file path specified. Please save the file first.');
  }

  return path;
}

// Shared helper to compute short name from file path
function getShortName(fileName) {
  var shortName = fileName.substring(fileName.lastIndexOf('/') + 1);
  shortName = shortName.substring(shortName.lastIndexOf("\\") + 1);
  return shortName;
}

// Shared helper to handle file opening
async function openFileHandler(callback) {
  const result = await ipcRenderer.invoke('dialog:showOpenDialog', { properties: ['openFile'] });
  if (result.canceled || result.filePaths.length === 0) return;

  var fileName = result.filePaths[0];
  const data = await ipcRenderer.invoke('file:readFile', fileName);
  lastSavedFilePath = fileName;
  var shortName = getShortName(fileName);
  callback(data, shortName);
}

// Shared helper to handle file saving
async function saveFileHandler(file, text) {
  const path = resolveWritePath(file);
  await ipcRenderer.invoke('file:writeFile', path, text);
}

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveDialog: async () => {
    return await ipcRenderer.invoke('dialog:showSaveDialog');
  },
  saveFile: async (file, text) => {
    try {
      await saveFileHandler(file, text);
    } catch (err) {
      window.alert(err);
    }
  },
  openFile: async (callback) => {
    try {
      await openFileHandler(callback);
    } catch (err) {
      window.alert(err);
    }
  },
  toggleDevTools: () => {
    ipcRenderer.send('window:toggleDevTools');
  }
});

// For backward compatibility with the renderer process if it expects these on the window object directly
// NOTE: With contextIsolation: true, these must be accessed via window.electronAPI or the bridge.
// Since the simulator code likely uses window.showSaveDialog, we need to make sure it still works.
// However, contextBridge.exposeInMainWorld('electronAPI', ...) means it will be at window.electronAPI.
// To keep it at window.showSaveDialog etc. we can expose them directly or change how they are accessed.

contextBridge.exposeInMainWorld('showSaveDialog', () => ipcRenderer.invoke('dialog:showSaveDialog'));
contextBridge.exposeInMainWorld('saveFile', async (file, text) => {
  try {
    await saveFileHandler(file, text);
  } catch (err) {
    // Note: window.alert might not work here depending on configuration,
    // but in Electron it usually does if not sandboxed.
    alert(err);
  }
});
contextBridge.exposeInMainWorld('openFile', async (callback) => {
  try {
    await openFileHandler(callback);
  } catch (err) {
    alert(err);
  }
});
contextBridge.exposeInMainWorld('toggleDevTools', () => {
  ipcRenderer.send('window:toggleDevTools');
});
