const axios = require('axios');

const ALLEGRO_API_URL = process.env.ALLEGRO_API_URL || 'https://api.allegro.pl';

/**
 * Get shipping rates from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} List of shipping rates
 */
async function getShippingRates(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/sale/shipping-rates`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data.shippingRates || [];
  } catch (error) {
    console.error('Allegro get shipping rates error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get shipping rates');
  }
}

/**
 * Get return policies from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} List of return policies
 */
async function getReturnPolicies(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/after-sales-service-conditions/return-policies`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data.returnPolicies || [];
  } catch (error) {
    console.error('Allegro get return policies error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get return policies');
  }
}

/**
 * Get implied warranties from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} List of implied warranties
 */
async function getImpliedWarranties(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/after-sales-service-conditions/implied-warranties`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data.impliedWarranties || [];
  } catch (error) {
    console.error('Allegro get implied warranties error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get implied warranties');
  }
}

/**
 * Get warranties from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} List of warranties
 */
async function getWarranties(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/after-sales-service-conditions/warranties`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data.warranties || [];
  } catch (error) {
    console.error('Allegro get warranties error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get warranties');
  }
}

/**
 * Get responsible producers from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Array>} List of responsible producers
 */
async function getResponsibleProducers(accessToken) {
  try {
    const response = await axios.get(`${ALLEGRO_API_URL}/sale/responsible-producers`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.allegro.public.v1+json'
      }
    });
    return response.data.responsibleProducers || [];
  } catch (error) {
    // GPSR is a new feature, so if it fails (e.g. 404 or 403), we can just return empty array
    // to avoid scaring the user with "Server error"
    if (error.response?.status === 404 || error.response?.status === 403) {
      console.warn('Allegro GPSR (Responsible Producers) not available:', error.response?.data?.error || error.message);
      return [];
    }
    
    console.error('Allegro get responsible producers error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error_description || error.response?.data?.error || 'Failed to get responsible producers');
  }
}

/**
 * Get all settings options from Allegro
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} All settings options
 */
async function getAllSettingsOptions(accessToken) {
  try {
    const [shippingRates, returnPolicies, impliedWarranties, warranties, responsibleProducers] = await Promise.all([
      getShippingRates(accessToken).catch(() => []),
      getReturnPolicies(accessToken).catch(() => []),
      getImpliedWarranties(accessToken).catch(() => []),
      getWarranties(accessToken).catch(() => []),
      getResponsibleProducers(accessToken).catch(() => [])
    ]);

    return {
      shippingRates,
      returnPolicies,
      impliedWarranties,
      warranties,
      responsibleProducers
    };
  } catch (error) {
    console.error('Allegro get all settings options error:', error);
    throw error;
  }
}

module.exports = {
  getShippingRates,
  getReturnPolicies,
  getImpliedWarranties,
  getWarranties,
  getResponsibleProducers,
  getAllSettingsOptions
};

