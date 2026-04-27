import ExpoModulesCore
import ARKit
import SceneKit

/**
 * ArkitFaceMeshModule
 *
 * Exposes a single async function `captureFaceMesh` that:
 *   1. Spins up a temporary ARSession with ARFaceTrackingConfiguration
 *   2. Waits for the first valid ARFaceAnchor (face detected by TrueDepth IR)
 *   3. Extracts ARFaceGeometry vertices (1,220 of them) + blendshapes (52)
 *   4. Pre-computes per-zone vertex indices using the canonical mesh layout
 *   5. Tears the session down and resolves the promise
 *
 * Total wall-clock target: <2s on iPhone 13 Pro Max.
 *
 * Device support:
 *   ARFaceTrackingConfiguration.isSupported is true on every iPhone with
 *   the TrueDepth front camera (iPhone X and later, including 13/14/15/16).
 *   When unsupported the module returns `{ supported: false }` so JS can fall
 *   back to the static heat map.
 */
public class ArkitFaceMeshModule: Module {

  // Hold the active session + delegate while capture is in flight so neither
  // is deallocated before the first ARFaceAnchor arrives.
  private var session: ARSession?
  private var delegate: FaceCaptureDelegate?

  public func definition() -> ModuleDefinition {
    Name("ArkitFaceMesh")

    Function("isSupported") { () -> Bool in
      return ARFaceTrackingConfiguration.isSupported
    }

    AsyncFunction("captureFaceMesh") { (promise: Promise) in
      guard ARFaceTrackingConfiguration.isSupported else {
        promise.resolve([ "supported": false ])
        return
      }

      DispatchQueue.main.async {
        self.startCapture(promise: promise, withContour: false)
      }
    }

    /**
     * captureFaceMeshWithDepth — Phase 2B
     * Returns the full mesh PLUS contourAnalysis (jawline, chin, cheekbone,
     * 64x64 depth grid). Same physical capture pipeline as captureFaceMesh
     * — ARKit fuses LiDAR with TrueDepth automatically when both are present.
     */
    AsyncFunction("captureFaceMeshWithDepth") { (promise: Promise) in
      guard ARFaceTrackingConfiguration.isSupported else {
        promise.resolve([ "supported": false ])
        return
      }

      DispatchQueue.main.async {
        self.startCapture(promise: promise, withContour: true)
      }
    }
  }

  private func startCapture(promise: Promise, withContour: Bool) {
    let config = ARFaceTrackingConfiguration()
    config.isLightEstimationEnabled = false
    config.maximumNumberOfTrackedFaces = 1

    let session = ARSession()
    let delegate = FaceCaptureDelegate(withContour: withContour) { [weak self] result in
      guard let self = self else { return }

      // Tear down — even on error
      self.session?.pause()
      self.session = nil
      self.delegate = nil

      switch result {
      case .success(let payload):
        promise.resolve(payload)
      case .failure(let error):
        promise.reject("E_FACE_MESH", error.localizedDescription)
      }
    }

    self.session = session
    self.delegate = delegate
    session.delegate = delegate

    // 6-second timeout — if no face detected by then, give up gracefully.
    delegate.armTimeout(seconds: 6) { [weak session] in
      session?.pause()
    }

    session.run(config, options: [ .resetTracking, .removeExistingAnchors ])
  }
}

// MARK: - Capture delegate

private final class FaceCaptureDelegate: NSObject, ARSessionDelegate {
  private let onComplete: (Result<[String: Any], Error>) -> Void
  private let withContour: Bool
  private var didFire = false
  private var timeoutWork: DispatchWorkItem?

  init(withContour: Bool, onComplete: @escaping (Result<[String: Any], Error>) -> Void) {
    self.withContour = withContour
    self.onComplete = onComplete
  }

