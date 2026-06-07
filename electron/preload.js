// preload.js — 上下文隔离桥接
// 当前无需向渲染进程暴露额外 API，保留此文件供后续扩展
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
