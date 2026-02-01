// Firebase Configuration for Desktop App
// Uses REST API to avoid Firebase Auth requirement (key-based auth)

const FIREBASE_PROJECT_ID = 'content-auto-post';
const API_KEY = 'AIzaSyDGEnGxtkor9PwWkgjiQvrr9SmZ_IHKapE';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ============================================
// Firestore Value Converters
// ============================================

function fromFirestoreValue(value) {
  if (!value) return null;
  
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return new Date(value.timestampValue);
  if (value.nullValue !== undefined) return null;
  
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(fromFirestoreValue);
  }
  
  if (value.mapValue) {
    const result = {};
    const fields = value.mapValue.fields || {};
    for (const key in fields) {
      result[key] = fromFirestoreValue(fields[key]);
    }
    return result;
  }
  
  return value;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map(toFirestoreValue)
      }
    };
  }
  if (typeof value === 'object') {
    const fields = {};
    for (const key in value) {
      fields[key] = toFirestoreValue(value[key]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
}

function parseDocument(doc) {
  const id = doc.name.split('/').pop();
  const data = {};
  
  if (doc.fields) {
    for (const key in doc.fields) {
      data[key] = fromFirestoreValue(doc.fields[key]);
    }
  }
  
  return { id, ...data };
}

// ============================================
// API Functions
// ============================================

/**
 * Fetch all projects for a user
 */
export async function fetchProjects(userId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('fetchProjects error:', error);
    throw error;
  }
}

/**
 * Fetch all global recipe blocks
 */
export async function fetchBlocks() {
  try {
    const url = `${FIRESTORE_BASE}/global_recipe_blocks?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('fetchBlocks error:', error);
    throw error;
  }
}

/**
 * Fetch a single block by name
 */
export async function fetchBlockByName(blockName) {
  try {
    // Query by name field
    const url = `${FIRESTORE_BASE}:runQuery?key=${API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'global_recipe_blocks' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'name' },
              op: 'EQUAL',
              value: { stringValue: blockName }
            }
          },
          limit: 1
        }
      })
    });
    
    const data = await response.json();
    
    if (data[0]?.document) {
      return parseDocument(data[0].document);
    }
    
    return null;
  } catch (error) {
    console.error('fetchBlockByName error:', error);
    throw error;
  }
}

/**
 * Fetch jobs for a project
 */
export async function fetchJobs(userId, projectId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects/${projectId}/jobs?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('fetchJobs error:', error);
    throw error;
  }
}

/**
 * Fetch ready prompts for a project
 */
export async function fetchReadyPrompts(userId, projectId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects/${projectId}/readyPrompts?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('fetchReadyPrompts error:', error);
    throw error;
  }
}

/**
 * Update job status
 */
export async function updateJobStatus(userId, projectId, jobId, status, additionalData = {}) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects/${projectId}/jobs/${jobId}?key=${API_KEY}`;
    
    const fields = {
      status: toFirestoreValue(status),
      updatedAt: toFirestoreValue(new Date()),
      ...Object.fromEntries(
        Object.entries(additionalData).map(([k, v]) => [k, toFirestoreValue(v)])
      )
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return parseDocument(data);
  } catch (error) {
    console.error('updateJobStatus error:', error);
    throw error;
  }
}

/**
 * Fetch posting schedule slots for a project
 */
export async function fetchSlots(userId, projectId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects/${projectId}/slots?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      return [];
    }
    
    return data.documents.map(parseDocument);
  } catch (error) {
    console.error('fetchSlots error:', error);
    throw error;
  }
}

/**
 * Update agent status (heartbeat)
 */
export async function updateAgentStatus(projectId, status) {
  try {
    const url = `${FIRESTORE_BASE}/agent_status/${projectId}?key=${API_KEY}`;
    
    const fields = {
      status: toFirestoreValue(status),
      lastHeartbeat: toFirestoreValue(new Date()),
      platform: toFirestoreValue('desktop')
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return true;
  } catch (error) {
    console.error('updateAgentStatus error:', error);
    throw error;
  }
}

/**
 * Fetch user-specific block settings (description, deleted status)
 */
export async function fetchUserBlockSettings(userId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/block_settings?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.warn('fetchUserBlockSettings warning:', data.error.message);
      return {};
    }
    
    if (!data.documents) {
      return {};
    }
    
    // Convert to map: { blockId: { description, deleted } }
    const settings = {};
    data.documents.forEach(doc => {
      const parsed = parseDocument(doc);
      settings[parsed.id] = parsed;
    });
    
    return settings;
  } catch (error) {
    console.error('fetchUserBlockSettings error:', error);
    return {};
  }
}

/**
 * Save user-specific block settings (description)
 */
export async function saveUserBlockSettings(userId, blockId, data) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/block_settings/${blockId}?key=${API_KEY}`;
    
    const fields = {};
    if (data.name !== undefined) fields.name = toFirestoreValue(data.name);
    if (data.description !== undefined) fields.description = toFirestoreValue(data.description);
    if (data.deleted !== undefined) fields.deleted = toFirestoreValue(data.deleted);
    fields.updatedAt = toFirestoreValue(new Date());
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    console.log('✅ Block settings saved:', blockId);
    return true;
  } catch (error) {
    console.error('saveUserBlockSettings error:', error);
    throw error;
  }
}