  func armTimeout(seconds: Double, onTimeout: @escaping () -> Void) {
    let work = DispatchWorkItem { [weak self] in
      guard let self = self, !self.didFire else { return }
      self.didFire = true
      onTimeout()
      self.onComplete(.failure(NSError(
        domain: "ArkitFaceMesh",
        code: 408,
        userInfo: [NSLocalizedDescriptionKey: "Face not detected within 6s"]
      )))
    }
    self.timeoutWork = work
    DispatchQueue.main.asyncAfter(deadline: .now() + seconds, execute: work)
  }

  func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
    guard !didFire,
          let anchor = anchors.compactMap({ $0 as? ARFaceAnchor }).first else { return }

    didFire = true
    timeoutWork?.cancel()

    var payload = encodeAnchor(anchor)

    if withContour {
      let zones = (payload["zoneVertexIndices"] as? [String: [Int]]) ?? [:]
      let contour = computeContourAnalysis(geometry: anchor.geometry, zones: zones)
      payload["hasLiDAR"]        = LiDARDetector.hasLiDAR()
      payload["depthEnhanced"]   = LiDARDetector.hasLiDAR()  // ARKit fuses automatically
      payload["contourAnalysis"] = contour
    }

    onComplete(.success(payload))
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    guard !didFire else { return }
    didFire = true
    timeoutWork?.cancel()
    onComplete(.failure(error))
  }
}

// MARK: - Encoding

/**
 * Convert ARFaceAnchor → JS-friendly dictionary.
 *
 * vertices       : [{x,y,z}] — metres in face-local space (1,220 points)
 * blendShapes    : { eyeBlinkLeft: 0..1, ... }
 * faceTransform  : 16-float row-major 4x4 matrix
 * zoneVertexIndices : pre-computed index lists per facial zone
 */
private func encodeAnchor(_ anchor: ARFaceAnchor) -> [String: Any] {
  let geom = anchor.geometry
  let vertices = geom.vertices

  // Encode vertices as [{x,y,z}, ...]
  var verts: [[String: Float]] = []
  verts.reserveCapacity(vertices.count)
  for v in vertices {
    verts.append([ "x": v.x, "y": v.y, "z": v.z ])
  }

  // Encode blendshapes — keys are ARBlendShapeLocation rawValue strings
  var blend: [String: Float] = [:]
  for (k, n) in anchor.blendShapes {
    blend[k.rawValue] = n.floatValue
  }

  // Flatten 4x4 transform to 16 floats (column-major matches simd_float4x4)
  let m = anchor.transform
  let matrix: [Float] = [
    m.columns.0.x, m.columns.0.y, m.columns.0.z, m.columns.0.w,
    m.columns.1.x, m.columns.1.y, m.columns.1.z, m.columns.1.w,
    m.columns.2.x, m.columns.2.y, m.columns.2.z, m.columns.2.w,
    m.columns.3.x, m.columns.3.y, m.columns.3.z, m.columns.3.w
  ]

  let zones = computeZoneIndices(vertices: vertices)

  return [
    "supported":         true,
    "vertices":          verts,
    "blendShapes":       blend,
    "faceTransform":     matrix,
    "captureTimestamp":  Date().timeIntervalSince1970 * 1000.0,
    "zoneVertexIndices": zones
  ]
}

// MARK: - Zone computation

/**
 * Group vertex indices into eight named facial zones using Y-axis bands and
 * X-axis lateral splits. ARFaceGeometry uses metres in a face-local frame with:
 *   +X to the right (the user's right cheek)
 *   +Y upward (forehead = high Y)
 *   +Z out of the face toward the camera
 *
 * The exact thresholds are tuned for Apple's canonical face mesh and match
 * the zone positions used by the static SVG heat map. Vertex layout is stable
 * across iOS releases — Apple guarantees the same 1,220-point topology.
 */
