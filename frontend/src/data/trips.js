// ---------------------------------------------------------------------------
// PLACEHOLDER DATA
// Every value below is hard-coded so the UI can be built and reviewed before
// the backend exists. The shape mirrors what the API is expected to return —
// see docs/UI-DATA-CONTRACT.md. Replace this module with fetches, not the
// components.
// ---------------------------------------------------------------------------

export const trucks = ["Truck 14-B", "Truck 09-C", "Truck 22-A", "Truck 31-D"];

// The daily fuel-price sheet the plan was priced against. Index 0 is "today";
// any other selection puts the price panels into the archived (amber) state.
export const sheetDates = [
  "Sep 4, 2026 · 06:00 CT",
  "Sep 3, 2026 · 06:00 CT",
  "Sep 2, 2026 · 06:00 CT",
  "Sep 1, 2026 · 06:00 CT",
  "Aug 31, 2026 · 06:00 CT",
  "Aug 28, 2026 · 06:00 CT",
];

export const sheetLoadedNote = "Daily price CSV loaded 05:58 CT · 412 stations";
export const sheetArchivedNote =
  "Archived sheet — not today’s prices. Historical reference only.";

export const driverLinkPlaceholder =
  "https://www.google.com/maps/dir/?api=1&travelmode=driving";

export const sheetStationCount = 412;

// Stations on the sheet that sat inside the search corridor but were NOT
// chosen by the optimiser. Drawn as small green dots when "show all sheet
// stations" is toggled on. x/y are placeholder canvas positions.
export const sheetStations = [
  { name: "Loves #637", place: "Delano, CA", price: "4.960", alongMi: "62", x: "18%", y: "44%" },
  { name: "Pilot #219", place: "Lodi, CA", price: "4.712", alongMi: "112", x: "23%", y: "78%" },
  { name: "Chevron 341", place: "Barstow, CA", price: "4.511", alongMi: "168", x: "28%", y: "52%" },
  { name: "Shell 7712", place: "Boron, CA", price: "4.583", alongMi: "204", x: "31%", y: "88%" },
  { name: "Maverik 88", place: "Baker, CA", price: "4.630", alongMi: "246", x: "39%", y: "40%" },
  { name: "Circle K 40", place: "Primm, NV", price: "4.714", alongMi: "271", x: "42%", y: "74%" },
  { name: "Arco 1188", place: "Jean, NV", price: "4.792", alongMi: "298", x: "46%", y: "30%" },
  { name: "Loves #221", place: "Beatty, NV", price: "4.505", alongMi: "322", x: "49%", y: "82%" },
  { name: "Pilot #690", place: "Tonopah, NV", price: "4.488", alongMi: "347", x: "52%", y: "46%" },
  { name: "TA Hazen", place: "Hazen, NV", price: "4.402", alongMi: "384", x: "58%", y: "70%" },
  { name: "Sinclair 71", place: "Fallon, NV", price: "4.611", alongMi: "402", x: "61%", y: "34%" },
  { name: "Chevron 88", place: "Silver Springs, NV", price: "4.740", alongMi: "419", x: "66%", y: "62%" },
  { name: "Maverik 40", place: "Dayton, NV", price: "4.566", alongMi: "438", x: "70%", y: "26%" },
  { name: "Shell 2201", place: "Carson City, NV", price: "4.688", alongMi: "451", x: "73%", y: "80%" },
  { name: "Loves #504", place: "Sparks, NV", price: "4.394", alongMi: "466", x: "77%", y: "44%" },
  { name: "Pilot #118", place: "Reno, NV", price: "4.523", alongMi: "474", x: "80%", y: "66%" },
  { name: "Arco 902", place: "Verdi, NV", price: "4.771", alongMi: "479", x: "84%", y: "32%" },
  { name: "TA Tulare", place: "Tulare, CA", price: "4.317", alongMi: "88", x: "20%", y: "62%" },
  { name: "Loves #118", place: "Kramer Jct, CA", price: "4.469", alongMi: "221", x: "35%", y: "58%" },
  { name: "Sinclair 6", place: "Goldfield, NV", price: "4.655", alongMi: "336", x: "55%", y: "22%" },
  { name: "Pilot #77", place: "Yerington, NV", price: "4.598", alongMi: "411", x: "64%", y: "86%" },
  { name: "Maverik 9", place: "Minden, NV", price: "4.502", alongMi: "459", x: "75%", y: "54%" },
  { name: "Chevron 12", place: "Truckee, CA", price: "4.833", alongMi: "481", x: "86%", y: "76%" },
];

