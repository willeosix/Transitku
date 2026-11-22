import React, { useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewProps } from 'react-native-webview';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Corridor, Stop, Vehicle } from '../types/transit';
import { BANDUNG_CENTER } from '../utils/geo';

const MapWebView = WebView as unknown as React.ComponentType<
  WebViewProps & { ref?: React.RefObject<WebView | null> }
>;

interface BandungLiveMapProps {
  vehicles: Vehicle[];
  corridors?: Corridor[];
  stops?: Stop[];
  userLocation?: { latitude: number; longitude: number } | null;
  height?: number;
  title?: string;
  subtitle?: string;
}

function buildLeafletHtml(initialCenter: { latitude: number; longitude: number }): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #F4F4F5; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .leaflet-control-attribution { font-size: 9px !important; }
  .bus-pin { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #FFFFFF; box-shadow: 0 1px 4px rgba(0,0,0,0.35); }
  .user-pin { width: 12px; height: 12px; border-radius: 50%; background: #1D4ED8; border: 2px solid #FFFFFF; box-shadow: 0 0 0 4px rgba(29,78,216,0.2); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${initialCenter.latitude}, ${initialCenter.longitude}], 12);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  var routeLayer = L.layerGroup().addTo(map);
  var stopLayer = L.layerGroup().addTo(map);
  var vehicleLayer = L.layerGroup().addTo(map);
  var userLayer = L.layerGroup().addTo(map);
  var hasFitted = false;

  function statusColor(status) {
    if (status === 'RED') return '#DC2626';
    if (status === 'YELLOW') return '#D97706';
    return '#16A34A';
  }

  function decodePolyline(str) {
    var index = 0, lat = 0, lng = 0, coordinates = [];
    while (index < str.length) {
      var b, shift = 0, result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      var dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      shift = 0; result = 0;
      do { b = str.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      var dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      coordinates.push([lat / 1e5, lng / 1e5]);
    }
    return coordinates;
  }

  window.updateMapData = function(payload) {
    routeLayer.clearLayers();
    stopLayer.clearLayers();
    vehicleLayer.clearLayers();
    userLayer.clearLayers();

    var bounds = [];

    if (Array.isArray(payload.corridors)) {
      payload.corridors.forEach(function(c) {
        if (c.polyline) {
          var pts = decodePolyline(c.polyline);
          if (pts.length > 1) {
            L.polyline(pts, {
              color: c.color || '#1D4ED8',
              weight: 3.5,
              opacity: 0.78
            }).bindPopup('<b>' + c.code + '</b><br/>' + c.name).addTo(routeLayer);
            bounds.push(pts[0]);
            bounds.push(pts[pts.length - 1]);
          }
        }
      });
    }

    if (Array.isArray(payload.stops)) {
      payload.stops.forEach(function(s) {
        if (typeof s.latitude === 'number' && typeof s.longitude === 'number') {
          L.circleMarker([s.latitude, s.longitude], {
            radius: 3.5,
            color: '#525252',
            weight: 1,
            fillColor: '#FFFFFF',
            fillOpacity: 1
          }).bindPopup('<b>' + s.name + '</b><br/>' + (s.facilities || 'Shelter MJT')).addTo(stopLayer);
          bounds.push([s.latitude, s.longitude]);
        }
      });
    }

    if (Array.isArray(payload.vehicles)) {
      payload.vehicles.forEach(function(v) {
        if (typeof v.latitude === 'number' && typeof v.longitude === 'number') {
          var color = statusColor(v.crowd_status);
          var icon = L.divIcon({
            className: '',
            html: '<div class="bus-pin" style="background:' + color + '"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });
          var label = '<b>' + v.plate_number + '</b><br/>' +
            (v.corridor_code ? v.corridor_code + ' · ' : '') +
            v.crowd_status + ' (' + v.load_factor + '%)<br/>ETA ' + v.eta_next_stop_min + ' mnt';
          L.marker([v.latitude, v.longitude], { icon: icon }).bindPopup(label).addTo(vehicleLayer);
          bounds.push([v.latitude, v.longitude]);
        }
      });
    }

    if (payload.user && typeof payload.user.latitude === 'number' && typeof payload.user.longitude === 'number') {
      var uIcon = L.divIcon({
        className: '',
        html: '<div class="user-pin"></div>',
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });
      L.marker([payload.user.latitude, payload.user.longitude], { icon: uIcon })
        .bindPopup('Posisi Anda')
        .addTo(userLayer);
    }

    if (!hasFitted && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
      hasFitted = true;
    }
  };
</script>
</body>
</html>`;
}

export function BandungLiveMap({
  vehicles,
  corridors = [],
  stops = [],
  userLocation = null,
  height = 240,
  title = 'Peta live OpenStreetMap',
  subtitle,
}: BandungLiveMapProps) {
  const webViewRef = useRef<WebView>(null);
  const initialHtml = useMemo(() => buildLeafletHtml(BANDUNG_CENTER), []);

  const mapPayload = useMemo(
    () => ({
      corridors: corridors
        .filter((c) => Boolean(c.polyline))
        .map((c) => ({
          code: c.code,
          name: c.name,
          color: c.color ?? '#1D4ED8',
          polyline: c.polyline ?? '',
        })),
      vehicles: vehicles.map((v) => ({
        plate_number: v.plate_number,
        corridor_code: v.expand?.corridor?.code ?? '',
        latitude: v.latitude,
        longitude: v.longitude,
        crowd_status: v.crowd_status,
        load_factor: v.load_factor,
        eta_next_stop_min: v.eta_next_stop_min,
      })),
      stops: stops.slice(0, 80).map((s) => ({
        name: s.name,
        facilities: s.facilities ?? '',
        latitude: s.latitude,
        longitude: s.longitude,
      })),
      user: userLocation,
    }),
    [corridors, vehicles, stops, userLocation]
  );

  const pushPayloadToMap = () => {
    const script = `if (window.updateMapData) { window.updateMapData(${JSON.stringify(mapPayload)}); } true;`;
    webViewRef.current?.injectJavaScript(script);
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      pushPayloadToMap();
    }
  }, [mapPayload]);

  const webHtml = useMemo(() => {
    if (Platform.OS !== 'web') {
      return initialHtml;
    }
    return initialHtml.replace(
      '</body>',
      `<script>window.addEventListener('load', function() { window.updateMapData(${JSON.stringify(mapPayload)}); });</script></body>`
    );
  }, [initialHtml, mapPayload]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusGreenDot }]} />
            <Text style={styles.legendText}>Longgar</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusYellowDot }]} />
            <Text style={styles.legendText}>Sedang</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.statusRedDot }]} />
            <Text style={styles.legendText}>Padat</Text>
          </View>
        </View>
      </View>

      <View style={[styles.mapFrame, { height }]}>
        {Platform.OS === 'web' ? (
          <iframe
            title={title}
            srcDoc={webHtml}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        ) : (
          <MapWebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: initialHtml }}
            javaScriptEnabled
            domStorageEnabled
            onLoadEnd={pushPayloadToMap}
            style={styles.webview}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  titleCol: {
    gap: 2,
  },
  title: {
    ...typography.cardTitle,
  },
  subtitle: {
    ...typography.meta,
    ...typography.tabular,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...typography.meta,
    color: colors.textSecondary,
  },
  mapFrame: {
    width: '100%',
    backgroundColor: colors.raised,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.raised,
  },
});