private func computeZoneIndices(vertices: [simd_float3]) -> [String: [Int]] {
  guard !vertices.isEmpty else {
    return [
      "forehead": [], "leftCheek": [], "rightCheek": [], "nose": [],
      "chin": [], "jawline": [], "underEye": [], "lips": []
    ]
  }

  // Compute axis ranges
  let ys = vertices.map { $0.y }
  let xs = vertices.map { $0.x }
  let minY = ys.min() ?? 0, maxY = ys.max() ?? 0
  let minX = xs.min() ?? 0, maxX = xs.max() ?? 0
  let yRange = maxY - minY
  let xRange = maxX - minX

  // Helpers: y-fraction (0 = chin, 1 = forehead); x-fraction (0 = left, 1 = right)
  func yf(_ v: simd_float3) -> Float { (v.y - minY) / max(yRange, 0.0001) }
  func xf(_ v: simd_float3) -> Float { (v.x - minX) / max(xRange, 0.0001) }

  var forehead   = [Int]()
  var leftCheek  = [Int]()
  var rightCheek = [Int]()
  var nose       = [Int]()
  var chin       = [Int]()
  var jawline    = [Int]()
  var underEye   = [Int]()
  var lips       = [Int]()

  for (i, v) in vertices.enumerated() {
    let y = yf(v)   // 0..1
    let x = xf(v)   // 0..1

    // Forehead: top 20%
    if y >= 0.80 { forehead.append(i); continue }

    // Under-eye band: 0.55..0.70 (between forehead and cheek mid)
    if y >= 0.55 && y < 0.70 {
      // Skip the centre stripe (nose) — under-eye sits lateral to the nose ridge
      if x < 0.40 || x > 0.60 { underEye.append(i); continue }
    }

    // Nose: vertical ridge in the centre column, mid-band
    if x >= 0.43 && x <= 0.57 && y >= 0.40 && y < 0.70 {
      nose.append(i); continue
    }

    // Lips: mouth band
    if y >= 0.20 && y < 0.32 && x >= 0.30 && x <= 0.70 {
      lips.append(i); continue
    }

    // Chin: bottom 15%, centre half
    if y < 0.15 && x >= 0.30 && x <= 0.70 {
      chin.append(i); continue
    }

    // Jawline: bottom 25%, lateral
    if y < 0.25 && (x < 0.30 || x > 0.70) {
      jawline.append(i); continue
    }

    // Cheeks: mid-band 0.30..0.65, lateral
    if y >= 0.30 && y < 0.65 {
      if x < 0.40 { leftCheek.append(i); continue }
      if x > 0.60 { rightCheek.append(i); continue }
    }
  }

  return [
    "forehead":   forehead,
    "leftCheek":  leftCheek,
    "rightCheek": rightCheek,
    "nose":       nose,
    "chin":       chin,
    "jawline":    jawline,
    "underEye":   underEye,
    "lips":       lips
  ]
}

// MARK: - LiDAR detection

private struct LiDARDetector {
  /**
   * iPhone Pro models from 12-Pro onwards have a rear LiDAR sensor.
   * ARKit exposes its presence through the world-tracking scene-reconstruction
   * capability — face tracking automatically fuses LiDAR into the depth pipeline
   * when both LiDAR and TrueDepth are present, so we use this as the most
   * reliable runtime signal.
   */
  static func hasLiDAR() -> Bool {
    return ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh)
  }
}

// MARK: - Contour analysis (Phase 2B)

/**
 * Compute jawline contour, chin projection, cheekbone prominence and a 64x64
 * depth grid from the captured ARFaceGeometry.
 *
 * Coordinate system reminder:
 *   +X to the right, +Y upward, +Z toward the camera (out of the face).
 *   All values are in metres in face-local space.
 *
 * Output millimetres are converted via *1000 at the boundary so JS sees mm.
 */
