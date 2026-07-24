interface Window {
  gameConfirm: (message: string, title?: string) => Promise<boolean>;
  gameAlert: (message: string, title?: string) => Promise<boolean>;
  electronAPI: any;
  services?: any;
}
