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

    // Validate environment variables
    if (!notionApiKey) {
      console.error('Missing NOTION_API_KEY');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing API key' 
      });
    }

    if (!databaseId) {
      console.error('Missing NOTION_DAILY_REPORT_DB_ID');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error: Missing database ID' 
      });
    }

    // Parse request body
    const {
      name,           // Batch manager name (submitter)
      date,           // Report date
      yardsOut,       // Total yards of concrete delivered
      tripsOut,       // Number of trips/loads
      drivers,        // Array of driver objects: [{name, status, hours}, ...]
      fuelReading,    // End of day fuel tank reading
      issues,         // Issues/notes
      preparedBy,     // Who submitted (same as name usually)
      timestamp       // Submission timestamp
    } = req.body;

    console.log('Received daily report:', { name, date, yardsOut, tripsOut, drivers, fuelReading, issues });

    // Validate required fields
    if (!date) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: date' 
      });
    }

    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required field: name (batch manager)' 
      });
    }

    // Build properties object for Notion
    // Name is the title property
    const properties = {
      'Name': {
        title: [
          {
            text: {
              content: `Daily Report - ${date}`
            }
          }
        ]
      },
      'Report Date': {
        date: {
          start: date
        }
      },
      'Submitted By': {
        rich_text: [
          {
            text: {
              content: name || preparedBy || 'Unknown'
            }
          }
        ]
      }
    };

    // Add total yards out (concrete delivered)
    if (yardsOut !== undefined && yardsOut !== null && yardsOut !== '') {
      const yards = parseFloat(yardsOut);
      if (!isNaN(yards)) {
        properties['Total Yards Out'] = {
          number: yards
        };
      }
    }

    // Add trips out
    if (tripsOut !== undefined && tripsOut !== null && tripsOut !== '') {
      const trips = parseFloat(tripsOut);
      if (!isNaN(trips)) {
        properties['Trips Out'] = {
          number: trips
        };
      }
    }

    // Add end of day fuel reading
    if (fuelReading !== undefined && fuelReading !== null && fuelReading !== '') {
      const fuel = parseFloat(fuelReading);
      if (!isNaN(fuel)) {
        properties['End of Day Fuel Reading'] = {
          number: fuel
        };
      }
    }

    // Add issues presented
    if (issues) {
      properties['Issues Presented'] = {
        rich_text: [
          {
            text: {
              content: issues
            }
          }
        ]
      };
    }

    // Process drivers array into individual driver fields
    // Expected format: [{name: "James", status: "Working", hours: 8}, ...]
    if (drivers && Array.isArray(drivers)) {
      drivers.forEach((driver, index) => {
        if (index < 5 && driver.name) { // Only 5 driver slots
          const driverNum = index + 1;
          
          // Set driver name
          properties[`Driver ${driverNum} Name`] = {
            rich_text: [
              {
                text: {
                  content: driver.name
                }
              }
            ]
          };

          // Set driver hours (if provided)
          if (driver.hours !== undefined && driver.hours !== null && driver.hours !== '') {
            const hours = parseFloat(driver.hours);
            if (!isNaN(hours)) {
              properties[`Driver ${driverNum} Hours`] = {
                number: hours
              };
            }
          }
        }
      });
    }

    console.log('Notion properties:', JSON.stringify(properties, null, 2));

    // Create page in Notion
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: properties
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Notion API error:', JSON.stringify(data, null, 2));
      
      // Extract specific error details
      let errorDetails = '';
      if (data.message) {
        errorDetails = data.message;
      }
      
      return res.status(400).json({ 
        success: false, 
        error: 'Database property mismatch',
        details: errorDetails,
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
