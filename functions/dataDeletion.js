const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

/**
 * Facebook Data Deletion Callback
 * Called when a user requests to delete their data via Facebook
 * https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
exports.dataDeletion = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { signed_request } = req.body;

    if (!signed_request) {
      console.error('No signed_request provided');
      res.status(400).json({ error: 'Missing signed_request' });
      return;
    }

    // Parse signed request from Facebook
    const [encodedSig, payload] = signed_request.split('.');
    const data = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    
    const userId = data.user_id;
    const algorithm = data.algorithm;

    console.log(`Data deletion request for Facebook user: ${userId}`);

    // Find user in Firestore by Facebook ID
    const usersRef = admin.firestore().collection('users');
    const snapshot = await usersRef
      .where('platforms.facebook.userId', '==', userId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const userDoc = snapshot.docs[0];
      const uid = userDoc.id;

      console.log(`Found user ${uid}, deleting Facebook data...`);

      // Delete Facebook platform data
      await usersRef.doc(uid).update({
        'platforms.facebook': admin.firestore.FieldValue.delete()
      });

      console.log(`Facebook data deleted for user ${uid}`);
    } else {
      console.log(`No user found with Facebook ID: ${userId}`);
    }

    // Generate confirmation code
    const confirmationCode = crypto.randomBytes(16).toString('hex');

    // Log deletion request
    await admin.firestore().collection('dataDeletionRequests').add({
      facebookUserId: userId,
      algorithm: algorithm,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      confirmationCode: confirmationCode,
      status: 'completed'
    });

    // Return confirmation URL as required by Facebook
    res.json({
      url: `https://aicontents.vip/privacy-policy?deletion=${confirmationCode}`,
      confirmation_code: confirmationCode
    });

  } catch (error) {
    console.error('Error processing data deletion:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});
