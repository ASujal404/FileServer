const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API bridge to React renderer
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  send: (channel, data) => {
    const validChannels = ['toMain', 'download-file'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  receive: (channel, func) => {
    const validChannels = ['fromMain', 'download-progress'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