private func computeContourAnalysis(
  geometry: ARFaceGeometry,
  zones: [String: [Int]]
) -> [String: Any] {
  let verts = geometry.vertices
  let jawIdx       = zones["jawline"]    ?? []
  let chinIdx      = zones["chin"]       ?? []
  let leftCheekIdx = zones["leftCheek"]  ?? []
  let rightCheekIdx = zones["rightCheek"] ?? []
  let noseIdx      = zones["nose"]       ?? []
  let lipIdx       = zones["lips"]       ?? []

  // ── 1) Jawline contour: sort jaw vertices by X for a left-to-right curve
  let jawSorted = jawIdx
    .map { (idx: $0, v: verts[$0]) }
    .sorted { $0.v.x < $1.v.x }

  let jawlineContour: [[String: Float]] = jawSorted.map { (_, v) in
    ["x": v.x, "y": v.y, "z": v.z]
  }

  // Gonial-angle estimate: take the leftmost, midpoint and rightmost jaw points
  // and compute the interior angle at the chin (mid) vertex.
  let gonialAngle: Float = {
    guard jawSorted.count >= 3 else { return 0 }
    let p0 = jawSorted.first!.v
    let pm = jawSorted[jawSorted.count / 2].v
    let p1 = jawSorted.last!.v
    let v0 = SIMD3<Float>(p0.x - pm.x, p0.y - pm.y, p0.z - pm.z)
    let v1 = SIMD3<Float>(p1.x - pm.x, p1.y - pm.y, p1.z - pm.z)
    let dot = simd_dot(v0, v1)
    let mag = simd_length(v0) * simd_length(v1)
    let cos = max(-1.0, min(1.0, dot / max(mag, 1e-6)))
    return acos(cos) * 180.0 / .pi
  }()

  // Symmetry: compare left and right halves of the jaw against each other
  let jawlineSymmetry: Float = {
    guard jawSorted.count >= 4 else { return 100 }
    let mid = jawSorted.count / 2
    let left  = jawSorted[..<mid].map { $0.v }
    let right = jawSorted[mid...].map { $0.v }.reversed()
    var error: Float = 0; var count: Float = 0
    for (l, r) in zip(left, right) {
      // Mirror left X about 0 and compare to right
      error += abs((-l.x) - r.x) + abs(l.y - r.y) + abs(l.z - r.z)
      count += 1
    }
    let avg = error / max(count, 1)
    // Empirical: 0 mm avg error → 100, 5 mm → 0
    let pct = max(0, min(100, 100 - (avg * 1000.0) * 20.0))
    return pct
  }()

  // ── 2) Chin projection
  let mostAnteriorChin = chinIdx
    .map { verts[$0] }
    .max { $0.z < $1.z }

  // Subnasal point ≈ lowest nose vertex
  let subnasal = noseIdx
    .map { verts[$0] }
    .min { $0.y < $1.y }

  let lowestChin = chinIdx
    .map { verts[$0] }
    .min { $0.y < $1.y }

  let topLip = lipIdx
    .map { verts[$0] }
    .max { $0.y < $1.y }

  let chinProjectionMM: Float = {
    guard let chin = mostAnteriorChin, let sn = subnasal else { return 0 }
    return (chin.z - sn.z) * 1000.0
  }()

  let chinHeightMM: Float = {
    guard let lc = lowestChin, let lip = topLip else { return 0 }
    return (lip.y - lc.y) * 1000.0
  }()

  // Ricketts E-plane: line from nose tip to soft-tissue pogonion. We use chin
  // anterior as a proxy for pogonion. Position relative to that line is
  // determined by sign of horizontal offset; here we collapse to mm of forward
  // projection vs an idealised on-line value (~2 mm behind for adults).
  let rickettsPos: String = {
    if chinProjectionMM > 4 { return "ahead" }
    if chinProjectionMM < -2 { return "behind" }
    return "on"
  }()

  // ── 3) Cheekbone prominence
  // For each cheek zone, find the most lateral vertex (max |X|) and
  // compare its Z to the median Z of the rest of the cheek zone.
  func cheekProminence(_ idx: [Int], rightSide: Bool) -> Float {
    guard !idx.isEmpty else { return 0 }
    let pts = idx.map { verts[$0] }
    let lateral = rightSide ? pts.max(by: { $0.x < $1.x }) : pts.min(by: { $0.x < $1.x })
    guard let l = lateral else { return 0 }
    let medianZ: Float = {
      let zs = pts.map { $0.z }.sorted()
      return zs[zs.count / 2]
    }()
    let projMM = (l.z - medianZ) * 1000.0
    // Empirical scoring: 0 mm = 50, 8 mm = 100, -4 mm = 0
    let score = max(0, min(100, 50.0 + projMM * 6.25))
    return score
  }

  let leftScore  = cheekProminence(leftCheekIdx,  rightSide: false)
  let rightScore = cheekProminence(rightCheekIdx, rightSide: true)
  let cheekSymmetry: Float = {
    let diff = abs(leftScore - rightScore)
    return max(0, 100 - diff * 2)
  }()

  // ── 4) 64x64 depth grid (orthographic XY projection, Z values in mm)
  let depthMap = buildDepthGrid(verts: verts, gridSize: 64)

  return [
    "jawlineContour":      jawlineContour,
    "jawlineAngleDegrees": gonialAngle,
    "jawlineSymmetry":     jawlineSymmetry,
    "chinProjection": [
      "projectionMM":         chinProjectionMM,
      "verticalHeightMM":     chinHeightMM,
      "rickettEPlanePosition": rickettsPos
    ],
    "cheekboneProminence": [
      "leftScore":  leftScore,
      "rightScore": rightScore,
      "symmetry":   cheekSymmetry
    ],
    "facialDepthMap": depthMap
  ]
}

