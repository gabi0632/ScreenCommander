// Electron webview element type declarations for the renderer process
interface HTMLWebViewElement extends HTMLElement {
  src: string;
  nodeintegration: boolean;
  disablewebsecurity: boolean;
  partition: string;
  allowpopups: boolean;
  preload: string;
  httpreferrer: string;
  useragent: string;
  blinkfeatures: string;
  disableblinkfeatures: string;
  guestinstance: string;
  webpreferences: string;
  enableremotemodule: boolean;
  reload: () => void;
  loadURL: (url: string) => void;
  getURL: () => string;
  getTitle: () => string;
  stop: () => void;
  goBack: () => void;
  goForward: () => void;
  canGoBack: () => boolean;
  canGoForward: () => boolean;
}

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLWebViewElement> & {
        src?: string;
        sandbox?: string;
        nodeintegration?: boolean;
        allowpopups?: boolean;
        preload?: string;
        partition?: string;
      },
      HTMLWebViewElement
    >;
  }
}
