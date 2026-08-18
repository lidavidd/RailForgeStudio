using RailForge.Core.Geometry;

namespace RailForge.Core.Grading;

public class ProfilePoint
{
    public double StationFt { get; set; }
    public GeoCoordinate Coord { get; set; } = new(0, 0);
    public double GroundElevFt { get; set; }
    public double DesignTorFt { get; set; }
    public double CutFt { get; set; }
    public double FillFt { get; set; }
    public double DiffFt { get; set; }
}

public record PviNode(double StationFt, double ElevFt);

public record RoadbedCrossSection(
    double RoadbedWidthFt = 24.0,
    double BallastDepthInches = 12.0,
    double SubBallastDepthInches = 8.0,
    double SideSlopeHtoV = 2.0,
    double CrownSlopePercent = 2.0
);

public record EarthworkVolumeResult(
    double TotalCutCuYd,
    double TotalFillCuYd,
    double NetBalanceCuYd,
    double BallastTons,
    double SubBallastCuYd,
    double TotalTrackFootageFt,
    double EstimatedCivilCost
);

public class EarthworkEngine
{
    public RoadbedCrossSection CrossSection { get; set; } = new();

    /// <summary>
    /// Interpolates Proposed Top of Rail (TOR) elevations across profile points given a series of PVI nodes.
    /// </summary>
    public List<ProfilePoint> ApplyPviProfile(IEnumerable<ProfilePoint> profilePoints, IReadOnlyList<PviNode> pviNodes)
    {
        var list = profilePoints.ToList();
        if (list.Count == 0 || pviNodes.Count < 2) return list;

        foreach (var pt in list)
        {
            var pvi1 = pviNodes[0];
            var pvi2 = pviNodes[^1];

            for (int i = 0; i < pviNodes.Count - 1; i++)
            {
                if (pt.StationFt >= pviNodes[i].StationFt && pt.StationFt <= pviNodes[i + 1].StationFt)
                {
                    pvi1 = pviNodes[i];
                    pvi2 = pviNodes[i + 1];
                    break;
                }
            }

            double segLen = Math.Max(1.0, pvi2.StationFt - pvi1.StationFt);
            double t = Math.Clamp((pt.StationFt - pvi1.StationFt) / segLen, 0.0, 1.0);
            double designTor = pvi1.ElevFt + t * (pvi2.ElevFt - pvi1.ElevFt);

            double diff = designTor - pt.GroundElevFt;
            pt.DesignTorFt = designTor;
            pt.DiffFt = diff;
            pt.CutFt = diff < 0 ? Math.Abs(diff) : 0.0;
            pt.FillFt = diff >= 0 ? diff : 0.0;
        }

        return list;
    }

    /// <summary>
    /// Calculates Earthwork Quantities (Cut/Fill in Cubic Yards) using the Average End Area Method.
    /// </summary>
    public EarthworkVolumeResult CalculateVolumes(IReadOnlyList<ProfilePoint> profilePoints)
    {
        if (profilePoints.Count < 2)
        {
            return new EarthworkVolumeResult(0, 0, 0, 0, 0, 0, 0);
        }

        double totalCutCuYd = 0.0;
        double totalFillCuYd = 0.0;

        double CalcEndArea(double heightFt)
        {
            if (heightFt <= 0) return 0.0;
            // Trapezoidal cross-section area: A = (Width + sideSlope * Height) * Height
            return (CrossSection.RoadbedWidthFt + CrossSection.SideSlopeHtoV * heightFt) * heightFt;
        }

        for (int i = 0; i < profilePoints.Count - 1; i++)
        {
            var pt1 = profilePoints[i];
            var pt2 = profilePoints[i + 1];
            double dStation = pt2.StationFt - pt1.StationFt;

            double aCut1 = CalcEndArea(pt1.CutFt);
            double aCut2 = CalcEndArea(pt2.CutFt);
            totalCutCuYd += ((aCut1 + aCut2) / 2.0) * (dStation / 27.0);

            double aFill1 = CalcEndArea(pt1.FillFt);
            double aFill2 = CalcEndArea(pt2.FillFt);
            totalFillCuYd += ((aFill1 + aFill2) / 2.0) * (dStation / 27.0);
        }

        double totalFootage = profilePoints[^1].StationFt;

        // AREMA ballast volume estimating rules:
        // 1.25 tons of mainline ballast per track-foot
        // 0.40 cu.yd of sub-ballast per track-foot
        double ballastTons = totalFootage * 1.25;
        double subBallastCuYd = totalFootage * 0.40;

        // Industry standard ballpark unit rates ($15/yd cut, $18/yd fill, $45/ton ballast, $160/track-ft steel/ties)
        double estimatedCivilCost =
            totalCutCuYd * 15.0 +
            totalFillCuYd * 18.0 +
            ballastTons * 45.0 +
            totalFootage * 160.0;

        return new EarthworkVolumeResult(
            Math.Round(totalCutCuYd),
            Math.Round(totalFillCuYd),
            Math.Round(totalFillCuYd - totalCutCuYd),
            Math.Round(ballastTons),
            Math.Round(subBallastCuYd),
            Math.Round(totalFootage),
            Math.Round(estimatedCivilCost)
        );
    }
}
