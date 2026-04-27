/**
 * scanStore — in-memory handoff between camera screens and the processing screen.
 *
 * Camera screens push captured image URIs here immediately after capture.
 * processing.tsx reads them, sends to the API, then clears the store.
 *
 * We use a simple module-level store (not AsyncStorage) because the data is
 * transient — it only needs to survive the navigation from camera → processing,
 * which happens within a single JS runtime session.
 */

interface PendingScan {
  type: 'face' | 'skin' | 'dental';
  imageUris: string[];
  /** Optional ARKit face geometry captured in the same flow (skin & face scans). */
  faceMesh?: import('../modules/arkit-face-mesh/src').FaceMeshResult | null;
  /** Phase 2B: LiDAR-fused contour analysis (face scans only). */
  contourAnalysis?: import('../modules/arkit-face-mesh/src').ContourAnalysis | null;
  hasLiDAR?: boolean;
  depthEnhanced?: boolean;
}

let _pending: PendingScan | null = null;

/**
 * Persisted preview image for the most recent scan, keyed by scanId.
 * Survives `take()` so downstream screens (e.g. ai-report → simulateResult)
 * can hand a real image to follow-up Cloud Functions. Stored as a data URI
 * because that is the format the simulateResult CF accepts.
 */
let _lastSimulationImage: { scanId: string; dataUri: string } | null = null;

export const scanImageStore = {
  set(scanId: string, dataUri: string) {
    _lastSimulationImage = { scanId, dataUri };
  },
  get(scanId?: string): string | null {
    if (!_lastSimulationImage) return null;
    if (!scanId || _lastSimulationImage.scanId === scanId) return _lastSimulationImage.dataUri;
    return null;
  },
  /** Most recent image regardless of scanId — fallback for legacy mock paths */
  latest(): string | null {
    return _lastSimulationImage?.dataUri ?? null;
  },
};

export const scanStore = {
  /** Called by each camera screen after capture(s) complete */
  set(scan: PendingScan) {
    _pending = scan;
    console.log('📦 scanStore.set:', scan.type, scan.imageUris.length, 'image(s)');
  },

  /**
   * Append a single URI to the accumulating scan (face multi-step flow).
   * Initialises the store for the given type if not yet set.
   */
  addUri(type: PendingScan['type'], uri: string) {
    if (!_pending || _pending.type !== type) {
      _pending = { type, imageUris: [] };
    }
    _pending.imageUris.push(uri);
    console.log('📦 scanStore.addUri:', type, '→', _pending.imageUris.length, 'total');
  },

  /** Called by processing.tsx to read and consume the pending scan */
  take(): PendingScan | null {
    const val = _pending;
    _pending = null;
    console.log('📦 scanStore.take:', val?.type, val?.imageUris.length ?? 0, 'image(s)');
    return val;
  },

  peek(): PendingScan | null {
    return _pending;
  },

  /** Reset accumulated URIs — call when starting a fresh face scan */
  reset() {
    _pending = null;
  },
};
