import { Platform } from 'react-native';

const DEV_API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5272/api'
  : 'http://localhost:5272/api';

const PROD_API_URL = 'https://vns-backend-api-bke3cvfjh7cmdmcp.japanwest-01.azurewebsites.net/api';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