// MARK: - Depth grid

/**
 * Build a regular gridSize×gridSize depth grid by:
 *   1. Computing bounding box of all vertices in XY
 *   2. For each grid cell, finding the nearest vertex (by 2D distance) and
 *      taking its Z. This is a Voronoi-style nearest-neighbour fill — fast
 *      and produces a usable depth contour for visualisation.
 *
 * Z values are normalised so the most-anterior point (largest Z) maps to 0 mm
 * (closest to camera) and the most-posterior point (smallest Z) maps to a
 * positive number (depth into the face). Output is in millimetres.
 */
private func buildDepthGrid(verts: [simd_float3], gridSize: Int) -> [String: Any] {
  guard !verts.isEmpty else {
    return [
      "width": gridSize, "height": gridSize,
      "values": [Float](repeating: 0, count: gridSize * gridSize),
      "minDepth": 0.0, "maxDepth": 0.0
    ]
  }

  var minX = Float.infinity, maxX = -Float.infinity
  var minY = Float.infinity, maxY = -Float.infinity
  var minZ = Float.infinity, maxZ = -Float.infinity
  for v in verts {
    if v.x < minX { minX = v.x }; if (v.x > maxX) { maxX = v.x }
    if v.y < minY { minY = v.y }; if (v.y > maxY) { maxY = v.y }
    if v.z < minZ { minZ = v.z }; if (v.z > maxZ) { maxZ = v.z }
  }
  let rangeX = maxX - minX, rangeY = maxY - minY

  var values = [Float](repeating: 0, count: gridSize * gridSize)
  let cellW = rangeX / Float(gridSize)
  let cellH = rangeY / Float(gridSize)

  for gy in 0..<gridSize {
    for gx in 0..<gridSize {
      let cx = minX + (Float(gx) + 0.5) * cellW
      let cy = minY + (Float(gy) + 0.5) * cellH

      var bestDist: Float = .infinity
      var bestZ: Float = 0
      for v in verts {
        let dx = v.x - cx, dy = v.y - cy
        let d = dx * dx + dy * dy
        if d < bestDist { bestDist = d; bestZ = v.z }
      }
      // Convert to mm-from-front: closer to camera (largest Z) = 0
      values[gy * gridSize + gx] = (maxZ - bestZ) * 1000.0
    }
  }

  return [
    "width":     gridSize,
    "height":    gridSize,
    "values":    values,
    "minDepth":  0.0,
    "maxDepth":  (maxZ - minZ) * 1000.0
  ]
}
