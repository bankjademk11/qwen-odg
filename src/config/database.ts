// Database Configuration
export const DATABASE_CONFIG = {
  // ใช้ environment variables สำหรับความปลอดภัย
  DATABASE_URL: process.env.REACT_APP_DATABASE_URL || 'postgresql://postgres:av@2030@103.002.225.15:2222/odg_text',
  
  // Configuration options
  connection: {
    host: '103.002.225.15',
    port: 2222,
    database: 'odg_text',
    user: 'postgres',
    password: 'av@2030',
  },
  
  // Pool settings
  pool: {
    min: 2,
    max: 10,
    acquire: 30000,
    idle: 10000
  }
};

// API Base URL - ในอนาคตจะเป็น backend API
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

// Headers สำหรับ API calls
export const API_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

export default DATABASE_CONFIG;