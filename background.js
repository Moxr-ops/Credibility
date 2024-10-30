const browser = chrome;

browser.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

browser.action.onClicked.addListener((tab) => {
  console.log('Extension icon clicked');
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script is ready in tab:', sender.tab.id);
  }
  return true; // 保持消息通道开放
});

browser.scripting.onScriptInjected.addListener((details) => {
  console.log('Script injected successfully:', details);
});

console.log('Background script loaded');
