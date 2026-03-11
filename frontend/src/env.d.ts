declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_BASE_URL?: string;
  }
}

declare global {
  interface Window {
    __PAN_APP_ACCESS_TOKEN?: string;
    panAppAuthBridge?: {
      getAccessToken?: () => string | null | undefined;
      refreshAccessToken?:
        | ((reason: "missing" | "unauthorized") => Promise<string | null | undefined>)
        | ((reason: "missing" | "unauthorized") => string | null | undefined);
    };
  }
}

export {};
