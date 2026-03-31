export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function formatLastActive(dateValue) {
  if (!dateValue) {
    return "No activity yet";
  }

  const date = new Date(dateValue);
  const now = Date.now();
  const diffMs = Math.max(now - date.getTime(), 0);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "Active just now";
  if (diffMs < hour) return `Active ${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `Active ${Math.floor(diffMs / hour)} hr ago`;
  return `Active ${Math.floor(diffMs / day)} day ago`;
}
