const functions = require('firebase-functions');
const admin = require('firebase-admin');

/**
 * Get App Settings for OAuth
 * Returns API credentials for a specific platform
 */
exports.getAppSettings = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }

  const { platform } = data;

  if (!platform) {
    throw new functions.https.HttpsError('invalid-argument', 'Platform is required');
  }

  // Validate platform
  const validPlatforms = ['youtube', 'facebook', 'instagram', 'tiktok'];
  if (!validPlatforms.includes(platform)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid platform');
  }

  try {
    // Get app settings from Firestore
    const settingsRef = admin.firestore().collection('appSettings').doc(platform);
    const settingsSnap = await settingsRef.get();

    if (!settingsSnap.exists) {
      throw new functions.https.HttpsError('not-found', `App settings for ${platform} not found. Please contact admin.`);
    }

    const settings = settingsSnap.data();

    // Return credentials based on platform
    let credentials = {};

    switch (platform) {
      case 'youtube':
        credentials = {
          clientId: settings.clientId,
          clientSecret: settings.clientSecret
        };
        break;

      case 'facebook':
      case 'instagram':
        credentials = {
          appId: settings.appId,
          appSecret: settings.appSecret
        };
        break;

      case 'tiktok':
        credentials = {
          clientKey: settings.clientKey,
          clientSecret: settings.clientSecret
        };
        break;
    }

    // Validate that credentials exist
    const missingFields = Object.entries(credentials).filter(([key, value]) => !value).map(([key]) => key);
    
    if (missingFields.length > 0) {
      throw new functions.https.HttpsError(
        'failed-precondition', 
        `Missing credentials: ${missingFields.join(', ')}. Please contact admin to configure ${platform} app settings.`
      );
    }

    return credentials;

  } catch (error) {
    console.error('Error getting app settings:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', error.message);
  }
});
