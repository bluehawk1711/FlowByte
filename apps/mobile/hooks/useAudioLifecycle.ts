import { useEffect } from "react";
import { AudioPro, AudioProEventType } from "react-native-audio-pro";
import useAudioContext from "./store/audioContext";
import { useSettingsStore } from "./store/settingsStore";

export const useAudioLifecycle = () => {
  const playNext = useAudioContext((state) => state.playNext);
  const playPrevious = useAudioContext((state) => state.playPrevious);

  useEffect(() => {
    // AudioPro uses a single event listener for all events
    const subscription = AudioPro.addEventListener((event) => {
      switch (event.type) {
        case AudioProEventType.TRACK_ENDED:
          if (useSettingsStore.getState().autoplayNext) {
            playNext();
          }
          break;
        case AudioProEventType.REMOTE_NEXT:
          playNext(true);
          break;
        case AudioProEventType.REMOTE_PREV:
          playPrevious();
          break;
        case AudioProEventType.PROGRESS:
          // Update last position in store
          if (event.payload?.position) {
            useAudioContext.getState().setLastPosition(event.payload.position);
          }
          break;
      }
    });

    return () => {
      subscription.remove();
    };
  }, [playNext, playPrevious]);
};

