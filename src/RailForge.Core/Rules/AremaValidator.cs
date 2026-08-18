using RailForge.Core.Geometry;
using RailForge.Core.Grading;

namespace RailForge.Core.Rules;

public enum IssueSeverity
{
    Pass,
    Warning,
    Critical
}

public record ComplianceIssue(
    IssueSeverity Severity,
    string Code,
    string Title,
    string Description,
    string StandardReference
);

public record StandardsProfile(
    string Id,
    string Name,
    string Authority,
    double MaxDegreeOfCurveMain,
    double MaxDegreeOfCurveIndustrial,
    double MaxDegreeAbsolute,
    double MinReverseCurveTangentFt,
    double MaxGradeMainPct,
    double MaxGradeIndustrialPct,
    double MaxGradeStorageTrackPct,
    double MinTrackCenterSpacingFt,
    double MinOverheadClearanceFt
);

public class ComplianceReport
{
    public StandardsProfile Profile { get; set; } = null!;
    public string OverallStatus { get; set; } = "PASS"; // "PASS", "WARN", "FAIL"
    public List<ComplianceIssue> Issues { get; set; } = new();
    public List<ComplianceIssue> Passes { get; set; } = new();
}

public static class AremaValidator
{
    public static readonly Dictionary<string, StandardsProfile> Standards = new()
    {
        ["AREMA"] = new StandardsProfile(
            "AREMA",
            "AREMA MRE Recommended Practices",
            "American Railway Engineering and Maintenance-of-Way Association",
            4.0, 8.0, 10.0, 100.0, 1.0, 1.5, 0.20, 14.0, 23.0
        ),
        ["UP_BNSF"] = new StandardsProfile(
            "UP_BNSF",
            "Union Pacific & BNSF Industrial Standards",
            "US Class I Common Industrial Track Guidelines",
            2.5, 6.0, 9.5, 150.0, 0.8, 1.5, 0.20, 14.0, 23.5
        ),
        ["CN_CPKC"] = new StandardsProfile(
            "CN_CPKC",
            "CN & CPKC Canadian Standards",
            "Canadian Class I Track Guidelines & TC TSR",
            3.0, 7.5, 10.0, 100.0, 1.0, 1.5, 0.25, 14.0, 23.0
        )
    };

    public static ComplianceReport Validate(TrackAlignment alignment, IReadOnlyList<ProfilePoint>? profilePoints, string profileId = "AREMA")
    {
        if (!Standards.TryGetValue(profileId, out var rules))
        {
            rules = Standards["AREMA"];
        }

        var report = new ComplianceReport { Profile = rules };
        if (alignment.TotalLengthFt == 0) return report;

        // 1. Max Degree of Curvature
        if (alignment.MaxDegreeOfCurve > rules.MaxDegreeAbsolute)
        {
            report.Issues.Add(new ComplianceIssue(
                IssueSeverity.Critical,
                "CURVE_EXCEEDED_ABSOLUTE",
                $"Excessive Curvature ({alignment.MaxDegreeOfCurve:0.0}°)",
                $"Maximum degree of curve exceeds absolute limit of {rules.MaxDegreeAbsolute}°. Severe risk of car stringlining derailment.",
                $"{rules.Name} - Track Geometry"
            ));
        }
        else if (alignment.MaxDegreeOfCurve > rules.MaxDegreeOfCurveIndustrial)
        {
            report.Issues.Add(new ComplianceIssue(
                IssueSeverity.Warning,
                "CURVE_EXCEEDED_INDUSTRIAL",
                $"Sharp Industrial Curve ({alignment.MaxDegreeOfCurve:0.0}°)",
                $"Exceeds standard industrial recommendation of {rules.MaxDegreeOfCurveIndustrial}°. Requires special verification for long 60'-89' freight cars.",
                $"{rules.Name} - Curvature Limits"
            ));
        }
        else if (alignment.Curves.Count > 0)
        {
            report.Passes.Add(new ComplianceIssue(
                IssueSeverity.Pass,
                "CURVE_COMPLIANT",
                $"Curvature Compliant ({alignment.MaxDegreeOfCurve:0.0}° max)",
                $"All horizontal curves satisfy allowable {rules.Name} limits ({rules.MaxDegreeOfCurveIndustrial}° max).",
                $"{rules.Name} - Geometric Compliance"
            ));
        }

        // 2. Reverse Curve Tangent Check
        if (alignment.Curves.Count >= 2)
        {
            for (int i = 0; i < alignment.Curves.Count - 1; i++)
            {
                var c1 = alignment.Curves[i];
                var c2 = alignment.Curves[i + 1];
                if (!c1.Direction.Equals(c2.Direction, StringComparison.OrdinalIgnoreCase))
                {
                    double tangent = Math.Abs(c2.StationFt - c1.StationFt);
                    if (tangent < rules.MinReverseCurveTangentFt)
                    {
                        report.Issues.Add(new ComplianceIssue(
                            IssueSeverity.Warning,
                            "REVERSE_CURVE_TANGENT_SHORT",
                            $"Short Reverse Tangent ({tangent:0} ft)",
                            $"Tangent between reversing curves is less than required {rules.MinReverseCurveTangentFt} ft. Long cars may bind couplers.",
                            $"{rules.Name} - Reverse Curves"
                        ));
                    }
                }
            }
        }

        // 3. Vertical Grade Check
        if (profilePoints != null && profilePoints.Count >= 2)
        {
            double maxGrade = 0.0;
            for (int i = 0; i < profilePoints.Count - 1; i++)
            {
                var p1 = profilePoints[i];
                var p2 = profilePoints[i + 1];
                double dDist = Math.Max(1.0, p2.StationFt - p1.StationFt);
                double dElev = p2.DesignTorFt - p1.DesignTorFt;
                double grade = Math.Abs((dElev / dDist) * 100.0);
                if (grade > maxGrade) maxGrade = grade;
            }

            if (maxGrade > rules.MaxGradeIndustrialPct)
            {
                report.Issues.Add(new ComplianceIssue(
                    IssueSeverity.Warning,
                    "GRADE_EXCEEDED_LEAD",
                    $"Steep Track Grade ({maxGrade:0.00}%)",
                    $"Maximum grade exceeds industrial lead standard ({rules.MaxGradeIndustrialPct}%). Increases locomotive pull resistance.",
                    $"{rules.Name} - Maximum Grades"
                ));
            }
            else
            {
                report.Passes.Add(new ComplianceIssue(
                    IssueSeverity.Pass,
                    "GRADE_COMPLIANT",
                    $"Grade Compliant ({maxGrade:0.00}% max)",
                    $"Vertical profile stays within allowable ruling grade of {rules.MaxGradeIndustrialPct}%.",
                    $"{rules.Name} - Profile Compliance"
                ));
            }
        }

        bool hasCrit = report.Issues.Any(x => x.Severity == IssueSeverity.Critical);
        bool hasWarn = report.Issues.Any(x => x.Severity == IssueSeverity.Warning);
        report.OverallStatus = hasCrit ? "FAIL" : (hasWarn ? "WARN" : "PASS");

        return report;
    }
}
