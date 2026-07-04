// Standard Google encoded-polyline decoder (same algorithm as the backend's
// routeGeometryController.js), used to render a driver-recorded custom route
// on a Leaflet map without a round trip through the Routes API.
export function decodePolyline(str) {
  if (!str) return [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coords = [];

  while (index < str.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coords.push([lat / 1e5, lng / 1e5]);
  }

  return coords;
}
