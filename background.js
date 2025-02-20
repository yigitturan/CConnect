chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setOptions({
      enabled: true,
      path: "sidepanel.html"
    });
  });
  
  chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.setOptions({
      enabled: true,
      path: "sidepanel.html"
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting side panel options:", chrome.runtime.lastError);
        return;
      }
      chrome.sidePanel.open({ tabId: tab.id }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error opening side panel:", chrome.runtime.lastError);
        }
      });
    });
  });
  