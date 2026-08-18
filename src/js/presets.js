// Real-World North American Freight Rail Corridors & Industrial Hubs
export const RAIL_PRESETS = [
  {
    id: 'calgary-cpkc',
    name: 'Calgary Logistics Park (CPKC / CN)',
    region: 'Alberta, Canada',
    operator: 'CPKC / Canadian National',
    type: 'Intermodal & Industrial Logistics Hub',
    lat: 50.9835,
    lng: -113.8820,
    zoom: 15.5,
    bearing: 42,
    pitch: 45,
    baseElevation: 1045, // meters
    description: 'Major Canadian rail logistics park handling intermodal containers, automotive, and bulk transloading with complex switch ladders.',
    standardsProfile: 'CN_CPKC'
  },
  {
    id: 'north-platte-up',
    name: 'Bailey Yard (Union Pacific)',
    region: 'North Platte, Nebraska, USA',
    operator: 'Union Pacific Railroad',
    type: 'World Largest Classification Yard',
    lat: 41.1550,
    lng: -100.8250,
    zoom: 15.0,
    bearing: 90,
    pitch: 40,
    baseElevation: 855, // meters (2805 ft)
    description: 'The largest rail yard in the world, sorting over 10,000 railcars per day with east/west hump yards and extensive siding networks.',
    standardsProfile: 'UP_BNSF'
  },
  {
    id: 'houston-port',
    name: 'Houston Ship Channel Rail Terminal',
    region: 'Houston, Texas, USA',
    operator: 'PTRA / Union Pacific / BNSF',
    type: 'Petrochemical & Port Transload Spur',
    lat: 29.7420,
    lng: -95.2280,
    zoom: 15.8,
    bearing: 15,
    pitch: 50,
    baseElevation: 8, // meters (26 ft)
    description: 'High-density industrial spurs serving heavy chemical, plastics, and container transload facilities with tight radius curves.',
    standardsProfile: 'UP_BNSF'
  },
  {
    id: 'chicago-corwith',
    name: 'Corwith Intermodal Yard (BNSF)',
    region: 'Chicago, Illinois, USA',
    operator: 'BNSF Railway',
    type: 'Historic Core Intermodal Facility',
    lat: 41.8170,
    lng: -87.7120,
    zoom: 15.2,
    bearing: 55,
    pitch: 35,
    baseElevation: 181, // meters (595 ft)
    description: 'Crucial Midwest freight nexus with high-speed crossovers, double-stack clearance corridors, and dense trackage.',
    standardsProfile: 'UP_BNSF'
  },
  {
    id: 'prince-rupert-cn',
    name: 'Prince Rupert Port Logistics (CN)',
    region: 'British Columbia, Canada',
    operator: 'Canadian National Railway',
    type: 'Deep-Water Port & Bulk Siding',
    lat: 54.2980,
    lng: -130.3450,
    zoom: 15.0,
    bearing: 310,
    pitch: 45,
    baseElevation: 12, // meters
    description: 'Fastest North American Pacific gateway, accommodating 12,000-ft unit trains for grain, coal, and container traffic.',
    standardsProfile: 'CN_CPKC'
  },
  {
    id: 'kansas-city-ns',
    name: 'Kansas City Junction (NS / CPKC)',
    region: 'Kansas City, Missouri, USA',
    operator: 'Norfolk Southern / CPKC',
    type: 'Cross-Border Freight Gateway',
    lat: 39.1250,
    lng: -94.5750,
    zoom: 15.3,
    bearing: 120,
    pitch: 40,
    baseElevation: 230,
    description: 'Key North-South/East-West freight confluence connecting Mexican, US, and Canadian supply chains.',
    standardsProfile: 'AREMA'
  }
];
