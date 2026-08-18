using RailForge.Core.Geometry;

namespace RailForge.Core.Turnouts;

public record TurnoutSpec(
    int Number,
    string Name,
    double FrogAngleDeg,
    double LeadLengthFt,
    double SwitchRailLengthFt,
    int MaxSpeedMph,
    string TypicalUse,
    double MinClearanceOffsetFt = 14.0
);

public class TurnoutInstance
{
    public TurnoutSpec Spec { get; set; } = null!;
    public string Hand { get; set; } = "Right"; // "Right" or "Left"
    public double SwitchStationFt { get; set; }
    public double FrogStationFt { get; set; }
    public double FoulingDistanceFt { get; set; }
    public double FoulingStationFt { get; set; }

    public GeoCoordinate PointOfSwitch { get; set; } = new(0, 0);
    public GeoCoordinate PointOfFrogMain { get; set; } = new(0, 0);
    public GeoCoordinate PointOfFrogDiverging { get; set; } = new(0, 0);
    public GeoCoordinate FoulingPointMain { get; set; } = new(0, 0);
    public GeoCoordinate FoulingPointDiverging { get; set; } = new(0, 0);

    public List<GeoCoordinate> DivergingPath { get; set; } = new();
    public double MainBearingDeg { get; set; }
    public double DivergingBearingDeg { get; set; }
}

public static class TurnoutCatalog
{
    public static readonly Dictionary<int, TurnoutSpec> Specs = new()
    {
        [8] = new TurnoutSpec(8, "No. 8 Turnout (AREMA)", 7.15, 67.8, 16.5, 10, "Restricted Industrial Siding & Yard", 14.0),
        [9] = new TurnoutSpec(9, "No. 9 Turnout (AREMA)", 6.36, 72.5, 16.5, 12, "Standard Industrial Siding", 14.0),
        [10] = new TurnoutSpec(10, "No. 10 Turnout (UP / BNSF Standard)", 5.72, 78.75, 16.5, 15, "US Class I Standard Industrial Siding", 14.0),
        [11] = new TurnoutSpec(11, "No. 11 Turnout (CN / CPKC Standard)", 5.20, 83.2, 19.5, 20, "Canadian Class I Standard Industrial Lead", 14.0),
        [15] = new TurnoutSpec(15, "No. 15 Turnout (AREMA High-Speed Siding)", 3.82, 112.5, 26.0, 30, "Passing Siding & Secondary Mainline", 15.0),
        [20] = new TurnoutSpec(20, "No. 20 Turnout (Mainline Crossover)", 2.86, 152.0, 39.0, 50, "Class I High-Speed Universal Crossover", 15.0)
    };

    public static TurnoutInstance SolveTurnout(TrackAlignment mainline, double switchStationFt, int turnoutNumber = 10, string hand = "Right")
    {
        if (!Specs.TryGetValue(turnoutNumber, out var spec))
        {
            spec = Specs[10];
        }

        var (psCoord, mainBearing) = mainline.GetPointAtStation(switchStationFt);

        double angleOffset = hand.Equals("Right", StringComparison.OrdinalIgnoreCase) ? spec.FrogAngleDeg : -spec.FrogAngleDeg;
        double divergingBearing = (mainBearing + angleOffset + 360.0) % 360.0;

        // Point of Frog on Main & Diverging
        var pfMain = psCoord.Destination(spec.LeadLengthFt, mainBearing);
        var pfDiv = psCoord.Destination(spec.LeadLengthFt, (mainBearing + angleOffset * 0.75 + 360.0) % 360.0);

        // Fouling Point (Clear point where track centers reach 14.0 ft)
        double frogAngleRad = spec.FrogAngleDeg * Math.PI / 180.0;
        double foulingDist = spec.MinClearanceOffsetFt / Math.Tan(frogAngleRad);

        var foulMain = psCoord.Destination(foulingDist, mainBearing);
        var foulDiv = psCoord.Destination(foulingDist, divergingBearing);

        // Siding 300-ft preview lead
        var sidingEnd = foulDiv.Destination(300.0, divergingBearing);

        return new TurnoutInstance
        {
            Spec = spec,
            Hand = hand,
            SwitchStationFt = switchStationFt,
            FrogStationFt = switchStationFt + spec.LeadLengthFt,
            FoulingDistanceFt = foulingDist,
            FoulingStationFt = switchStationFt + foulingDist,
            PointOfSwitch = psCoord,
            PointOfFrogMain = pfMain,
            PointOfFrogDiverging = pfDiv,
            FoulingPointMain = foulMain,
            FoulingPointDiverging = foulDiv,
            MainBearingDeg = mainBearing,
            DivergingBearingDeg = divergingBearing,
            DivergingPath = new List<GeoCoordinate> { psCoord, pfDiv, foulDiv, sidingEnd }
        };
    }
}

public static class CarSpotCalculator
{
    public record CapacityBreakdown(int Spots50Ft, int Spots60Ft, int Spots65Ft, int Spots85Ft, double UsableFootageFt);

    public static CapacityBreakdown CalculateCapacity(double totalTrackLengthFt, double foulingStationFt = 0.0)
    {
        double usableFt = Math.Max(0.0, totalTrackLengthFt - foulingStationFt);

        // Standard car lengths + 5-ft coupler spacing
        int spots50 = (int)Math.Floor(usableFt / 55.0); // 50' Boxcar
        int spots60 = (int)Math.Floor(usableFt / 65.0); // 60' Covered Hopper
        int spots65 = (int)Math.Floor(usableFt / 70.0); // 65' Mill Gondola
        int spots85 = (int)Math.Floor(usableFt / 90.0); // 85' Intermodal Flatcar

        return new CapacityBreakdown(spots50, spots60, spots65, spots85, usableFt);
    }
}
