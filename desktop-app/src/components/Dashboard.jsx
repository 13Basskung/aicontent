import React, { useState, useEffect } from 'react';
import { 
  FolderOpen, Play, Plus, Settings, 
  Chrome, Trash2, RefreshCw, AlertCircle,
  CheckCircle, Clock, User, Shield, Edit3, X, Lock, Unlock, Search, ChevronDown,
  Calendar, Circle
} from 'lucide-react';
import SchedulerPanel from './SchedulerPanel';
import RecorderPanel from './RecorderPanel';

// Platform definitions (FB, YT, TikTok, IG)
const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', short: 'FB', color: 'bg-blue-600', icon: '📘' },
  { id: 'youtube', name: 'YouTube', short: 'YT', color: 'bg-red-600', icon: '▶️' },
  { id: 'tiktok', name: 'TikTok', short: 'TikTok', color: 'bg-black', icon: '🎵' },
  { id: 'instagram', name: 'Instagram', short: 'IG', color: 'bg-gradient-to-r from-purple-500 to-pink-500', icon: '📷' }
];
import { fetchProjects, fetchBlocks, fetchSlots, fetchUserBlockSettings, saveUserBlockSettings, deleteUserBlock, saveInstanceSettings, fetchInstanceSettings } from '../lib/firebase';

