declare module "*.scss" {
  const content: { [className: string]: string };
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_API_BASE_URL?: string;
  }
}
