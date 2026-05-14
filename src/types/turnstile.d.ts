declare global {
  interface Window {
    onTurnstileSuccess?: (token: string) => void;
  }
}

export {};
