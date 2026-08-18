namespace RailForge.Core.Geometry;

/// <summary>
/// Solves and manages a continuous 3D railway track alignment with cumulative stationing and curve detection.
/// </summary>
public class TrackAlignment
{
    public List<GeoCoordinate> Vertices { get; set; } = new();
    public double TotalLengthFt { get; private set; }
    public List<double> Stations { get; private set; } = new();
    public List<TrackSegment> Segments { get; private set; } = new();
    public List<CurveInfo> Curves { get; private set; } = new();
    public double MinRadiusFt { get; private set; } = 0.0;
    public double MaxDegreeOfCurve { get; private set; } = 0.0;

    public TrackAlignment(IEnumerable<GeoCoordinate> vertices)
    {
        Vertices = vertices.ToList();
        Solve();
    }

    public void Solve()
    {
        Stations.Clear();
        Segments.Clear();
        Curves.Clear();
        TotalLengthFt = 0.0;
        MinRadiusFt = 0.0;
        MaxDegreeOfCurve = 0.0;

        if (Vertices.Count < 2) return;

        Stations.Add(0.0);

        // 1. Solve linear segments and cumulative stationing
        for (int i = 0; i < Vertices.Count - 1; i++)
        {
            var p1 = Vertices[i];
            var p2 = Vertices[i + 1];
            double segLen = p1.DistanceToFeet(p2);
            double bearing = p1.BearingToDegrees(p2);

            TotalLengthFt += segLen;
            Stations.Add(TotalLengthFt);

            Segments.Add(new TrackSegment
            {
                Index = i,
                StartCoord = p1,
                EndCoord = p2,
                LengthFt = segLen,
                StartStationFt = Stations[i],
                EndStationFt = TotalLengthFt,
                BearingDeg = bearing
            });
        }

        // 2. Solve horizontal curves at intermediate vertices
        double lowestRadius = double.MaxValue;
        for (int i = 1; i < Vertices.Count - 1; i++)
        {
            var pPrev = Vertices[i - 1];
            var pCurr = Vertices[i];
            var pNext = Vertices[i + 1];

            double radius = AremaFormulas.CalculateRadius(pPrev, pCurr, pNext);
            double doc = AremaFormulas.RadiusToDegreeOfCurve(radius);

            double b1 = pPrev.BearingToDegrees(pCurr);
            double b2 = pCurr.BearingToDegrees(pNext);
            double deflection = b2 - b1;
            if (deflection > 180.0) deflection -= 360.0;
            if (deflection < -180.0) deflection += 360.0;

            var curve = new CurveInfo
            {
                VertexIndex = i,
                StationFt = Stations[i],
                VertexCoord = pCurr,
                RadiusFt = radius,
                DegreeOfCurve = doc,
                DeflectionDeg = deflection,
                Direction = deflection > 0 ? "Right" : (deflection < 0 ? "Left" : "Tangent")
            };

            if (radius > 0 && radius < lowestRadius) lowestRadius = radius;
            if (doc > MaxDegreeOfCurve) MaxDegreeOfCurve = doc;

            Curves.Add(curve);
        }

        MinRadiusFt = lowestRadius < double.MaxValue ? lowestRadius : 0.0;
    }

    public (GeoCoordinate Coord, double BearingDeg) GetPointAtStation(double stationFt)
    {
        if (Segments.Count == 0) return (Vertices.FirstOrDefault() ?? new GeoCoordinate(0, 0), 0.0);
        if (stationFt <= 0) return (Segments[0].StartCoord, Segments[0].BearingDeg);
        if (stationFt >= TotalLengthFt) return (Segments[^1].EndCoord, Segments[^1].BearingDeg);

        foreach (var seg in Segments)
        {
            if (stationFt >= seg.StartStationFt && stationFt <= seg.EndStationFt)
            {
                double distAlong = stationFt - seg.StartStationFt;
                var coord = seg.StartCoord.Destination(distAlong, seg.BearingDeg);
                return (coord, seg.BearingDeg);
            }
        }

        return (Segments[^1].EndCoord, Segments[^1].BearingDeg);
    }
}
