export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_KEY
    || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    || '';
}
