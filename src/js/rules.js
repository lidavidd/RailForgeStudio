/**
 * AREMA & Class I Railroad Standard Rules & Automated Compliance Engine
 */

export const STANDARDS_PROFILES = {
  AREMA: {
    id: 'AREMA',
    name: 'AREMA MRE Recommended Practices',
    authority: 'American Railway Engineering and Maintenance-of-Way Association',
    maxDegreeOfCurveMain: 4.0,       // 4° 00'
    maxDegreeOfCurveIndustrial: 8.0, // 8° 00'
    maxDegreeAbsolute: 10.0,
    minReverseCurveTangentFt: 100,
    maxGradeMainPct: 1.0,
    maxGradeIndustrialPct: 1.5,
    maxGradeStorageTrackPct: 0.20,   // Prevent unbraked car rollout
    minTrackCenterSpacingFt: 14.0,
    minOverheadClearanceFt: 23.0,
    preferredTurnoutMain: 15,
    preferredTurnoutIndustrial: 10
  },
  UP_BNSF: {
    id: 'UP_BNSF',
    name: 'Union Pacific & BNSF Industrial Standards',
    authority: 'US Class I Common Industrial Track Specifications',
    maxDegreeOfCurveMain: 2.5,
    maxDegreeOfCurveIndustrial: 6.0, // BNSF prefers 6°00' max for modern 60ft/85ft cars
    maxDegreeAbsolute: 9.5,
    minReverseCurveTangentFt: 150,   // Strict 150' tangent for long autoracks
    maxGradeMainPct: 0.8,
    maxGradeIndustrialPct: 1.5,
    maxGradeStorageTrackPct: 0.20,
    minTrackCenterSpacingFt: 14.0,
    minOverheadClearanceFt: 23.5,    // Plate H Double Stack Clearance
    preferredTurnoutMain: 20,
    preferredTurnoutIndustrial: 10
  },
  CN_CPKC: {
    id: 'CN_CPKC',
    name: 'CN & CPKC Canadian Standards',
    authority: 'Canadian Class I Track Engineering Guidelines & TC TSR',
    maxDegreeOfCurveMain: 3.0,
    maxDegreeOfCurveIndustrial: 7.5,
    maxDegreeAbsolute: 10.0,
    minReverseCurveTangentFt: 100,
    maxGradeMainPct: 1.0,
    maxGradeIndustrialPct: 1.5,
    maxGradeStorageTrackPct: 0.25,
    minTrackCenterSpacingFt: 14.0,
    minOverheadClearanceFt: 23.0,
    preferredTurnoutMain: 15,
    preferredTurnoutIndustrial: 11   // Canadian standard No. 11 switch
  }
};

/**
 * Validates a track alignment and vertical profile against selected standards
 */
export function validateAlignmentCompliance(alignmentAnalysis, profilePoints, profileId = 'AREMA') {
  const rules = STANDARDS_PROFILES[profileId] || STANDARDS_PROFILES.AREMA;
  const issues = [];
  const passes = [];

  if (!alignmentAnalysis || alignmentAnalysis.totalLengthFt === 0) {
    return { issues: [], passes: [], overallStatus: 'PASS' };
  }

  // 1. Max Degree of Curve Check
  if (alignmentAnalysis.maxDegreeOfCurve > rules.maxDegreeAbsolute) {
    issues.push({
      severity: 'CRITICAL',
      code: 'CURVE_EXCEEDED_ABSOLUTE',
      title: `Excessive Curvature (${alignmentAnalysis.maxDegreeOfCurve.toFixed(1)}°)`,
      desc: `Maximum degree of curve exceeds absolute threshold of ${rules.maxDegreeAbsolute}°. High derailment risk from car stringlining and wheel flange climb.`,
      reference: `${rules.name} - Track Geometry`
    });
  } else if (alignmentAnalysis.maxDegreeOfCurve > rules.maxDegreeOfCurveIndustrial) {
    issues.push({
      severity: 'WARNING',
      code: 'CURVE_EXCEEDED_INDUSTRIAL',
      title: `Sharp Industrial Curve (${alignmentAnalysis.maxDegreeOfCurve.toFixed(1)}°)`,
      desc: `Exceeds standard industrial recommendation of ${rules.maxDegreeOfCurveIndustrial}°. Requires special approval for long cars (60'-89').`,
      reference: `${rules.name} - Curvature limits`
    });
  } else if (alignmentAnalysis.curves.length > 0) {
    passes.push({
      code: 'CURVATURE_COMPLIANT',
      title: `Curvature Compliant (${alignmentAnalysis.maxDegreeOfCurve.toFixed(1)}° max)`,
      desc: `All horizontal curves satisfy ${rules.name} limits (${rules.maxDegreeOfCurveIndustrial}° max).`
    });
  }

  // 2. Reverse Curve Tangent Check
  if (alignmentAnalysis.curves && alignmentAnalysis.curves.length >= 2) {
    for (let i = 0; i < alignmentAnalysis.curves.length - 1; i++) {
      const c1 = alignmentAnalysis.curves[i];
      const c2 = alignmentAnalysis.curves[i + 1];
      if (c1.direction !== c2.direction) {
        const tangentBetween = Math.abs(c2.stationFt - c1.stationFt);
        if (tangentBetween < rules.minReverseCurveTangentFt) {
          issues.push({
            severity: 'WARNING',
            code: 'REVERSE_CURVE_TANGENT_SHORT',
            title: `Short Reverse Tangent (${Math.round(tangentBetween)} ft)`,
            desc: `Tangent between reverse curves is less than required ${rules.minReverseCurveTangentFt} ft. Long cars may bind or uncouple.`,
            reference: `${rules.name} - Reverse Curves`
          });
        }
      }
    }
  }

  // 3. Vertical Grade Check
  if (profilePoints && profilePoints.length >= 2) {
    let maxGrade = 0;
    for (let i = 0; i < profilePoints.length - 1; i++) {
      const p1 = profilePoints[i];
      const p2 = profilePoints[i + 1];
      const dDist = Math.max(1, p2.stationFt - p1.stationFt);
      const dElev = p2.designTORFt - p1.designTORFt;
      const gradePct = Math.abs((dElev / dDist) * 100);
      if (gradePct > maxGrade) maxGrade = gradePct;
    }

    if (maxGrade > rules.maxGradeIndustrialPct) {
      issues.push({
        severity: 'WARNING',
        code: 'GRADE_EXCEEDED_LEAD',
        title: `Steep Track Grade (${maxGrade.toFixed(2)}%)`,
        desc: `Maximum grade exceeds industrial lead standard (${rules.maxGradeIndustrialPct}%). Heavy locomotive pulling resistance increases significantly.`,
        reference: `${rules.name} - Maximum Grades`
      });
    } else {
      passes.push({
        code: 'GRADE_COMPLIANT',
        title: `Grade Compliant (${maxGrade.toFixed(2)}% max)`,
        desc: `Vertical profile stays within allowable ruling grade of ${rules.maxGradeIndustrialPct}%.`
      });
    }
  }

  const hasCritical = issues.some(i => i.severity === 'CRITICAL');
  const hasWarning = issues.some(i => i.severity === 'WARNING');
  const overallStatus = hasCritical ? 'FAIL' : hasWarning ? 'WARN' : 'PASS';

  return {
    rules,
    issues,
    passes,
    overallStatus
  };
}
