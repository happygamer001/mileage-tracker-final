// Driver Management API Endpoint
// Handles: fetching, adding, updating, and removing drivers
// from the Notion Driver Management database.
// Batch managers use this from within the app so driver lists
// stay in sync across all devices without code changes.

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const notionApiKey = process.env.NOTION_API_KEY;
  const driversDatabaseId = process.env.NOTION_DRIVERS_DB_ID;

  if (!notionApiKey) {
    return res.status(500).json({ success: false, error: 'Missing NOTION_API_KEY' });
  }
  if (!driversDatabaseId) {
    return res.status(500).json({ success: false, error: 'Missing NOTION_DRIVERS_DB_ID' });
  }

  // -------------------------------------------------------
  // GET — fetch all drivers sorted by Order
  // -------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const response = await fetch(`https://api.notion.com/v1/databases/${driversDatabaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionApiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          sorts: [{ property: 'Order', direction: 'ascending' }],
          page_size: 100
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Notion API error (get drivers):', data);
        return res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
      }

      const drivers = data.results
        .map(page => ({
          id: page.id,
          name: page.properties['Name']?.title?.[0]?.text?.content || '',
          active: page.properties['Active']?.checkbox || false,
          inBatchReport: page.properties['In Batch Report']?.checkbox || false,
          role: page.properties['Role']?.select?.name || 'Driver',
          order: page.properties['Order']?.number || 99
        }))
        .filter(d => d.name); // filter out any blank-name rows

      return res.status(200).json({ success: true, drivers });
    } catch (error) {
      console.error('Error fetching drivers:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // -------------------------------------------------------
  // POST — add / update / remove a driver
  // -------------------------------------------------------
  if (req.method === 'POST') {
    const { action, driverId, name, active, inBatchReport, role, order } = req.body;

    // ADD DRIVER — creates a new page in the Driver Management database
    if (action === 'add-driver') {
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Driver name is required' });
      }

      try {
        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({
            parent: { database_id: driversDatabaseId },
            properties: {
              'Name': { title: [{ text: { content: name.trim() } }] },
              'Active': { checkbox: active !== false },
              'In Batch Report': { checkbox: inBatchReport !== false },
              'Role': { select: { name: role || 'Driver' } },
              'Order': { number: order || 50 }
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          console.error('Notion API error (add driver):', data);
          return res.status(500).json({ success: false, error: 'Failed to add driver', details: data.message });
        }

        return res.status(200).json({
          success: true,
          driver: {
            id: data.id,
            name: name.trim(),
            active: active !== false,
            inBatchReport: inBatchReport !== false,
            role: role || 'Driver',
            order: order || 50
          }
        });
      } catch (error) {
        console.error('Error adding driver:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
    }

    // UPDATE DRIVER — toggles Active, In Batch Report, or renames
    if (action === 'update-driver') {
      if (!driverId) {
        return res.status(400).json({ success: false, error: 'driverId is required' });
      }

      const properties = {};
      if (active !== undefined)          properties['Active'] = { checkbox: active };
      if (inBatchReport !== undefined)   properties['In Batch Report'] = { checkbox: inBatchReport };
      if (name !== undefined)            properties['Name'] = { title: [{ text: { content: name.trim() } }] };
      if (role !== undefined)            properties['Role'] = { select: { name: role } };
      if (order !== undefined)           properties['Order'] = { number: order };

      try {
        const response = await fetch(`https://api.notion.com/v1/pages/${driverId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({ properties })
        });

        if (!response.ok) {
          const data = await response.json();
          console.error('Notion API error (update driver):', data);
          return res.status(500).json({ success: false, error: 'Failed to update driver', details: data.message });
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating driver:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
    }

    // REMOVE DRIVER — archives the Notion page (soft delete, recoverable)
    if (action === 'remove-driver') {
      if (!driverId) {
        return res.status(400).json({ success: false, error: 'driverId is required' });
      }

      try {
        const response = await fetch(`https://api.notion.com/v1/pages/${driverId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify({ archived: true })
        });

        if (!response.ok) {
          const data = await response.json();
          console.error('Notion API error (remove driver):', data);
          return res.status(500).json({ success: false, error: 'Failed to remove driver', details: data.message });
        }

        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error removing driver:', error);
        return res.status(500).json({ success: false, error: error.message });
      }
    }

    return res.status(400).json({ success: false, error: 'Invalid action. Use add-driver, update-driver, or remove-driver.' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
