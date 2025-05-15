// Fix for content-script.js
// This is the script that interacts with videos on webpages
// Add these improvements to make video detection and synchronization more reliable

// Immediately tell the extension we're loaded
console.log("[Content Script] Video sync content script loaded and ready");
chrome.runtime.sendMessage({ action: "contentScriptReady" });

// Improved message listener with better error handling and logging
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[Content Script] Received message:", request);
  
  if (request.action === "getVideoInfo") {
    getActiveVideoInfo().then(sendResponse);
    return true; // Keep the messaging channel open for the async response
  }
  
  if (request.action === "setVideoTime") {
    setActiveVideoTime(request.currentTime).then(sendResponse);
    return true; // Keep the messaging channel open for the async response
  }
  
  return false;
});

// Improved function to find and get info from active video
async function getActiveVideoInfo() {
  try {
    // Find all video elements on the page
    const videos = document.querySelectorAll('video');
    console.log(`[Content] Found ${videos.length} video elements on page`);
    
    if (videos.length === 0) {
      return {success: false, message: "No videos found on this page"};
    }
    
    // Get the active video using our improved detection logic
    const activeVideo = findBestActiveVideo(videos);
    
    if (!activeVideo) {
      return {success: false, message: "Could not determine which video is active"};
    }
    
    console.log("[Content] Active video found:", activeVideo);
    console.log("[Content] Video state:", {
      currentTime: activeVideo.currentTime,
      duration: activeVideo.duration,
      paused: activeVideo.paused,
      readyState: activeVideo.readyState
    });
    
    // Respond with detailed video information
    return {
      success: true,
      currentTime: activeVideo.currentTime,
      duration: activeVideo.duration,
      paused: activeVideo.paused,
      videoUrl: window.location.href,
      pageTitle: document.title,
      playerType: detectPlayerType(),
      videoId: getVideoIdentifier(activeVideo)
    };
  } catch (error) {
    console.error("[Content] Error getting video info:", error);
    return {success: false, message: `Error: ${error.message}`};
  }
}

// Improved function to set time on active video
async function setActiveVideoTime(timeToSet) {
  try {
    // Find all video elements on the page
    const videos = document.querySelectorAll('video');
    
    if (videos.length === 0) {
      return {success: false, message: "No videos found on this page"};
    }
    
    // Get the active video using our improved detection logic
    const activeVideo = findBestActiveVideo(videos);
    
    if (!activeVideo) {
      return {success: false, message: "Could not determine which video is active"};
    }
    
    console.log(`[Content] Setting video time to ${timeToSet} from current ${activeVideo.currentTime}`);
    
    // Set the time
    const parsedTime = parseFloat(timeToSet);
    
    // Verify the time is valid and within range
    if (isNaN(parsedTime)) {
      return {success: false, message: "Invalid time format"};
    }
    
    if (parsedTime < 0 || (activeVideo.duration && parsedTime > activeVideo.duration)) {
      return {success: false, message: `Time out of range (0-${activeVideo.duration})`};
    }
    
    // Actually set the time
    activeVideo.currentTime = parsedTime;
    
    // Try to play the video if it's paused and should be playing
    if (activeVideo.paused) {
      try {
        // Handle different video player types
        const playerType = detectPlayerType();
        let playInitiated = false;
        
        // Try player-specific play methods first
        if (playerType === "youtube") {
          const playButton = document.querySelector('.ytp-play-button');
          if (playButton && playButton.getAttribute('aria-label')?.includes('Play')) {
            console.log("[Content] Clicking YouTube play button");
            playButton.click();
            playInitiated = true;
          }
        } else if (playerType === "vimeo") {
          const playButton = document.querySelector('.play');
          if (playButton) {
            console.log("[Content] Clicking Vimeo play button");
            playButton.click();
            playInitiated = true;
          }
        } else if (playerType === "netflix") {
          const playButton = document.querySelector('.button-nfplayerPlay');
          if (playButton) {
            console.log("[Content] Clicking Netflix play button");
            playButton.click();
            playInitiated = true;
          }
        }
        
        // Fall back to standard HTML5 video play() method if needed
        if (!playInitiated) {
          console.log("[Content] Using standard play() method");
          await activeVideo.play();
        }
        
        console.log("[Content] Video playback started successfully");
      } catch (playError) {
        console.warn("[Content] Could not auto-play video:", playError.message);
        // We'll still report success even if auto-play fails - the time was set correctly
      }
    }
    
    // Confirm the time was set
    console.log(`[Content] Time set successfully to ${activeVideo.currentTime}`);
    return {
      success: true,
      message: "Video time set successfully",
      newTime: activeVideo.currentTime,
      playing: !activeVideo.paused
    };
  } catch (error) {
    console.error("[Content] Error setting video time:", error);
    return {success: false, message: `Error: ${error.message}`};
  }
}

