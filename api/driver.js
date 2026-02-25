// Consolidated Driver API Endpoint
// Handles: mileage (start/complete), fuel submission, incomplete checks, daily trips
// Replaces: mileage.js, fuel.js, get-incomplete-mileage.js, get-daily-trips.js

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.method === 'GET' ? req.query : req.body;

  if (!action) {
    return res.status(400).json({ error: 'Missing action parameter' });
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const mileageDatabaseId = process.env.NOTION_MILEAGE_DB_ID;
  const fuelDatabaseId = process.env.NOTION_FUEL_DB_ID;

  if (!notionApiKey) {
    return res.status(500).json({ error: 'Missing NOTION_API_KEY' });
  }

  try {
    switch (action) {
      case 'start-mileage':
        return await handleStartMileage(req, res, notionApiKey, mileageDatabaseId);
      
      case 'complete-mileage':
        return await handleCompleteMileage(req, res, notionApiKey, mileageDatabaseId);
      
      case 'cross-state':
        return await handleCrossState(req, res, notionApiKey, mileageDatabaseId);
      
      case 'submit-fuel':
        return await handleSubmitFuel(req, res, notionApiKey, fuelDatabaseId);
      
      case 'check-incomplete':
        return await handleCheckIncomplete(req, res, notionApiKey, mileageDatabaseId);
      
      case 'get-daily-trips':
        return await handleGetDailyTrips(req, res, notionApiKey, mileageDatabaseId);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Driver API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    });
  }
};

// Helper: Start Mileage
async function handleStartMileage(req, res, apiKey, databaseId) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { driverName, truckNumber, startMileage, currentState, date, startTime } = req.body;

    if (!driverName || !truckNumber || !startMileage || !currentState || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!databaseId) {
      return res.status(500).json({ error: 'Missing NOTION_MILEAGE_DB_ID configuration' });
    }

    const properties = {
      'Driver Name': { select: { name: driverName } },
      'Truck Number': { select: { name: truckNumber } },
      'Mileage Start': { number: parseFloat(startMileage) },
      'Current State': { select: { name: currentState } },
      'Date': { date: { start: date } },
      'Status': { status: { name: 'In Progress' } }
    };

    if (startTime) {
      properties['Start Time'] = { rich_text: [{ text: { content: startTime } }] };
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: properties
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Notion API error (start-mileage):', JSON.stringify(data, null, 2));
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create entry',
        details: data.message || 'Unknown error'
      });
    }

    return res.status(200).json({ 
      success: true, 
      pageId: data.id,
      message: 'Mileage entry started successfully'
    });
  } catch (error) {
    console.error('Error in handleStartMileage:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    });
  }
}

// Helper: Complete Mileage
async function handleCompleteMileage(req, res, apiKey, databaseId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    pageId, 
    endMileage, 
    endState, 
    endTime,
    jobSiteArrivalTime,
    jobSiteDepartureTime,
    totalDeliveryTime,
    totalJobSiteTime
  } = req.body;

  if (!pageId || !endMileage || !endState) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const properties = {
    'Mileage End': { number: parseFloat(endMileage) },
    'End State': { select: { name: endState } },
    'Status': { status: { name: 'Done' } }
  };

  if (endTime) {
    properties['End Time'] = { rich_text: [{ text: { content: endTime } }] };
  }

  // Optional job site timing fields
  if (jobSiteArrivalTime) {
    properties['Job Site Arrival'] = { rich_text: [{ text: { content: jobSiteArrivalTime } }] };
  }
  if (jobSiteDepartureTime) {
    properties['Job Site Departure'] = { rich_text: [{ text: { content: jobSiteDepartureTime } }] };
  }
  if (totalDeliveryTime) {
    properties['Total Delivery Time (hrs)'] = { number: parseFloat(totalDeliveryTime) };
  }
  if (totalJobSiteTime) {
    properties['Total Job Site Time (hrs)'] = { number: parseFloat(totalJobSiteTime) };
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ properties })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ success: false, error: 'Failed to complete entry' });
  }

  return res.status(200).json({ 
    success: true,
    message: 'Mileage entry completed successfully'
  });
}

// Helper: Cross State Line
async function handleCrossState(req, res, apiKey, databaseId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { pageId, crossedState, crossTime } = req.body;

  if (!pageId || !crossedState) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const properties = {
    'Crossed State Line': { checkbox: true },
    'State at Crossing': { select: { name: crossedState } }
  };

  if (crossTime) {
    properties['Cross Time'] = { rich_text: [{ text: { content: crossTime } }] };
  }

  const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ properties })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ success: false, error: 'Failed to update state crossing' });
  }

  return res.status(200).json({ 
    success: true,
    message: 'State crossing recorded successfully'
  });
}

// Helper: Submit Fuel
async function handleSubmitFuel(req, res, apiKey, databaseId) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { driverName, truckNumber, gallons, date, location } = req.body;

  if (!driverName || !truckNumber || !gallons || !date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const properties = {
    'Driver Name': { select: { name: driverName } },
    'Truck Number': { select: { name: truckNumber } },
    'Gallons': { number: parseFloat(gallons) },
    'Date': { date: { start: date } }
  };

  if (location) {
    properties['Location'] = { rich_text: [{ text: { content: location } }] };
  }

  const response = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: properties
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ success: false, error: 'Failed to create fuel entry' });
  }

  return res.status(200).json({ 
    success: true,
    message: 'Fuel entry submitted successfully'
  });
}

// Helper: Check Incomplete Mileage
async function handleCheckIncomplete(req, res, apiKey, databaseId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { driver, truck } = req.query;

  if (!driver || !truck) {
    return res.status(400).json({ error: 'Missing driver or truck parameter' });
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
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
            property: 'Driver Name',
            select: { equals: driver }
          },
          {
            property: 'Truck Number',
            select: { equals: truck }
          },
          {
            property: 'Status',
            status: { equals: 'In Progress' }
          }
        ]
      },
      sorts: [
        {
          property: 'Date',
          direction: 'descending'
        }
      ],
      page_size: 1
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Notion API error:', data);
    return res.status(500).json({ success: false, error: 'Failed to check incomplete entries' });
  }

  if (data.results && data.results.length > 0) {
    const entry = data.results[0];
    return res.status(200).json({
      success: true,
      hasIncomplete: true,
      pageId: entry.id,
      startMileage: entry.properties['Mileage Start']?.number || 0,
      currentState: entry.properties['Current State']?.select?.name || '',
      date: entry.properties['Date']?.date?.start || ''
    });
  }

  return res.status(200).json({
    success: true,
    hasIncomplete: false
  });
}

// Helper: Get Daily Trips
async function handleGetDailyTrips(req, res, apiKey, databaseId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { driver, truck, date } = req.query;

  if (!driver || !truck || !date) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
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
            property: 'Driver Name',
            select: { equals: driver }
          },
          {
            property: 'Truck Number',
            select: { equals: truck }
          },
          {
            property: 'Date',
            date: { equals: date }
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
    return res.status(500).json({ success: false, error: 'Failed to fetch daily trips' });
  }

  const trips = data.results.map(entry => ({
    id: entry.id,
    startMileage: entry.properties['Mileage Start']?.number || 0,
    endMileage: entry.properties['Mileage End']?.number || 0,
    startState: entry.properties['Current State']?.select?.name || '',
    endState: entry.properties['End State']?.select?.name || '',
    crossedStateLine: entry.properties['Crossed State Line']?.checkbox || false
  }));

  return res.status(200).json({
    success: true,
    trips: trips,
    totalTrips: trips.length
  });
}
