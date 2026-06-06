import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { Loader2, MapPin, Search } from "lucide-react";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const DEFAULT_CENTER = [16.047079, 108.20623];

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestDestination(lat, lng, destinations = []) {
  const validDestinations = destinations.filter(
    (destination) =>
      Number.isFinite(destination.latitude) &&
      Number.isFinite(destination.longitude),
  );

  if (!validDestinations.length) return null;

  return validDestinations.reduce((nearest, destination) => {
    const distanceKm = haversineDistanceKm(
      lat,
      lng,
      destination.latitude,
      destination.longitude,
    );

    if (!nearest || distanceKm < nearest.distanceKm) {
      return {
        id: destination.id,
        name: destination.name,
        province: destination.province,
        distanceKm,
      };
    }

    return nearest;
  }, null);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

async function reverseGeocode(lat, lng) {
  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
  });

  return fetchJson(`https://nominatim.openstreetmap.org/reverse?${params}`);
}

async function searchLocation(query) {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    limit: "5",
  });

  return fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);
}

function MapViewport({ center }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);

  return null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function ServiceLocationPicker({
  label,
  value,
  onChange,
  destinations,
  required = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const normalizedDestinations = useMemo(
    () =>
      (destinations || []).map((destination) => ({
        id: destination.id || destination.destinationId,
        name: destination.name,
        province: destination.province || destination.city || "",
        latitude:
          destination.latitude != null ? Number(destination.latitude) : null,
        longitude:
          destination.longitude != null ? Number(destination.longitude) : null,
      })),
    [destinations],
  );

  const fallbackDestination = normalizedDestinations.find(
    (destination) =>
      Number.isFinite(destination.latitude) &&
      Number.isFinite(destination.longitude),
  );

  const selectedCenter =
    value?.latitude && value?.longitude
      ? [Number(value.latitude), Number(value.longitude)]
      : fallbackDestination
        ? [fallbackDestination.latitude, fallbackDestination.longitude]
        : DEFAULT_CENTER;

  const applyLocation = async (lat, lng, fallbackLabel = "") => {
    setBusy(true);
    setError("");

    try {
      const geo = await reverseGeocode(lat, lng);
      const nearest = findNearestDestination(lat, lng, normalizedDestinations);
      onChange({
        address:
          geo.display_name ||
          fallbackLabel ||
          `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        destinationId: nearest?.id || "",
        destinationName: nearest
          ? `${nearest.name}${nearest.province ? `, ${nearest.province}` : ""}`
          : "",
        destinationDistanceKm:
          nearest?.distanceKm != null
            ? Number(nearest.distanceKm.toFixed(1))
            : null,
      });
    } catch (err) {
      onChange({
        address: fallbackLabel || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        destinationId: "",
        destinationName: "",
        destinationDistanceKm: null,
      });
      setError(err.message || "Không thể xác định vị trí này");
    } finally {
      setBusy(false);
    }
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;

    setBusy(true);
    setError("");

    try {
      const results = await searchLocation(searchQuery.trim());
      if (!Array.isArray(results) || !results.length) {
        setError("Không tìm thấy vị trí nào cho tìm kiếm đó");
        return;
      }

      const match = results[0];
      await applyLocation(
        Number(match.lat),
        Number(match.lon),
        match.display_name || searchQuery.trim(),
      );
    } catch (err) {
      setError(err.message || "Tìm kiếm vị trí thất bại");
    } finally {
      setBusy(false);
    }
  };

  const markerPosition =
    value?.latitude && value?.longitude
      ? [Number(value.latitude), Number(value.longitude)]
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-[#5a6577]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {busy ? (
          <span className="inline-flex items-center gap-2 text-xs text-[#5a6577]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang xác định vị trí...
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d95a3]" />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo địa điểm, thắng cảnh hoặc địa chỉ"
            className="w-full rounded-xl border border-[#e8ecf0] bg-white py-2 pl-9 pr-3 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-[#e8ecf0] px-4 py-2 text-sm font-medium text-[#1a2332] hover:bg-[#f9fafb] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Tìm kiếm
        </button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[#dce4ea] bg-[#eef3f6]">
        <MapContainer
          center={selectedCenter}
          zoom={markerPosition ? 13 : 6}
          scrollWheelZoom
          className="h-[320px] w-full"
        >
          <MapViewport center={selectedCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPick={applyLocation} />
          {markerPosition ? (
            <Marker
              position={markerPosition}
              draggable
              eventHandlers={{
                dragend: (event) => {
                  const marker = event.target;
                  const latLng = marker.getLatLng();
                  applyLocation(latLng.lat, latLng.lng);
                },
              }}
            />
          ) : null}
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-[#e8ecf0] bg-[#f9fafb] p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="space-y-1 text-sm text-[#5a6577]">
            <p className="font-medium text-[#1a2332]">Điểm hẹn đã chọn</p>
            <p>
              Nhấp vào bản đồ hoặc tìm kiếm ở trên, sau đó kéo điểm đánh dấu để
              điều chỉnh vị trí chính xác.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8d95a3]">
              Địa chỉ đã xác định
            </p>
            <p className="min-h-[2.5rem] text-[#1a2332]">
              {value?.address ||
                "Chọn một điểm trên bản đồ để lấy địa chỉ"}
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8d95a3]">
              Điểm đến liên kết
            </p>
            <p className="text-[#1a2332]">
              {value?.destinationName ||
                "Điểm đến gần nhất sẽ hiển thị ở đây"}
            </p>
            {value?.destinationDistanceKm != null ? (
              <p className="mt-1 text-xs text-[#5a6577]">
                Khoảng {value.destinationDistanceKm} km từ điểm đã
                chọn
              </p>
            ) : null}
          </div>
          {false && (
            <>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8d95a3]">
                  Latitude
                </p>
                <p className="text-[#1a2332]">
                  {value?.latitude != null ? value.latitude : "--"}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.16em] text-[#8d95a3]">
                  Longitude
                </p>
                <p className="text-[#1a2332]">
                  {value?.longitude != null ? value.longitude : "--"}
                </p>
              </div>
            </>
          )}
        </div>

        {error ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