export const trips = [
  {
    id: "T-1042",
    date: "Sep 1",
    truck: "Truck 14-B",
    status: "Planned",
    source: "Bakersfield, CA",
    dest: "Reno, NV",
    route: "Bakersfield, CA → Reno, NV",
    driverLink: driverLinkPlaceholder,
    summary: {
      fuelCost: "$286.62",
      fuelGal: "68 gal",
      saved: "−$41.00",
      dist: "486.5",
      distSub: "+4.7 mi of detour · direct 481.8 mi",
      driveTime: "7h 40m",
      stopCount: "5",
      stopsSub: "within the leg bounds",
      detourCost: "$3.39",
    },
    // Recent-trips row only.
    miles: "482 mi",
    save: "$41",
    cheapest: [
      { name: "Pilot #412", width: "52%", price: "4.09" },
      { name: "Love's 233", width: "60%", price: "4.18" },
      { name: "TA Mojave", width: "68%", price: "4.24" },
      { name: "Flying J 88", width: "80%", price: "4.37" },
      { name: "Sinclair 9", width: "92%", price: "4.44" },
    ],
    stops: [
      { rank: "1", station: "Pilot #412", place: "Buttonwillow, CA", milepost: "mi 96", action: "60 gal fill", detour: "0.4 mi", price: "$4.09", buy: "60.0 gal", arrive: "92.6 gal", cumulative: "96.1 mi", stopCost: "$14.53" },
      { rank: "2", station: "TA Mojave", place: "Mojave, CA", milepost: "mi 188", action: "top-off", detour: "0.2 mi", price: "$4.24", buy: "2.0 gal", arrive: "78.4 gal", cumulative: "188.1 mi", stopCost: "$11.20" },
      { rank: "3", station: "Love's 233", place: "Hinkley, CA", milepost: "mi 264", action: "40 gal", detour: "2.1 mi", price: "$4.18", buy: "40.0 gal", arrive: "61.2 gal", cumulative: "264.1 mi", stopCost: "$9.86" },
      { rank: "4", station: "Flying J 88", place: "Hawthorne, NV", milepost: "mi 351", action: "top-off", detour: "0.6 mi", price: "$4.37", buy: "2.0 gal", arrive: "44.8 gal", cumulative: "351.1 mi", stopCost: "$6.42" },
      { rank: "5", station: "Sinclair 9", place: "Fernley, NV", milepost: "mi 430", action: "20 gal", detour: "1.4 mi", price: "$4.44", buy: "20.0 gal", arrive: "29.1 gal", cumulative: "430.1 mi", stopCost: "$4.10" },
    ],
  },
  {
    id: "T-1041",
    date: "Aug 29",
    truck: "Truck 09-C",
    status: "Completed",
    source: "Fresno, CA",
    dest: "Phoenix, AZ",
    route: "Fresno, CA → Phoenix, AZ",
    driverLink: driverLinkPlaceholder,
    summary: {
      fuelCost: "$334.32",
      fuelGal: "84 gal",
      saved: "−$58.10",
      dist: "593.5",
      distSub: "+2.8 mi of detour · direct 590.7 mi",
      driveTime: "9h 05m",
      stopCount: "5",
      stopsSub: "within the leg bounds",
      detourCost: "$3.12",
    },
    miles: "591 mi",
    save: "$58",
    cheapest: [
      { name: "Loves 118", width: "48%", price: "3.98" },
      { name: "TA Blythe", width: "58%", price: "4.07" },
      { name: "Pilot #77", width: "70%", price: "4.19" },
      { name: "QT Buckeye", width: "82%", price: "4.31" },
      { name: "Chevron 3", width: "94%", price: "4.46" },
    ],
    stops: [
      { rank: "1", station: "Loves 118", place: "Tulare, CA", milepost: "mi 74", action: "65 gal fill", detour: "0.3 mi", price: "$3.98", buy: "65.0 gal", arrive: "92.6 gal", cumulative: "74.1 mi", stopCost: "$14.53" },
      { rank: "2", station: "TA Blythe", place: "Blythe, CA", milepost: "mi 236", action: "45 gal", detour: "0.5 mi", price: "$4.07", buy: "45.0 gal", arrive: "78.4 gal", cumulative: "236.1 mi", stopCost: "$11.20" },
      { rank: "3", station: "Pilot #77", place: "Quartzsite, AZ", milepost: "mi 388", action: "top-off", detour: "1.2 mi", price: "$4.19", buy: "2.0 gal", arrive: "61.2 gal", cumulative: "388.1 mi", stopCost: "$9.86" },
      { rank: "4", station: "QT Buckeye", place: "Buckeye, AZ", milepost: "mi 512", action: "20 gal", detour: "0.8 mi", price: "$4.31", buy: "20.0 gal", arrive: "44.8 gal", cumulative: "512.1 mi", stopCost: "$6.42" },
      { rank: "5", station: "Chevron 3", place: "Goodyear, AZ", milepost: "mi 560", action: "reserve", detour: "2.4 mi", price: "$4.46", buy: "2.0 gal", arrive: "29.1 gal", cumulative: "560.1 mi", stopCost: "$4.10" },
    ],
  },
  {
    id: "T-1039",
    date: "Aug 26",
    truck: "Truck 14-B",
    status: "Completed",
    source: "Sacramento, CA",
    dest: "Portland, OR",
    route: "Sacramento, CA → Portland, OR",
    driverLink: driverLinkPlaceholder,
    summary: {
      fuelCost: "$334.71",
      fuelGal: "81 gal",
      saved: "−$36.40",
      dist: "582.5",
      distSub: "+4.5 mi of detour · direct 578.0 mi",
      driveTime: "8h 50m",
      stopCount: "5",
      stopsSub: "within the leg bounds",
      detourCost: "$5.40",
    },
    miles: "578 mi",
    save: "$36",
    cheapest: [
      { name: "Pilot #212", width: "50%", price: "4.11" },
      { name: "TA Redding", width: "62%", price: "4.22" },
      { name: "Loves 401", width: "72%", price: "4.29" },
      { name: "Space Age", width: "84%", price: "4.40" },
      { name: "Shell 88", width: "96%", price: "4.52" },
    ],
    stops: [
      { rank: "1", station: "Pilot #212", place: "Williams, CA", milepost: "mi 88", action: "62 gal fill", detour: "0.6 mi", price: "$4.11", buy: "62.0 gal", arrive: "92.6 gal", cumulative: "88.1 mi", stopCost: "$14.53" },
      { rank: "2", station: "TA Redding", place: "Redding, CA", milepost: "mi 162", action: "40 gal", detour: "0.2 mi", price: "$4.22", buy: "40.0 gal", arrive: "78.4 gal", cumulative: "162.1 mi", stopCost: "$11.20" },
      { rank: "3", station: "Loves 401", place: "Medford, OR", milepost: "mi 318", action: "top-off", detour: "1.0 mi", price: "$4.29", buy: "2.0 gal", arrive: "61.2 gal", cumulative: "318.1 mi", stopCost: "$9.86" },
      { rank: "4", station: "Space Age", place: "Eugene, OR", milepost: "mi 447", action: "25 gal", detour: "0.9 mi", price: "$4.40", buy: "25.0 gal", arrive: "44.8 gal", cumulative: "447.1 mi", stopCost: "$6.42" },
      { rank: "5", station: "Shell 88", place: "Salem, OR", milepost: "mi 528", action: "reserve", detour: "1.8 mi", price: "$4.52", buy: "2.0 gal", arrive: "29.1 gal", cumulative: "528.1 mi", stopCost: "$4.10" },
    ],
  },
  {
    id: "T-1036",
    date: "Aug 22",
    truck: "Truck 22-A",
    status: "Completed",
    source: "Barstow, CA",
    dest: "Salt Lake City, UT",
    route: "Barstow, CA → Salt Lake City, UT",
    driverLink: driverLinkPlaceholder,
    summary: {
      fuelCost: "$374.44",
      fuelGal: "92 gal",
      saved: "−$67.20",
      dist: "655.0",
      distSub: "+3.9 mi of detour · direct 651.1 mi",
      driveTime: "10h 10m",
      stopCount: "5",
      stopsSub: "within the leg bounds",
      detourCost: "$4.68",
    },
    miles: "651 mi",
    save: "$67",
    cheapest: [
      { name: "Loves 302", width: "46%", price: "3.92" },
      { name: "Pilot #504", width: "56%", price: "4.03" },
      { name: "Maverik 12", width: "68%", price: "4.15" },
      { name: "Sinclair 44", width: "80%", price: "4.28" },
      { name: "Flying J 5", width: "90%", price: "4.39" },
    ],
    stops: [
      { rank: "1", station: "Loves 302", place: "Baker, CA", milepost: "mi 110", action: "70 gal fill", detour: "0.4 mi", price: "$3.92", buy: "70.0 gal", arrive: "92.6 gal", cumulative: "110.1 mi", stopCost: "$14.53" },
      { rank: "2", station: "Pilot #504", place: "Las Vegas, NV", milepost: "mi 264", action: "50 gal", detour: "0.3 mi", price: "$4.03", buy: "50.0 gal", arrive: "78.4 gal", cumulative: "264.1 mi", stopCost: "$11.20" },
      { rank: "3", station: "Maverik 12", place: "Beaver, UT", milepost: "mi 402", action: "top-off", detour: "1.5 mi", price: "$4.15", buy: "2.0 gal", arrive: "61.2 gal", cumulative: "402.1 mi", stopCost: "$9.86" },
      { rank: "4", station: "Sinclair 44", place: "Nephi, UT", milepost: "mi 520", action: "25 gal", detour: "0.7 mi", price: "$4.28", buy: "25.0 gal", arrive: "44.8 gal", cumulative: "520.1 mi", stopCost: "$6.42" },
      { rank: "5", station: "Flying J 5", place: "Springville, UT", milepost: "mi 604", action: "reserve", detour: "1.1 mi", price: "$4.39", buy: "2.0 gal", arrive: "29.1 gal", cumulative: "604.1 mi", stopCost: "$4.10" },
    ],
  },
];
