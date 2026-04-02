// Consolidated Supervisor Data API Endpoint
// Handles: capacity planning, week at a glance, fleet status, recent entries
// Replaces: capacity-data.js, week-at-a-glance.js, fleet-status.js, get-recent-entries.js

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { view } = req.query;

  if (!view) {
    return res.status(400).json({ error: 'Missing view parameter' });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const mileageDatabaseId = process.env.NOTION_MILEAGE_DB_ID;
  const fuelDatabaseId = process.env.NOTION_FUEL_DB_ID;
  const dailyReportDatabaseId = process.env.NOTION_DAILY_REPORT_DB_ID;

  if (!notionApiKey) {
    return res.status(500).json({ error: 'Missing NOTION_API_KEY' });
  }

  try {
    switch (view) {
      case 'capacity':
        return await handleCapacityPlanning(req, res, notionApiKey, mileageDatabaseId, dailyReportDatabaseId);
      
      case 'week-at-a-glance':
        return await handleWeekAtAGlance(req, res, notionApiKey, mileageDatabaseId, dailyReportDatabaseId);
      
      case 'fleet-status':
        return await handleFleetStatus(req, res, notionApiKey, mileageDatabaseId);
      
      case 'recent-entries':
        return await handleRecentEntries(req, res, notionApiKey, mileageDatabaseId, fuelDatabaseId);
      
      default:
        return res.status(400).json({ error: 'Invalid view parameter' });
    }
  } catch (error) {
    console.error('Supervisor data API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    });
  }
};

// Helper: Capacity Planning
async function handleCapacityPlanning(req, res, apiKey, databaseId, dailyReportDatabaseId) {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Missing startDate or endDate parameters' });
  }

  if (!databaseId) {
    return res.status(500).json({ error: 'Missing NOTION_MILEAGE_DB_ID' });
  }

  // Query Notion for mileage entries in date range
  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        and: [
          {
            property: 'Date',
            date: { on_or_after: startDate }
          },
          {
            property: 'Date',
            date: { on_or_before: endDate }
          },
          {
            property: 'Status',
            status: { equals: 'Done' }
          }
        ]
      },
      sorts: [
        {
          property: 'Date',
          direction: 'ascending'
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ error: 'Failed to fetch data from Notion' });
  }

  // Fetch concrete yardage from daily reports if database ID exists
  let concreteData = {};
  if (dailyReportDatabaseId) {
    try {
      const concreteResponse = await fetch('https://api.notion.com/v1/databases/' + dailyReportDatabaseId + '/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            and: [
              {
                property: 'Date',
                date: { on_or_after: startDate }
              },
              {
                property: 'Date',
                date: { on_or_before: endDate }
              }
            ]
          }
        })
      });

      const concreteResponseData = await concreteResponse.json();
      
      if (concreteResponse.ok && concreteResponseData.results) {
        concreteResponseData.results.forEach(entry => {
          const date = entry.properties['Report Date']?.date?.start;
          const yards = entry.properties['Total Yards Out']?.number || 0;
          
          if (date) {
            if (!concreteData[date]) {
              concreteData[date] = 0;
            }
            concreteData[date] += yards;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching concrete data:', error);
    }
  }

  // Process results and group by date
  const dailyData = {};
  const truckSet = new Set();

  data.results.forEach(entry => {
    const date = entry.properties['Date']?.date?.start;
    const truck = entry.properties['Truck Number']?.select?.name;
    const driver = entry.properties['Driver Name']?.select?.name;

    if (!date) return;

    if (!dailyData[date]) {
      dailyData[date] = {
        date: date,
        loads: 0,
        trucks: new Set(),
        drivers: new Set(),
        concreteYards: concreteData[date] || 0
      };
    }

    dailyData[date].loads += 1;
    if (truck) {
      dailyData[date].trucks.add(truck);
      truckSet.add(truck);
    }
    if (driver) dailyData[date].drivers.add(driver);
  });

  // Convert to array and add capacity calculations
  const totalTrucks = truckSet.size || 4;
  const avgLoadsPerTruck = 12.5;
  const maxCapacity = totalTrucks * avgLoadsPerTruck;

  const dailyArray = Object.values(dailyData).map(day => ({
    date: day.date,
    loads: day.loads,
    maxCapacity: maxCapacity,
    trucksActive: day.trucks.size,
    utilizationPercent: Math.round((day.loads / maxCapacity) * 100),
    drivers: Array.from(day.drivers),
    concreteYards: day.concreteYards
  }));

  // Calculate summary metrics
  const totalLoads = dailyArray.reduce((sum, day) => sum + day.loads, 0);
  const totalConcreteYards = dailyArray.reduce((sum, day) => sum + day.concreteYards, 0);
  const avgDailyLoads = dailyArray.length > 0 ? Math.round(totalLoads / dailyArray.length) : 0;
  const avgDailyYards = dailyArray.length > 0 ? Math.round(totalConcreteYards / dailyArray.length) : 0;
  const avgUtilization = dailyArray.length > 0 
    ? Math.round(dailyArray.reduce((sum, day) => sum + day.utilizationPercent, 0) / dailyArray.length)
    : 0;
  const peakDay = dailyArray.reduce((max, day) => day.loads > max.loads ? day : max, { loads: 0 });
  const peakYardsDay = dailyArray.reduce((max, day) => day.concreteYards > max.concreteYards ? day : max, { concreteYards: 0 });

  const midpoint = Math.floor(dailyArray.length / 2);
  const firstHalf = dailyArray.slice(0, midpoint);
  const secondHalf = dailyArray.slice(midpoint);
  
  const firstHalfAvg = firstHalf.length > 0 
    ? firstHalf.reduce((sum, day) => sum + day.loads, 0) / firstHalf.length 
    : 0;
  const secondHalfAvg = secondHalf.length > 0 
    ? secondHalf.reduce((sum, day) => sum + day.loads, 0) / secondHalf.length 
    : 0;
  
  const trendPercent = firstHalfAvg > 0 
    ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
    : 0;

  return res.status(200).json({
    success: true,
    dateRange: { start: startDate, end: endDate },
    summary: {
      totalLoads,
      totalConcreteYards,
      avgDailyLoads,
      avgDailyYards,
      avgUtilization,
      peakDay: { date: peakDay.date, loads: peakDay.loads },
      peakYardsDay: { date: peakYardsDay.date, yards: peakYardsDay.concreteYards },
      trendPercent,
      totalTrucks,
      maxCapacity
    },
    dailyData: dailyArray
  });
}

// Helper: Week at a Glance
async function handleWeekAtAGlance(req, res, apiKey, databaseId, dailyReportDatabaseId) {
  if (!databaseId) {
    return res.status(500).json({ error: 'Missing NOTION_MILEAGE_DB_ID' });
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);

  const startDate = sevenDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        and: [
          {
            property: 'Date',
            date: { on_or_after: startDate }
          },
          {
            property: 'Status',
            status: { equals: 'Done' }
          }
        ]
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ error: 'Failed to fetch week data' });
  }

  // Fetch concrete yardage from daily reports
  let concreteDataByDate = {};
  if (dailyReportDatabaseId) {
    try {
      const concreteResponse = await fetch('https://api.notion.com/v1/databases/' + dailyReportDatabaseId + '/query', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            property: 'Report Date',
            date: { on_or_after: startDate }
          }
        })
      });

      const concreteResponseData = await concreteResponse.json();
      
      if (concreteResponse.ok && concreteResponseData.results) {
        concreteResponseData.results.forEach(entry => {
          const date = entry.properties['Report Date']?.date?.start;
          const yards = entry.properties['Total Yards Out']?.number || 0;
          
          if (date) {
            if (!concreteDataByDate[date]) {
              concreteDataByDate[date] = 0;
            }
            concreteDataByDate[date] += yards;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching concrete data for week:', error);
    }
  }

  // Group by driver
  const driverStats = {};

  data.results.forEach(entry => {
    const driver = entry.properties['Driver Name']?.select?.name;
    const mileageStart = entry.properties['Mileage Start']?.number || 0;  // FIXED
    const mileageEnd = entry.properties['Mileage End']?.number || 0;      // FIXED
    const crossedState = entry.properties['Crossed State Line']?.checkbox || false;

    if (!driver) return;

    if (!driverStats[driver]) {
      driverStats[driver] = {
        driver: driver,
        totalLoads: 0,
        totalMiles: 0,
        stateCrossings: 0
      };
    }

    driverStats[driver].totalLoads += 1;
    driverStats[driver].totalMiles += (mileageEnd - mileageStart);
    if (crossedState) driverStats[driver].stateCrossings += 1;
  });

  const driverArray = Object.values(driverStats);
  const totalConcreteYards = Object.values(concreteDataByDate).reduce((sum, yards) => sum + yards, 0);

  return res.status(200).json({
    success: true,
    weekRange: { start: startDate, end: endDate },
    drivers: driverArray,
    totalConcreteYards: totalConcreteYards
  });
}

// Helper: Fleet Status
async function handleFleetStatus(req, res, apiKey, databaseId) {
  if (!databaseId) {
    return res.status(500).json({ error: 'Missing NOTION_MILEAGE_DB_ID' });
  }

  const today = new Date().toISOString().split('T')[0];

  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        and: [
          {
            property: 'Date',
            date: { equals: today }
          },
          {
            property: 'Status',
            status: { equals: 'In Progress' }
          }
        ]
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ error: 'Failed to fetch fleet status' });
  }

  const activeDrivers = data.results.map(entry => ({
    driver: entry.properties['Driver Name']?.select?.name || 'Unknown',
    truck: entry.properties['Truck Number']?.select?.name || 'Unknown',
    startMileage: entry.properties['Mileage Start']?.number || 0,         // FIXED
    currentState: entry.properties['Current State']?.select?.name || 'Unknown',
    startTime: entry.properties['Start Time']?.rich_text?.[0]?.text?.content || ''
  }));

  return res.status(200).json({
    success: true,
    date: today,
    activeDrivers: activeDrivers,
    totalActive: activeDrivers.length
  });
}

