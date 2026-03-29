"use client";

import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "@/lib/redux/store";
import { endCall } from "@/lib/redux/slices/callSlice";
import { ConnectedView } from "@/components/connected-view";
import {
  clearCallSession,
  broadcastCallMessage,
} from "@/lib/call/call-sync";

let activePipCloseUi: (() => void) | null = null;

export function dismissDocumentPip(): void {
  try {
    activePipCloseUi?.();
  } finally {
    activePipCloseUi = null;
  }
}

function copyStylesToPictureInPictureDocument(target: Document): void {
  const charset = target.createElement("meta");
  charset.setAttribute("charset", "utf-8");
  target.head.appendChild(charset);

  const viewport = target.createElement("meta");
  viewport.setAttribute("name", "viewport");
  viewport.setAttribute(
    "content",
    "width=device-width, initial-scale=1, viewport-fit=cover"
  );
  target.head.appendChild(viewport);

  document.head
    .querySelectorAll('link[rel="stylesheet"], style')
    .forEach((node) => {
      target.head.appendChild(node.cloneNode(true));
    });
}

/**
 * Chromium Document Picture-in-Picture (no address bar). Main `/room` tab stays as-is.
 */
export async function openDocumentPictureInPictureCall(): Promise<boolean> {
  const api = window.documentPictureInPicture;
  if (!api?.requestWindow) return false;

  dismissDocumentPip();
  await new Promise((r) => setTimeout(r, 60));

  let pipWindow: Window;
  try {
    pipWindow = await api.requestWindow({ width: 400, height: 580 });
  } catch {
    await new Promise((r) => setTimeout(r, 120));
    try {
      pipWindow = await api.requestWindow({ width: 400, height: 580 });
    } catch {
      return false;
    }
  }

  const doc = pipWindow.document;
  doc.documentElement.lang = document.documentElement.lang || "en";
  doc.documentElement.className = document.documentElement.className;
  doc.body.style.margin = "0";
  doc.body.style.minHeight = "100vh";
  doc.documentElement.style.height = "100%";

  copyStylesToPictureInPictureDocument(doc);

  const container = doc.createElement("div");
  container.id = "circlo-doc-pip-root";
  container.style.cssText =
    "height:100vh;width:100%;overflow:hidden;box-sizing:border-box";
  doc.body.appendChild(container);

  let root: Root | null = createRoot(container);
  let closed = false;

  const closePipUi = () => {
    if (closed) return;
    closed = true;
    activePipCloseUi = null;
    api.removeEventListener("leave", onLeave);
    try {
      root?.unmount();
    } catch {
      /* ignore */
    }
    root = null;
    try {
      pipWindow.close();
    } catch {
      /* ignore */
    }
  };

  activePipCloseUi = () => closePipUi();

  const signalCallEnded = () => {
    clearCallSession();
    store.dispatch(endCall());
    broadcastCallMessage({ type: "END_CALL" });
  };

  const terminateCall = () => {
    closePipUi();
    signalCallEnded();
  };

  const onLeave = () => {
    api.removeEventListener("leave", onLeave);
    if (closed) return;
    closed = true;
    activePipCloseUi = null;
    try {
      root?.unmount();
    } catch {
      /* ignore */
    }
    root = null;
  };

  api.addEventListener("leave", onLeave);

  const skipCall = () => {
    broadcastCallMessage({ type: "SKIP_CALL" });
    closePipUi();
  };

  root.render(
    <Provider store={store}>
      <ConnectedView variant="pip" onEnd={terminateCall} onSkip={skipCall} />
    </Provider>
  );

  return true;
}
