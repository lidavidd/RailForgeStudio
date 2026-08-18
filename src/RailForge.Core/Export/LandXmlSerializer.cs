using System.Globalization;
using System.Text;
using RailForge.Core.Geometry;
using RailForge.Core.Grading;
using RailForge.Core.Turnouts;

namespace RailForge.Core.Export;

public static class LandXmlSerializer
{
    /// <summary>
    /// Serializes track alignment and vertical profile into LandXML 1.2 format for direct Autodesk Civil 3D / Bentley OpenRail import.
    /// </summary>
    public static string ExportToLandXml(string projectName, TrackAlignment alignment, IReadOnlyList<PviNode>? pviNodes = null)
    {
        var sb = new StringBuilder();
        var now = DateTime.UtcNow;
        var inv = CultureInfo.InvariantCulture;

        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<LandXML xmlns=\"http://www.landxml.org/schema/LandXML-1.2\" version=\"1.2\" " +
                      $"date=\"{now:yyyy-MM-dd}\" time=\"{now:HH:mm:ss}\">");
        sb.AppendLine($"  <Project name=\"{EscapeXml(projectName)}\"/>");
        sb.AppendLine("  <Units>");
        sb.AppendLine("    <Imperial linearUnit=\"foot\" areaUnit=\"squareFoot\" volumeUnit=\"cubicYard\" temperatureUnit=\"fahrenheit\" pressureUnit=\"inHG\"/>");
        sb.AppendLine("  </Units>");
        sb.AppendLine("  <Alignments name=\"RailAlignments\">");
        sb.AppendLine($"    <Alignment name=\"Track_Centerline\" length=\"{alignment.TotalLengthFt.ToString("F2", inv)}\" staStart=\"0.00\">");
        sb.AppendLine("      <CoordGeom>");

        for (int i = 0; i < alignment.Vertices.Count - 1; i++)
        {
            var p1 = alignment.Vertices[i];
            var p2 = alignment.Vertices[i + 1];
            sb.AppendLine("        <Line>");
            sb.AppendLine($"          <Start>{p1.Latitude.ToString("F7", inv)} {p1.Longitude.ToString("F7", inv)}</Start>");
            sb.AppendLine($"          <End>{p2.Latitude.ToString("F7", inv)} {p2.Longitude.ToString("F7", inv)}</End>");
            sb.AppendLine("        </Line>");
        }

        sb.AppendLine("      </CoordGeom>");

        if (pviNodes != null && pviNodes.Count >= 2)
        {
            sb.AppendLine("      <Profile name=\"Design_TOR_Profile\">");
            sb.AppendLine("        <ProfAlign name=\"PVI_Profile\">");
            foreach (var pvi in pviNodes)
            {
                sb.AppendLine($"          <PVI>{pvi.StationFt.ToString("F2", inv)} {pvi.ElevFt.ToString("F2", inv)}</PVI>");
            }
            sb.AppendLine("        </ProfAlign>");
            sb.AppendLine("      </Profile>");
        }

        sb.AppendLine("    </Alignment>");
        sb.AppendLine("  </Alignments>");
        sb.AppendLine("</LandXML>");

        return sb.ToString();
    }

    public static string ExportToDxf(string projectName, TrackAlignment alignment)
    {
        var sb = new StringBuilder();
        var inv = CultureInfo.InvariantCulture;

        sb.AppendLine("0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES");
        sb.AppendLine($"0\nLWPOLYLINE\n8\nTRACK_CENTERLINE\n90\n{alignment.Vertices.Count}\n70\n0");

        foreach (var v in alignment.Vertices)
        {
            sb.AppendLine($"10\n{v.Longitude.ToString("F7", inv)}\n20\n{v.Latitude.ToString("F7", inv)}\n30\n0.0");
        }

        sb.AppendLine("0\nENDSEC\n0\nEOF");
        return sb.ToString();
    }

    private static string EscapeXml(string input) =>
        input.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace("\"", "&quot;");
}
