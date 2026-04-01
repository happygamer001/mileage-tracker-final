// Daily Job Report API Endpoint
// Handles batch manager daily report submissions

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const notionApiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DAILY_REPORT_DB_ID;

    if (!notionApiKey) {
      console.error('Missing NOTION_API_KEY');
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing API key' });
    }

    if (!databaseId) {
      console.error('Missing NOTION_DAILY_REPORT_DB_ID');
      return res.status(500).json({ success: false, error: 'Server configuration error: Missing database ID' });
    }

    const {
      name,
      date,
      yardsOut,
      tripsOut,
      drivers,       // Array: [{name, status, hours}, ...]
                     // status values: "Full Day" | "Half Day" | "Absent"
      fuelReading,
      issues,
      preparedBy,
      timestamp
    } = req.body;

    console.log('Received daily report:', { name, date, yardsOut, tripsOut, drivers, fuelReading, issues });

    if (!date) {
      return res.status(400).json({ success: false, error: 'Missing required field: date' });
    }

    if (!name) {
      return res.status(400).json({ success: false, error: 'Missing required field: name (batch manager)' });
    }

    const properties = {
      'Name': {
        title: [{ text: { content: `Daily Report - ${date}` } }]
      },
      'Report Date': {
        date: { start: date }
      },
      'Submitted By': {
        rich_text: [{ text: { content: name || preparedBy || 'Unknown' } }]
      }
    };

    if (yardsOut !== undefined && yardsOut !== null && yardsOut !== '') {
      const yards = parseFloat(yardsOut);
      if (!isNaN(yards)) properties['Total Yards Out'] = { number: yards };
    }

    if (tripsOut !== undefined && tripsOut !== null && tripsOut !== '') {
      const trips = parseFloat(tripsOut);
      if (!isNaN(trips)) properties['Trips Out'] = { number: trips };
    }

    if (fuelReading !== undefined && fuelReading !== null && fuelReading !== '') {
      const fuel = parseFloat(fuelReading);
      if (!isNaN(fuel)) properties['End of Day Fuel Reading'] = { number: fuel };
    }

    if (issues) {
      properties['Issues Presented'] = {
        rich_text: [{ text: { content: issues } }]
      };
    }

    // -------------------------------------------------------
    // DRIVER PROCESSING — now includes status (Full Day / Half Day / Absent)
    // -------------------------------------------------------
    // Valid status values that must match your Notion select options exactly:
    const VALID_STATUSES = ['Full Day', 'Half Day', 'Absent'];

    if (drivers && Array.isArray(drivers)) {
      drivers.forEach((driver, index) => {
        if (index < 5 && driver.name) {
          const driverNum = index + 1;

          // Driver name
          properties[`Driver ${driverNum} Name`] = {
            rich_text: [{ text: { content: driver.name } }]
          };

          // Driver status — sent as a Select property in Notion
          // Make sure your Notion DB has a Select column named "Driver N Status"
          // with options: Full Day, Half Day, Absent
          if (driver.status && VALID_STATUSES.includes(driver.status)) {
            properties[`Driver ${driverNum} Status`] = {
              select: { name: driver.status }
            };
          }

          // Driver hours — only meaningful for Full Day / Half Day
          if (
            driver.status !== 'Absent' &&
            driver.hours !== undefined &&
            driver.hours !== null &&
            driver.hours !== ''
          ) {
            const hours = parseFloat(driver.hours);
            if (!isNaN(hours)) {
              properties[`Driver ${driverNum} Hours`] = { number: hours };
            }
          }
        }
      });
    }

    console.log('Notion properties:', JSON.stringify(properties, null, 2));

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
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
      console.error('Notion API error:', JSON.stringify(data, null, 2));
      return res.status(400).json({
        success: false,
        error: 'Database property mismatch',
        details: data.message || '',
        hint: 'Check that Notion database has correct property names and types'
      });
    }

    console.log('Successfully created daily report in Notion');
    return res.status(200).json({
      success: true,
      message: 'Daily report submitted successfully',
      pageId: data.id
    });

  } catch (error) {
    console.error('Error in daily report API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
