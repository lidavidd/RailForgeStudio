/**
 * Standard AREMA & North American Class I Turnout Catalog & Geometry Solver
 */
import { destinationCoord, bearingDegrees, distanceFeet } from './geometry.js';

export const TURNOUT_SPECS = {
  8: {
    number: 8,
    name: 'No. 8 Turnout (AREMA)',
    frogAngleDeg: 7.15,          // 7° 09' 10" (tan(theta) = 1/8)
    leadLengthFt: 67.8,          // Distance from Point of Switch (PS) to Point of Frog (PF)
    switchRailLengthFt: 16.5,
    maxSpeedMph: 10,
    typicalUse: 'Restricted Industrial Siding & Yard Drill Track',
    minClearanceOffsetFt: 14.0   // Fouling point clearance threshold
  },
  9: {
    number: 9,
    name: 'No. 9 Turnout (AREMA)',
    frogAngleDeg: 6.36,          // 6° 21' 35"
    leadLengthFt: 72.5,
    switchRailLengthFt: 16.5,
    maxSpeedMph: 12,
    typicalUse: 'Standard Industrial Yard Siding',
    minClearanceOffsetFt: 14.0
  },
  10: {
    number: 10,
    name: 'No. 10 Turnout (AREMA / UP / BNSF Standard)',
    frogAngleDeg: 5.72,          // 5° 43' 29" (tan(theta) = 1/10)
    leadLengthFt: 78.75,         // ~78'-9"
    switchRailLengthFt: 16.5,
    maxSpeedMph: 15,
    typicalUse: 'Class I Standard Industrial Connection & Secondary Main',
    minClearanceOffsetFt: 14.0
  },
  11: {
    number: 11,
    name: 'No. 11 Turnout (CN / CPKC Standard)',
    frogAngleDeg: 5.20,          // 5° 12' 18"
    leadLengthFt: 83.2,
    switchRailLengthFt: 19.5,
    maxSpeedMph: 20,
    typicalUse: 'Canadian Class I Standard Industrial & Branchline',
    minClearanceOffsetFt: 14.0
  },
  15: {
    number: 15,
    name: 'No. 15 Turnout (AREMA High-Speed Siding)',
    frogAngleDeg: 3.82,          // 3° 49' 06"
    leadLengthFt: 112.5,
    switchRailLengthFt: 26.0,
    maxSpeedMph: 30,
    typicalUse: 'Passing Siding & High-Speed Mainline Divergence',
    minClearanceOffsetFt: 15.0
  },
  20: {
    number: 20,
    name: 'No. 20 Turnout (High-Speed Mainline Crossover)',
    frogAngleDeg: 2.86,          // 2° 51' 45"
    leadLengthFt: 152.0,
    switchRailLengthFt: 39.0,
    maxSpeedMph: 50,
    typicalUse: 'Class I High-Speed Mainline Universal Crossover',
    minClearanceOffsetFt: 15.0
  }
};

/**
 * Solves turnout geometry coordinates given mainline alignment, switch position, and hand (Left/Right)
 */
export function generateTurnoutGeometry(mainlineCoords, switchStationFt, turnoutNumber = 10, hand = 'Right') {
  const spec = TURNOUT_SPECS[turnoutNumber] || TURNOUT_SPECS[10];
  
  // Find coordinate and bearing at switchStationFt along mainline
  let accumulated = 0;
  let pointOfSwitch = mainlineCoords[0];
  let mainBearing = 0;

  for (let i = 0; i < mainlineCoords.length - 1; i++) {
    const segLen = distanceFeet(mainlineCoords[i], mainlineCoords[i + 1]);
    if (accumulated + segLen >= switchStationFt) {
      const remainder = switchStationFt - accumulated;
      mainBearing = bearingDegrees(mainlineCoords[i], mainlineCoords[i + 1]);
      pointOfSwitch = destinationCoord(mainlineCoords[i], remainder, mainBearing);
      break;
    }
    accumulated += segLen;
  }

  // Calculate Point of Frog (PF)
  const frogStationFt = switchStationFt + spec.leadLengthFt;
  const pointOfFrogMain = destinationCoord(pointOfSwitch, spec.leadLengthFt, mainBearing);

  // Diverging angle
  const angleOffset = hand === 'Right' ? spec.frogAngleDeg : -spec.frogAngleDeg;
  const divergingBearing = (mainBearing + angleOffset + 360) % 360;

  // Point of Frog on Diverging track
  const pointOfFrogDiv = destinationCoord(pointOfSwitch, spec.leadLengthFt, (mainBearing + angleOffset * 0.75 + 360) % 360);

  // Fouling point (where tracks diverge to required clearance, e.g. 14.0 ft)
  // Distance to fouling point approx: clearance / tan(frogAngle)
  const foulingDistanceFt = spec.minClearanceOffsetFt / Math.tan((spec.frogAngleDeg * Math.PI) / 180);
  const foulingPointMain = destinationCoord(pointOfSwitch, foulingDistanceFt, mainBearing);
  const foulingPointDiv = destinationCoord(pointOfSwitch, foulingDistanceFt, divergingBearing);

  // Diverging extension track (preview 300 ft lead)
  const sidingEnd = destinationCoord(foulingPointDiv, 300, divergingBearing);

  return {
    spec,
    hand,
    switchStationFt,
    frogStationFt,
    foulingDistanceFt,
    foulingStationFt: switchStationFt + foulingDistanceFt,
    pointOfSwitch,
    pointOfFrogMain,
    pointOfFrogDiv,
    foulingPointMain,
    foulingPointDiv,
    divergingPath: [pointOfSwitch, pointOfFrogDiv, foulingPointDiv, sidingEnd],
    mainBearing,
    divergingBearing
  };
}
