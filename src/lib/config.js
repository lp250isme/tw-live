// Base URL of the tw-live Worker data proxy. Override in local dev via
// VITE_API_BASE (e.g. http://127.0.0.1:8799); defaults to the deployed Worker.
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://live-api.kvcc.me'
