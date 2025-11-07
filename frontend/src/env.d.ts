
interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string
  // add other VITE_... variables if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
