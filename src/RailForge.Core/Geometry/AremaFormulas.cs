namespace RailForge.Core.Geometry;

/// <summary>
/// Horizontal curve metadata at an intermediate Point of Intersection (PI).
/// </summary>
public class CurveInfo
{
    public int VertexIndex { get; set; }
    public double StationFt { get; set; }
    public GeoCoordinate VertexCoord { get; set; } = new(0, 0);
    public double RadiusFt { get; set; }
    public double DegreeOfCurve { get; set; }
    public double DeflectionDeg { get; set; }
    public string Direction { get; set; } = "Tangent"; // "Right", "Left", or "Tangent"
}

/// <summary>
/// A straight or curved segment along the track alignment.
/// </summary>
public class TrackSegment
{
    public int Index { get; set; }
    public GeoCoordinate StartCoord { get; set; } = new(0, 0);
    public GeoCoordinate EndCoord { get; set; } = new(0, 0);
    public double LengthFt { get; set; }
    public double StartStationFt { get; set; }
    public double EndStationFt { get; set; }
    public double BearingDeg { get; set; }
}

/// <summary>
/// AREMA standard railway engineering mathematical formulas.
/// </summary>
public static class AremaFormulas
{
    /// <summary>
    /// AREMA 100-foot chord definition constant: D = 5729.578 / R
    /// </summary>
    public const double DegreeOfCurveConstant = 5729.578;

    public static double RadiusToDegreeOfCurve(double radiusFt)
    {
        if (radiusFt <= 0 || double.IsInfinity(radiusFt) || double.IsNaN(radiusFt)) return 0.0;
        return DegreeOfCurveConstant / radiusFt;
    }

    public static double DegreeOfCurveToRadius(double degreeOfCurve)
    {
        if (degreeOfCurve <= 0 || double.IsNaN(degreeOfCurve)) return 0.0;
        return DegreeOfCurveConstant / degreeOfCurve;
    }

    /// <summary>
    /// Formats distance in feet into standard Railway Stationing (e.g. Sta 14+52.30)
    /// </summary>
    public static string FormatStationing(double distanceFt, bool isMetric = false)
    {
        if (isMetric)
        {
            double meters = distanceFt * GeoCoordinate.FeetToMeters;
            int km = (int)(meters / 1000.0);
            double rem = meters % 1000.0;
            return $"KM {km}+{rem:000.00}";
        }

        int stations = (int)(distanceFt / 100.0);
        double plus = distanceFt % 100.0;
        return $"Sta {stations}+{plus:00.00}";
    }

    /// <summary>
    /// Calculates the radius of a circle passing through 3 points (p1, p2, p3) in feet.
    /// </summary>
    public static double CalculateRadius(GeoCoordinate p1, GeoCoordinate p2, GeoCoordinate p3)
    {
        double a = p2.DistanceToFeet(p3);
        double b = p1.DistanceToFeet(p3);
        double c = p1.DistanceToFeet(p2);

        double s = (a + b + c) / 2.0;
        double areaSq = s * (s - a) * (s - b) * (s - c);
        if (areaSq <= 0.0001) return 0.0; // Straight line (0 for JSON safety)

        double area = Math.Sqrt(areaSq);
        return (a * b * c) / (4.0 * area);
    }
}
