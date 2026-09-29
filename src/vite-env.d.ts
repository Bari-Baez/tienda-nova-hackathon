/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REGISTRATION_ENDPOINT?: string;
  readonly VITE_REGISTRATION_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
