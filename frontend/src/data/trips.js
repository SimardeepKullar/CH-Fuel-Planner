export const trips = [
  {
    id: "T-1042", date: "Feb 3", truck: "Truck 14-B", status: "Completed",
    source: "Bakersfield, CA", dest: "Reno, NV", miles: "482 mi", hours: "7 h 40 m", gal: "68 gal", save: "$41",
    cheapest: [
      { n: "Pilot #412", p: "4.09", w: 52 },
      { n: "Love's 233", p: "4.18", w: 60 },
      { n: "TA Mojave", p: "4.24", w: 68 },
      { n: "Flying J 88", p: "4.37", w: 80 },
      { n: "Sinclair 9", p: "4.44", w: 92 },
    ],
    stops: [
      { r: 1, t: "Pilot #412 · mi 96", s: "0.4 mi detour · 60 gal fill", p: "$4.09", top: true },
      { r: 2, t: "TA Mojave · mi 188", s: "0.2 mi detour · top-off", p: "$4.24", top: false },
      { r: 3, t: "Love's 233 · mi 264", s: "2.1 mi detour · 40 gal", p: "$4.18", top: false },
      { r: 4, t: "Flying J 88 · mi 351", s: "0.6 mi detour · top-off", p: "$4.37", top: false },
      { r: 5, t: "Sinclair 9 · mi 430", s: "1.4 mi detour · 20 gal", p: "$4.44", top: false },
    ],
  },
  {
    id: "T-1038", date: "Jan 29", truck: "Truck 22-A", status: "Completed",
    source: "Fresno, CA", dest: "Elko, NV", miles: "398 mi", hours: "6 h 15 m", gal: "56 gal", save: "$33",
    cheapest: [
      { n: "Love's 512", p: "4.02", w: 48 },
      { n: "Pilot #77", p: "4.11", w: 58 },
      { n: "TA Winnemucca", p: "4.19", w: 66 },
      { n: "Sinclair 4", p: "4.30", w: 78 },
    ],
    stops: [
      { r: 1, t: "Love's 512 · mi 84", s: "0.3 mi detour · 55 gal fill", p: "$4.02", top: true },
      { r: 2, t: "TA Winnemucca · mi 260", s: "0.5 mi detour · top-off", p: "$4.19", top: false },
      { r: 3, t: "Sinclair 4 · mi 349", s: "1.1 mi detour · 25 gal", p: "$4.30", top: false },
    ],
  },
  {
    id: "T-1031", date: "Jan 24", truck: "Truck 14-B", status: "Completed",
    source: "Stockton, CA", dest: "Salt Lake City, UT", miles: "611 mi", hours: "9 h 55 m", gal: "86 gal", save: "$52",
    cheapest: [
      { n: "Flying J 12", p: "3.98", w: 46 },
      { n: "Pilot #205", p: "4.05", w: 54 },
      { n: "Love's 88", p: "4.16", w: 64 },
      { n: "TA Wendover", p: "4.27", w: 76 },
      { n: "Sinclair 21", p: "4.41", w: 90 },
    ],
    stops: [
      { r: 1, t: "Flying J 12 · mi 110", s: "0.2 mi detour · 60 gal fill", p: "$3.98", top: true },
      { r: 2, t: "Love's 88 · mi 305", s: "0.4 mi detour · top-off", p: "$4.16", top: false },
      { r: 3, t: "TA Wendover · mi 470", s: "0.8 mi detour · 40 gal", p: "$4.27", top: false },
      { r: 4, t: "Sinclair 21 · mi 560", s: "1.6 mi detour · top-off", p: "$4.41", top: false },
    ],
  },
  {
    id: "T-1027", date: "Jan 19", truck: "Truck 08-C", status: "Flagged",
    source: "Bakersfield, CA", dest: "Phoenix, AZ", miles: "389 mi", hours: "6 h 05 m", gal: "55 gal", save: "$28",
    cheapest: [
      { n: "Pilot #90", p: "4.14", w: 50 },
      { n: "Love's 301", p: "4.22", w: 62 },
      { n: "TA Blythe", p: "4.35", w: 82 },
    ],
    stops: [
      { r: 1, t: "Pilot #90 · mi 102", s: "0.5 mi detour · 55 gal fill", p: "$4.14", top: true },
      { r: 2, t: "TA Blythe · mi 260", s: "0.3 mi detour · top-off", p: "$4.35", top: false },
    ],
  },
];