// Helper: Recent Entries
async function handleRecentEntries(req, res, apiKey, mileageDatabaseId, fuelDatabaseId) {
  const { type, days } = req.query;

  if (!type) {
    return res.status(400).json({ error: 'Missing type parameter (mileage or fuel)' });
  }

  const daysBack = parseInt(days) || 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  const startDate = cutoffDate.toISOString().split('T')[0];

  const databaseId = type === 'mileage' ? mileageDatabaseId : fuelDatabaseId;

  if (!databaseId) {
    return res.status(500).json({ error: `Missing database ID for ${type}` });
  }

  const response = await fetch('https://api.notion.com/v1/databases/' + databaseId + '/query', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      filter: {
        property: 'Date',
        date: { on_or_after: startDate }
      },
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ],
      page_size: 50
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ error: 'Failed to fetch recent entries' });
  }

  let entries = [];

  if (type === 'mileage') {
    entries = data.results.map(entry => ({
      id: entry.id,
      driver: entry.properties['Driver Name']?.select?.name || '',
      truck: entry.properties['Truck Number']?.select?.name || '',
      date: entry.properties['Date']?.date?.start || '',
      mileageStart: entry.properties['Mileage Start']?.number || 0,       // FIXED
      mileageEnd: entry.properties['Mileage End']?.number || 0,           // FIXED
      totalMiles: (entry.properties['Mileage End']?.number || 0) -
                  (entry.properties['Mileage Start']?.number || 0),       // FIXED
      state: entry.properties['Current State']?.select?.name || '',       // FIXED
      status: entry.properties['Status']?.status?.name || ''
    }));
  } else {
    entries = data.results.map(entry => ({
      id: entry.id,
      driver: entry.properties['Driver Name']?.select?.name || '',
      truck: entry.properties['Truck Number']?.select?.name || '',
      date: entry.properties['Date']?.date?.start || '',
      gallons: entry.properties['Gallons']?.number || 0,
      location: entry.properties['Location']?.rich_text?.[0]?.text?.content || ''
    }));
  }

  return res.status(200).json({
    success: true,
    type: type,
    entries: entries,
    count: entries.length
  });
}
