/**
 * Railway Geometric Engineering Mathematics & Formulas (AREMA & Class I standards)
 */

export const EARTH_RADIUS_FT = 20902231.0; // Mean Earth radius in feet
export const EARTH_RADIUS_M = 6371000.0;   // Mean Earth radius in meters
export const FT_TO_M = 0.3048;
export const M_TO_FT = 3.280839895;

/**
 * Calculates distance between two [lng, lat] coordinates in feet
 */
export function distanceFeet(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_FT * c;
}

/**
 * Calculates initial bearing/azimuth from coord1 to coord2 in degrees (0-360)
 */
export function bearingDegrees(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);

  return ((theta * 180) / Math.PI + 360) % 360;
}

/**
 * Projects a new coordinate given start coord, distance (in feet), and bearing (degrees)
 */
export function destinationCoord(startCoord, distanceFt, bearingDeg) {
  const [lon1, lat1] = startCoord;
  const delta = distanceFt / EARTH_RADIUS_FT;
  const theta = (bearingDeg * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const lambda1 = (lon1 * Math.PI) / 180;

  const phi2 = Math.asin(
    Math.sin(phi1) * Math.cos(delta) +
      Math.cos(phi1) * Math.sin(delta) * Math.cos(theta)
  );
  const lambda2 =
    lambda1 +
    Math.atan2(
      Math.sin(theta) * Math.sin(delta) * Math.cos(phi1),
      Math.cos(delta) - Math.sin(phi1) * Math.sin(phi2)
    );

  return [((lambda2 * 180) / Math.PI + 540) % 360 - 180, (phi2 * 180) / Math.PI];
}

/**
 * AREMA Degree of Curvature (Chord definition for 100-ft chord)
 * D = 5729.58 / R (in feet)
 */
export function radiusToDegreeOfCurve(radiusFt) {
  if (!radiusFt || radiusFt <= 0) return 0;
  return 5729.578 / radiusFt;
}

export function degreeOfCurveToRadius(degree) {
  if (!degree || degree <= 0) return Infinity;
  return 5729.578 / degree;
}

/**
 * Formats feet into Railway Stationing format (e.g., Sta 14+52.30)
 */
export function formatStationing(distanceFt, isMetric = false) {
  if (isMetric) {
    const meters = distanceFt * FT_TO_M;
    const km = Math.floor(meters / 1000);
    const m = (meters % 1000).toFixed(2).padStart(6, '0');
    return `KM ${km}+${m}`;
  }
  const stations = Math.floor(distanceFt / 100);
  const plusFt = (distanceFt % 100).toFixed(2).padStart(5, '0');
  return `Sta ${stations}+${plusFt}`;
}

/**
 * Calculates radius of circle passing through 3 points (p1, p2, p3) in feet
 */
export function calculateCurveRadius(p1, p2, p3) {
  const a = distanceFeet(p2, p3);
  const b = distanceFeet(p1, p3);
  const c = distanceFeet(p1, p2);

  const s = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));

  if (area < 0.001) return Infinity; // Straight tangent line

  const radius = (a * b * c) / (4 * area);
  return radius;
}

/**
 * Calculates total track cumulative stationing and segment stats
 */
export function analyzeTrackAlignment(coords) {
  if (!coords || coords.length < 2) {
    return {
      totalLengthFt: 0,
      stations: [],
      segments: [],
      curves: [],
      minRadiusFt: Infinity,
      maxDegreeOfCurve: 0,
      warnings: []
    };
  }

  let totalLength = 0;
  const stations = [0];
  const segments = [];
  const curves = [];
  let minRadius = Infinity;
  let maxDegree = 0;
  const warnings = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const segLen = distanceFeet(coords[i], coords[i + 1]);
    const bearing = bearingDegrees(coords[i], coords[i + 1]);
    totalLength += segLen;
    stations.push(totalLength);

    segments.push({
      index: i,
      fromCoord: coords[i],
      toCoord: coords[i + 1],
      lengthFt: segLen,
      startStationFt: stations[i],
      endStationFt: totalLength,
      bearingDeg: bearing
    });
  }

  // Analyze curve geometry for intermediate points
  for (let i = 1; i < coords.length - 1; i++) {
    const pPrev = coords[i - 1];
    const pCurr = coords[i];
    const pNext = coords[i + 1];

    const radius = calculateCurveRadius(pPrev, pCurr, pNext);
    const doc = radiusToDegreeOfCurve(radius);

    const b1 = bearingDegrees(pPrev, pCurr);
    const b2 = bearingDegrees(pCurr, pNext);
    let deflection = b2 - b1;
    if (deflection > 180) deflection -= 360;
    if (deflection < -180) deflection += 360;

    const curveInfo = {
      vertexIndex: i,
      stationFt: stations[i],
      coord: pCurr,
      radiusFt: radius,
      degreeOfCurve: doc,
      deflectionDeg: deflection,
      direction: deflection > 0 ? 'Right' : 'Left'
    };

    if (radius < minRadius) minRadius = radius;
    if (doc > maxDegree) maxDegree = doc;

    curves.push(curveInfo);
  }

  return {
    totalLengthFt: totalLength,
    stations,
    segments,
    curves,
    minRadiusFt: minRadius === Infinity ? 0 : minRadius,
    maxDegreeOfCurve: maxDegree,
    warnings
  };
}