// Improved algorithm to find the most likely "active" video
function findBestActiveVideo(videos) {
  // If there's only one video, that's our answer
  if (videos.length === 1) {
    return videos[0];
  }
  
  // Strategy 1: First look for a video that's currently playing
  for (const video of videos) {
    if (!video.paused && video.currentTime > 0 && video.readyState > 2 && video.disablePictureInPicture !== true) {
      console.log("[Content] Found playing video");
      return video;
    }
  }
  
  // Strategy 2: Look for a video with reasonable dimensions that's in view
  const viewportVideos = [];
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    // Only consider videos of a significant size
    if (rect.width >= 200 && rect.height >= 100) {
      // Calculate how much of the video is in the viewport
      const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
      const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      
      if (visibleWidth > 0 && visibleHeight > 0) {
        const visibleArea = visibleWidth * visibleHeight;
        const visiblePercent = visibleArea / (rect.width * rect.height);
        
        viewportVideos.push({
          video,
          visibleArea,
          visiblePercent,
          progress: video.currentTime / (video.duration || 1) // How far along the video is
        });
      }
    }
  }
  
  if (viewportVideos.length > 0) {
    // Sort by visible area (largest first) as primary criterion
    viewportVideos.sort((a, b) => b.visibleArea - a.visibleArea);
    console.log("[Content] Found video in viewport");
    return viewportVideos[0].video;
  }
  
  // Strategy 3: If no good viewport videos, look for a video that has been played
  for (const video of videos) {
    if (video.currentTime > 0 && video.readyState > 2) {
      console.log("[Content] Found video with playback history");
      return video;
    }
  }
  
  // Strategy 4: Last resort - find the largest video
  let largestVideo = null;
  let largestArea = 0;
  
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const area = rect.width * rect.height;
    
    if (area > largestArea) {
      largestArea = area;
      largestVideo = video;
    }
  }
  
  if (largestVideo && largestArea > 10000) { // Minimum area threshold
    console.log("[Content] Using largest video as fallback");
    return largestVideo;
  }
  
  // Give up - return the first video if any
  console.log("[Content] No ideal video found, using first video");
  return videos.length > 0 ? videos[0] : null;
}

// Get a unique identifier for a video element if possible
function getVideoIdentifier(videoElement) {
  // Try to get a video ID from the page or element
  const url = window.location.href;
  
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // Extract YouTube video ID
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v');
    if (videoId) return `youtube:${videoId}`;
    
    // Check for embed format
    const embedMatch = url.match(/\/embed\/([^\/\?]+)/);
    if (embedMatch) return `youtube:${embedMatch[1]}`;
    
    // Check for youtu.be format
    const shortMatch = url.match(/youtu\.be\/([^\/\?]+)/);
    if (shortMatch) return `youtube:${shortMatch[1]}`;
  }
  
  if (url.includes('vimeo.com')) {
    // Extract Vimeo video ID
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return `vimeo:${vimeoMatch[1]}`;
  }
  
  if (url.includes('netflix.com')) {
    // Try to extract Netflix video ID
    const netflixMatch = url.match(/watch\/(\d+)/);
    if (netflixMatch) return `netflix:${netflixMatch[1]}`;
  }
  
  // Generic fallback - hash of video element properties
  try {
    const videoProps = {
      src: videoElement.src || '',
      currentSrc: videoElement.currentSrc || '',
      duration: videoElement.duration,
      videoWidth: videoElement.videoWidth,
      videoHeight: videoElement.videoHeight
    };
    return `generic:${JSON.stringify(videoProps)}`;
  } catch (e) {
    return 'unknown';
  }
}

// Enhanced player type detection
function detectPlayerType() {
  const url = window.location.href;
  const host = window.location.hostname;
  
  // Netflix detection
  if (url.includes('netflix.com') || host.includes('netflix')) {
    // Check for Netflix player elements
    if (document.querySelector('.nf-player-container') || document.querySelector('.netflix-player')) {
      return 'netflix';
    }
  }
  
  // YouTube detection
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    // Check for YouTube player elements
    if (document.querySelector('.html5-video-player') || document.querySelector('#movie_player')) {
      return 'youtube';
    }
  }
  
  // Vimeo detection
  if (url.includes('vimeo.com')) {
    // Check for Vimeo player elements
    if (document.querySelector('.vp-video') || document.querySelector('.vimeo-player')) {
      return 'vimeo';
    }
  }
  
  // Amazon Prime Video detection
  if (url.includes('amazon.com/gp/video') || url.includes('primevideo.com')) {
    if (document.querySelector('.webPlayerContainer') || document.querySelector('.atvwebplayersdk-wrapper')) {
      return 'primevideo';
    }
  }
  
  // Disney+ detection
  if (url.includes('disneyplus.com')) {
    if (document.querySelector('.btm-media-player') || document.querySelector('.disney-player')) {
      return 'disney';
    }
  }
  
  // Hulu detection
  if (url.includes('hulu.com')) {
    if (document.querySelector('.player-container') || document.querySelector('.hulu-player')) {
      return 'hulu';
    }
  }
  
  // HBO detection
  if (url.includes('hbo') || url.includes('max.com')) {
    if (document.querySelector('.hbo-player') || document.querySelector('.max-player')) {
      return 'hbo';
    }
  }
  
  // Generic HTML5 video
  return 'generic';
}