using RailForge.Core.Geometry;

namespace RailForge.Core.Presets;

public record RailPreset(
    string Id,
    string Name,
    string Region,
    string Operator,
    string Type,
    double Latitude,
    double Longitude,
    double Zoom,
    double Bearing,
    double Pitch,
    double BaseElevationMeters,
    string Description,
    string StandardsProfile,
    List<GeoCoordinate> DemoCoordinates
);

public static class RailPresets
{
    public static readonly List<RailPreset> All = new()
    {
        // ==========================================
        // Lower Mainland British Columbia, Canada
        // ==========================================
        new RailPreset(
            "roberts-bank-bc",
            "Roberts Bank Deltaport (BCRC / CN / CPKC / BNSF)",
            "Delta, Lower Mainland, BC, Canada",
            "BCRC / CN / CPKC / BNSF",
            "Deep-Sea Container & Coal Intermodal Superport",
            49.0205, -123.1550,
            15.2, 330.0, 55.0,
            4.0,
            "Premier Pacific gateway with extensive rail loop yards handling 12,000-ft unit trains for coal and container shipping.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-123.1650, 49.0150),
                new(-123.1580, 49.0190),
                new(-123.1520, 49.0230),
                new(-123.1470, 49.0270)
            }
        ),
        new RailPreset(
            "poco-yard-cpkc",
            "Port Coquitlam Yard (CPKC)",
            "Port Coquitlam, Metro Vancouver, BC, Canada",
            "Canadian Pacific Kansas City",
            "Major Freight Classification & Intermodal Yard",
            49.2561, -122.7594,
            15.2, 105.0, 50.0,
            12.0,
            "The largest CPKC freight marshalling and diesel maintenance terminal in Western Canada with multi-track switch ladders.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-122.7700, 49.2540),
                new(-122.7630, 49.2560),
                new(-122.7550, 49.2575),
                new(-122.7480, 49.2590)
            }
        ),
        new RailPreset(
            "thornton-yard-cn",
            "Thornton Classification Yard (CN Rail)",
            "Surrey, Metro Vancouver, BC, Canada",
            "Canadian National Railway",
            "Primary CN Pacific Marshalling Yard",
            49.2065, -122.8680,
            15.0, 65.0, 45.0,
            8.0,
            "Core CN freight classification facility connecting to the Fraser River Rail Bridge and Burrard Inlet port terminals.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-122.8780, 49.2020),
                new(-122.8710, 49.2050),
                new(-122.8630, 49.2080),
                new(-122.8550, 49.2110)
            }
        ),
        new RailPreset(
            "burrard-port-vancouver",
            "Burrard Waterfront & Grain Terminals (Port of Vancouver)",
            "Vancouver / North Vancouver, BC, Canada",
            "CN / CPKC / Port of Vancouver",
            "Waterfront Grain Elevators & Container Docks",
            49.2880, -123.0850,
            15.5, 285.0, 50.0,
            6.0,
            "Dense waterfront industrial rail network serving Cascadia, Richardson, and Cargill export elevators and Centerm/Vanterm docks.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-123.0950, 49.2860),
                new(-123.0880, 49.2875),
                new(-123.0800, 49.2890),
                new(-123.0720, 49.2905)
            }
        ),
        new RailPreset(
            "brownsville-sry",
            "Brownsville & South Westminster Spurs (SRY / BNSF)",
            "Surrey / Delta, BC, Canada",
            "Southern Railway of BC (SRY) / BNSF",
            "Fraser River Industrial & Transload Sidings",
            49.1950, -122.8850,
            15.4, 120.0, 45.0,
            5.0,
            "Short-line industrial rail spurs connecting heavy industrial lumber, steel, and agricultural transloads along the Fraser River.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-122.8940, 49.1920),
                new(-122.8870, 49.1945),
                new(-122.8800, 49.1970),
                new(-122.8730, 49.1990)
            }
        ),

        // ==========================================
        // Rest of North America
        // ==========================================
        new RailPreset(
            "calgary-cpkc",
            "Calgary Logistics Park (CPKC / CN)",
            "Alberta, Canada",
            "CPKC / Canadian National",
            "Intermodal & Industrial Logistics Hub",
            50.9835, -113.8820,
            15.5, 42.0, 45.0,
            1045.0,
            "Major Canadian rail logistics park handling intermodal containers, automotive, and bulk transloading.",
            "CN_CPKC",
            new List<GeoCoordinate>
            {
                new(-113.8900, 50.9805),
                new(-113.8850, 50.9825),
                new(-113.8800, 50.9855),
                new(-113.8750, 50.9875)
            }
        ),
        new RailPreset(
            "bailey-up",
            "Bailey Yard (Union Pacific)",
            "North Platte, Nebraska, USA",
            "Union Pacific Railroad",
            "World Largest Classification Yard",
            41.1550, -100.8250,
            15.0, 90.0, 40.0,
            855.0,
            "The largest rail yard in the world, sorting over 10,000 railcars per day with east/west hump yards.",
            "UP_BNSF",
            new List<GeoCoordinate>
            {
                new(-100.8350, 41.1550),
                new(-100.8290, 41.1550),
                new(-100.8210, 41.1555),
                new(-100.8150, 41.1558)
            }
        ),
        new RailPreset(
            "houston-port",
            "Houston Ship Channel Rail Terminal",
            "Houston, Texas, USA",
            "PTRA / Union Pacific / BNSF",
            "Petrochemical & Port Transload Spur",
            29.7420, -95.2280,
            15.8, 15.0, 50.0,
            8.0,
            "High-density industrial spurs serving heavy chemical, plastics, and container transload facilities.",
            "UP_BNSF",
            new List<GeoCoordinate>
            {
                new(-95.2340, 29.7400),
                new(-95.2290, 29.7420),
                new(-95.2240, 29.7440),
                new(-95.2200, 29.7450)
            }
        )
    };
}
