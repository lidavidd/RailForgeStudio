namespace RailForge.Core.Geometry;

/// <summary>
/// Represents a geographic coordinate on the WGS84 ellipsoid.
/// </summary>
public record GeoCoordinate(double Longitude, double Latitude, double ElevationFt = 0.0)
{
    public const double EarthRadiusFeet = 20902231.0;
    public const double EarthRadiusMeters = 6371000.0;
    public const double FeetToMeters = 0.3048;
    public const double MetersToFeet = 3.280839895;

    /// <summary>
    /// Calculates Great-Circle distance to another coordinate in feet.
    /// </summary>
    public double DistanceToFeet(GeoCoordinate other)
    {
        double lat1Rad = Latitude * Math.PI / 180.0;
        double lat2Rad = other.Latitude * Math.PI / 180.0;
        double deltaLat = (other.Latitude - Latitude) * Math.PI / 180.0;
        double deltaLon = (other.Longitude - Longitude) * Math.PI / 180.0;

        double a = Math.Sin(deltaLat / 2.0) * Math.Sin(deltaLat / 2.0) +
                   Math.Cos(lat1Rad) * Math.Cos(lat2Rad) *
                   Math.Sin(deltaLon / 2.0) * Math.Sin(deltaLon / 2.0);

        double c = 2.0 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1.0 - a));
        return EarthRadiusFeet * c;
    }

    /// <summary>
    /// Calculates initial bearing/azimuth to target coordinate in degrees (0-360).
    /// </summary>
    public double BearingToDegrees(GeoCoordinate other)
    {
        double lat1Rad = Latitude * Math.PI / 180.0;
        double lat2Rad = other.Latitude * Math.PI / 180.0;
        double deltaLon = (other.Longitude - Longitude) * Math.PI / 180.0;

        double y = Math.Sin(deltaLon) * Math.Cos(lat2Rad);
        double x = Math.Cos(lat1Rad) * Math.Sin(lat2Rad) -
                   Math.Sin(lat1Rad) * Math.Cos(lat2Rad) * Math.Cos(deltaLon);

        double theta = Math.Atan2(y, x);
        return ((theta * 180.0 / Math.PI) + 360.0) % 360.0;
    }

    /// <summary>
    /// Projects a new coordinate given distance (in feet) and bearing (degrees).
    /// </summary>
    public GeoCoordinate Destination(double distanceFeet, double bearingDegrees)
    {
        double delta = distanceFeet / EarthRadiusFeet;
        double theta = bearingDegrees * Math.PI / 180.0;
        double lat1Rad = Latitude * Math.PI / 180.0;
        double lon1Rad = Longitude * Math.PI / 180.0;

        double lat2Rad = Math.Asin(
            Math.Sin(lat1Rad) * Math.Cos(delta) +
            Math.Cos(lat1Rad) * Math.Sin(delta) * Math.Cos(theta)
        );

        double lon2Rad = lon1Rad + Math.Atan2(
            Math.Sin(theta) * Math.Sin(delta) * Math.Cos(lat1Rad),
            Math.Cos(delta) - Math.Sin(lat1Rad) * Math.Sin(lat2Rad)
        );

        double lat2 = lat2Rad * 180.0 / Math.PI;
        double lon2 = ((lon2Rad * 180.0 / Math.PI) + 540.0) % 360.0 - 180.0;

        return new GeoCoordinate(lon2, lat2, ElevationFt);
    }
}