/**
 * Mark block as deleted for user
 */
export async function deleteUserBlock(userId, blockId) {
  return saveUserBlockSettings(userId, blockId, { deleted: true });
}

/**
 * Save instance settings (selectedBlockId) to Firestore
 */
export async function saveInstanceSettings(userId, instanceId, data) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/instance_settings/${instanceId}?key=${API_KEY}`;
    
    const fields = {};
    if (data.selectedBlockId !== undefined) fields.selectedBlockId = toFirestoreValue(data.selectedBlockId);
    if (data.selectedBlockName !== undefined) fields.selectedBlockName = toFirestoreValue(data.selectedBlockName);
    fields.updatedAt = toFirestoreValue(new Date());
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    const result = await response.json();
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    console.log('✅ Instance settings saved:', instanceId);
    return true;
  } catch (error) {
    console.error('saveInstanceSettings error:', error);
    throw error;
  }
}

/**
 * Fetch all instance settings for a user
 */
export async function fetchInstanceSettings(userId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/instance_settings?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error('fetchInstanceSettings error:', data.error);
      return {};
    }
    
    // Convert to map: { instanceId: { selectedBlockId, ... } }
    const settingsMap = {};
    if (data.documents) {
      data.documents.forEach(doc => {
        const parsed = parseDocument(doc);
        settingsMap[parsed.id] = parsed;
      });
    }
    
    console.log(`📊 Loaded ${Object.keys(settingsMap).length} instance settings`);
    return settingsMap;
  } catch (error) {
    console.error('fetchInstanceSettings error:', error);
    return {};
  }
}

/**
 * Create a new block in global_recipe_blocks
 */
export async function createBlock(blockData) {
  try {
    // Generate a unique ID
    const blockId = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const url = `${FIRESTORE_BASE}/global_recipe_blocks/${blockId}?key=${API_KEY}`;
    
    const fields = {
      name: toFirestoreValue(blockData.name),
      description: toFirestoreValue(blockData.description || ''),
      steps: toFirestoreValue(blockData.steps || []),
      createdAt: toFirestoreValue(new Date()),
      createdBy: toFirestoreValue(blockData.createdBy || 'admin')
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to create block');
    }
    
    console.log('✅ Block created:', blockId);
    return { success: true, blockId };
  } catch (error) {
    console.error('createBlock error:', error);
    throw error;
  }
}

export default {
  fetchProjects,
  fetchBlocks,
  fetchBlockByName,
  fetchJobs,
  fetchReadyPrompts,
  fetchSlots,
  updateJobStatus,
  updateAgentStatus,
  fetchUserBlockSettings,
  saveUserBlockSettings,
  deleteUserBlock,
  saveInstanceSettings,
  fetchInstanceSettings,
  createBlock
};