function Dashboard({ keyData }) {
  const [projects, setProjects] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [instances, setInstances] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({ open: false, instanceId: null, instanceName: '' });
  const [editingInstanceId, setEditingInstanceId] = useState(null);
  const [editingName, setEditingName] = useState('');
  
  // Block editing states (Admin only)
  const [blockEditModal, setBlockEditModal] = useState({ open: false, block: null });
  const [blockDeleteModal, setBlockDeleteModal] = useState({ open: false, block: null });
  const [hoveredBlockId, setHoveredBlockId] = useState(null);
  
  // Search states
  const [projectSearch, setProjectSearch] = useState('');
  const [instanceSearch, setInstanceSearch] = useState('');
  
  // Platform modal state (removed - now using Posting Schedule data)
  const [changingProjectId, setChangingProjectId] = useState(null);
  
  // Project slots cache (for platforms and scenes info)
  const [projectSlotsCache, setProjectSlotsCache] = useState({});
  
  // Active tab: 'instances' | 'scheduler' | 'recorder'
  const [activeTab, setActiveTab] = useState('instances');
  
  // Toast notification state (แทน native alert)
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // Block selection confirmation modal
  const [blockSelectModal, setBlockSelectModal] = useState({ 
    open: false, 
    instanceId: null, 
    instanceName: '',
    blockId: null, 
    blockName: '',
    blockDescription: ''
  });
  
  // Show toast helper
  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  }

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [keyData]);

  // Fetch slots for a project (NO cache - always fresh)
  async function loadProjectSlots(projectId) {
    try {
      console.log(`🔑 Fetching slots for project "${projectId}" using userId: ${keyData.userId}`);
      const slots = await fetchSlots(keyData.userId, projectId);
      console.log(`📅 Project "${projectId}" has ${slots.length} slots`);
      
      if (slots.length > 0) {
        slots.forEach((slot, i) => {
          console.log(`  Slot ${i}:`, {
            platforms: slot.platforms?.length || 0,
            scenes: slot.scenes,
            sceneDuration: slot.sceneDuration
          });
        });
      } else {
        console.log(`  ⚠️ No slots found for project "${projectId}"`);
      }
      
      setProjectSlotsCache(prev => ({ ...prev, [projectId]: slots }));
      return slots;
    } catch (err) {
      console.error(`Failed to load slots for project "${projectId}":`, err);
      setProjectSlotsCache(prev => ({ ...prev, [projectId]: [] }));
      return [];
    }
  }

  // Get aggregated platform info from slots (unique by accountId)
  function getProjectPlatformsFromSlots(slots) {
    if (!slots || slots.length === 0) return [];
    
    const platformMap = new Map();
    slots.forEach(slot => {
      if (slot.platforms && Array.isArray(slot.platforms)) {
        slot.platforms.forEach(p => {
          // Only add if has valid platformId and accountId, use accountId as unique key
          if (p.platformId && p.accountId) {
            const key = p.accountId; // unique per account
            if (!platformMap.has(key)) {
              platformMap.set(key, {
                id: p.accountId,
                platformId: p.platformId,
                name: p.name || '',
                avatar: p.avatar
              });
            }
          }
        });
      }
    });
    
    // Sort by platform order: FB, YT, TikTok, IG
    const order = ['facebook', 'youtube', 'tiktok', 'instagram'];
    return Array.from(platformMap.values()).sort((a, b) => 
      order.indexOf(a.platformId) - order.indexOf(b.platformId)
    );
  }

  // Get scenes info from slots (use first slot or max)
  function getScenesInfoFromSlots(slots) {
    if (!slots || slots.length === 0) return { scenes: 0, sceneDuration: 0 };
    
    // Use max scenes and first sceneDuration found
    let maxScenes = 0;
    let sceneDuration = 0;
    
    slots.forEach(slot => {
      if (slot.scenes > maxScenes) maxScenes = slot.scenes;
      if (!sceneDuration && slot.sceneDuration) sceneDuration = slot.sceneDuration;
    });
    
    return { scenes: maxScenes, sceneDuration: sceneDuration || 8 };
  }

  // Load slots for all instances' projects on mount
  useEffect(() => {
    async function loadAllSlots() {
      // Clear cache first to ensure fresh data
      setProjectSlotsCache({});
      
      const projectIds = [...new Set(instances.map(i => i.projectId))];
      console.log(`🔄 Loading slots for ${projectIds.length} unique projects:`, projectIds);
      
      for (const projectId of projectIds) {
        if (projectId) {
          await loadProjectSlots(projectId);
        }
      }
    }
    if (instances.length > 0) {
      loadAllSlots();
    }
  }, [instances]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      // Fetch projects for this user
      const projectsData = await fetchProjects(keyData.userId);
      setProjects(projectsData);
      
      // Create a map of valid projectIds for this user
      const validProjectIds = new Set(projectsData.map(p => p.id));
      console.log(`✅ Valid projectIds for user ${keyData.userId}:`, Array.from(validProjectIds));

      // Fetch global blocks + user-specific settings
      const [blocksData, userBlockSettings] = await Promise.all([
        fetchBlocks(),
        fetchUserBlockSettings(keyData.userId)
      ]);
      
      // Merge global blocks with user-specific settings (description, deleted)
      const mergedBlocks = blocksData
        .map(block => {
          const userSettings = userBlockSettings[block.id] || {};
          return {
            ...block,
            description: userSettings.description || block.description || '',
            deleted: userSettings.deleted || false
          };
        })
        .filter(block => !block.deleted); // Filter out deleted blocks
      
      console.log(`📦 Loaded ${mergedBlocks.length} blocks (${blocksData.length - mergedBlocks.length} deleted)`);
      setBlocks(mergedBlocks);

      // Load instances from store - FILTER only instances that belong to this user's projects
      if (window.electronAPI) {
        const storedInstances = await window.electronAPI.store.get('instances') || {};
        const allInstances = Object.values(storedInstances);
        
        // Filter instances: keep only those with projectId matching this user's projects
        const validInstances = allInstances.filter(instance => {
          const isValid = validProjectIds.has(instance.projectId);
          if (!isValid) {
            console.log(`🚫 Filtering out instance "${instance.customName || instance.projectName}" - projectId ${instance.projectId} not found in user's projects`);
          }
          return isValid;
        });
        
        // Load instance settings from Firestore (selectedBlockId)
        const instanceSettings = await fetchInstanceSettings(keyData.userId);
        
        // Merge instance settings with instances
        const instancesWithSettings = validInstances.map(instance => {
          const settings = instanceSettings[instance.id];
          if (settings?.selectedBlockId) {
            console.log(`� Instance "${instance.customName || instance.projectName}" has saved block: ${settings.selectedBlockId}`);
            return { ...instance, selectedBlockId: settings.selectedBlockId };
          }
          return instance;
        });
        
        console.log(`📊 Loaded ${instancesWithSettings.length}/${allInstances.length} instances for this user`);
        setInstances(instancesWithSettings);
        
        // Update store to remove invalid instances
        if (validInstances.length !== allInstances.length) {
          const updatedStore = {};
          validInstances.forEach(i => { updatedStore[i.id] = i; });
          await window.electronAPI.store.set('instances', updatedStore);
          console.log('🧹 Cleaned up invalid instances from store');
        }
      }
    } catch (err) {
      console.error('Load data error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Create new Chrome instance
  async function createInstance() {
    if (!selectedProject) {
      alert('กรุณาเลือก Project ก่อน');
      return;
    }

    const instanceId = `instance_${Date.now()}`;
    const newInstance = {
      id: instanceId,
      projectId: selectedProject.id,
      projectName: selectedProject.name,
      status: 'launching',
      createdAt: Date.now()
    };

    // Save to store
    if (window.electronAPI) {
      const current = await window.electronAPI.store.get('instances') || {};
      current[instanceId] = newInstance;
      await window.electronAPI.store.set('instances', current);
    }

    setInstances(prev => [...prev, newInstance]);

    // Launch Playwright Chrome instance
    if (window.electronAPI) {
      const result = await window.electronAPI.playwright.launchInstance({
        instanceId,
        projectId: selectedProject.id,
        projectName: selectedProject.name
      });

      if (result.success) {
        // Update instance status to idle (ready to run blocks)
        setInstances(prev => prev.map(i => 
          i.id === instanceId ? { ...i, status: 'idle' } : i
        ));
      } else {
        alert(`❌ ไม่สามารถเปิด Chrome ได้: ${result.error}`);
        // Remove failed instance
        setInstances(prev => prev.filter(i => i.id !== instanceId));
      }
    }
  }

  // Show delete confirmation modal
  function showDeleteModal(instance) {
    setDeleteModal({
      open: true,
      instanceId: instance.id,
      instanceName: instance.customName || instance.projectName
    });
  }

  // Confirm delete instance
  async function confirmDeleteInstance() {
    const { instanceId } = deleteModal;
    if (!instanceId) return;

    // Close Playwright instance first
    if (window.electronAPI) {
      await window.electronAPI.playwright.closeInstance(instanceId);
      
      // Remove from store
      const current = await window.electronAPI.store.get('instances') || {};
      delete current[instanceId];
      await window.electronAPI.store.set('instances', current);
    }

    setInstances(prev => prev.filter(i => i.id !== instanceId));
    setDeleteModal({ open: false, instanceId: null, instanceName: '' });
  }

  // Rename instance
  async function renameInstance(instanceId, newName) {
    if (!newName.trim()) return;

    // Update in store
    if (window.electronAPI) {
      const current = await window.electronAPI.store.get('instances') || {};
      if (current[instanceId]) {
        current[instanceId].customName = newName.trim();
        await window.electronAPI.store.set('instances', current);
      }
    }

    setInstances(prev => prev.map(i => 
      i.id === instanceId ? { ...i, customName: newName.trim() } : i
    ));
    setEditingInstanceId(null);
    setEditingName('');
  }

  // Change project of instance
  async function changeInstanceProject(instanceId, newProject) {
    if (!newProject) return;

    // Update in store
    if (window.electronAPI) {
      const current = await window.electronAPI.store.get('instances') || {};
      if (current[instanceId]) {
        current[instanceId].projectId = newProject.id;
        current[instanceId].projectName = newProject.name;
        await window.electronAPI.store.set('instances', current);
      }
    }

    setInstances(prev => prev.map(i => 
      i.id === instanceId ? { ...i, projectId: newProject.id, projectName: newProject.name } : i
    ));
    setChangingProjectId(null);
    
    // Load slots for new project
    loadProjectSlots(newProject.id);
  }

  // Run block on instance (with auto re-launch if closed)
  async function runBlock(instanceId, block) {
    const instance = instances.find(i => i.id === instanceId);
    if (!instance) return;

    // Update status to executing (disables Play button)
    setInstances(prev => prev.map(i => 
      i.id === instanceId ? { ...i, status: 'executing' } : i
    ));

    try {
      // Fetch prompts/variables for this project
      const prompts = []; // TODO: fetch from Firebase
      const variables = {
        prompt: prompts[0] || '',
        sceneIndex: 0
      };

      let result = await window.electronAPI.playwright.runBlock(instanceId, block, variables);
      
      // If instance not found, try to re-launch it
      if (!result.success && result.error === 'Instance not found') {
        console.log(`🔄 Re-launching closed instance: ${instanceId}`);
        setInstances(prev => prev.map(i => 
          i.id === instanceId ? { ...i, status: 'launching' } : i
        ));
        
        // Re-launch the instance
        const launchResult = await window.electronAPI.playwright.launchInstance({
          instanceId,
          projectId: instance.projectId,
          projectName: instance.projectName
        });
        
        if (launchResult.success) {
          // Wait a bit for Chrome to be ready
          await new Promise(r => setTimeout(r, 2000));
          
          // Try running the block again
          result = await window.electronAPI.playwright.runBlock(instanceId, block, variables);
        } else {
          alert(`❌ ไม่สามารถเปิด Chrome ใหม่ได้: ${launchResult.error}`);
          setInstances(prev => prev.map(i => 
            i.id === instanceId ? { ...i, status: 'idle' } : i
          ));
          return;
        }
      }
      
      if (result.success) {
        alert(`✅ Block "${block.name}" รันสำเร็จ!`);
      } else {
        alert(`❌ Block "${block.name}" ล้มเหลว: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }

    // Reset status
    setInstances(prev => prev.map(i => 
      i.id === instanceId ? { ...i, status: 'idle' } : i
    ));
  }

  // Block editing functions (Admin only)
  async function handleEditBlock(block) {
    setBlockEditModal({ open: true, block: { ...block, description: block.description || '' } });
  }

  async function handleDeleteBlock(block) {
    setBlockDeleteModal({ open: true, block });
  }
  
  // Test block - Run full execution (video + platform blocks)
  async function handleTestBlock(block) {
    // Check if instance is selected in RecorderPanel
    // For now, show alert - this will be connected to RecorderPanel later
    alert(`ทดสอบ Block: ${block.name}\n\nกรุณาเลือก Instance ในส่วน Recorder แล้วกดทดสอบอีกครั้ง`);
    console.log('🧪 Test block requested:', block);
  }

  async function saveBlockEdit() {
    const { block } = blockEditModal;
    if (!block) {
      console.error('No block to save');
      return;
    }
    
    console.log('📝 Saving block:', block.id, block.name, block.description);
    
    try {
      // Save to Firestore FIRST for persistence
      const result = await saveUserBlockSettings(keyData.userId, block.id, {
        name: block.name,
        description: block.description || ''
      });
      console.log('✅ Block saved to Firestore:', block.id, result);
      
      // Then update block in local state
      const updatedBlocks = blocks.map(b => 
        b.id === block.id ? { ...b, name: block.name, description: block.description || '' } : b
      );
      setBlocks(updatedBlocks);
      
      setBlockEditModal({ open: false, block: null });
      showToast('บันทึกสำเร็จ!', 'success');
    } catch (error) {
      console.error('Save block error:', error);
      showToast('บันทึกไม่สำเร็จ: ' + error.message, 'error');
    }
  }

  async function confirmDeleteBlock() {
    const { block } = blockDeleteModal;
    if (!block) {
      console.error('No block to delete');
      return;
    }
    
    console.log('🗑️ Deleting block:', block.id, block.name);
    
    try {
      // Mark as deleted in Firestore FIRST (persistent)
      const result = await deleteUserBlock(keyData.userId, block.id);
      console.log('✅ Block marked as deleted in Firestore:', block.id, result);
      
      // Then remove block from local state
      const updatedBlocks = blocks.filter(b => b.id !== block.id);
      setBlocks(updatedBlocks);
      if (selectedBlock?.id === block.id) {
        setSelectedBlock(null);
      }
      
      setBlockDeleteModal({ open: false, block: null });
      showToast('ลบสำเร็จ!', 'success');
    } catch (error) {
      console.error('Delete block error:', error);
      showToast('ลบไม่สำเร็จ: ' + error.message, 'error');
    }
  }

  // Run block on ALL instances (parallel)
  async function runAllInstances() {
    if (!selectedBlock || instances.length === 0) return;

    // Update all to executing
    setInstances(prev => prev.map(i => ({ ...i, status: 'executing' })));

    try {
      // Prepare variables per instance
      const variablesPerInstance = {};
      instances.forEach(inst => {
        variablesPerInstance[inst.id] = {
          prompt: '',
          sceneIndex: 0
        };
      });

      const result = await window.electronAPI.instanceManager.runAll(selectedBlock, variablesPerInstance);
      
      if (result.success) {
        const successCount = result.results.filter(r => r.success).length;
        alert(`✅ รันสำเร็จ ${successCount}/${result.results.length} instances`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    }

    // Reset all to idle
    setInstances(prev => prev.map(i => ({ ...i, status: 'idle' })));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto mb-3" />
          <p className="text-white/50">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Info */}
      <div className="glass rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${keyData.isAdmin ? 'bg-purple-500/30' : 'bg-blue-500/30'}`}>
            {keyData.isAdmin ? <Shield className="w-5 h-5 text-purple-400" /> : <User className="w-5 h-5 text-blue-400" />}
          </div>
          <div>
            <p className="text-white font-medium">
              {keyData.isAdmin ? 'Admin Mode' : 'User Mode'}
            </p>
            <p className="text-white/50 text-sm">ID: {keyData.userId}</p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition"
          title="รีเฟรช"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass rounded-xl p-4 border border-red-500/30 bg-red-500/10">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs Navigation - Moved here (under Admin Mode) */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl">
        <button
          onClick={() => setActiveTab('instances')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'instances' 
              ? 'bg-white/10 text-white' 
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <Chrome className="w-4 h-4" />
          Instances
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            activeTab === 'scheduler' 
              ? 'bg-white/10 text-white' 
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Scheduler
        </button>
        {keyData?.isAdmin && (
          <button
            onClick={() => setActiveTab('recorder')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'recorder' 
                ? 'bg-white/10 text-white' 
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Circle className="w-4 h-4" />
            Recorder
          </button>
        )}
      </div>

      {/* Tab Content: Scheduler */}
      {activeTab === 'scheduler' && (
        <SchedulerPanel keyData={keyData} instances={instances} />
      )}

      {/* Tab Content: Recorder (Admin only) */}
      {activeTab === 'recorder' && keyData?.isAdmin && (
        <RecorderPanel keyData={keyData} instances={instances} onBlockCreated={loadData} />
      )}

      {/* Projects Section - Only show on Instances tab */}
      {activeTab === 'instances' && (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-red-400" />
            Projects ({projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).length})
          </h2>
          {/* Search Projects */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="ค้นหา Project..."
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 w-48"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())).map(project => (
            <button
              key={project.id}
              onClick={() => setSelectedProject(project)}
              className={`glass rounded-xl p-4 text-left transition hover:bg-white/20 ${
                selectedProject?.id === project.id ? 'ring-2 ring-red-500 bg-red-500/10' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium">{project.name}</h3>
                  <p className="text-white/50 text-sm mt-1 line-clamp-2">{project.concept || 'ไม่มีคำอธิบาย'}</p>
                </div>
                {/* SCENES & Duration boxes */}
                {(() => {
                  const slots = projectSlotsCache[project.id] || [];
                  const scenesInfo = getScenesInfoFromSlots(slots);
                  if (scenesInfo.scenes === 0) return null;
                  return (
                    <div className="flex items-center gap-1.5 ml-2">
                      <div className="bg-slate-800/80 border border-purple-500/30 rounded px-2 py-1 text-center">
                        <div className="text-white/50 text-[8px] uppercase">SCENES</div>
                        <div className="text-white font-semibold text-xs">{scenesInfo.scenes}</div>
                      </div>
                      <div className="bg-slate-800/80 border border-purple-500/30 rounded px-2 py-1 text-center">
                        <div className="text-white/50 text-[8px] uppercase">วินาที/ชิ้น</div>
                        <div className="text-white font-semibold text-xs">{scenesInfo.sceneDuration}</div>
                      </div>
                    </div>
                  );
                })()}
                {selectedProject?.id === project.id && (
                  <CheckCircle className="w-5 h-5 text-red-400 flex-shrink-0 ml-2" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <span className={`w-2 h-2 rounded-full ${project.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                  {project.status === 'active' ? 'มีงานวันนี้' : 'ไม่มีงานวันนี้'}
                </span>
              </div>
            </button>
          ))}

          {projects.length === 0 && (
            <div className="col-span-full text-center py-8 text-white/30">
              ไม่พบ Project - สร้าง Project ได้ที่เว็บไซต์
            </div>
          )}
        </div>
      </section>
      )}

      {/* Instance ล็อกกับ Project ที่เลือก */}
      {activeTab === 'instances' && selectedProject && (
        <section className="glass rounded-xl p-4 border border-green-500/30 bg-green-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-green-300 text-sm">Instance ล็อคกับ:</p>
                <p className="text-white font-semibold">{selectedProject.name}</p>
              </div>
            </div>
            <p className="text-white/50 text-xs">
              💡 Automation จะทำงานเฉพาะโปรเจคนี้เท่านั้น
            </p>
          </div>
        </section>
      )}

      {/* Chrome Instances Section - Only show on Instances tab */}
      {activeTab === 'instances' && (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Chrome className="w-5 h-5 text-blue-400" />
            Chrome Instances ({instances.filter(i => {
              const matchesSearch = (i.customName || i.projectName).toLowerCase().includes(instanceSearch.toLowerCase());
              const matchesProject = !selectedProject || i.projectId === selectedProject.id;
              return matchesSearch && matchesProject;
            }).length})
          </h2>
          <div className="flex items-center gap-2">
            {/* Search Instances */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="ค้นหา Instance..."
                value={instanceSearch}
                onChange={(e) => setInstanceSearch(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-1.5 text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
              />
            </div>
            {instances.filter(i => selectedProject && i.projectId === selectedProject.id).length > 1 && (
              <button
                onClick={runAllInstances}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white text-sm font-medium rounded-lg transition"
              >
                <Play className="w-4 h-4" />
                Run All
              </button>
            )}
            <button
              onClick={createInstance}
              disabled={!selectedProject}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              สร้าง Instance
            </button>
          </div>
        </div>

        {!selectedProject && (
          <div className="glass rounded-xl p-4 border border-yellow-500/20 bg-yellow-500/10 mb-3">
            <p className="text-yellow-200/70 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              เลือก Project ก่อนสร้าง Chrome Instance
            </p>
          </div>
        )}

        <div className="space-y-3">
          {instances
            .filter(i => (i.customName || i.projectName).toLowerCase().includes(instanceSearch.toLowerCase()))
            .sort((a, b) => {
              // Sort: instances locked to current project first
              if (!selectedProject) return 0;
              const aIsCurrent = a.projectId === selectedProject.id;
              const bIsCurrent = b.projectId === selectedProject.id;
              if (aIsCurrent && !bIsCurrent) return -1;
              if (!aIsCurrent && bIsCurrent) return 1;
              return 0;
            })
            .map(instance => {
            const isLockedToCurrentProject = selectedProject && instance.projectId === selectedProject.id;
            const isLockedToOtherProject = selectedProject && instance.projectId !== selectedProject.id;
            
            return (
              <div 
                key={instance.id} 
                className={`glass rounded-xl p-4 ${
                  isLockedToOtherProject ? 'opacity-50 border border-white/10' : 
                  isLockedToCurrentProject ? 'border border-green-500/30' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isLockedToOtherProject ? 'bg-gray-500/30' :
                      instance.status === 'idle' ? 'bg-green-500/30' : 
                      instance.status === 'executing' ? 'bg-yellow-500/30' : 'bg-white/10'
                    }`}>
                      {isLockedToOtherProject ? (
                        <Lock className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Chrome className={`w-5 h-5 ${
                          instance.status === 'idle' ? 'text-green-400' : 
                          instance.status === 'executing' ? 'text-yellow-400 animate-pulse' : 'text-white/50'
                        }`} />
                      )}
                    </div>
                    <div className="flex-1">
                      {editingInstanceId === instance.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') renameInstance(instance.id, editingName);
                              if (e.key === 'Escape') { setEditingInstanceId(null); setEditingName(''); }
                            }}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            autoFocus
                          />
                          <button
                            onClick={() => renameInstance(instance.id, editingName)}
                            className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded text-green-400"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingInstanceId(null); setEditingName(''); }}
                            className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium">{instance.customName || instance.projectName}</p>
                          {!isLockedToOtherProject && (
                            <button
                              onClick={() => { setEditingInstanceId(instance.id); setEditingName(instance.customName || instance.projectName); }}
                              className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition"
                              title="เปลี่ยนชื่อ"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {/* Project Lock with Change Option */}
                      <div className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-white/30" />
                        {changingProjectId === instance.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const proj = projects.find(p => p.id === e.target.value);
                                if (proj) changeInstanceProject(instance.id, proj);
                              }}
                              className="bg-slate-800 border border-white/20 rounded px-2 py-0.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                              style={{ colorScheme: 'dark' }}
                              autoFocus
                            >
                              <option value="">เลือก Project ใหม่...</option>
                              {projects.map(p => (
                                <option key={p.id} value={p.id} className="bg-slate-800">{p.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => setChangingProjectId(null)}
                              className="p-0.5 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <p className={`text-xs ${
                              isLockedToCurrentProject ? 'text-green-400' : 
                              isLockedToOtherProject ? 'text-orange-400' : 'text-white/50'
                            }`}>
                              ล็อคกับ: {instance.projectName}
                              {isLockedToCurrentProject && ' ✓'}
                            </p>
                            <button
                              onClick={() => setChangingProjectId(instance.id)}
                              className="px-1.5 py-0.5 bg-purple-500/20 hover:bg-purple-500/30 rounded text-purple-400 text-xs transition"
                              title="เปลี่ยน Project"
                            >
                              เปลี่ยน
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Platforms from Posting Schedule */}
                      {(() => {
                        const slots = projectSlotsCache[instance.projectId] || [];
                        const platforms = getProjectPlatformsFromSlots(slots);
                        const scenesInfo = getScenesInfoFromSlots(slots);
                        
                        // Debug: log what we're showing
                        console.log(`📊 Instance ${instance.id} (project: ${instance.projectId}): slots=${slots.length}, platforms=${platforms.length}`);
                        
                        // Don't show anything if no platforms configured
                        if (platforms.length === 0) {
                          return null;
                        }
                        
                        return (
                          <>
                            {/* Platform badges with channel names - horizontal layout */}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {platforms.map(p => {
                                const platformDef = PLATFORMS.find(pd => pd.id === p.platformId);
                                if (!platformDef) return null;
                                return (
                                  <div key={p.id} className="flex items-center gap-1" title={p.name || platformDef.name}>
                                    <span className={`px-1.5 py-0.5 rounded text-xs text-white ${platformDef.color}`}>
                                      {platformDef.short}
                                    </span>
                                    {p.name && (
                                      <span className="text-white/50 text-xs max-w-[100px] truncate">{p.name}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isLockedToOtherProject && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        instance.status === 'executing' ? 'bg-yellow-500/20 text-yellow-300' :
                        instance.status === 'idle' ? 'bg-green-500/20 text-green-300' :
                        instance.status === 'launching' ? 'bg-blue-500/20 text-blue-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {instance.status === 'idle' ? 'ready' : instance.status}
                      </span>
                    )}
                    
                    <button
                      onClick={() => showDeleteModal(instance)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition"
                      title="ลบ Instance"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Block Selector - Only for current project's instances */}
                {isLockedToCurrentProject && (
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white/50 text-xs">Block:</span>
                      <div className="relative flex-1 max-w-[200px]">
                        <select
                          value={instance.selectedBlockId || ''}
                          onChange={(e) => {
                            const blockId = e.target.value;
                            const block = blocks.find(b => b.id === blockId);
                            
                            // Only show popup if selecting a different block (not same or empty)
                            if (blockId && blockId !== instance.selectedBlockId) {
                              setBlockSelectModal({
                                open: true,
                                instanceId: instance.id,
                                instanceName: instance.customName || instance.projectName,
                                blockId: blockId,
                                blockName: block?.name || '',
                                blockDescription: block?.description || ''
                              });
                            }
                          }}
                          className="w-full appearance-none bg-slate-800 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 cursor-pointer"
                          style={{ colorScheme: 'dark' }}
                        >
                          <option value="" className="bg-slate-800 text-white/50">-- เลือก Block --</option>
                          {blocks.map(block => (
                            <option key={block.id} value={block.id} className="bg-slate-800 text-white py-2">
                              {block.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const block = blocks.find(b => b.id === instance.selectedBlockId);
                          if (block) runBlock(instance.id, block);
                        }}
                        disabled={!instance.selectedBlockId || instance.status === 'executing'}
                        className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
                      >
                        <Play className="w-4 h-4" />
                        TEST RUN
                      </button>
                    </div>
                  </div>
                )}

                {/* Locked to other project message */}
                {isLockedToOtherProject && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-orange-400/70 text-xs flex items-center gap-2">
                      <Lock className="w-3 h-3" />
                      Instance นี้ล็อคกับโปรเจคอื่น - เลือกโปรเจค "{instance.projectName}" เพื่อใช้งาน
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {instances.length === 0 && (
            <div className="text-center py-8 text-white/30 glass rounded-xl">
              ยังไม่มี Chrome Instance - กดปุ่ม "สร้าง Instance" เพื่อเริ่มต้น
            </div>
          )}
        </div>
      </section>
      )}

      {/* Available Blocks Section - Instances tab (View-only, Video blocks only) */}
      {activeTab === 'instances' && (
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" />
            🎬 สร้างวีดีโอ Blocks ({blocks.filter(b => b.type !== 'platform').length})
          </h2>
          {selectedBlock && (
            <span className="text-sm text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full">
              Selected: {selectedBlock.name}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {blocks.filter(b => b.type !== 'platform').map(block => (
            <div
              key={block.id}
              className="relative group"
              onMouseEnter={() => setHoveredBlockId(block.id)}
              onMouseLeave={() => setHoveredBlockId(null)}
            >
              <button
                onClick={() => setSelectedBlock(block)}
                className={`w-full rounded-lg p-3 text-left transition bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 ${
                  selectedBlock?.id === block.id ? 'ring-2 ring-purple-500 bg-purple-500/30' : ''
                }`}
              >
                <p className="text-white text-sm font-medium truncate">{block.name}</p>
                <p className="text-purple-300/70 text-xs mt-1">{block.steps?.length || 0} steps</p>
              </button>
              
              {/* Tooltip with description (View-only) */}
              {hoveredBlockId === block.id && block.description && (
                <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50 text-xs text-white/80">
                  {block.description}
                </div>
              )}
            </div>
          ))}
        </div>
        {blocks.length === 0 && (
          <div className="text-center py-4 text-white/30 glass rounded-xl">
            ไม่พบ Blocks
          </div>
        )}
      </section>
      )}

      {/* Available Blocks Section - Recorder tab (Admin with Edit/Delete) - 2 Column Layout */}
      {activeTab === 'recorder' && keyData?.isAdmin && (
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: Video Blocks */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">🎬</span>
              <h3 className="text-white font-semibold">สร้างวีดีโอ ({blocks.filter(b => b.type !== 'platform').length})</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {blocks.filter(b => b.type !== 'platform').map(block => (
                <div
                  key={block.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredBlockId(block.id)}
                  onMouseLeave={() => setHoveredBlockId(null)}
                >
                  <div className="w-full rounded-lg p-3 text-left transition bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30">
                    <p className="text-white text-sm font-medium truncate">{block.name}</p>
                    <p className="text-purple-300/70 text-xs mt-1">{block.steps?.length || 0} steps</p>
                  </div>
                  
                  {hoveredBlockId === block.id && block.description && (
                    <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50 text-xs text-white/80">
                      {block.description}
                    </div>
                  )}
                  
                  {hoveredBlockId === block.id && (
                    <div className="absolute top-1 right-1 flex gap-1 z-10">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleTestBlock(block); }}
                        className="p-1.5 bg-green-500/80 hover:bg-green-500 rounded-md transition"
                        title="ทดสอบ"
                      >
                        <Play className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditBlock(block); }}
                        className="p-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-md transition"
                        title="แก้ไข"
                      >
                        <Edit3 className="w-3 h-3 text-white" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block); }}
                        className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-md transition"
                        title="ลบ"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {blocks.filter(b => b.type !== 'platform').length === 0 && (
              <div className="text-center py-4 text-white/30">ไม่พบ Blocks สร้างวีดีโอ</div>
            )}
          </div>
          
          {/* Right Column: Platform Blocks */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">📤</span>
              <h3 className="text-white font-semibold">Platform Blocks ({blocks.filter(b => b.type === 'platform').length})</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {blocks.filter(b => b.type === 'platform').map(block => {
                const platformColors = {
                  youtube: 'bg-red-600/20 border-red-500/50 hover:bg-red-600/30',
                  tiktok: 'bg-black/50 border-white/20 hover:bg-black/70',
                  facebook: 'bg-blue-600/20 border-blue-500/50 hover:bg-blue-600/30',
                  instagram: 'bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-pink-500/50 hover:from-purple-600/30 hover:to-pink-600/30'
                };
                const platformIcons = { youtube: '▶️', tiktok: '🎵', facebook: '📘', instagram: '📷' };
                const colorClass = platformColors[block.platform] || 'bg-white/10 border-white/20';
                const icon = platformIcons[block.platform] || '📤';
                
                return (
                  <div
                    key={block.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredBlockId(block.id)}
                    onMouseLeave={() => setHoveredBlockId(null)}
                  >
                    <div className={`w-full rounded-lg p-3 text-left transition border ${colorClass}`}>
                      <div className="flex items-center gap-2">
                        <span>{icon}</span>
                        <p className="text-white text-sm font-medium truncate">{block.name}</p>
                      </div>
                      <p className="text-white/50 text-xs mt-1">{block.steps?.length || 0} steps</p>
                    </div>
                    
                    {hoveredBlockId === block.id && block.description && (
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50 text-xs text-white/80">
                        {block.description}
                      </div>
                    )}
                    
                    {hoveredBlockId === block.id && (
                      <div className="absolute top-1 right-1 flex gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTestBlock(block); }}
                          className="p-1.5 bg-green-500/80 hover:bg-green-500 rounded-md transition"
                          title="ทดสอบ"
                        >
                          <Play className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditBlock(block); }}
                          className="p-1.5 bg-blue-500/80 hover:bg-blue-500 rounded-md transition"
                          title="แก้ไข"
                        >
                          <Edit3 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block); }}
                          className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-md transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {blocks.filter(b => b.type === 'platform').length === 0 && (
              <div className="text-center py-4 text-white/30">ไม่พบ Platform Blocks</div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Block Selection Confirmation Modal */}
      {blockSelectModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-purple-500/30 bg-gradient-to-br from-purple-900/50 to-slate-900/90">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Settings className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">ยืนยันการเลือก Block</h3>
                <p className="text-white/50 text-sm">Block นี้จะถูกใช้สำหรับ Instance นี้</p>
              </div>
            </div>
            
            <div className="bg-white/5 rounded-xl p-4 mb-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-sm">Instance:</span>
                <span className="text-white font-medium">{blockSelectModal.instanceName}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-sm">Block:</span>
                <span className="text-purple-300 font-medium">{blockSelectModal.blockName}</span>
              </div>
              {blockSelectModal.blockDescription && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <span className="text-white/50 text-xs block mb-1">รายละเอียด:</span>
                  <p className="text-white/80 text-sm">{blockSelectModal.blockDescription}</p>
                </div>
              )}
            </div>

            <p className="text-white/60 text-sm mb-6 flex items-center gap-2">
              <span className="text-yellow-400">⚠️</span>
              การเลือกนี้จะถูกบันทึกและใช้งานทันที
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBlockSelectModal({ open: false, instanceId: null, instanceName: '', blockId: null, blockName: '', blockDescription: '' })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  const { instanceId, blockId, blockName } = blockSelectModal;
                  
                  try {
                    // Save to Firestore
                    await saveInstanceSettings(keyData.userId, instanceId, { 
                      selectedBlockId: blockId,
                      selectedBlockName: blockName
                    });
                    
                    // Update local state
                    setInstances(prev => prev.map(i => 
                      i.id === instanceId ? { ...i, selectedBlockId: blockId } : i
                    ));
                    
                    showToast(`✅ บันทึก Block "${blockName}" สำเร็จ`, 'success');
                  } catch (error) {
                    console.error('Failed to save block selection:', error);
                    showToast(`❌ บันทึกไม่สำเร็จ: ${error.message}`, 'error');
                  }
                  
                  setBlockSelectModal({ open: false, instanceId: null, instanceName: '', blockId: null, blockName: '', blockDescription: '' });
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-lg transition font-medium"
              >
                ✓ ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">ยืนยันการลบ</h3>
                <p className="text-white/50 text-sm">Instance นี้จะถูกลบถาวร</p>
              </div>
            </div>
            
            <p className="text-white/70 mb-6">
              คุณต้องการลบ Instance "<span className="text-white font-medium">{deleteModal.instanceName}</span>" หรือไม่?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ open: false, instanceId: null, instanceName: '' })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteInstance}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
              >
                ลบ Instance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Edit Modal (Admin only) */}
      {blockEditModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Edit3 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">แก้ไข Block</h3>
                <p className="text-white/50 text-sm">แก้ไขชื่อและรายละเอียด</p>
              </div>
            </div>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-white/70 text-sm mb-1">ชื่อ Block</label>
                <input
                  type="text"
                  value={blockEditModal.block?.name || ''}
                  onChange={(e) => setBlockEditModal(prev => ({ ...prev, block: { ...prev.block, name: e.target.value } }))}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-white/70 text-sm mb-1">รายละเอียด (แสดงเมื่อ hover)</label>
                <textarea
                  value={blockEditModal.block?.description || ''}
                  onChange={(e) => setBlockEditModal(prev => ({ ...prev, block: { ...prev.block, description: e.target.value } }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="อธิบายว่า Block นี้ทำอะไร..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBlockEditModal({ open: false, block: null })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveBlockEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Block Delete Modal (Admin only) */}
      {blockDeleteModal.open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 max-w-md w-full mx-4 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-white text-lg font-semibold">ยืนยันการลบ Block</h3>
                <p className="text-white/50 text-sm">Block นี้จะถูกลบถาวร</p>
              </div>
            </div>
            
            <p className="text-white/70 mb-6">
              คุณต้องการลบ Block "<span className="text-white font-medium">{blockDeleteModal.block?.name}</span>" หรือไม่?
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setBlockDeleteModal({ open: false, block: null })}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteBlock}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition"
              >
                ลบ Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification (แทน native alert) */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-pulse">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border ${
            toast.type === 'success' 
              ? 'bg-green-900/90 border-green-500/50 text-green-100' 
              : 'bg-red-900/90 border-red-500/50 text-red-100'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
