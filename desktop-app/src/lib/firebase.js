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
 * Fetch expander by ID
 */
export async function fetchExpander(userId, expanderId) {
  try {
    if (!expanderId) return null;
    const url = `${FIRESTORE_BASE}/users/${userId}/expanders/${expanderId}?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.log('Expander not found:', expanderId);
      return null;
    }
    
    return parseDocument(data);
  } catch (error) {
    console.error('fetchExpander error:', error);
    return null;
  }
}

/**
 * Fetch posting schedule slots for a project
 */
export async function fetchSlots(userId, projectId) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/projects/${projectId}/slots?key=${API_KEY}`;
    console.log(`🔍 fetchSlots URL: ${url}`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`📥 fetchSlots response for ${projectId}:`, data);
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    if (!data.documents) {
      console.log(`⚠️ No slots documents for project ${projectId}`);
      return [];
    }
    
    const slots = data.documents.map(parseDocument);
    console.log(`✅ Parsed slots for ${projectId}:`, slots);
    return slots;
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
 * @param {Object} blockData - Block data with name, description, steps, type, platform, startUrl
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
      type: toFirestoreValue(blockData.type || 'video'),
      platform: toFirestoreValue(blockData.platform || null),
      startUrl: toFirestoreValue(blockData.startUrl || ''),
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

/**
 * Update an existing block in global_recipe_blocks
 * @param {string} blockId - The ID of the block to update
 * @param {Object} blockData - Updated block data
 */
export async function updateBlock(blockId, blockData) {
  try {
    const url = `${FIRESTORE_BASE}/global_recipe_blocks/${blockId}?key=${API_KEY}`;
    
    const fields = {
      name: toFirestoreValue(blockData.name),
      description: toFirestoreValue(blockData.description || ''),
      steps: toFirestoreValue(blockData.steps || []),
      type: toFirestoreValue(blockData.type || 'video'),
      platform: toFirestoreValue(blockData.platform || null),
      startUrl: toFirestoreValue(blockData.startUrl || ''),
      updatedAt: toFirestoreValue(new Date())
    };
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to update block');
    }
    
    console.log('✅ Block updated:', blockId);
    return { success: true, blockId };
  } catch (error) {
    console.error('updateBlock error:', error);
    throw error;
  }
}

// ============================================
// Execution Log Functions
// ============================================

/**
 * Save execution log to Firebase
 */
export async function saveExecutionLog(userId, logData) {
  try {
    const url = `${FIRESTORE_BASE}/users/${userId}/executionLogs?key=${API_KEY}`;
    
    const fields = {
      status: toFirestoreValue(logData.status), // 'success' | 'failed'
      projectId: toFirestoreValue(logData.projectId || ''),
      projectName: toFirestoreValue(logData.projectName || ''),
      instanceId: toFirestoreValue(logData.instanceId || ''),
      instanceName: toFirestoreValue(logData.instanceName || ''),
      blockId: toFirestoreValue(logData.blockId || ''),
      blockName: toFirestoreValue(logData.blockName || ''),
      startTime: toFirestoreValue(logData.startTime || new Date()),
      endTime: toFirestoreValue(logData.endTime || new Date()),
      duration: toFirestoreValue(logData.duration || 0), // milliseconds
      currentStep: toFirestoreValue(logData.currentStep || 0),
      totalSteps: toFirestoreValue(logData.totalSteps || 0),
      failedStep: toFirestoreValue(logData.failedStep || null),
      error: toFirestoreValue(logData.error || null),
      createdAt: toFirestoreValue(new Date())
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to save log');
    }
    
    const result = await response.json();
    const logId = result.name.split('/').pop();
    console.log('✅ Execution log saved:', logId);
    return { success: true, logId };
  } catch (error) {
    console.error('saveExecutionLog error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch execution logs for a user with optional date filter
 */
export async function fetchExecutionLogs(userId, filter = 'all') {
  try {
    // Calculate date range based on filter
    const now = new Date();
    let startDate = null;
    
    switch (filter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // all
    }
    
    let url = `${FIRESTORE_BASE}/users/${userId}/executionLogs?key=${API_KEY}&orderBy=createdAt desc&pageSize=100`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    let logs = (data.documents || []).map(parseDocument);
    
    // Filter by date if needed
    if (startDate) {
      logs = logs.filter(log => {
        const logDate = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt);
        return logDate >= startDate;
      });
    }
    
    return logs;
  } catch (error) {
    console.error('fetchExecutionLogs error:', error);
    return [];
  }
}

/**
 * Clear all execution logs for a user
 */
export async function clearExecutionLogs(userId) {
  try {
    // First fetch all logs
    const url = `${FIRESTORE_BASE}/users/${userId}/executionLogs?key=${API_KEY}&pageSize=500`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    const docs = data.documents || [];
    
    // Delete each log
    for (const doc of docs) {
      const deleteUrl = `https://firestore.googleapis.com/v1/${doc.name}?key=${API_KEY}`;
      await fetch(deleteUrl, { method: 'DELETE' });
    }
    
    console.log(`✅ Cleared ${docs.length} execution logs`);
    return { success: true, count: docs.length };
  } catch (error) {
    console.error('clearExecutionLogs error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  fetchProjects,
  fetchBlocks,
  fetchBlockByName,
  fetchJobs,
  fetchReadyPrompts,
  fetchSlots,
  fetchExpander,
  updateJobStatus,
  updateAgentStatus,
  fetchUserBlockSettings,
  saveUserBlockSettings,
  deleteUserBlock,
  saveInstanceSettings,
  fetchInstanceSettings,
  createBlock,
  updateBlock,
  saveExecutionLog,
  fetchExecutionLogs,
  clearExecutionLogs
};
