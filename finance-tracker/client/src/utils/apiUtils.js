// Detect if running under HA Ingress or directly
function getApiBase() {
  const path = window.location.pathname;
  const ingressMatch = path.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  if (ingressMatch) {
    // Under Ingress — use the ingress prefix + app-api
    return `${ingressMatch[1]}/app-api`;
  }
  // Direct access — use relative path
  return '/app-api';
}

export const API_BASE = getApiBase();
