const MEETINGS_KEY = "cio_summit_meetings";
const MEETINGS_EVENT = "meetings-updated";
const FEATURED_KEY = "cio_featured_speaker";

export const saveMeetingsToStorage = (meetings: any[]) => {
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
  localStorage.setItem(MEETINGS_KEY + "_ts", Date.now().toString());
  
  window.dispatchEvent(new StorageEvent("storage", {
    key: MEETINGS_KEY,
    newValue: JSON.stringify(meetings),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const getMeetingsFromStorage = (): any[] | null => {
  const data = localStorage.getItem(MEETINGS_KEY);
  return data ? JSON.parse(data) : null;
};

export const subscribeToMeetingsUpdates = (callback: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === MEETINGS_KEY) {
      callback();
    }
  };
  
  window.addEventListener("storage", handleStorage);
  
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
};

export const saveFeaturedSpeaker = (speaker: { name: string; company: string; bio: string }) => {
  localStorage.setItem(FEATURED_KEY, JSON.stringify(speaker));
  localStorage.setItem(FEATURED_KEY + "_ts", Date.now().toString());
  
  window.dispatchEvent(new StorageEvent("storage", {
    key: FEATURED_KEY,
    newValue: JSON.stringify(speaker),
    url: window.location.href,
    storageArea: localStorage
  }));
};

export const getFeaturedSpeaker = (): { name: string; company: string; bio: string } | null => {
  const data = localStorage.getItem(FEATURED_KEY);
  return data ? JSON.parse(data) : null;
};

export const subscribeToFeaturedSpeaker = (callback: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === FEATURED_KEY) {
      callback();
    }
  };
  
  window.addEventListener("storage", handleStorage);
  
  return () => {
    window.removeEventListener("storage", handleStorage);
  };
};