/**
 * Engineering Export Suite: LandXML (Civil 3D / OpenRail), DXF, GeoJSON, and Report
 */

export function exportLandXML(alignmentName, coords, profilePoints, pviNodes) {
  const timestamp = new Date().toISOString();
  let landXml = `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" version="1.2" date="${timestamp.split('T')[0]}" time="${timestamp.split('T')[1].split('.')[0]}">
  <Project name="${alignmentName || 'RailForge_Feasibility_Alignment'}"/>
  <Units>
    <Imperial linearUnit="foot" areaUnit="squareFoot" volumeUnit="cubicYard" temperatureUnit="fahrenheit" pressureUnit="inHG"/>
  </Units>
  <Alignments name="RailAlignments">
    <Alignment name="${alignmentName || 'Track_01'}" length="${profilePoints && profilePoints.length > 0 ? profilePoints[profilePoints.length - 1].stationFt.toFixed(2) : '1000.00'}" staStart="0.00">
      <CoordGeom>
`;

  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    landXml += `        <Line>
          <Start>${p1[1].toFixed(7)} ${p1[0].toFixed(7)}</Start>
          <End>${p2[1].toFixed(7)} ${p2[0].toFixed(7)}</End>
        </Line>\n`;
  }

  landXml += `      </CoordGeom>\n`;

  if (pviNodes && pviNodes.length >= 2) {
    landXml += `      <Profile name="Design_TOR_Profile">
        <ProfAlign name="PVI_Alignment">
`;
    for (const pvi of pviNodes) {
      landXml += `          <PVI>${pvi.stationFt.toFixed(2)} ${pvi.elevFt.toFixed(2)}</PVI>\n`;
    }
    landXml += `        </ProfAlign>
      </Profile>\n`;
  }

  landXml += `    </Alignment>
  </Alignments>
</LandXML>`;

  return landXml;
}

export function exportDXF(alignmentName, coords) {
  let dxf = `0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;

  // Write LWPOLYLINE for track centerline
  dxf += `0\nLWPOLYLINE\n8\nTRACK_CENTERLINE\n90\n${coords.length}\n70\n0\n`;
  for (const pt of coords) {
    dxf += `10\n${pt[0]}\n20\n${pt[1]}\n30\n0.0\n`;
  }

  dxf += `0\nENDSEC\n0\nEOF\n`;
  return dxf;
}

export function exportGeoJSON(alignmentName, coords, turnouts = []) {
  const geojson = {
    type: 'FeatureCollection',
    name: alignmentName || 'RailForge_Alignment',
    features: [
      {
        type: 'Feature',
        properties: {
          name: alignmentName || 'Track Centerline',
          type: 'Rail_Track'
        },
        geometry: {
          type: 'LineString',
          coordinates: coords
        }
      }
    ]
  };

  for (const t of turnouts) {
    geojson.features.push({
      type: 'Feature',
      properties: {
        name: `Turnout #${t.spec.number} (${t.hand})`,
        type: 'Turnout_PointOfSwitch',
        frogAngle: t.spec.frogAngleDeg,
        leadLengthFt: t.spec.leadLengthFt
      },
      geometry: {
        type: 'Point',
        coordinates: t.pointOfSwitch
      }
    });

    if (t.divergingPath) {
      geojson.features.push({
        type: 'Feature',
        properties: {
          name: `Turnout #${t.spec.number} Diverging Lead`,
          type: 'Diverging_Track'
        },
        geometry: {
          type: 'LineString',
          coordinates: t.divergingPath
        }
      });
    }
  }

  return JSON.stringify(geojson, null, 2);
}

export function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
