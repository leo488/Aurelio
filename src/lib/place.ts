// Where a note was made: the phone's location, named with OpenStreetMap's free lookup.

export type Place = { place?: string; lat: number; lng: number }

const here = () => new Promise<GeolocationPosition>((ok, fail) => navigator.geolocation.getCurrentPosition(ok, fail, { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }))

/** "Lekki, Lagos" from an OpenStreetMap address. */
function name(a: Record<string, string> = {}) {
  const near = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.village ?? a.town ?? a.city_district
  const city = a.city ?? a.town ?? a.county ?? a.state
  return [near, city].filter((x, i, all) => x && all.indexOf(x) === i).join(', ') || undefined
}

/** The spot and its name, or null when location is off or refused. */
export async function findPlace(): Promise<Place | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null
  try {
    const { coords } = await here()
    const lat = Math.round(coords.latitude * 1e4) / 1e4
    const lng = Math.round(coords.longitude * 1e4) / 1e4
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat=${lat}&lon=${lng}`, { headers: { Accept: 'application/json' } })
      const data = res.ok ? await res.json() : null
      return { lat, lng, place: name(data?.address) }
    } catch {
      return { lat, lng }
    }
  } catch {
    return null
  }
}
