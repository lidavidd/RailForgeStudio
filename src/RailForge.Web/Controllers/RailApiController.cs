using System.Text;
using Microsoft.AspNetCore.Mvc;
using RailForge.Core.Export;
using RailForge.Core.Geometry;
using RailForge.Core.Grading;
using RailForge.Core.Presets;
using RailForge.Core.Rules;
using RailForge.Core.Turnouts;

namespace RailForge.Web.Controllers;

[ApiController]
[Route("api/rail")]
public class RailApiController : ControllerBase
{
    public record CoordinateDto(double Longitude, double Latitude, double ElevationFt = 0.0);
    public record PviDto(double StationFt, double ElevFt);

    public record AnalyzeRequest(
        List<CoordinateDto> Vertices,
        string StandardsProfile = "AREMA"
    );

    public record TurnoutRequest(
        List<CoordinateDto> Vertices,
        double SwitchStationFt,
        int TurnoutNumber = 10,
        string Hand = "Right"
    );

    public record ProfileRequest(
        List<CoordinateDto> Vertices,
        List<PviDto>? PviNodes = null,
        double BaseElevationFt = 1000.0
    );

    public record ExportRequest(
        string ProjectName,
        List<CoordinateDto> Vertices,
        List<PviDto>? PviNodes = null
    );

    [HttpGet("presets")]
    public IActionResult GetPresets()
    {
        return Ok(RailPresets.All);
    }

    [HttpPost("analyze")]
    public IActionResult AnalyzeAlignment([FromBody] AnalyzeRequest request)
    {
        if (request.Vertices == null || request.Vertices.Count < 2)
        {
            return BadRequest("At least 2 vertices are required.");
        }

        var coords = request.Vertices.Select(v => new GeoCoordinate(v.Longitude, v.Latitude, v.ElevationFt));
        var alignment = new TrackAlignment(coords);
        var compliance = AremaValidator.Validate(alignment, null, request.StandardsProfile);

        return Ok(new
        {
            totalLengthFt = alignment.TotalLengthFt,
            minRadiusFt = alignment.MinRadiusFt,
            maxDegreeOfCurve = alignment.MaxDegreeOfCurve,
            stations = alignment.Stations,
            segments = alignment.Segments,
            curves = alignment.Curves,
            compliance = compliance
        });
    }

    [HttpPost("turnout")]
    public IActionResult SolveTurnout([FromBody] TurnoutRequest request)
    {
        if (request.Vertices == null || request.Vertices.Count < 2)
        {
            return BadRequest("At least 2 vertices are required.");
        }

        var coords = request.Vertices.Select(v => new GeoCoordinate(v.Longitude, v.Latitude, v.ElevationFt));
        var alignment = new TrackAlignment(coords);
        var turnout = TurnoutCatalog.SolveTurnout(alignment, request.SwitchStationFt, request.TurnoutNumber, request.Hand);
        var capacity = CarSpotCalculator.CalculateCapacity(alignment.TotalLengthFt, turnout.FoulingStationFt);

        return Ok(new
        {
            turnout,
            capacity
        });
    }

    [HttpPost("profile")]
    public IActionResult GenerateProfile([FromBody] ProfileRequest request)
    {
        if (request.Vertices == null || request.Vertices.Count < 2)
        {
            return BadRequest("At least 2 vertices are required.");
        }

        var coords = request.Vertices.Select(v => new GeoCoordinate(v.Longitude, v.Latitude, v.ElevationFt)).ToList();
        var alignment = new TrackAlignment(coords);

        // Generate profile points along alignment
        var profilePoints = new List<ProfilePoint>();
        double currentStation = 0.0;
        double datum = request.BaseElevationFt;

        for (int i = 0; i < coords.Count - 1; i++)
        {
            var p1 = coords[i];
            var p2 = coords[i + 1];
            double segLen = p1.DistanceToFeet(p2);
            int steps = Math.Max(1, (int)Math.Ceiling(segLen / 50.0));

            for (int s = 0; s <= steps; s++)
            {
                if (i > 0 && s == 0) continue;
                double t = (double)s / steps;
                double lon = p1.Longitude + (p2.Longitude - p1.Longitude) * t;
                double lat = p1.Latitude + (p2.Latitude - p1.Latitude) * t;
                double station = currentStation + t * segLen;

                // High-frequency procedural micro-topography simulation
                double micro = Math.Sin(lat * 1200.0) * 12.5 + Math.Cos(lon * 1200.0) * 8.4;
                double groundElev = datum + micro;

                profilePoints.Add(new ProfilePoint
                {
                    StationFt = station,
                    Coord = new GeoCoordinate(lon, lat, groundElev),
                    GroundElevFt = groundElev,
                    DesignTorFt = groundElev + 2.5,
                    CutFt = 0.0,
                    FillFt = 2.5,
                    DiffFt = 2.5
                });
            }
            currentStation += segLen;
        }

        var engine = new EarthworkEngine();
        var pviList = request.PviNodes?.Select(p => new PviNode(p.StationFt, p.ElevFt)).ToList();

        if (pviList != null && pviList.Count >= 2)
        {
            profilePoints = engine.ApplyPviProfile(profilePoints, pviList);
        }

        var volumes = engine.CalculateVolumes(profilePoints);

        return Ok(new
        {
            profilePoints,
            volumes
        });
    }

    [HttpPost("export/landxml")]
    public IActionResult ExportLandXml([FromBody] ExportRequest request)
    {
        var coords = request.Vertices.Select(v => new GeoCoordinate(v.Longitude, v.Latitude, v.ElevationFt));
        var alignment = new TrackAlignment(coords);
        var pviList = request.PviNodes?.Select(p => new PviNode(p.StationFt, p.ElevFt)).ToList();

        string xml = LandXmlSerializer.ExportToLandXml(request.ProjectName ?? "RailForge_Alignment", alignment, pviList);
        byte[] bytes = Encoding.UTF8.GetBytes(xml);
        return File(bytes, "application/xml", $"{request.ProjectName ?? "rail_alignment"}.xml");
    }

    [HttpPost("export/dxf")]
    public IActionResult ExportDxf([FromBody] ExportRequest request)
    {
        var coords = request.Vertices.Select(v => new GeoCoordinate(v.Longitude, v.Latitude, v.ElevationFt));
        var alignment = new TrackAlignment(coords);

        string dxf = LandXmlSerializer.ExportToDxf(request.ProjectName ?? "RailForge_Alignment", alignment);
        byte[] bytes = Encoding.UTF8.GetBytes(dxf);
        return File(bytes, "application/dxf", $"{request.ProjectName ?? "rail_track"}.dxf");
    }
}
