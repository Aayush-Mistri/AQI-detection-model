import React, { useState, useEffect } from 'react';

const AQIDashboard = () => {
  const [location, setLocation] = useState(null);
  const [aqiData, setAqiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [hourlyAqiData, setHourlyAqiData] = useState([]);

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setError(null);
        },
        (error) => {
          setError('Unable to retrieve your location');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
    }
  }, []);

  // Fetch AQI data when location is available
  useEffect(() => {
    if (location) {
      fetchAQIData();
      fetchHourlyAQIData();
    }
  }, [location]);

  // Check for user's preferred color scheme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  // Fetch current AQI data
  const fetchAQIData = async () => {
    setLoading(true);
    try {
      const apiKey = 'ac27ccc7-6f2a-46c0-b3ba-feeafeda4cd8';
      const response = await fetch(
        `https://api.airvisual.com/v2/nearest_city?lat=${location.latitude}&lon=${location.longitude}&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();

      // Transform API response to your app's data structure
      const transformedData = {
        aqi: data.data.current.pollution.aqius,
        category: getAQICategory(data.data.current.pollution.aqius),
        pollutants: {
          pm25: data.data.current.pollution.aqius,
          pm10: data.data.current.pollution.aqicn || 0,
        },
        timestamp: new Date().toISOString(),
        location: showCustomLocation && customLocationName ?
          customLocationName :
          `${data.data.city}, ${data.data.state || ''} ${data.data.country}`
      };

      setAqiData(transformedData);
      setLoading(false);

      // Set alerts based on AQI levels
      if (transformedData.aqi > 100) {
        setAlerts(prev => [...prev, `Alert: AQI is ${transformedData.aqi}, which is unhealthy!`]);
      } else {
        setAlerts([]);
      }

    } catch (error) {
      console.error('Error fetching AQI data:', error);
      setError('Error fetching AQI data. Please try again later.');
      setLoading(false);
    }
  };

  // Fetch hourly AQI data for the last 24 hours
  const fetchHourlyAQIData = async () => {
    try {
      const apiKey = 'ac27ccc7-6f2a-46c0-b3ba-feeafeda4cd8';
      const response = await fetch(
        `https://api.airvisual.com/v2/history?lat=${location.latitude}&lon=${location.longitude}&key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      const hourlyData = data.data.map(entry => ({
        time: new Date(entry.timestamp).toLocaleTimeString(),
        aqi: entry.pollution.aqius
      }));

      setHourlyAqiData(hourlyData);
    } catch (error) {
      console.error('Error fetching hourly AQI data:', error);
    }
  };

  // Request notification permission
  const enableNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        new Notification('AQI Alert Enabled', {
          body: `You will now receive alerts when air quality changes significantly in ${aqiData.location}.`
        });
      }
    }
  };

  // Toggle dark/light mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Save custom location name
  const saveCustomLocation = () => {
    if (customLocationName.trim()) {
      setShowCustomLocation(true);
      fetchAQIData(); // Refresh data with new location name
      fetchHourlyAQIData(); // Refresh hourly data with new location name
    }
  };

  // Get AQI category based on AQI value
  const getAQICategory = (aqi) => {
    if (aqi <= 50) return "Good";
    if (aqi <= 100) return "Moderate";
    if (aqi <= 150) return "Unhealthy for Sensitive Groups";
    if (aqi <= 200) return "Unhealthy";
    if (aqi <= 300) return "Very Unhealthy";
    return "Hazardous";
  };

  // Get health recommendation based on AQI
  const getHealthRecommendation = (aqi) => {
    if (aqi <= 50) return "Air quality is good. Enjoy outdoor activities.";
    if (aqi <= 100) return "Air quality is acceptable. Unusually sensitive people should consider reducing prolonged outdoor exertion.";
    if (aqi <= 150) return "Members of sensitive groups may experience health effects. Consider reducing prolonged outdoor activities.";
    if (aqi <= 200) return "Everyone may begin to experience health effects. Limit outdoor activities.";
    if (aqi <= 300) return "Health alert: everyone may experience more serious health effects. Avoid outdoor activities.";
    return "Health warning: everyone may experience serious health effects. Stay indoors and keep activity levels low.";
  };

  // Get detailed instructions based on AQI level
  const getDetailedInstructions = (aqi) => {
    if (aqi <= 50) {
      return [
        "Enjoy outdoor activities",
        "Perfect air quality for exercising outside",
        "No restrictions needed",
        "Great day for outdoor picnics and gatherings"
      ];
    } else if (aqi <= 100) {
      return [
        "Consider reducing prolonged outdoor exertion if you have respiratory issues",
        "Keep windows closed during peak traffic hours",
        "Stay hydrated when outside",
        "Monitor symptoms if you have asthma or allergies"
      ];
    } else if (aqi <= 150) {
      return [
        "Sensitive groups should limit outdoor activities",
        "Consider wearing a mask if you have respiratory conditions",
        "Keep windows closed",
        "Use air purifiers indoors if available",
        "Avoid exercising near busy roads"
      ];
    } else if (aqi <= 200) {
      return [
        "Everyone should reduce outdoor activities",
        "Wear masks when outside (N95 or equivalent recommended)",
        "Keep windows and doors closed",
        "Use air purifiers indoors",
        "Consider rescheduling outdoor events",
        "Stay hydrated and watch for symptoms"
      ];
    } else if (aqi <= 300) {
      return [
        "Avoid all outdoor activities",
        "Wear masks when outside (N95 required)",
        "Keep all windows and doors closed",
        "Run air purifiers continuously",
        "Create a clean air room in your home",
        "Check on elderly neighbors and those with health conditions",
        "Follow local health advisories"
      ];
    } else {
      return [
        "Stay indoors and keep activity levels low",
        "Create a sealed clean air room with purifiers",
        "Wear N95 masks if you must go outside",
        "Follow emergency instructions from local authorities",
        "Seek medical help if experiencing difficulty breathing",
        "Evacuate area if advised by officials",
        "Minimize all physical exertion"
      ];
    }
  };

  return (
    <div style={{
      backgroundColor: darkMode ? '#1a202c' : '#f7fafc',
      color: darkMode ? '#fff' : '#1a202c',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        backgroundColor: darkMode ? '#2d3748' : '#fff',
        borderRadius: '0.5rem',
        padding: '1rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Air Quality Index</h1>
          <button onClick={toggleDarkMode} style={{
            padding: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '9999px',
            cursor: 'pointer'
          }}>
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* City Selection */}
        <div style={{ marginBottom: '1rem' }}>
          <select onChange={(e) => setCustomLocationName(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.25rem', width: '100%' }}>
            <option value="">Select a city</option>
            <option value="New York">New York</option>
            <option value="Los Angeles">Los Angeles</option>
            <option value="Chicago">Chicago</option>
            {/* Add more cities as needed */}
          </select>
          <button onClick={saveCustomLocation} style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3182ce',
            color: '#fff',
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer',
            marginTop: '0.5rem'
          }}>
            Select
          </button>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div style={{ backgroundColor: '#f56565', color: '#fff', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
            <h2>Alerts</h2>
            {alerts.map((alert, index) => (
              <p key={index}>{alert}</p>
            ))}
          </div>
        )}

        {loading && <p style={{ textAlign: 'center', padding: '2rem 0' }}>Loading air quality data...</p>}

        {error && (
          <div style={{
            backgroundColor: darkMode ? '#742a2a' : '#fff5f5',
            borderLeft: '4px solid #f56565',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: '#f56565', marginRight: '0.5rem' }}>⚠️</span>
              <p style={{ color: darkMode ? '#feb2b2' : '#c53030' }}>{error}</p>
            </div>
          </div>
        )}

        {aqiData && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: darkMode ? '#a0aec0' : '#718096' }}>
              <span>📍</span>
              <span>{aqiData.location}</span>
            </div>

            <div style={{
              width: '150px',
              height: '150px',
              margin: '0 auto',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: aqiData.aqi <= 50 ? '#48bb78' :
                aqiData.aqi <= 100 ? '#ecc94b' :
                  aqiData.aqi <= 150 ? '#ed8936' :
                    aqiData.aqi <= 200 ? '#f56565' :
                      aqiData.aqi <= 300 ? '#9f7aea' : '#e53e3e'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#fff' }}>{aqiData.aqi}</div>
                <div style={{ fontSize: '0.875rem', color: '#fff' }}>{aqiData.category}</div>
              </div>
            </div>

            {/* Recommendations Section */}
            <div style={{
              backgroundColor: darkMode ? '#4a5568' : '#f7fafc',
              padding: '1rem',
              borderRadius: '0.375rem'
            }}>
              <h2 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Health Recommendations</h2>
              <p>{getHealthRecommendation(aqiData.aqi)}</p>
            </div>

            {/* Detailed instructions */}
            <div style={{
              backgroundColor: darkMode ? '#4a5568' : '#f7fafc',
              padding: '1rem',
              borderRadius: '0.375rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ marginRight: '0.5rem' }}>ℹ️</span>
                <h2 style={{ fontWeight: '600' }}>What to Do</h2>
              </div>
              <ul style={{ paddingLeft: '1.5rem', listStyleType: 'disc' }}>
                {getDetailedInstructions(aqiData.aqi).map((instruction, index) => (
                  <li key={index} style={{ marginBottom: '0.25rem' }}>{instruction}</li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{
                backgroundColor: darkMode ? '#4a5568' : '#f7fafc',
                padding: '0.75rem',
                borderRadius: '0.375rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: darkMode ? '#a0aec0' : '#718096' }}>US AQI (PM2.5)</div>
                <div style={{ fontWeight: '600' }}>{aqiData.pollutants.pm25}</div>
              </div>
              <div style={{
                backgroundColor: darkMode ? '#4a5568' : '#f7fafc',
                padding: '0.75rem',
                borderRadius: '0.375rem'
              }}>
                <div style={{ fontSize: '0.875rem', color: darkMode ? '#a0aec0' : '#718096' }}>China AQI</div>
                <div style={{ fontWeight: '600' }}>{aqiData.pollutants.pm10}</div>
              </div>
            </div>

            <div style={{
              borderTop: `1px solid ${darkMode ? '#4a5568' : '#e2e8f0'}`,
              paddingTop: '1rem'
            }}>
              <button
                onClick={enableNotifications}
                disabled={notificationsEnabled}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  backgroundColor: notificationsEnabled
                    ? (darkMode ? '#4a5568' : '#edf2f7')
                    : '#4299e1',
                  color: notificationsEnabled
                    ? (darkMode ? '#a0aec0' : '#718096')
                    : '#fff',
                  border: 'none',
                  cursor: notificationsEnabled ? 'default' : 'pointer'
                }}
              >
                <span style={{ marginRight: '0.5rem' }}>🔔</span>
                {notificationsEnabled ? 'Notifications Enabled' : 'Enable Notifications'}
              </button>
            </div>

            <div style={{
              fontSize: '0.75rem',
              color: darkMode ? '#718096' : '#718096',
              textAlign: 'center'
            }}>
              Last updated: {new Date(aqiData.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* 24-Hour AQI Data Section */}
        {hourlyAqiData.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h2>24-Hour AQI Data</h2>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {hourlyAqiData.map((data, index) => (
                <li key={index} style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontWeight: 'bold' }}>{data.time}</span>: AQI {data.aqi}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <AQIDashboard />
    </div>
  );
}

export default App;