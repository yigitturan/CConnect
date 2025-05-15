// Fix for service-worker.js
// Update the content script injection and video sync handling

// Enhanced content script management
let contentScriptReadyTabs = new Set();

// Listen for the contentScriptReady message from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "contentScriptReady" && sender.tab) {
    console.log(`[SW] Content script ready in tab ${sender.tab.id}`);
    contentScriptReadyTabs.add(sender.tab.id);
    sendResponse({status: "acknowledged"});
    return true;
  }
});

// Improved function to get video information
async function handleGetVideoInfo(sendResponse) {
  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.error("[Video] No active tab found");
      sendResponse({ success: false, error: "No active tab found" });
      return true;
    }

    const activeTab = tabs[0];
    console.log(`[Video] Getting video info from tab ${activeTab.id}: ${activeTab.url}`);
    
    // Check if we should inject the content script
    const shouldInject = !contentScriptReadyTabs.has(activeTab.id);
    
    // Function to send message to the content script
    const sendMessageToContentScript = () => {
      chrome.tabs.sendMessage(activeTab.id, { action: "getVideoInfo" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`[Video] Error getting video info: ${chrome.runtime.lastError.message}`);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message,
            tabId: activeTab.id,
            tabUrl: activeTab.url
          });
        } else {
          console.log("[Video] Successfully got video info:", response);
          sendResponse(response);
        }
      });
    };
    
    // If we need to inject the content script
    if (shouldInject) {
      console.log(`[Video] Injecting content script into tab ${activeTab.id}`);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content-script.js']
        });
        
        console.log(`[Video] Content script injected into tab ${activeTab.id}`);
        
        // Wait a moment for the script to initialize
        setTimeout(() => {
          sendMessageToContentScript();
        }, 500);
      } catch (injectionError) {
        console.error(`[Video] Content script injection error:`, injectionError);
        sendResponse({
          success: false,
          error: `Could not inject content script: ${injectionError.message}`,
          tabId: activeTab.id,
          tabUrl: activeTab.url
        });
      }
    } else {
      // Content script is already loaded, send message directly
      sendMessageToContentScript();
    }
  } catch (error) {
    console.error("[Video] Error in handleGetVideoInfo:", error);
    sendResponse({
      success: false,
      error: `Error getting video info: ${error.message}`
    });
  }
  
  return true; // Keep the messaging channel open for the async response
}

// Improved function to set video time
async function handleSetVideoTime(message, sendResponse) {
  try {
    // Get the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      console.error("[Video] No active tab found");
      sendResponse({ success: false, error: "No active tab found" });
      return true;
    }

    const activeTab = tabs[0];
    console.log(`[Video] Setting video time in tab ${activeTab.id}: ${activeTab.url} to ${message.currentTime}`);
    
    // Check if we should inject the content script
    const shouldInject = !contentScriptReadyTabs.has(activeTab.id);
    
    // Function to send message to the content script
    const sendMessageToContentScript = () => {
      chrome.tabs.sendMessage(activeTab.id, { 
        action: "setVideoTime",
        currentTime: message.currentTime
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(`[Video] Error setting video time: ${chrome.runtime.lastError.message}`);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message,
            tabId: activeTab.id,
            tabUrl: activeTab.url
          });
        } else {
          console.log("[Video] Successfully set video time:", response);
          sendResponse(response);
        }
      });
    };
    
    // If we need to inject the content script
    if (shouldInject) {
      console.log(`[Video] Injecting content script into tab ${activeTab.id}`);
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          files: ['content-script.js']
        });
        
        console.log(`[Video] Content script injected into tab ${activeTab.id}`);
        
        // Wait a moment for the script to initialize
        setTimeout(() => {
          sendMessageToContentScript();
        }, 500);
      } catch (injectionError) {
        console.error(`[Video] Content script injection error:`, injectionError);
        sendResponse({
          success: false,
          error: `Could not inject content script: ${injectionError.message}`,
          tabId: activeTab.id,
          tabUrl: activeTab.url
        });
      }
    } else {
      // Content script is already loaded, send message directly
      sendMessageToContentScript();
    }
  } catch (error) {
    console.error("[Video] Error in handleSetVideoTime:", error);
    sendResponse({
      success: false,
      error: `Error setting video time: ${error.message}`
    });
  }
  
  return true; // Keep the messaging channel open for the async response
}

// Update the message listener to use our improved functions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[SW] Message received:", message);
  
  if (!message || !message.action) {
    console.warn("[SW] Unrecognized message format:", message);
    return false;
  }
  
  switch (message.action) {
    case "getVideoInfo":
      handleGetVideoInfo(sendResponse);
      return true; // Keep the messaging channel open
      
    case "setVideoTime":
      handleSetVideoTime(message, sendResponse);
      return true; // Keep the messaging channel open
      
    // Keep other cases the same...
    
    default:
      // Let default behavior handle other message types
      return false;
  }
});

// Clean up on tab close to avoid memory leaks
chrome.tabs.onRemoved.addListener((tabId) => {
  if (contentScriptReadyTabs.has(tabId)) {
    console.log(`[SW] Tab ${tabId} closed, removing from content script registry`);
    contentScriptReadyTabs.delete(tabId);
  }
});