import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Truck and Driver data
const TRUCKS = [
  'Green Semi',
  'Dump Truck (2525)',
  '2500',
  '2502',
  '2503',
  '2504',
  '2507'
];

const DRIVERS = [
  'Basil',
  'Calvin',
  'Matt',
  'James',
  'Nic',
  'Jerron',
  'Other'
];

const BATCH_MANAGERS = [
  'Batch Manager',
  'Supervisor'
];

const STATES = ['Nebraska', 'Kansas'];

function App() {
  // Helper functions for Central Time (America/Chicago)
  const getCentralDateString = () => {
    const centralDate = new Date().toLocaleString('en-US', { 
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    // Convert from MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = centralDate.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };
  
  const getCentralISOString = () => {
    // Get current time in Central timezone
    const centralDateStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
    const centralDate = new Date(centralDateStr);
    return centralDate.toISOString();
  };
  
  const formatCentralTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
      timeZone: 'America/Chicago',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Authentication state
  const [currentDriver, setCurrentDriver] = useState('');
  const [customDriverName, setCustomDriverName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isBatchManager, setIsBatchManager] = useState(false);
  
  // Selection state
  const [selectedTruck, setSelectedTruck] = useState('');
  const [trackingMode, setTrackingMode] = useState(null); // 'mileage', 'fuel', or 'daily-report'
  
  // Animation state
  const [animationClass, setAnimationClass] = useState('');
  
  // Mileage form state
  const [mileageData, setMileageData] = useState(() => ({
    date: (() => {
      const centralDate = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const [month, day, year] = centralDate.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    })(),
    state: 'Nebraska',
    mileageStart: '',
    mileageEnd: ''
  }));
  
  // Incomplete entry state
  const [incompleteEntry, setIncompleteEntry] = useState(null);
  const [checkingIncomplete, setCheckingIncomplete] = useState(false);
  
  // Cross state line state
  const [showCrossStateModal, setShowCrossStateModal] = useState(false);
  const [crossStateMileage, setCrossStateMileage] = useState('');
  const [newState, setNewState] = useState('Kansas');
  
  // GPS detection state
  const [gpsPermission, setGpsPermission] = useState(null); // null, 'granted', 'denied'
  const [detectedStateCrossing, setDetectedStateCrossing] = useState(false);
  const [checkingLocation, setCheckingLocation] = useState(false);
  
  // Fuel form state
  const [fuelData, setFuelData] = useState(() => ({
    date: (() => {
      const centralDate = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const [month, day, year] = centralDate.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    })(),
    state: 'Nebraska',
    gallons: '',
    cost: '',
    location: '',
    fuelPhoto: null
  }));
  
  // Daily Report form state
  const [dailyReportData, setDailyReportData] = useState(() => ({
    name: '',
    date: (() => {
      const centralDate = new Date().toLocaleString('en-US', { 
        timeZone: 'America/Chicago',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const [month, day, year] = centralDate.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    })(),
    yardsOut: '',
    tripsOut: '',
    fuelReading: '',
    issues: ''
  }));

  // Driver work status - initialized with known drivers + 2 blanks
  const [driverStatus, setDriverStatus] = useState({
    'James': { halfDay: false, fullDay: false, absent: false },
    'Matt': { halfDay: false, fullDay: false, absent: false },
    'Calvin': { halfDay: false, fullDay: false, absent: false },
    'Jerron': { halfDay: false, fullDay: false, absent: false },
    'Nic': { halfDay: false, fullDay: false, absent: false },
    'Custom1': { name: '', halfDay: false, fullDay: false, absent: false },
    'Custom2': { name: '', halfDay: false, fullDay: false, absent: false }
  });
  
  // Feedback state
  const [submitStatus, setSubmitStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // Loading indicator
  
  // Completion screen state
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  
  // Toggle dark mode function
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newValue = !prev;
      localStorage.setItem('darkMode', newValue);
      return newValue;
    });
  };
  
  // Online/offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Mileage alert state
  const [mileageAlert, setMileageAlert] = useState(null);
  
  // Week at a glance data
  const [weekData, setWeekData] = useState(null);
  const [loadingWeekData, setLoadingWeekData] = useState(false);
  
  // Fleet status data
  const [fleetStatus, setFleetStatus] = useState(null);
  const [loadingFleetStatus, setLoadingFleetStatus] = useState(false);
  
  // Edit entries state
  const [recentEntries, setRecentEntries] = useState(null);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideData, setOverrideData] = useState({
    supervisorName: '',
    reason: '',
    changes: {}
  });
  
  // Capacity planning state
  const [capacityData, setCapacityData] = useState(null);
  const [loadingCapacityData, setLoadingCapacityData] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState('q1-2026');
  const [showCapacityTable, setShowCapacityTable] = useState(false);
  
  // Pre-trip checklist state
  const [showPreTripChecklist, setShowPreTripChecklist] = useState(false);
  const [preTripChecklist, setPreTripChecklist] = useState({
    tires: false,
    oilLevel: false,
    beltsHoses: false,
    mirrors: false,
    windshieldWipers: false,
    lights: false,
    headlights: false,
    brakeLights: false,
    turnSignals: false,
    hazardLights: false,
    safetyEquipment: false,
    // Trailer items (conditional)
    hasTrailer: false,
    coupler: false,
    safetyChains: false,
    // Issues tracking
    issues: ''
  });
  
  // Job site timing state
  const [jobSiteArrivalTime, setJobSiteArrivalTime] = useState(null);
  const [jobSiteDepartureTime, setJobSiteDepartureTime] = useState(null);
  const [showJobSiteButtons, setShowJobSiteButtons] = useState(false);

  // Check for incomplete mileage entry - wrapped in useCallback
  const checkForIncompleteEntry = useCallback(async () => {
    setCheckingIncomplete(true);
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    try {
      const response = await fetch(
        `https://mileage-tracker-final.vercel.app/api/driver?action=check-incomplete&driver=${encodeURIComponent(driverName)}&truck=${encodeURIComponent(selectedTruck)}`
      );
      
      const data = await response.json();
      console.log('Check incomplete response:', data); // Debug log
      
      if (data.hasIncomplete) {
        setIncompleteEntry({
          id: data.pageId,
          date: data.date,
          state: data.currentState,
          mileageStart: data.startMileage
        });
        // Pre-fill the form with the incomplete entry data
        setMileageData({
          date: data.date,
          state: data.currentState,
          mileageStart: data.startMileage.toString(),
          mileageEnd: ''
        });
      } else {
        setIncompleteEntry(null);
      }
    } catch (error) {
      console.error('Error checking for incomplete entry:', error);
    } finally {
      setCheckingIncomplete(false);
    }
  }, [currentDriver, customDriverName, selectedTruck]);

  // Smart mileage validation
  const validateMileage = (start, end, type = 'trip') => {
    const startNum = parseFloat(start);
    const endNum = parseFloat(end);
    const diff = endNum - startNum;
    
    if (isNaN(startNum) || isNaN(endNum)) return null;
    
    // Negative mileage
    if (diff < 0) {
      return {
        type: 'error',
        message: '⚠️ Ending mileage is less than starting mileage. Please check your numbers.'
      };
    }
    
    // Single trip > 300 miles (unusual for local concrete delivery)
    if (type === 'trip' && diff > 300) {
      return {
        type: 'warning',
        message: `⚠️ This trip shows ${diff.toFixed(1)} miles. That's unusually high for a single shift. Double-check your numbers?`
      };
    }
    
    // Mileage jump > 1000 (possible truck swap or typo)
    if (diff > 1000) {
      return {
        type: 'warning',
        message: `⚠️ Odometer jumped ${diff.toFixed(1)} miles. Did you switch trucks or is this a typo?`
      };
    }
    
    return null;
  };

  // Determine state from GPS coordinates
  const getStateFromCoordinates = (latitude, longitude) => {
    // Nebraska/Kansas border is approximately at 40°N latitude
    // Nebraska is north of the border, Kansas is south
    
    // Rough boundaries:
    // Nebraska: 40°N to 43°N, -104°W to -95.3°W
    // Kansas: 37°N to 40°N, -102°W to -94.6°W
    
    if (latitude >= 40.0) {
      return 'Nebraska';
    } else if (latitude < 40.0 && latitude >= 37.0) {
      return 'Kansas';
    }
    
    // Default to Nebraska if coordinates are unclear
    return 'Nebraska';
  };

  // Check GPS location and detect state crossing
  const checkGPSLocation = useCallback(() => {
    if (!incompleteEntry) return;
    
    // Don't check if modal is already open
    if (showCrossStateModal) return;
    
    // Check if GPS is available
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }
    
    setCheckingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const detectedState = getStateFromCoordinates(latitude, longitude);
        
        console.log(`GPS Location: ${latitude}, ${longitude}`);
        console.log(`Detected State: ${detectedState}`);
        console.log(`Shift State: ${incompleteEntry.state}`);
        
        // If detected state is different from shift state, prompt user
        if (detectedState !== incompleteEntry.state) {
          setDetectedStateCrossing(true);
          setNewState(detectedState);
          // Auto-open the cross state modal with detected state
          setTimeout(() => {
            setShowCrossStateModal(true);
          }, 1000); // Small delay to let the page load
        }
        
        setCheckingLocation(false);
        setGpsPermission('granted');
      },
      (error) => {
        console.log('GPS Error:', error.message);
        setCheckingLocation(false);
        
        if (error.code === 1) {
          setGpsPermission('denied');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // Cache location for 1 minute
      }
    );
  }, [incompleteEntry, showCrossStateModal]);

  // Check for incomplete entries when entering mileage mode
  useEffect(() => {
    if (trackingMode === 'mileage' && selectedTruck) {
      checkForIncompleteEntry();
    }
  }, [trackingMode, selectedTruck, checkForIncompleteEntry]);

  // Check GPS location when incomplete entry is found
  useEffect(() => {
    if (incompleteEntry && trackingMode === 'mileage') {
      // Wait a bit for the page to render, then check GPS
      const timer = setTimeout(() => {
        checkGPSLocation();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [incompleteEntry, trackingMode, checkGPSLocation]);
  
  // Dark mode effect
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Fetch week data when entering week-at-a-glance mode
  useEffect(() => {
    if (trackingMode === 'week-at-a-glance') {
      const fetchWeekData = async () => {
        setLoadingWeekData(true);
        try {
          const response = await fetch('https://mileage-tracker-final.vercel.app/api/supervisor-data?view=week-at-a-glance');
          const data = await response.json();
          if (data.success) {
            setWeekData(data);
          }
        } catch (error) {
          console.error('Error fetching week data:', error);
        } finally {
          setLoadingWeekData(false);
        }
      };
      fetchWeekData();
    }
  }, [trackingMode]);
  
  // Fetch fleet status when entering fleet-status mode
  useEffect(() => {
    if (trackingMode === 'fleet-status') {
      const fetchFleetStatus = async () => {
        setLoadingFleetStatus(true);
        try {
          const response = await fetch('https://mileage-tracker-final.vercel.app/api/supervisor-data?view=fleet-status');
          const data = await response.json();
          if (data.success) {
            setFleetStatus(data);
          }
        } catch (error) {
          console.error('Error fetching fleet status:', error);
        } finally {
          setLoadingFleetStatus(false);
        }
      };
      fetchFleetStatus();
    }
  }, [trackingMode]);
  
  // Fetch recent entries when entering edit-entries mode
  useEffect(() => {
    if (trackingMode === 'edit-entries') {
      const fetchRecentEntries = async () => {
        setLoadingEntries(true);
        try {
          // Fetch both mileage and fuel entries (all historical data)
          const [mileageRes, fuelRes] = await Promise.all([
            fetch('https://mileage-tracker-final.vercel.app/api/supervisor-data?view=recent-entries&type=mileage&days=9999'),
            fetch('https://mileage-tracker-final.vercel.app/api/supervisor-data?view=recent-entries&type=fuel&days=9999')
          ]);
          
          const mileageData = await mileageRes.json();
          const fuelData = await fuelRes.json();
          
          if (mileageData.success && fuelData.success) {
            setRecentEntries({
              mileage: mileageData.entries || [],
              fuel: fuelData.entries || []
            });
          }
        } catch (error) {
          console.error('Error fetching recent entries:', error);
        } finally {
          setLoadingEntries(false);
        }
      };
      fetchRecentEntries();
    }
  }, [trackingMode]);
  
  // Fetch capacity data when entering capacity-planning mode
  useEffect(() => {
    if (trackingMode === 'capacity-planning') {
      fetchCapacityData(selectedQuarter);
    }
  }, [trackingMode, selectedQuarter]);
  
  // Load Chart.js library when needed
  useEffect(() => {
    // Check if Chart.js is already loaded
    if (window.Chart) return;
    
    // Load Chart.js from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    script.async = true;
    script.onload = () => {
      console.log('Chart.js loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Chart.js');
    };
    document.head.appendChild(script);
    
    return () => {
      // Cleanup: remove script if component unmounts
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);
  
  // Render Chart.js capacity chart when data loads
  useEffect(() => {
    if (capacityData && trackingMode === 'capacity-planning' && !showCapacityTable) {
      const ctx = document.getElementById('capacityChart');
      if (!ctx) return;
      
      // Wait for Chart.js to be available
      if (!window.Chart) {
        console.log('Waiting for Chart.js to load...');
        return;
      }
      
      // Destroy existing chart if any
      const existingChart = window.capacityChartInstance;
      if (existingChart) {
        existingChart.destroy();
      }
      
      // Prepare chart data
      const labels = capacityData.dailyData.map(day => {
        const date = new Date(day.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });
      
      const loadsData = capacityData.dailyData.map(day => day.loads);
      const capacityData_values = capacityData.dailyData.map(day => day.maxCapacity);
      
      // Create new chart
      const newChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Daily Loads',
              data: loadsData,
              borderColor: '#FF7E26',
              backgroundColor: 'rgba(255, 126, 38, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6
            },
            {
              label: 'Max Capacity',
              data: capacityData_values,
              borderColor: '#e53e3e',
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderDash: [5, 5],
              fill: false,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: darkMode ? '#e2e8f0' : '#2d3748',
                font: { size: 14, weight: '600' },
                padding: 15
              }
            },
            title: {
              display: true,
              text: 'Daily Loads vs Maximum Capacity',
              font: { size: 16, weight: 'bold' },
              color: darkMode ? '#e2e8f0' : '#2d3748'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: darkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: darkMode ? '#4a5568' : '#e2e8f0',
              borderWidth: 1
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Loads',
                color: darkMode ? '#e2e8f0' : '#2d3748'
              },
              grid: {
                color: darkMode ? '#4a5568' : '#e2e8f0'
              },
              ticks: {
                color: darkMode ? '#cbd5e0' : '#4a5568'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date',
                color: darkMode ? '#e2e8f0' : '#2d3748'
              },
              grid: {
                color: darkMode ? '#4a5568' : '#e2e8f0'
              },
              ticks: {
                color: darkMode ? '#cbd5e0' : '#4a5568'
              }
            }
          }
        }
      });
      
      window.capacityChartInstance = newChart;
    }
  }, [capacityData, trackingMode, showCapacityTable, darkMode]);
  
  // Render concrete yardage chart when data loads
  useEffect(() => {
    if (capacityData && trackingMode === 'capacity-planning' && !showCapacityTable) {
      const ctx = document.getElementById('concreteChart');
      if (!ctx) return;
      
      // Wait for Chart.js to be available
      if (!window.Chart) {
        console.log('Waiting for Chart.js to load...');
        return;
      }
      
      // Destroy existing chart if any
      const existingChart = window.concreteChartInstance;
      if (existingChart) {
        existingChart.destroy();
      }
      
      // Prepare chart data
      const labels = capacityData.dailyData.map(day => {
        const date = new Date(day.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      });
      
      const concreteData = capacityData.dailyData.map(day => day.concreteYards || 0);
      
      // Create new chart
      const newChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Concrete Delivered (Yards)',
              data: concreteData,
              borderColor: '#38b2ac',
              backgroundColor: 'rgba(56, 178, 172, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#38b2ac'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: darkMode ? '#e2e8f0' : '#2d3748',
                font: { size: 14, weight: '600' },
                padding: 15
              }
            },
            title: {
              display: true,
              text: 'Daily Concrete Delivered',
              font: { size: 16, weight: 'bold' },
              color: darkMode ? '#e2e8f0' : '#2d3748'
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              backgroundColor: darkMode ? 'rgba(45, 55, 72, 0.95)' : 'rgba(0, 0, 0, 0.8)',
              titleColor: '#fff',
              bodyColor: '#fff',
              borderColor: darkMode ? '#4a5568' : '#e2e8f0',
              borderWidth: 1,
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} yards`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Yards of Concrete',
                color: darkMode ? '#e2e8f0' : '#2d3748'
              },
              grid: {
                color: darkMode ? '#4a5568' : '#e2e8f0'
              },
              ticks: {
                color: darkMode ? '#cbd5e0' : '#4a5568'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Date',
                color: darkMode ? '#e2e8f0' : '#2d3748'
              },
              grid: {
                color: darkMode ? '#4a5568' : '#e2e8f0'
              },
              ticks: {
                color: darkMode ? '#cbd5e0' : '#4a5568'
              }
            }
          }
        }
      });
      
      window.concreteChartInstance = newChart;
    }
  }, [capacityData, trackingMode, showCapacityTable, darkMode]);
  
  // Function to fetch capacity data
  const fetchCapacityData = async (quarter) => {
    setLoadingCapacityData(true);
    try {
      // Define quarter date ranges
      const quarters = {
        'q1-2026': { start: '2026-01-01', end: '2026-03-31' },
        'q2-2026': { start: '2026-04-01', end: '2026-06-30' },
        'q3-2026': { start: '2026-07-01', end: '2026-09-30' },
        'q4-2026': { start: '2026-10-01', end: '2026-12-31' },
        'q1-2025': { start: '2025-01-01', end: '2025-03-31' },
        'q4-2025': { start: '2025-10-01', end: '2025-12-31' }
      };
      
      const dateRange = quarters[quarter];
      
      const response = await fetch(
        `https://mileage-tracker-final.vercel.app/api/supervisor-data?view=capacity&startDate=${dateRange.start}&endDate=${dateRange.end}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setCapacityData(data);
      } else {
        console.error('Failed to fetch capacity data:', data.error);
        setCapacityData(null);
      }
    } catch (error) {
      console.error('Error fetching capacity data:', error);
      setCapacityData(null);
    } finally {
      setLoadingCapacityData(false);
    }
  };

  // Handle login
  const handleLogin = () => {
    const isBatchMgr = BATCH_MANAGERS.includes(currentDriver);
    
    if (currentDriver && (currentDriver !== 'Other' || customDriverName.trim())) {
      setIsLoggedIn(true);
      setIsBatchManager(isBatchMgr);
      
      // Batch managers/supervisors go to supervisor menu (not directly to daily report)
      if (isBatchMgr) {
        setTrackingMode('supervisor-menu');
      }
    } else {
      alert('Please select a driver name');
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentDriver('');
    setCustomDriverName('');
    setSelectedTruck('');
    setTrackingMode(null);
    setIncompleteEntry(null);
  };

  // Handle truck selection
  const handleTruckSelect = (truck) => {
    setAnimationClass('slide-in-right');
    setSelectedTruck(truck);
    setShowPreTripChecklist(true); // Show pre-trip checklist first
  };

  // Handle mode selection
  const handleModeSelect = (mode) => {
    setAnimationClass('slide-in-right');
    setTrackingMode(mode);
    setSubmitStatus(null);
  };
  
  // Handle pre-trip checklist submission
  const submitPreTripChecklist = async () => {
    const today = getCentralDateString();
    setIsLoading(true);
    
    // No validation needed - unchecked = good, checked = issue
    // Drivers only check boxes when there are problems
    
    // Save to Notion
    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/submit-pretrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver: currentDriver,
          truck: selectedTruck,
          date: today,
          checklist: preTripChecklist
        }),
      });
      
      if (response.ok) {
        // Checklist complete, proceed to mode selection
        setShowPreTripChecklist(false);
        // Reset checklist for next time
        setPreTripChecklist({
          tires: false,
          oilLevel: false,
          beltsHoses: false,
          mirrors: false,
          windshieldWipers: false,
          lights: false,
          headlights: false,
          brakeLights: false,
          turnSignals: false,
          hazardLights: false,
          safetyEquipment: false,
          hasTrailer: false,
          coupler: false,
          safetyChains: false,
          issues: ''
        });
      } else {
        throw new Error('Failed to submit checklist');
      }
    } catch (error) {
      console.error('Error submitting pre-trip checklist:', error);
      alert('Failed to submit checklist. Please try again.');
      setIsLoading(false);
    }
    setIsLoading(false);
  };
  
  // Handle "All Good - No Issues" bypass
  const handleAllGood = async () => {
    const today = getCentralDateString();
    setIsLoading(true);
    
    // All boxes UNCHECKED = everything is good (matches paper form)
    const allGood = {
      tires: false,
      oilLevel: false,
      beltsHoses: false,
      mirrors: false,
      windshieldWipers: false,
      lights: false,
      headlights: false,
      brakeLights: false,
      turnSignals: false,
      hazardLights: false,
      safetyEquipment: false,
      hasTrailer: preTripChecklist.hasTrailer,
      coupler: false,
      safetyChains: false,
      issues: 'No issues - all good'
    };
    
    // Save to Notion
    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/submit-pretrip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driver: currentDriver,
          truck: selectedTruck,
          date: today,
          checklist: allGood
        }),
      });
      
      if (response.ok) {
        // Checklist bypassed, proceed to mode selection
        setShowPreTripChecklist(false);
        // Reset checklist
        setPreTripChecklist({
          tires: false,
          oilLevel: false,
          beltsHoses: false,
          mirrors: false,
          windshieldWipers: false,
          lights: false,
          headlights: false,
          brakeLights: false,
          turnSignals: false,
          hazardLights: false,
          safetyEquipment: false,
          hasTrailer: false,
          coupler: false,
          safetyChains: false,
          issues: ''
        });
      } else {
        throw new Error('Failed to submit checklist');
      }
    } catch (error) {
      console.error('Error submitting pre-trip checklist:', error);
      alert('Failed to submit. Please try again.');
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  // Handle back button
  const handleBack = () => {
    setAnimationClass('slide-in-left');
    if (trackingMode) {
      // If batch manager, logout instead of going back to truck selection
      if (isBatchManager) {
        handleLogout();
        return;
      }
      
      setTrackingMode(null);
      setIncompleteEntry(null);
      setMileageAlert(null); // Clear any mileage alerts
      // Reset forms
      setMileageData({
        date: getCentralDateString(),
        state: 'Nebraska',
        mileageStart: '',
        mileageEnd: ''
      });
      setFuelData({
        date: getCentralDateString(),
        state: 'Nebraska',
        gallons: '',
        cost: '',
        location: ''
      });
    } else if (selectedTruck) {
      setSelectedTruck('');
    }
  };

  // Handle crossing state line
  const handleCrossStateLine = async (e) => {
    e.preventDefault();
    
    if (!crossStateMileage || parseFloat(crossStateMileage) <= 0) {
      setSubmitStatus({ type: 'error', message: 'Please enter a valid mileage reading' });
      return;
    }
    
    if (parseFloat(crossStateMileage) <= parseFloat(incompleteEntry.mileageStart)) {
      setSubmitStatus({ type: 'error', message: 'Current mileage must be greater than starting mileage' });
      return;
    }
    
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    try {
      // Step 1: Complete the current shift in the current state
      const completeResponse = await fetch('https://mileage-tracker-final.vercel.app/api/driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete-mileage',
          pageId: incompleteEntry.id,
          endMileage: parseFloat(crossStateMileage),
          endState: incompleteEntry.state || mileageData.state,
          endTime: getCentralISOString()
        }),
      });
      
      if (!completeResponse.ok) {
        throw new Error('Failed to complete current shift');
      }
      
      // Step 2: Start a new shift in the new state
      const startResponse = await fetch('https://mileage-tracker-final.vercel.app/api/driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start-mileage',
          driverName: driverName,
          truckNumber: selectedTruck,
          date: mileageData.date,
          currentState: newState,
          startMileage: parseFloat(crossStateMileage),
          startTime: getCentralISOString()
        }),
      });
      
      if (!startResponse.ok) {
        throw new Error('Failed to start new shift in new state');
      }
      
      // Success! Close modal and refresh incomplete entry
      setShowCrossStateModal(false);
      setCrossStateMileage('');
      setDetectedStateCrossing(false);
      setSubmitStatus({ 
        type: 'success', 
        message: `✅ Crossed into ${newState}! Continue driving and complete shift when done.` 
      });
      
      // Refresh to get the new incomplete entry
      setTimeout(() => {
        checkForIncompleteEntry();
      }, 1000);
      
    } catch (error) {
      console.error('Error crossing state line:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to process state line crossing. Please try again.' });
    }
  };

  // Submit mileage data to Notion
  // Handle arriving on job site
  const handleArrivedOnJobSite = () => {
    const arrivalTime = getCentralISOString();
    setJobSiteArrivalTime(arrivalTime);
    setSubmitStatus({ 
      type: 'success', 
      message: `⏱️ Job site timer started at ${formatCentralTime(arrivalTime)}` 
    });
  };
  
  // Handle leaving job site
  const handleLeavingJobSite = () => {
    const departureTime = getCentralISOString();
    setJobSiteDepartureTime(departureTime);
    
    // Calculate job site duration
    if (jobSiteArrivalTime) {
      const arrival = new Date(jobSiteArrivalTime);
      const departure = new Date(departureTime);
      const durationMs = departure - arrival;
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setSubmitStatus({ 
        type: 'success', 
        message: `✅ Job site time: ${hours}h ${minutes}m` 
      });
    }
  };

  const submitMileageData = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    
    // ALWAYS check for incomplete entry before starting a new shift
    // This is critical for historical data entry
    if (!incompleteEntry) {
      try {
        const checkResponse = await fetch(
          `https://mileage-tracker-final.vercel.app/api/driver?action=check-incomplete&driver=${encodeURIComponent(driverName)}&truck=${encodeURIComponent(selectedTruck)}`
        );
        const checkData = await checkResponse.json();
        
        if (checkData.hasIncomplete) {
          // Found an incomplete entry - block new entry creation
          setIncompleteEntry({
            id: checkData.pageId,
            date: checkData.date,
            state: checkData.currentState,
            mileageStart: checkData.startMileage
          });
          
          // Pre-fill the form
          setMileageData({
            date: checkData.date,
            state: checkData.currentState,
            mileageStart: checkData.startMileage.toString(),
            mileageEnd: ''
          });
          
          setSubmitStatus({ 
            type: 'error', 
            message: `⚠️ You have an active shift from ${checkData.date}. Please complete it before starting a new one.` 
          });
          setIsLoading(false);
          return; // Stop here - don't create new entry
        }
      } catch (error) {
        console.error('Error checking for incomplete entry:', error);
        // Continue with new entry creation if check fails
      }
    }
    
    // If completing an existing entry
    if (incompleteEntry) {
      const totalMiles = parseFloat(mileageData.mileageEnd) - parseFloat(mileageData.mileageStart);
      
      if (totalMiles < 0) {
        alert('Ending mileage must be greater than starting mileage');
        return;
      }
      
      // Calculate total delivery time
      const startTime = new Date(incompleteEntry.timestamp);
      const endTime = new Date();
      const totalDeliveryTimeMs = endTime - startTime;
      const totalDeliveryHours = (totalDeliveryTimeMs / (1000 * 60 * 60)).toFixed(2);
      
      // Calculate total job site time (if applicable)
      let totalJobSiteHours = 0;
      if (jobSiteArrivalTime && jobSiteDepartureTime) {
        const arrivalTime = new Date(jobSiteArrivalTime);
        const departureTime = new Date(jobSiteDepartureTime);
        const jobSiteTimeMs = departureTime - arrivalTime;
        totalJobSiteHours = (jobSiteTimeMs / (1000 * 60 * 60)).toFixed(2);
      }

      try {
        // Update the existing Notion entry
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/driver', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'complete-mileage',
            pageId: incompleteEntry.id,
            endMileage: parseFloat(mileageData.mileageEnd),
            endState: mileageData.state,
            endTime: getCentralISOString(),
            jobSiteArrivalTime: jobSiteArrivalTime,
            jobSiteDepartureTime: jobSiteDepartureTime,
            totalDeliveryTime: parseFloat(totalDeliveryHours),
            totalJobSiteTime: parseFloat(totalJobSiteHours)
          }),
        });

        if (response.ok) {
          // Fetch all completed trips for this driver/truck/date to show full journey
          try {
            const tripsResponse = await fetch(
              `https://mileage-tracker-final.vercel.app/api/driver?action=get-daily-trips&driver=${encodeURIComponent(driverName)}&truck=${encodeURIComponent(selectedTruck)}&date=${mileageData.date}`
            );
            
            const tripsData = await tripsResponse.json();
            
            // Store completion data with all trips
            setCompletionData({
              driver: driverName,
              truck: selectedTruck,
              date: mileageData.date,
              trips: tripsData.trips || [],
              totalMiles: tripsData.totalMiles || totalMiles
            });
          } catch (fetchError) {
            console.error('Error fetching trips:', fetchError);
            // Fallback to single trip data
            setCompletionData({
              driver: driverName,
              truck: selectedTruck,
              date: mileageData.date,
              trips: [{
                state: mileageData.state,
                mileageStart: parseFloat(mileageData.mileageStart),
                mileageEnd: parseFloat(mileageData.mileageEnd),
                totalMiles: totalMiles,
                timestamp: getCentralISOString()
              }],
              totalMiles: totalMiles
            });
          }
          
          // Show completion screen
          setShowCompletionScreen(true);
          setIncompleteEntry(null);
          setMileageAlert(null); // Clear any alerts
          setShowJobSiteButtons(false); // Reset job site buttons
          setJobSiteArrivalTime(null); // Reset arrival time
          setJobSiteDepartureTime(null); // Reset departure time
          
          // Reset form
          setMileageData({
            date: getCentralDateString(),
            state: 'Nebraska',
            mileageStart: '',
            mileageEnd: ''
          });
        } else {
          throw new Error('Failed to submit data');
        }
      } catch (error) {
        console.error('Error completing mileage:', error);
        setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
        setIsLoading(false);
      }
    } else {
      // Starting a new entry
      const payload = {
        action: 'start-mileage',
        driverName: driverName,
        truckNumber: selectedTruck,
        date: mileageData.date,
        currentState: mileageData.state,
        startMileage: parseFloat(mileageData.mileageStart),
        startTime: getCentralISOString()
      };

      console.log('Starting mileage with payload:', payload);

      try {
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/driver', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        console.log('Start mileage response:', response.status, responseData);

        if (response.ok) {
          setSubmitStatus({ type: 'success', message: '✅ Shift started! Come back later to enter your ending mileage.' });
          setMileageAlert(null); // Clear any alerts
          setShowJobSiteButtons(true); // Enable job site timing buttons
          // Reset form
          setMileageData({
            date: getCentralDateString(),
            state: 'Nebraska',
            mileageStart: '',
            mileageEnd: ''
          });
        } else {
          const errorMsg = responseData.error || responseData.message || 'Failed to submit data';
          const errorDetails = responseData.details ? `\n${responseData.details}` : '';
          setSubmitStatus({ type: 'error', message: `❌ ${errorMsg}${errorDetails}` });
          console.error('Server error:', responseData);
        }
      } catch (error) {
        console.error('Error starting mileage:', error);
        setSubmitStatus({ type: 'error', message: '❌ Network error. Please check your connection and try again.' });
        setIsLoading(false);
      }
    }
    setIsLoading(false);
  };

  // Submit fuel data to Notion
  const submitFuelData = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const driverName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const isSemi = selectedTruck === 'Semi';
    
    const payload = {
      action: 'submit-fuel',
      driverName: driverName,
      truckNumber: selectedTruck,
      date: fuelData.date,
      gallons: parseFloat(fuelData.gallons),
      location: isSemi ? (fuelData.location || 'N/A') : null
    };

    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/driver', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        // Reset fuel form
        setFuelData({
          date: getCentralDateString(),
          state: 'Nebraska',
          gallons: '',
          cost: '',
          location: '',
          fuelPhoto: null
        });
        
        // Seamlessly redirect to mileage form with animation
        setAnimationClass('slide-in-right');
        setTrackingMode('mileage');
      } else {
        throw new Error('Failed to submit data');
      }
    } catch (error) {
      console.error('Error submitting fuel:', error);
      setSubmitStatus({ type: 'error', message: 'Failed to submit data. Please try again.' });
      setIsLoading(false);
    }
    setIsLoading(false);
  };

  // Helper functions for Daily Report
  const handleDriverCheckbox = (driver, type) => {
    setDriverStatus({
      ...driverStatus,
      [driver]: {
        halfDay: type === 'halfDay' ? !driverStatus[driver].halfDay : false,
        fullDay: type === 'fullDay' ? !driverStatus[driver].fullDay : false
      }
    });
  };

  const handleCustomDriverName = (key, name) => {
    setDriverStatus({
      ...driverStatus,
      [key]: {
        ...driverStatus[key],
        name: name
      }
    });
  };

  const handleFuelPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFuelData({...fuelData, fuelPhoto: reader.result});
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit daily report to Notion
  const submitDailyReport = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const submitterName = isBatchManager ? currentDriver : customDriverName;
    
    // Validate submitter name
    if (!submitterName || submitterName.trim() === '') {
      setSubmitStatus({ type: 'error', message: '❌ Error: Batch manager name is missing. Please log in again.' });
      setIsLoading(false);
      return;
    }
    
    // Validate date
    if (!dailyReportData.date) {
      setSubmitStatus({ type: 'error', message: '❌ Error: Please select a date.' });
      setIsLoading(false);
      return;
    }
    
    // Build drivers array from driver status
    const drivers = [];
    Object.keys(driverStatus).forEach(key => {
      const status = driverStatus[key];
      const driverName = key.startsWith('Custom') ? status.name : key;
      
      if (driverName && (status.halfDay || status.fullDay)) {
        // Calculate hours: half day = 4 hours, full day = 8 hours
        let hours = 0;
        if (status.fullDay) hours = 8;
        else if (status.halfDay) hours = 4;
        
        drivers.push({
          name: driverName,
          status: status.fullDay ? 'Working (Full Day)' : 'Working (Half Day)',
          hours: hours
        });
      }
    });
    
    const payload = {
      name: submitterName,  // Use logged-in batch manager name
      date: dailyReportData.date,
      yardsOut: dailyReportData.yardsOut ? parseFloat(dailyReportData.yardsOut) : 0,
      tripsOut: dailyReportData.tripsOut ? parseFloat(dailyReportData.tripsOut) : 0,
      drivers: drivers,
      fuelReading: dailyReportData.fuelReading ? parseFloat(dailyReportData.fuelReading) : 0,
      issues: dailyReportData.issues || 'N/A',
      preparedBy: submitterName,
      timestamp: getCentralISOString()
    };

    console.log('Submitting daily report:', payload); // Debug log

    try {
      const response = await fetch('https://mileage-tracker-final.vercel.app/api/daily-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('Response:', response.status, responseData); // Debug log

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: '✅ Daily report submitted successfully!' });
        
        // Reset form
        setDailyReportData({
          name: '',
          date: getCentralDateString(),
          yardsOut: '',
          tripsOut: '',
          fuelReading: '',
          issues: ''
        });
        
        // Reset driver statuses
        setDriverStatus({
          'James': { halfDay: false, fullDay: false },
          'Matt': { halfDay: false, fullDay: false },
          'Calvin': { halfDay: false, fullDay: false },
          'Jerron': { halfDay: false, fullDay: false },
          'Nic': { halfDay: false, fullDay: false },
          'Custom1': { name: '', halfDay: false, fullDay: false },
          'Custom2': { name: '', halfDay: false, fullDay: false }
        });
      } else {
        // Show detailed error from backend
        const errorMessage = responseData.error || responseData.message || 'Failed to submit data';
        const errorDetails = responseData.details ? `\n${responseData.details}` : '';
        const errorHint = responseData.hint ? `\n${responseData.hint}` : '';
        setSubmitStatus({ type: 'error', message: `❌ ${errorMessage}${errorDetails}${errorHint}` });
      }
    } catch (error) {
      console.error('Error submitting daily report:', error);
      setSubmitStatus({ type: 'error', message: '❌ Network error. Please check your connection and try again.' });
    }
    setIsLoading(false);
  };

  // Render login screen
  if (!isLoggedIn) {
    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        )}
        <div className="container">
          <div className="login-screen">
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="dark-mode-toggle login-dark-toggle"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            <img src="/mccook-logo.png" alt="McCook Concrete Inc." className="company-logo" />
            <h2>Mileage & Fuel Tracker</h2>
            
            <div className="login-form">
              <label htmlFor="driver-select">Select Your Name:</label>
              <select
                id="driver-select"
                value={currentDriver}
                onChange={(e) => setCurrentDriver(e.target.value)}
                required
              >
                <option value="">-- Select Your Name --</option>
                
                <optgroup label="Batch Managers">
                  {BATCH_MANAGERS.map(manager => (
                    <option key={manager} value={manager}>{manager}</option>
                  ))}
                </optgroup>
                
                <optgroup label="Drivers">
                  {DRIVERS.map(driver => (
                    <option key={driver} value={driver}>{driver}</option>
                  ))}
                </optgroup>
              </select>

              {currentDriver === 'Other' && (
                <div className="custom-driver-input">
                  <label htmlFor="custom-driver">Enter Your Name:</label>
                  <input
                    id="custom-driver"
                    type="text"
                    value={customDriverName}
                    onChange={(e) => setCustomDriverName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-input"
                  />
                </div>
              )}

              <button onClick={handleLogin} className="btn btn-primary">
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Render Supervisor Menu (for batch managers/supervisors only)
  if (trackingMode === 'supervisor-menu') {
    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <h1>📊 Supervisor Dashboard</h1>
            <p className="user-info">Welcome, {currentDriver}</p>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
          
          <div className="supervisor-menu">
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('daily-report');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">📋</div>
              <div className="option-title">Daily Job Report</div>
              <div className="option-description">Submit today's batch and driver info</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('week-at-a-glance');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">📊</div>
              <div className="option-title">Week at a Glance</div>
              <div className="option-description">View all drivers' weekly activity</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('fleet-status');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">🚛</div>
              <div className="option-title">Real-Time Operations</div>
              <div className="option-description">Live fleet status and truck locations</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('edit-entries');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">✏️</div>
              <div className="option-title">Edit Entries</div>
              <div className="option-description">View and correct driver submissions</div>
            </button>
            
            <button
              onClick={() => {
                setAnimationClass('slide-in-right');
                setTrackingMode('capacity-planning');
              }}
              className="supervisor-option-card"
            >
              <div className="option-icon">📈</div>
              <div className="option-title">Capacity Planning</div>
              <div className="option-description">MCI at a Glance</div>
            </button>
          </div>
          
          <div className="dark-mode-toggle">
            <label>
              <input 
                type="checkbox" 
                checked={darkMode} 
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              🌙 Dark Mode
            </label>
          </div>
          
          {!isOnline && (
            <div className="offline-banner">
              📵 Offline - You can still use the app. Changes will sync when back online.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Week at a Glance View (Supervisor only)
  if (trackingMode === 'week-at-a-glance') {
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setAnimationClass('slide-in-left');
              setTrackingMode('supervisor-menu');
            }} className="btn btn-back">
              ← Back
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="week-container">
            <div className="week-header">
              <h2>📊 Week at a Glance</h2>
              {weekData && (
                <p className="week-date-range">
                  {new Date(weekData.startDate).toLocaleDateString()} - {new Date(weekData.endDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {loadingWeekData && (
              <div className="info-message">
                <span className="loading-spinner"></span>
                Loading week data...
              </div>
            )}

            {!loadingWeekData && weekData && weekData.data && weekData.data.length === 0 && (
              <div className="info-message">
                No activity this week yet.
              </div>
            )}

            {!loadingWeekData && weekData && weekData.data && weekData.data.map((driverData, index) => (
              <div key={index} className="driver-card">
                <div className="driver-header">
                  <div className="driver-name">{driverData.driver}</div>
                  <div className="driver-truck">🚛 {driverData.truck}</div>
                </div>

                <div className="week-stats">
                  <div className="stat-box">
                    <div className="stat-label">Total Miles</div>
                    <div className="stat-value highlight">{driverData.totalMiles.toFixed(1)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Fuel Spent</div>
                    <div className="stat-value">${driverData.totalFuelCost.toFixed(2)}</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Nebraska</div>
                    <div className="stat-value">{driverData.nebraskaMiles.toFixed(1)} mi</div>
                  </div>
                  <div className="stat-box">
                    <div className="stat-label">Kansas</div>
                    <div className="stat-value">{driverData.kansasMiles.toFixed(1)} mi</div>
                  </div>
                </div>

                <div className="daily-breakdown">
                  {Object.entries(driverData.days).map(([date, dayData]) => (
                    <div key={date} className="daily-row">
                      <div className="day-label">
                        {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })}
                      </div>
                      <div className="daily-value">
                        {dayData.miles > 0 ? `${dayData.miles.toFixed(1)} mi` : '---'}
                      </div>
                      <div className="daily-value">
                        {dayData.fuelCost > 0 ? `$${dayData.fuelCost.toFixed(2)}` : '---'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Real-Time Operations Board (formerly Fleet Status)
  if (trackingMode === 'fleet-status') {
    const handleRefreshFleet = async () => {
      setLoadingFleetStatus(true);
      try {
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/supervisor-data?view=fleet-status');
        const data = await response.json();
        if (data.success) {
          setFleetStatus(data);
        }
      } catch (error) {
        console.error('Error fetching fleet status:', error);
      } finally {
        setLoadingFleetStatus(false);
      }
    };

    const getStatusIcon = (status) => {
      switch(status) {
        case 'en-route': return '🟢';
        case 'at-job-site': return '🔵';
        case 'available': return '⚪';
        case 'idle': return '⚫';
        default: return '❓';
      }
    };

    const getStatusLabel = (status) => {
      switch(status) {
        case 'en-route': return 'EN ROUTE TO JOB SITE';
        case 'at-job-site': return 'AT JOB SITE';
        case 'available': return 'AVAILABLE (Back at Plant)';
        case 'idle': return 'IDLE - No Activity Today';
        default: return 'UNKNOWN';
      }
    };

    const getStatusColor = (status) => {
      switch(status) {
        case 'en-route': return '#48bb78';
        case 'at-job-site': return '#4299e1';
        case 'available': return '#cbd5e0';
        case 'idle': return '#718096';
        default: return '#a0aec0';
      }
    };

    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setAnimationClass('slide-in-left');
              setTrackingMode('supervisor-menu');
            }} className="btn btn-back">
              ← Back
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="operations-container">
            <div className="operations-header">
              <h2>📍 Real-Time Operations</h2>
              {fleetStatus && (
                <p className="operations-date">
                  {new Date(fleetStatus.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>

            {loadingFleetStatus && (
              <div className="info-message">
                <span className="loading-spinner"></span>
                Loading operations data...
              </div>
            )}

            {!loadingFleetStatus && fleetStatus && fleetStatus.grouped && (
              <>
                {/* Summary Stats */}
                <div className="operations-summary">
                  <div className="summary-stat">
                    <span className="summary-label">Active Now</span>
                    <span className="summary-value">{fleetStatus.summary.activeNow}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-label">Completed Today</span>
                    <span className="summary-value">{fleetStatus.summary.completedToday}</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-label">Fleet Utilization</span>
                    <span className="summary-value">{fleetStatus.summary.utilization}%</span>
                  </div>
                  <div className="summary-stat">
                    <span className="summary-label">Total Trucks</span>
                    <span className="summary-value">{fleetStatus.summary.totalTrucks}</span>
                  </div>
                </div>

                {/* En Route Section */}
                {fleetStatus.grouped.enRoute.length > 0 && (
                  <div className="operations-section">
                    <h3 className="section-header">
                      🟢 EN ROUTE ({fleetStatus.grouped.enRoute.length})
                    </h3>
                    {fleetStatus.grouped.enRoute.map((truck, idx) => (
                      <div key={idx} className="operations-card en-route">
                        <div className="operations-card-header">
                          <div>
                            <span className="truck-number">🚛 Truck {truck.truck}</span>
                            <span className="driver-name"> - {truck.driver}</span>
                          </div>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(truck.operationalStatus) }}>
                            {getStatusIcon(truck.operationalStatus)} {getStatusLabel(truck.operationalStatus)}
                          </span>
                        </div>
                        <div className="operations-details">
                          <div className="detail-row">
                            <span className="detail-label">⏱️ Out for:</span>
                            <span className="detail-value">{truck.elapsedTime} (since {new Date(truck.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📍 Start:</span>
                            <span className="detail-value">{truck.startMileage.toLocaleString()} mi | {truck.currentState}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">🕐 Expected back:</span>
                            <span className="detail-value">~{truck.expectedReturn}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* At Job Site Section */}
                {fleetStatus.grouped.atJobSite.length > 0 && (
                  <div className="operations-section">
                    <h3 className="section-header">
                      🔵 AT JOB SITE ({fleetStatus.grouped.atJobSite.length})
                    </h3>
                    {fleetStatus.grouped.atJobSite.map((truck, idx) => (
                      <div key={idx} className="operations-card at-job-site">
                        <div className="operations-card-header">
                          <div>
                            <span className="truck-number">🚛 Truck {truck.truck}</span>
                            <span className="driver-name"> - {truck.driver}</span>
                          </div>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(truck.operationalStatus) }}>
                            {getStatusIcon(truck.operationalStatus)} {getStatusLabel(truck.operationalStatus)}
                          </span>
                        </div>
                        <div className="operations-details">
                          <div className="detail-row">
                            <span className="detail-label">🏗️ On site:</span>
                            <span className="detail-value">{truck.jobSiteTime} (arrived {new Date(truck.jobSiteArrival).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">⏱️ Total trip:</span>
                            <span className="detail-value">{truck.elapsedTime} (since {new Date(truck.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })})</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📍 Start:</span>
                            <span className="detail-value">{truck.startMileage.toLocaleString()} mi | {truck.currentState}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Available Section */}
                {fleetStatus.grouped.available.length > 0 && (
                  <div className="operations-section">
                    <h3 className="section-header">
                      ⚪ AVAILABLE ({fleetStatus.grouped.available.length})
                    </h3>
                    {fleetStatus.grouped.available.map((truck, idx) => (
                      <div key={idx} className="operations-card available">
                        <div className="operations-card-header">
                          <div>
                            <span className="truck-number">🚛 Truck {truck.truck}</span>
                            <span className="driver-name"> - {truck.driver}</span>
                          </div>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(truck.operationalStatus) }}>
                            {getStatusIcon(truck.operationalStatus)} {getStatusLabel(truck.operationalStatus)}
                          </span>
                        </div>
                        <div className="operations-details">
                          <div className="detail-row">
                            <span className="detail-label">✅ Completed:</span>
                            <span className="detail-value">
                              {truck.endMileage ? 
                                `${(truck.endMileage - truck.startMileage).toFixed(1)} miles` : 
                                'Recently completed'
                              }
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📊 Current mileage:</span>
                            <span className="detail-value">{truck.endMileage?.toLocaleString() || truck.startMileage.toLocaleString()} mi</span>
                          </div>
                          <div className="detail-row" style={{ color: '#48bb78', fontWeight: '600' }}>
                            <span>✅ Ready for next assignment</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Idle Section */}
                {fleetStatus.grouped.idle.length > 0 && (
                  <div className="operations-section">
                    <h3 className="section-header warning">
                      ⚫ IDLE ({fleetStatus.grouped.idle.length})
                    </h3>
                    {fleetStatus.grouped.idle.map((truck, idx) => (
                      <div key={idx} className="operations-card idle">
                        <div className="operations-card-header">
                          <div>
                            <span className="truck-number">🚛 Truck {truck.truck}</span>
                          </div>
                          <span className="status-badge" style={{ backgroundColor: getStatusColor(truck.operationalStatus) }}>
                            {getStatusIcon(truck.operationalStatus)} {getStatusLabel(truck.operationalStatus)}
                          </span>
                        </div>
                        <div className="operations-details">
                          <div className="detail-row warning-text">
                            <span className="detail-label">⚠️ Status:</span>
                            <span className="detail-value">No activity today</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📅 Last used:</span>
                            <span className="detail-value">Check dispatch records</span>
                          </div>
                          <div className="detail-row warning-text">
                            <span style={{ fontWeight: '600' }}>⚠️ Action needed: Check truck availability with dispatch</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ textAlign: 'center', marginTop: '30px' }}>
                  <button 
                    onClick={handleRefreshFleet} 
                    className="refresh-button"
                    disabled={loadingFleetStatus}
                  >
                    {loadingFleetStatus ? (
                      <>
                        <span className="loading-spinner"></span>
                        Refreshing...
                      </>
                    ) : (
                      '🔄 Refresh Operations'
                    )}
                  </button>
                  <p className="fleet-timestamp">
                    Updates every time you refresh. Real-time auto-refresh coming soon.
                  </p>
                </div>
              </>
            )}

            {!loadingFleetStatus && (!fleetStatus || !fleetStatus.grouped) && (
              <div className="no-data-message">
                No operations data available. Click refresh to load current status.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit Entries View (Supervisor only)
  if (trackingMode === 'edit-entries') {
    const handleEditEntry = (entry, type) => {
      setEditingEntry({ ...entry, type });
      setShowOverrideModal(true);
    };

    const handleSaveOverride = async () => {
      if (!overrideData.supervisorName.trim() || !overrideData.reason.trim()) {
        alert('Supervisor name and reason are required!');
        return;
      }

      if (Object.keys(overrideData.changes).length === 0) {
        alert('No changes to save!');
        return;
      }

      try {
        const response = await fetch('https://mileage-tracker-final.vercel.app/api/supervisor-override', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entryId: editingEntry.id,
            entryType: editingEntry.type,
            changes: overrideData.changes,
            supervisorName: overrideData.supervisorName,
            reason: overrideData.reason,
            originalDriver: editingEntry.driver,
            originalTruck: editingEntry.truck,
            originalDate: editingEntry.date
          }),
        });

        const data = await response.json();

        if (data.success) {
          alert(`✅ Entry updated! ${data.changesCount} change(s) logged.`);
          setShowOverrideModal(false);
          setEditingEntry(null);
          setOverrideData({ supervisorName: '', reason: '', changes: {} });
          // Refresh entries
          setTrackingMode('supervisor-menu');
          setTimeout(() => setTrackingMode('edit-entries'), 100);
        } else {
          throw new Error(data.error || 'Failed to update');
        }
      } catch (error) {
        console.error('Error saving override:', error);
        alert('❌ Failed to save changes. Please try again.');
      }
    };

    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setAnimationClass('slide-in-left');
              setTrackingMode('supervisor-menu');
            }} className="btn btn-back">
              ← Back
            </button>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>

          <div className="week-container">
            <div className="week-header">
              <h2>✏️ Edit Entries</h2>
              <p className="week-date-range">All Historical Entries</p>
            </div>

            {loadingEntries && (
              <div className="info-message">
                <span className="loading-spinner"></span>
                Loading entries...
              </div>
            )}

            {!loadingEntries && recentEntries && (
              <>
                {/* Mileage Entries */}
                <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#2d3748' }}>📍 Mileage Entries</h3>
                {recentEntries.mileage.length === 0 ? (
                  <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No mileage entries found.</p>
                ) : (
                  <div className="entries-list">
                    {recentEntries.mileage.map((entry) => (
                      <div key={entry.id} className="entry-card">
                        <div className="entry-header">
                          <span className="entry-driver">{entry.driver}</span>
                          <span className="entry-truck">🚛 {entry.truck}</span>
                        </div>
                        <div className="entry-details">
                          <div className="entry-row">
                            <span>Date:</span>
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                          </div>
                          <div className="entry-row">
                            <span>State:</span>
                            <span>{entry.state}</span>
                          </div>
                          <div className="entry-row">
                            <span>Start:</span>
                            <span>{entry.mileageStart.toFixed(1)}</span>
                          </div>
                          <div className="entry-row">
                            <span>End:</span>
                            <span>{entry.mileageEnd > 0 ? entry.mileageEnd.toFixed(1) : 'Incomplete'}</span>
                          </div>
                          <div className="entry-row">
                            <span>Total:</span>
                            <span className="entry-highlight">{entry.totalMiles.toFixed(1)} mi</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleEditEntry(entry, 'mileage')}
                          className="btn-edit-entry"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fuel Entries */}
                <h3 style={{ marginTop: '30px', marginBottom: '15px', color: '#2d3748' }}>⛽ Fuel Entries</h3>
                {recentEntries.fuel.length === 0 ? (
                  <p style={{ color: '#718096', textAlign: 'center', padding: '20px' }}>No fuel entries found.</p>
                ) : (
                  <div className="entries-list">
                    {recentEntries.fuel.map((entry) => (
                      <div key={entry.id} className="entry-card">
                        <div className="entry-header">
                          <span className="entry-driver">{entry.driver}</span>
                          <span className="entry-truck">🚛 {entry.truck}</span>
                        </div>
                        <div className="entry-details">
                          <div className="entry-row">
                            <span>Date:</span>
                            <span>{new Date(entry.date).toLocaleDateString()}</span>
                          </div>
                          <div className="entry-row">
                            <span>State:</span>
                            <span>{entry.state}</span>
                          </div>
                          <div className="entry-row">
                            <span>Gallons:</span>
                            <span>{entry.gallons.toFixed(2)}</span>
                          </div>
                          <div className="entry-row">
                            <span>Cost:</span>
                            <span className="entry-highlight">${entry.cost.toFixed(2)}</span>
                          </div>
                          {entry.location && (
                            <div className="entry-row">
                              <span>Location:</span>
                              <span>{entry.location}</span>
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => handleEditEntry(entry, 'fuel')}
                          className="btn-edit-entry"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Override Modal */}
          {showOverrideModal && editingEntry && (
            <div className="modal-overlay">
              <div className="modal-content override-modal">
                <h2>🔐 Supervisor Override</h2>
                <p style={{ color: '#718096', marginBottom: '20px' }}>
                  Editing {editingEntry.type} entry for {editingEntry.driver} ({editingEntry.truck})
                </p>

                {/* Edit Fields */}
                <div className="override-edit-section">
                  <h3>Edit Values:</h3>
                  
                  {editingEntry.type === 'mileage' ? (
                    <>
                      <div className="form-group">
                        <label>Mileage Start:</label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={editingEntry.mileageStart}
                          onChange={(e) => {
                            if (parseFloat(e.target.value) !== editingEntry.mileageStart) {
                              setOverrideData({
                                ...overrideData,
                                changes: {
                                  ...overrideData.changes,
                                  'Mileage Start': {
                                    oldValue: editingEntry.mileageStart,
                                    newValue: e.target.value,
                                    propertyType: 'number'
                                  }
                                }
                              });
                            }
                          }}
                          className="text-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Mileage End:</label>
                        <input
                          type="number"
                          step="0.1"
                          defaultValue={editingEntry.mileageEnd}
                          onChange={(e) => {
                            if (parseFloat(e.target.value) !== editingEntry.mileageEnd) {
                              setOverrideData({
                                ...overrideData,
                                changes: {
                                  ...overrideData.changes,
                                  'Mileage End': {
                                    oldValue: editingEntry.mileageEnd,
                                    newValue: e.target.value,
                                    propertyType: 'number'
                                  }
                                }
                              });
                            }
                          }}
                          className="text-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>State:</label>
                        <select
                          defaultValue={editingEntry.state}
                          onChange={(e) => {
                            if (e.target.value !== editingEntry.state) {
                              setOverrideData({
                                ...overrideData,
                                changes: {
                                  ...overrideData.changes,
                                  'State': {
                                    oldValue: editingEntry.state,
                                    newValue: e.target.value,
                                    propertyType: 'select'
                                  }
                                }
                              });
                            }
                          }}
                          className="select-input"
                        >
                          {STATES.map(state => (
                            <option key={state} value={state}>{state}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label>Gallons:</label>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={editingEntry.gallons}
                          onChange={(e) => {
                            if (parseFloat(e.target.value) !== editingEntry.gallons) {
                              setOverrideData({
                                ...overrideData,
                                changes: {
                                  ...overrideData.changes,
                                  'Gallons': {
                                    oldValue: editingEntry.gallons,
                                    newValue: e.target.value,
                                    propertyType: 'number'
                                  }
                                }
                              });
                            }
                          }}
                          className="text-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Total Cost:</label>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={editingEntry.cost}
                          onChange={(e) => {
                            if (parseFloat(e.target.value) !== editingEntry.cost) {
                              setOverrideData({
                                ...overrideData,
                                changes: {
                                  ...overrideData.changes,
                                  'Total Cost': {
                                    oldValue: editingEntry.cost,
                                    newValue: e.target.value,
                                    propertyType: 'number'
                                  }
                                }
                              });
                            }
                          }}
                          className="text-input"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Required: Supervisor Name & Reason */}
                <div className="override-required-section">
                  <h3 style={{ color: '#e53e3e', marginBottom: '10px' }}>⚠️ Required Information:</h3>
                  
                  <div className="form-group">
                    <label>Your Name: *</label>
                    <input
                      type="text"
                      value={overrideData.supervisorName}
                      onChange={(e) => setOverrideData({...overrideData, supervisorName: e.target.value})}
                      placeholder="Enter your full name"
                      required
                      className="text-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Reason for Override: *</label>
                    <textarea
                      value={overrideData.reason}
                      onChange={(e) => setOverrideData({...overrideData, reason: e.target.value})}
                      placeholder="Explain why you're making this change..."
                      required
                      rows="3"
                      className="textarea-input"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="modal-buttons">
                  <button 
                    onClick={handleSaveOverride}
                    className="btn btn-primary"
                  >
                    💾 Save Changes
                  </button>
                  <button 
                    onClick={() => {
                      setShowOverrideModal(false);
                      setEditingEntry(null);
                      setOverrideData({ supervisorName: '', reason: '', changes: {} });
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Render Capacity Planning screen
  if (trackingMode === 'capacity-planning') {
    const quarters = {
      'q1-2026': { label: 'Q1 2026', start: '2026-01-01', end: '2026-03-31' },
      'q2-2026': { label: 'Q2 2026', start: '2026-04-01', end: '2026-06-30' },
      'q3-2026': { label: 'Q3 2026', start: '2026-07-01', end: '2026-09-30' },
      'q4-2026': { label: 'Q4 2026', start: '2026-10-01', end: '2026-12-31' },
      'q1-2025': { label: 'Q1 2025', start: '2025-01-01', end: '2025-03-31' },
      'q4-2025': { label: 'Q4 2025', start: '2025-10-01', end: '2025-12-31' }
    };
    
    const currentQuarter = quarters[selectedQuarter];
    
    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>📈 Capacity Planning</h1>
            <p className="user-info">{currentQuarter.label}</p>
          </div>
          
          {/* Quarter Filter */}
          <div className="capacity-filters">
            <div className="quarter-selector">
              {Object.keys(quarters).map(qId => (
                <button
                  key={qId}
                  onClick={() => setSelectedQuarter(qId)}
                  className={`quarter-btn ${selectedQuarter === qId ? 'active' : ''}`}
                >
                  {quarters[qId].label}
                </button>
              ))}
            </div>
            
            <div className="view-toggle">
              <button
                onClick={() => setShowCapacityTable(false)}
                className={`toggle-btn ${!showCapacityTable ? 'active' : ''}`}
              >
                📊 Chart
              </button>
              <button
                onClick={() => setShowCapacityTable(true)}
                className={`toggle-btn ${showCapacityTable ? 'active' : ''}`}
              >
                📋 Table
              </button>
            </div>
          </div>
          
          {loadingCapacityData && (
            <div className="loading-message">
              Loading capacity data...
            </div>
          )}
          
          {!loadingCapacityData && capacityData && (
            <>
              {/* KPI Cards */}
              <div className="capacity-kpis">
                <div className="kpi-card">
                  <div className="kpi-label">Avg Daily Loads</div>
                  <div className="kpi-value">{capacityData.summary.avgDailyLoads}</div>
                  <div className="kpi-trend">
                    {capacityData.summary.trendPercent > 0 ? '↗️' : '↘️'} {Math.abs(capacityData.summary.trendPercent)}%
                  </div>
                </div>
                
                <div className="kpi-card">
                  <div className="kpi-label">Concrete Delivered</div>
                  <div className="kpi-value">{capacityData.summary.totalConcreteYards || 0}</div>
                  <div className="kpi-sub">yards total</div>
                </div>
                
                <div className="kpi-card">
                  <div className="kpi-label">Peak Day</div>
                  <div className="kpi-value">{capacityData.summary.peakDay.loads}</div>
                  <div className="kpi-sub">loads</div>
                </div>
                
                <div className="kpi-card">
                  <div className="kpi-label">Utilization</div>
                  <div className="kpi-value">{capacityData.summary.avgUtilization}%</div>
                  <div className={`kpi-status ${capacityData.summary.avgUtilization >= 85 ? 'warning' : 'good'}`}>
                    {capacityData.summary.avgUtilization >= 85 ? '⚠️ High' : '✅ Good'}
                  </div>
                </div>
                
                <div className="kpi-card">
                  <div className="kpi-label">Avg Daily Yards</div>
                  <div className="kpi-value">{capacityData.summary.avgDailyYards || 0}</div>
                  <div className="kpi-sub">yards per day</div>
                </div>
              </div>
              
              {/* Chart or Table View */}
              {!showCapacityTable ? (
                <>
                  <div className="capacity-chart-container">
                    <canvas id="capacityChart" style={{ maxHeight: '400px' }}></canvas>
                  </div>
                  
                  <div className="capacity-chart-container" style={{ marginTop: '20px' }}>
                    <canvas id="concreteChart" style={{ maxHeight: '400px' }}></canvas>
                  </div>
                </>
              ) : (
                <div className="capacity-table-container">
                  <table className="capacity-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Loads</th>
                        <th>Concrete (yds)</th>
                        <th>Max Capacity</th>
                        <th>Utilization</th>
                        <th>Trucks Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capacityData.dailyData.map(day => (
                        <tr key={day.date}>
                          <td>{new Date(day.date).toLocaleDateString()}</td>
                          <td>{day.loads}</td>
                          <td>{day.concreteYards || 0}</td>
                          <td>{day.maxCapacity}</td>
                          <td>
                            <span className={day.utilizationPercent >= 85 ? 'util-high' : 'util-normal'}>
                              {day.utilizationPercent}%
                            </span>
                          </td>
                          <td>{day.trucksActive} of {capacityData.summary.totalTrucks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* Insights & Recommendations */}
              <div className="capacity-insights">
                <h3>💡 Insights & Recommendations</h3>
                {capacityData.summary.avgUtilization >= 90 && (
                  <div className="insight-card alert">
                    <strong>⚠️ High Capacity Alert:</strong> Fleet operating at {capacityData.summary.avgUtilization}% capacity. 
                    Consider hiring additional truck if trend continues.
                  </div>
                )}
                {capacityData.summary.avgUtilization >= 80 && capacityData.summary.avgUtilization < 90 && (
                  <div className="insight-card warning">
                    <strong>📊 Monitor Capacity:</strong> Fleet at {capacityData.summary.avgUtilization}% capacity. 
                    Watch for continued growth before expanding.
                  </div>
                )}
                {capacityData.summary.avgUtilization < 65 && (
                  <div className="insight-card info">
                    <strong>✅ Good Capacity:</strong> Fleet at {capacityData.summary.avgUtilization}% capacity. 
                    Comfortable operating range with room for growth.
                  </div>
                )}
                {capacityData.summary.trendPercent > 10 && (
                  <div className="insight-card info">
                    <strong>📈 Growing Demand:</strong> Load volume increased {capacityData.summary.trendPercent}% during this period. 
                    Continue monitoring for expansion opportunities.
                  </div>
                )}
              </div>
              
              {/* Export Buttons */}
              <div className="capacity-actions">
                <button className="btn btn-secondary">
                  📄 Export CSV
                </button>
                <button className="btn btn-secondary">
                  📋 Export to Notion
                </button>
                <button className="btn btn-primary">
                  📸 Save Snapshot
                </button>
              </div>
            </>
          )}
          
          {!loadingCapacityData && !capacityData && (
            <div className="no-data-message">
              No data available for {currentQuarter.label}. 
              Make sure mileage entries have been submitted for this period.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render truck selection screen (skip for batch managers)
  if (!selectedTruck && !isBatchManager) {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <h1>Select Truck</h1>
            <p className="user-info">Driver: {displayName}</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={toggleDarkMode}
                className="dark-mode-toggle"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button onClick={handleLogout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>

          <div className="truck-grid">
            {TRUCKS.map(truck => (
              <button
                key={truck}
                onClick={() => handleTruckSelect(truck)}
                className="truck-card"
              >
                <div className="truck-icon">🚛</div>
                <div className="truck-name">{truck}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // Render pre-trip checklist (before mode selection)
  if (showPreTripChecklist) {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isFriday = dayOfWeek === 5;
    
    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Submitting...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={() => {
              setShowPreTripChecklist(false);
              setSelectedTruck('');
            }} className="btn btn-back">
              ← Back
            </button>
            <h1>Pre-Trip Inspection</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <div className="pretrip-container">
            <div className="pretrip-header">
              <h2>🔍 Daily Safety Checklist</h2>
              <p style={{ marginBottom: '10px' }}>Check any boxes below if you find issues</p>
              <p style={{ color: '#FF7E26', fontWeight: '600' }}>✅ If everything looks good, just click "All Good - No Issues"</p>
            </div>

            <div className="pretrip-checklist">
              <div className="checklist-section">
                <h3>Vehicle Inspection (Check box if issue found)</h3>
                
                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.tires}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, tires: e.target.checked})}
                  />
                  <span>Tires (pressure, tread, damage)</span>
                </label>

                <label className={`pretrip-item ${isFriday ? 'required-friday' : ''}`}>
                  <input
                    type="checkbox"
                    checked={preTripChecklist.oilLevel}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, oilLevel: e.target.checked})}
                  />
                  <span>Oil Level {isFriday && <strong style={{color: '#FF7E26'}}>(Check on Fridays)</strong>}</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.beltsHoses}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, beltsHoses: e.target.checked})}
                  />
                  <span>Belts & Hoses</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.mirrors}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, mirrors: e.target.checked})}
                  />
                  <span>Mirrors (clean, adjusted)</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.windshieldWipers}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, windshieldWipers: e.target.checked})}
                  />
                  <span>Windshield Wipers</span>
                </label>
              </div>

              <div className="checklist-section">
                <h3>Lights & Signals (Check box if issue found)</h3>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.lights}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, lights: e.target.checked})}
                  />
                  <span>Running Lights</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.headlights}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, headlights: e.target.checked})}
                  />
                  <span>Headlights (high & low beam)</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.brakeLights}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, brakeLights: e.target.checked})}
                  />
                  <span>Brake Lights</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.turnSignals}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, turnSignals: e.target.checked})}
                  />
                  <span>Turn Signals</span>
                </label>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.hazardLights}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, hazardLights: e.target.checked})}
                  />
                  <span>Hazard Lights</span>
                </label>
              </div>

              <div className="checklist-section">
                <h3>Safety Equipment (Check box if issue found)</h3>

                <label className="pretrip-item">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.safetyEquipment}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, safetyEquipment: e.target.checked})}
                  />
                  <span>Fire Extinguisher, Flares, Cones</span>
                </label>
              </div>

              <div className="checklist-section">
                <h3>Trailer (if attached)</h3>

                <label className="pretrip-item trailer-checkbox">
                  <input
                    type="checkbox"
                    checked={preTripChecklist.hasTrailer}
                    onChange={(e) => setPreTripChecklist({...preTripChecklist, hasTrailer: e.target.checked})}
                  />
                  <span><strong>Truck has trailer attached</strong></span>
                </label>

                {preTripChecklist.hasTrailer && (
                  <>
                    <label className="pretrip-item trailer-item">
                      <input
                        type="checkbox"
                        checked={preTripChecklist.coupler}
                        onChange={(e) => setPreTripChecklist({...preTripChecklist, coupler: e.target.checked})}
                      />
                      <span>Coupler (secure, locked)</span>
                    </label>

                    <label className="pretrip-item trailer-item">
                      <input
                        type="checkbox"
                        checked={preTripChecklist.safetyChains}
                        onChange={(e) => setPreTripChecklist({...preTripChecklist, safetyChains: e.target.checked})}
                      />
                      <span>Safety Chains (attached, not dragging)</span>
                    </label>
                  </>
                )}
              </div>

              <div className="checklist-section">
                <h3>Issues or Notes (Optional)</h3>
                <textarea
                  value={preTripChecklist.issues}
                  onChange={(e) => setPreTripChecklist({...preTripChecklist, issues: e.target.value})}
                  placeholder="Note any issues found during inspection..."
                  rows="3"
                  className="textarea-input"
                  style={{width: '100%', marginTop: '10px'}}
                />
              </div>
            </div>

            <div className="pretrip-buttons">
              <button 
                onClick={handleAllGood}
                className="btn btn-success btn-all-good"
              >
                ✅ All Good - No Issues
              </button>
              <button 
                onClick={submitPreTripChecklist}
                className="btn btn-primary"
              >
                Submit (Issues Noted)
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render tracking mode selection
  if (!trackingMode) {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    return (
      <div className="App">
        <div className={`container ${animationClass}`}>
          <div className="header">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <button onClick={handleBack} className="btn btn-back">
                ← Back
              </button>
              <button 
                onClick={toggleDarkMode}
                className="dark-mode-toggle"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? '☀️ Light' : '🌙 Dark'}
              </button>
            </div>
            <h1>Select Tracking Mode</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <div className="mode-selection">
            <button
              onClick={() => handleModeSelect('mileage')}
              className="mode-card"
            >
              <div className="mode-icon">📍</div>
              <h2>Track Mileage</h2>
              <p>Record trip mileage by state</p>
            </button>

            <button
              onClick={() => handleModeSelect('fuel')}
              className="mode-card"
            >
              <div className="mode-icon">⛽</div>
              <h2>Track Fuel</h2>
              <p>Record fuel purchases</p>
            </button>

            {isBatchManager && (
              <button 
                onClick={() => handleModeSelect('daily-report')} 
                className="mode-card"
              >
                <div className="mode-icon">📋</div>
                <h2>Daily Report</h2>
                <p>Submit batch manager daily report</p>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render mileage tracking form
  if (trackingMode === 'mileage') {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const totalMiles = mileageData.mileageEnd && mileageData.mileageStart 
      ? parseFloat(mileageData.mileageEnd) - parseFloat(mileageData.mileageStart)
      : 0;

    // Show completion screen after successful submission
    if (showCompletionScreen && completionData) {
      // Group trips by state
      const tripsByState = {};
      let overallStart = null;
      let overallEnd = null;
      
      if (completionData.trips && completionData.trips.length > 0) {
        completionData.trips.forEach(trip => {
          if (!tripsByState[trip.state]) {
            tripsByState[trip.state] = [];
          }
          tripsByState[trip.state].push(trip);
          
          // Track overall start and end
          if (overallStart === null || trip.mileageStart < overallStart) {
            overallStart = trip.mileageStart;
          }
          if (overallEnd === null || trip.mileageEnd > overallEnd) {
            overallEnd = trip.mileageEnd;
          }
        });
      }
      
      return (
        <div className="App">
          <div className={`container ${animationClass}`}>
            <div className="completion-screen">
              <div className="completion-icon">✅</div>
              <h1>Shift Completed!</h1>
              <p className="completion-message">Your mileage has been successfully recorded.</p>
              
              <div className="completion-summary">
                <h3>Trip Summary</h3>
                <div className="summary-row">
                  <span className="summary-label">Driver:</span>
                  <span className="summary-value">{completionData.driver}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Truck:</span>
                  <span className="summary-value">{completionData.truck}</span>
                </div>
                <div className="summary-row">
                  <span className="summary-label">Date:</span>
                  <span className="summary-value">{new Date(completionData.date).toLocaleDateString()}</span>
                </div>
                
                {/* Show breakdown by state */}
                {Object.keys(tripsByState).length > 0 && (
                  <>
                    <div className="state-breakdown-header">State Breakdown:</div>
                    {Object.keys(tripsByState).map(state => {
                      const stateTrips = tripsByState[state];
                      const stateMiles = stateTrips.reduce((sum, trip) => sum + trip.totalMiles, 0);
                      const stateStart = Math.min(...stateTrips.map(t => t.mileageStart));
                      const stateEnd = Math.max(...stateTrips.map(t => t.mileageEnd));
                      
                      return (
                        <div key={state} className="state-section">
                          <div className="state-header">📍 {state}</div>
                          <div className="summary-row state-detail">
                            <span className="summary-label">Start:</span>
                            <span className="summary-value">{stateStart.toFixed(1)}</span>
                          </div>
                          <div className="summary-row state-detail">
                            <span className="summary-label">End:</span>
                            <span className="summary-value">{stateEnd.toFixed(1)}</span>
                          </div>
                          <div className="summary-row state-detail state-miles">
                            <span className="summary-label">Miles:</span>
                            <span className="summary-value">{stateMiles.toFixed(1)} mi</span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
                
                <div className="summary-row total">
                  <span className="summary-label">Total Miles:</span>
                  <span className="summary-value">{completionData.totalMiles.toFixed(1)} miles</span>
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowCompletionScreen(false);
                  setCompletionData(null);
                  setTrackingMode(null);
                  setAnimationClass('slide-in-left');
                }}
                className="btn btn-primary btn-large"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Submitting...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>{incompleteEntry ? 'Complete Shift' : 'Start Shift'}</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          {checkingIncomplete && (
            <div className="info-message">
              Checking for incomplete entries...
            </div>
          )}

          {incompleteEntry && (
            <div className="incomplete-entry-notice">
              📍 <strong>Active Shift Found</strong>
              <p>Started: {new Date(incompleteEntry.createdTime).toLocaleString()}</p>
              <p>Starting Mileage: {incompleteEntry.mileageStart}</p>
              <p>State: {incompleteEntry.state}</p>
            </div>
          )}

          {checkingLocation && (
            <div className="info-message">
              🌍 Checking your location...
            </div>
          )}

          {detectedStateCrossing && !showCrossStateModal && (
            <div className="gps-detection-notice">
              📍 <strong>State Crossing Detected!</strong>
              <p>GPS shows you're now in <strong>{newState}</strong></p>
              <p>Your shift started in <strong>{incompleteEntry.state}</strong></p>
              <p>Click "Cross State Line" below to split your shift.</p>
            </div>
          )}

          {gpsPermission === 'denied' && incompleteEntry && (
            <div className="gps-permission-notice">
              ℹ️ <strong>Location Permission Needed</strong>
              <p>Enable location access to auto-detect state crossings.</p>
              <p>You can still use the "Cross State Line" button manually.</p>
            </div>
          )}

          {incompleteEntry && !showCrossStateModal && (
            <button 
              type="button"
              onClick={() => {
                setShowCrossStateModal(true);
                // Set the opposite state as default
                setNewState(incompleteEntry.state === 'Nebraska' ? 'Kansas' : 'Nebraska');
              }}
              className="btn btn-secondary"
              style={{ marginBottom: '20px', width: '100%' }}
            >
              🚗 Cross State Line
            </button>
          )}
          
          {/* Job Site Timing Buttons */}
          {incompleteEntry && showJobSiteButtons && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!jobSiteArrivalTime && (
                <button
                  type="button"
                  onClick={handleArrivedOnJobSite}
                  className="btn btn-info"
                  style={{ width: '100%' }}
                >
                  🏗️ Arrived on Job Site
                </button>
              )}
              
              {jobSiteArrivalTime && !jobSiteDepartureTime && (
                <div>
                  <div style={{ 
                    background: '#e6f7ff', 
                    border: '2px solid #1890ff', 
                    padding: '10px', 
                    borderRadius: '8px',
                    marginBottom: '10px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#1890ff', fontWeight: '600' }}>
                      ⏱️ On Job Site Since: {formatCentralTime(jobSiteArrivalTime)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLeavingJobSite}
                    className="btn btn-warning"
                    style={{ width: '100%' }}
                  >
                    🚪 Leaving Job Site
                  </button>
                </div>
              )}
              
              {jobSiteArrivalTime && jobSiteDepartureTime && (
                <div style={{ 
                  background: '#f6ffed', 
                  border: '2px solid #52c41a', 
                  padding: '10px', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <span style={{ color: '#52c41a', fontWeight: '600' }}>
                    ✅ Job Site Time Recorded
                  </span>
                </div>
              )}
            </div>
          )}

          {showCrossStateModal && (
            <div className="cross-state-modal">
              <h3>{detectedStateCrossing ? '📍 GPS Detected State Crossing' : 'Crossing State Line'}</h3>
              <p>You're leaving <strong>{incompleteEntry.state}</strong></p>
              {detectedStateCrossing && (
                <p style={{ color: '#2196f3', fontWeight: 600 }}>
                  GPS detected you're now in {newState}
                </p>
              )}
              
              <form onSubmit={handleCrossStateLine} className="tracking-form">
                <div className="form-group">
                  <label htmlFor="cross-mileage">Current Odometer Reading:</label>
                  <input
                    id="cross-mileage"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    value={crossStateMileage}
                    onChange={(e) => setCrossStateMileage(e.target.value)}
                    placeholder="Enter current mileage"
                    required
                    autoFocus
                    className="text-input"
                  />
                  <small style={{ color: '#718096', marginTop: '5px', display: 'block' }}>
                    Must be greater than {incompleteEntry.mileageStart}
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="new-state">Entering State:</label>
                  <select
                    id="new-state"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    required
                    className="select-input"
                  >
                    {STATES.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Confirm State Crossing
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowCrossStateModal(false);
                      setCrossStateMileage('');
                      setDetectedStateCrossing(false);
                    }}
                    className="btn btn-secondary" 
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showCrossStateModal && (
            <form onSubmit={submitMileageData} className="tracking-form">
            
            {/* Smart Mileage Validation Alert */}
            {mileageAlert && (
              <div className={`mileage-alert ${mileageAlert.type}`}>
                {mileageAlert.message}
                {mileageAlert.type === 'warning' && (
                  <div style={{ marginTop: '10px' }}>
                    <button 
                      type="button"
                      onClick={() => setMileageAlert(null)}
                      style={{ 
                        background: '#FF7E26', 
                        color: 'white', 
                        border: 'none', 
                        padding: '8px 16px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        marginRight: '10px',
                        fontWeight: '600'
                      }}
                    >
                      ✓ Numbers are Correct
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setMileageData({...mileageData, mileageEnd: ''});
                        setMileageAlert(null);
                      }}
                      style={{ 
                        background: '#cbd5e0', 
                        color: '#2d3748', 
                        border: 'none', 
                        padding: '8px 16px', 
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600'
                      }}
                    >
                      Let Me Fix It
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="mileage-date">Date:</label>
              <input
                id="mileage-date"
                type="date"
                value={mileageData.date}
                onChange={(e) => setMileageData({...mileageData, date: e.target.value})}
                required
                disabled={!!incompleteEntry}
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="mileage-state">State:</label>
              <select
                id="mileage-state"
                value={mileageData.state}
                onChange={(e) => setMileageData({...mileageData, state: e.target.value})}
                required
                disabled={!!incompleteEntry}
                className="select-input"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {!incompleteEntry && (
              <div className="form-group">
                <label htmlFor="mileage-start">Starting Mileage:</label>
                <input
                  id="mileage-start"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={mileageData.mileageStart}
                  onChange={(e) => setMileageData({...mileageData, mileageStart: e.target.value})}
                  placeholder="Enter starting odometer reading"
                  required
                  className="text-input"
                />
              </div>
            )}

            {incompleteEntry && (
              <div className="form-group">
                <label htmlFor="mileage-end">Ending Mileage:</label>
                <input
                  id="mileage-end"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={mileageData.mileageEnd}
                  onChange={(e) => {
                    setMileageData({...mileageData, mileageEnd: e.target.value});
                    
                    // Validate mileage as user types
                    if (e.target.value && mileageData.mileageStart) {
                      const alert = validateMileage(mileageData.mileageStart, e.target.value, 'trip');
                      setMileageAlert(alert);
                    } else {
                      setMileageAlert(null);
                    }
                  }}
                  placeholder="Enter ending odometer reading"
                  required
                  className="text-input"
                />
              </div>
            )}

            {totalMiles > 0 && (
              <div className="calculation-display">
                <strong>Total Miles:</strong> {totalMiles.toFixed(1)} miles
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-submit">
              {incompleteEntry ? 'Complete Shift' : 'Start Shift'}
            </button>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </form>
          )}
        </div>
      </div>
    );
  }

  // Render fuel tracking form
  if (trackingMode === 'fuel') {
    const displayName = currentDriver === 'Other' ? customDriverName : currentDriver;
    const isSemi = selectedTruck === 'Green Semi';
    const costPerGallon = isSemi && fuelData.gallons && fuelData.cost
      ? (parseFloat(fuelData.cost) / parseFloat(fuelData.gallons)).toFixed(2)
      : 0;

    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Submitting...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn btn-back">
              ← Back
            </button>
            <h1>Track Fuel</h1>
            <p className="user-info">Driver: {displayName} | Truck: {selectedTruck}</p>
          </div>

          <form onSubmit={submitFuelData} className="tracking-form">
            <div className="form-group">
              <label htmlFor="fuel-date">Date:</label>
              <input
                id="fuel-date"
                type="date"
                value={fuelData.date}
                onChange={(e) => setFuelData({...fuelData, date: e.target.value})}
                required
                className="text-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="fuel-state">State:</label>
              <select
                id="fuel-state"
                value={fuelData.state}
                onChange={(e) => setFuelData({...fuelData, state: e.target.value})}
                required
                className="select-input"
              >
                {STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fuel-gallons">{isSemi ? 'Gallons Purchased:' : 'Gallons Filled:'}</label>
              <input
                id="fuel-gallons"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={fuelData.gallons}
                onChange={(e) => setFuelData({...fuelData, gallons: e.target.value})}
                placeholder="Enter gallons"
                required
                className="text-input"
              />
            </div>

            {isSemi && (
              <>
                <div className="form-group">
                  <label htmlFor="fuel-cost">Total Cost ($):</label>
                  <input
                    id="fuel-cost"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    value={fuelData.cost}
                    onChange={(e) => setFuelData({...fuelData, cost: e.target.value})}
                    placeholder="Enter total cost"
                    required
                    className="text-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fuel-location">Location (Optional):</label>
                  <input
                    id="fuel-location"
                    type="text"
                    value={fuelData.location}
                    onChange={(e) => setFuelData({...fuelData, location: e.target.value})}
                    placeholder="e.g., Shell - McCook"
                    className="text-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fuel-photo">Receipt Photo (Optional):</label>
                  <input
                    id="fuel-photo"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFuelPhotoUpload}
                    className="file-input"
                  />
                  {fuelData.fuelPhoto && (
                    <p className="file-preview">✅ Photo attached</p>
                  )}
                </div>

                {costPerGallon > 0 && (
                  <div className="calculation-display">
                    <strong>Price per Gallon:</strong> ${costPerGallon}
                  </div>
                )}
              </>
            )}

            <button type="submit" className="btn btn-primary btn-submit">
              Submit Fuel Data
            </button>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Daily Report form
  if (trackingMode === 'daily-report') {
    const predefinedDrivers = ['James', 'Matt', 'Calvin', 'Jerron', 'Nic'];
    const customDrivers = ['Custom1', 'Custom2'];
    
    return (
      <div className="App">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <div className="loading-text">Submitting...</div>
          </div>
        )}
        <div className={`container ${animationClass}`}>
          <div className="header">
            <button onClick={handleBack} className="btn-back">← Back</button>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>

          <h2>📋 MCI Daily Tab Sheet</h2>
          <p className="subtitle">Prepared by: {currentDriver}</p>

          <form onSubmit={submitDailyReport} className="tracking-form daily-report-form">
            <div className="form-group">
              <label htmlFor="report-name">Batch Manager:</label>
              <input
                id="report-name"
                type="text"
                value={currentDriver === 'Other' ? customDriverName : currentDriver}
                readOnly
                className="text-input"
                style={{ backgroundColor: '#f7fafc', cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="report-date">Date:</label>
              <input
                id="report-date"
                type="date"
                value={dailyReportData.date}
                onChange={(e) => setDailyReportData({...dailyReportData, date: e.target.value})}
                required
                className="date-input"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="yards-out">Yards Out:</label>
                <input
                  id="yards-out"
                  type="number"
                  step="0.01"
                  value={dailyReportData.yardsOut}
                  onChange={(e) => setDailyReportData({...dailyReportData, yardsOut: e.target.value})}
                  placeholder="e.g., 4"
                  required
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="trips-out">Trips Out:</label>
                <input
                  id="trips-out"
                  type="number"
                  value={dailyReportData.tripsOut}
                  onChange={(e) => setDailyReportData({...dailyReportData, tripsOut: e.target.value})}
                  placeholder="e.g., 1"
                  required
                  className="number-input"
                />
              </div>
            </div>

            <div className="drivers-section">
              <h3>Drivers:</h3>
              
              {predefinedDrivers.map(driver => (
                <div key={driver} className="driver-row">
                  <span className="driver-name">{driver}</span>
                  <div className="driver-checkboxes">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[driver].halfDay}
                        onChange={() => handleDriverCheckbox(driver, 'halfDay')}
                      />
                      <span>Half Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[driver].fullDay}
                        onChange={() => handleDriverCheckbox(driver, 'fullDay')}
                      />
                      <span>Full Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[driver].absent}
                        onChange={() => handleDriverCheckbox(driver, 'absent')}
                      />
                      <span>Absent</span>
                    </label>
                  </div>
                </div>
              ))}

              {customDrivers.map(key => (
                <div key={key} className="driver-row custom-driver">
                  <input
                    type="text"
                    value={driverStatus[key].name}
                    onChange={(e) => handleCustomDriverName(key, e.target.value)}
                    placeholder="Other driver name..."
                    className="custom-driver-input"
                  />
                  <div className="driver-checkboxes">
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[key].halfDay}
                        onChange={() => handleDriverCheckbox(key, 'halfDay')}
                        disabled={!driverStatus[key].name}
                      />
                      <span>Half Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[key].fullDay}
                        onChange={() => handleDriverCheckbox(key, 'fullDay')}
                        disabled={!driverStatus[key].name}
                      />
                      <span>Full Day</span>
                    </label>
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        checked={driverStatus[key].absent}
                        onChange={() => handleDriverCheckbox(key, 'absent')}
                        disabled={!driverStatus[key].name}
                      />
                      <span>Absent</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-group">
              <label htmlFor="fuel-reading">End of Day Fuel Tank Reading:</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  id="fuel-reading"
                  type="number"
                  step="0.1"
                  value={dailyReportData.fuelReading}
                  onChange={(e) => setDailyReportData({...dailyReportData, fuelReading: e.target.value})}
                  placeholder="e.g., 14642"
                  className="number-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => setDailyReportData({...dailyReportData, fuelReading: '0'})}
                  className="btn btn-secondary"
                  style={{ 
                    padding: '8px 16px',
                    fontSize: '14px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  No Reading
                </button>
              </div>
              <small style={{ color: '#718096', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Click "No Reading" if this data is not available
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="issues">Issues (Optional):</label>
              <textarea
                id="issues"
                value={dailyReportData.issues}
                onChange={(e) => setDailyReportData({...dailyReportData, issues: e.target.value})}
                placeholder="Enter any issues or leave blank for N/A"
                rows="4"
                className="textarea-input"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-submit">
              Submit Daily Report
            </button>

            {submitStatus && (
              <div className={`status-message ${submitStatus.type}`}>
                {submitStatus.message}
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  return null;
}

export default App;
