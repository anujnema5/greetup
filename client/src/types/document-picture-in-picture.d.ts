/** Chromium Document Picture-in-Picture (not in all TypeScript DOM libs yet). */
export {};

declare global {
  interface DocumentPictureInPicture extends EventTarget {
    readonly window: Window | null;
    requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
    addEventListener(
      type: "enter" | "leave",
      listener: (this: DocumentPictureInPicture, ev: Event) => void,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: "enter" | "leave",
      listener: (this: DocumentPictureInPicture, ev: Event) => void,
      options?: boolean | EventListenerOptions
    ): void;
  }

  interface Window {
    readonly documentPictureInPicture?: DocumentPictureInPicture;
  }
}
