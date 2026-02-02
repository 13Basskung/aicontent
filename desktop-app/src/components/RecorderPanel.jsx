import React, { useState, useEffect } from 'react';
import { 
  Circle, Square, Play, Trash2, Save, 
  MousePointer, Type, ChevronDown, Plus, 
  Edit3, X, Clock, AlertCircle, CheckCircle
} from 'lucide-react';
import { createBlock, updateBlock } from '../lib/firebase';

// Platform definitions for Block types
const BLOCK_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', borderColor: 'border-red-500', icon: '▶️' },
  { id: 'tiktok', name: 'TikTok', color: 'bg-black', borderColor: 'border-white/30', icon: '🎵' },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', borderColor: 'border-blue-500', icon: '📘' },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-r from-purple-600 to-pink-600', borderColor: 'border-pink-500', icon: '📷' }
];

// Step action icons
const ACTION_ICONS = {
  click: MousePointer,
  fill: Type,
  select: ChevronDown,
  wait: Clock,
  goto: Play
};

function RecorderPanel({ keyData, instances, onBlockCreated, onInstanceSelect }) {
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState([]);
  const [startUrl, setStartUrl] = useState('https://www.google.com');
  const [selectedInstance, setSelectedInstance] = useState(null);
  
  // Notify parent when instance changes
  useEffect(() => {
    if (onInstanceSelect) {
      onInstanceSelect(selectedInstance);
    }
  }, [selectedInstance, onInstanceSelect]);
  const [editingStep, setEditingStep] = useState(null);
  const [blockName, setBlockName] = useState('');
  const [blockDescription, setBlockDescription] = useState('');
  const [blockType, setBlockType] = useState('video');
  const [blockPlatform, setBlockPlatform] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null);
  const [showEditModePopup, setShowEditModePopup] = useState(false);

  // Listen for recorder events
  useEffect(() => {
    if (window.electronAPI?.recorder) {
      window.electronAPI.recorder.onStarted((data) => {
        console.log('🎬 Recording started:', data);
        setIsRecording(true);
      });
      
      window.electronAPI.recorder.onStopped((data) => {
        console.log('🛑 Recording stopped:', data);
        setIsRecording(false);
        setSteps(data.steps || []);
      });
      
      window.electronAPI.recorder.onStep((step) => {
        console.log('📝 New step:', step);
        setSteps(prev => [...prev, step]);
      });
    }
  }, []);

  async function handleStartRecording() {
    if (!selectedInstance) {
      alert('กรุณาเลือก Instance ก่อน');
      return;
    }
    
    const profilePath = `./profiles/${selectedInstance.id}`;
    const result = await window.electronAPI?.recorder.start(profilePath, startUrl);
    
    if (result?.success) {
      setIsRecording(true);
      setSteps([]);
    } else {
      alert('ไม่สามารถเริ่มบันทึกได้: ' + (result?.message || 'Unknown error'));
    }
  }

  async function handleStopRecording() {
    const result = await window.electronAPI?.recorder.stop();
    if (result?.success) {
      setIsRecording(false);
      setSteps(result.steps || []);
    }
  }

  function handleDeleteStep(index) {
    setSteps(prev => prev.filter((_, i) => i !== index));
  }

  function handleEditStep(index, updates) {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, ...updates } : step
    ));
    setEditingStep(null);
  }

  function handleAddCustomStep() {
    const newStep = {
      id: Date.now(),
      action: 'wait',
      value: 1000,
      timestamp: new Date().toISOString()
    };
    setSteps(prev => [...prev, newStep]);
  }

  function handleClearSteps() {
    if (confirm('ล้าง Steps ทั้งหมด?')) {
      setSteps([]);
      window.electronAPI?.recorder.clear();
    }
  }

  async function handleSaveBlock(isUpdate = false) {
    if (!blockName.trim()) {
      alert('กรุณาใส่ชื่อ Block');
      return;
    }
    
    if (blockType === 'platform' && !blockPlatform) {
      alert('กรุณาเลือก Platform');
      return;
    }
    
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      // Prepare steps with startUrl as first step (goto action)
      const stepsWithUrl = startUrl ? [
        { action: 'goto', value: startUrl, selector: '', text: '' },
        ...steps.map(s => ({
          action: s.action,
          selector: s.selector || '',
          value: s.value || '',
          text: s.text || ''
        }))
      ] : steps.map(s => ({
        action: s.action,
        selector: s.selector || '',
        value: s.value || '',
        text: s.text || ''
      }));
      
      const blockData = {
        name: blockName.trim(),
        description: blockDescription.trim(),
        type: blockType,
        platform: blockType === 'platform' ? blockPlatform : null,
        startUrl: startUrl,
        steps: stepsWithUrl,
        createdBy: keyData?.userId || 'admin'
      };
      
      console.log('📦 Saving block to Firestore:', blockData);
      
      let result;
      if (isUpdate && editingBlock?.id) {
        result = await updateBlock(editingBlock.id, blockData);
      } else {
        result = await createBlock(blockData);
      }
      
      if (result.success) {
        console.log('✅ Block saved successfully:', result.blockId);
        setSaveSuccess(true);
        
        if (onBlockCreated) {
          onBlockCreated();
        }
        
        setTimeout(() => {
          resetForm();
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Failed to save block:', error);
      alert(`บันทึกไม่สำเร็จ: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }
  
  function resetForm() {
    setShowSaveModal(false);
    setShowEditModePopup(false);
    setBlockName('');
    setBlockDescription('');
    setBlockType('video');
    setBlockPlatform(null);
    setSteps([]);
    setEditingBlock(null);
    setSaveSuccess(false);
  }
  
  function handleLoadBlockForEdit(block) {
    setEditingBlock(block);
    setBlockName(block.name || '');
    setBlockDescription(block.description || '');
    setBlockType(block.type || 'video');
    setBlockPlatform(block.platform || null);
    setStartUrl(block.startUrl || '');
    // Load steps (skip first goto step if it matches startUrl)
    const blockSteps = block.steps || [];
    if (blockSteps.length > 0 && blockSteps[0].action === 'goto') {
      setSteps(blockSteps.slice(1));
    } else {
      setSteps(blockSteps);
    }
    setShowEditModePopup(true);
  }

  // Admin check
  if (!keyData?.isAdmin) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Admin Only</h3>
        <p className="text-white/50">
          ฟีเจอร์ Recorder สำหรับ Admin เท่านั้น
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Recording Controls */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isRecording ? 'bg-red-500/20' : 'bg-blue-500/20'
            }`}>
              {isRecording ? (
                <Circle className="w-5 h-5 text-red-400 animate-pulse" fill="currentColor" />
              ) : (
                <Circle className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Recorder</h2>
              <p className="text-white/50 text-sm">
                {isRecording ? 'กำลังบันทึก...' : 'พร้อมบันทึก'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                onClick={handleStartRecording}
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition"
              >
                <Circle className="w-4 h-4" fill="currentColor" />
                <span>เริ่มบันทึก</span>
              </button>
            ) : (
              <button
                onClick={handleStopRecording}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-2 transition"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                <span>หยุดบันทึก</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Recording settings */}
        {!isRecording && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-white/70 text-sm mb-1">เลือก Instance เพื่อทดสอบ</label>
              <select
                value={selectedInstance?.id || ''}
                onChange={(e) => setSelectedInstance(instances.find(i => i.id === e.target.value))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="">-- เลือก Instance --</option>
                {instances.map(inst => (
                  <option key={inst.id} value={inst.id}>
                    {inst.customName || inst.projectName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-1">URL เริ่มต้น</label>
              <input
                type="text"
                value={startUrl}
                onChange={(e) => setStartUrl(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="https://..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">
            Steps ({steps.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddCustomStep}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition"
              title="เพิ่ม Step"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={handleClearSteps}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition"
              title="ล้าง Steps"
              disabled={steps.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 flex items-center gap-1 transition"
              disabled={steps.length === 0}
            >
              <Save className="w-4 h-4" />
              <span>บันทึก Block</span>
            </button>
          </div>
        </div>
        
        {steps.length === 0 ? (
          <div className="text-center py-8 text-white/30">
            {isRecording 
              ? 'กำลังรอการคลิก/พิมพ์...' 
              : 'ยังไม่มี Steps - เริ่มบันทึกเพื่อเพิ่ม Steps'}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {steps.map((step, index) => {
              const ActionIcon = ACTION_ICONS[step.action] || MousePointer;
              
              return (
                <div 
                  key={step.id || index}
                  className="p-3 rounded-lg bg-white/5 border border-white/10 group"
                >
                  {editingStep === index ? (
                    // Edit mode
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={step.action}
                          onChange={(e) => handleEditStep(index, { action: e.target.value })}
                          className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                        >
                          <option value="click">Click</option>
                          <option value="fill">Fill</option>
                          <option value="wait">Wait</option>
                          <option value="goto">Go to URL</option>
                        </select>
                        <input
                          type="text"
                          value={step.selector || step.value || ''}
                          onChange={(e) => handleEditStep(index, { 
                            [step.action === 'wait' || step.action === 'goto' ? 'value' : 'selector']: e.target.value 
                          })}
                          className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                          placeholder={step.action === 'wait' ? 'ms' : step.action === 'goto' ? 'URL' : 'Selector'}
                        />
                        <button
                          onClick={() => setEditingStep(null)}
                          className="p-1 text-green-400"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs text-white/50">
                          {index + 1}
                        </span>
                        <ActionIcon className="w-4 h-4 text-purple-400" />
                        <div>
                          <span className="text-white font-medium capitalize">{step.action}</span>
                          {step.selector && (
                            <span className="text-white/50 text-sm ml-2 font-mono">
                              {step.selector.substring(0, 40)}...
                            </span>
                          )}
                          {step.value && (
                            <span className="text-green-400 text-sm ml-2">
                              "{step.value}"
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => setEditingStep(index)}
                          className="p-1 text-white/50 hover:text-white"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStep(index)}
                          className="p-1 text-white/50 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save Block Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-96">
            {saveSuccess ? (
              // Success state
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">บันทึกสำเร็จ!</h3>
                <p className="text-white/50">Block "{blockName}" ถูกบันทึกแล้ว</p>
              </div>
            ) : (
              // Form state
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">บันทึก Block</h3>
                  <button onClick={() => setShowSaveModal(false)} className="text-white/50 hover:text-white" disabled={saving}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-1">ชื่อ Block *</label>
                  <input
                    type="text"
                    value={blockName}
                    onChange={(e) => setBlockName(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="เช่น: Post to Facebook"
                    disabled={saving}
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-1">รายละเอียด (แสดงเมื่อ hover)</label>
                  <textarea
                    value={blockDescription}
                    onChange={(e) => setBlockDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="อธิบายการทำงานของ Block นี้..."
                    rows={2}
                    disabled={saving}
                  />
                </div>
                
                {/* Block Type Selection */}
                <div className="mb-4">
                  <label className="block text-white/70 text-sm mb-2">ประเภท Block *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setBlockType('video'); setBlockPlatform(null); }}
                      className={`p-3 rounded-lg border-2 transition flex items-center gap-2 ${
                        blockType === 'video' 
                          ? 'bg-purple-500/30 border-purple-500 text-white' 
                          : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                      }`}
                      disabled={saving}
                    >
                      <span>🎬</span>
                      <span className="text-sm font-medium">สร้างวีดีโอ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockType('platform')}
                      className={`p-3 rounded-lg border-2 transition flex items-center gap-2 ${
                        blockType === 'platform' 
                          ? 'bg-blue-500/30 border-blue-500 text-white' 
                          : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                      }`}
                      disabled={saving}
                    >
                      <span>📤</span>
                      <span className="text-sm font-medium">โพส Platform</span>
                    </button>
                  </div>
                </div>
                
                {/* Platform Selection (only if type is platform) */}
                {blockType === 'platform' && (
                  <div className="mb-4">
                    <label className="block text-white/70 text-sm mb-2">เลือก Platform *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {BLOCK_PLATFORMS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setBlockPlatform(p.id)}
                          className={`p-2 rounded-lg border-2 transition flex items-center gap-2 ${
                            blockPlatform === p.id 
                              ? `${p.color} ${p.borderColor} text-white` 
                              : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10'
                          }`}
                          disabled={saving}
                        >
                          <span>{p.icon}</span>
                          <span className="text-sm">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-white/50 text-sm mb-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${blockType === 'video' ? 'bg-purple-400' : 'bg-blue-400'}`}></span>
                  {steps.length + (startUrl ? 1 : 0)} steps จะถูกบันทึก {startUrl && '(รวม URL เริ่มต้น)'}
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition"
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => handleSaveBlock(!!editingBlock)}
                    className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white transition flex items-center justify-center gap-2"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        บันทึก
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Edit Mode Popup - Choose Update or Create New */}
      {showEditModePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass rounded-xl p-6 w-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">แก้ไข Block</h3>
              <button onClick={() => { setShowEditModePopup(false); setEditingBlock(null); }} className="text-white/50 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-white font-medium">{editingBlock?.name}</p>
              <p className="text-white/50 text-sm">{editingBlock?.steps?.length || 0} steps โหลดแล้ว</p>
            </div>
            
            <p className="text-white/70 text-sm mb-4">
              Steps ถูกโหลดในกล่อง Steps แล้ว คุณต้องการบันทึกอย่างไร?
            </p>
            
            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowEditModePopup(false);
                  setShowSaveModal(true);
                }}
                className="w-full px-4 py-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 transition flex items-center gap-3"
              >
                <Edit3 className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">อัปเดตทับ Block เดิม</p>
                  <p className="text-xs text-white/50">แก้ไข Block "{editingBlock?.name}" โดยตรง</p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  setEditingBlock(null);
                  setBlockName(editingBlock?.name + ' (Copy)');
                  setShowEditModePopup(false);
                  setShowSaveModal(true);
                }}
                className="w-full px-4 py-3 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 transition flex items-center gap-3"
              >
                <Plus className="w-5 h-5" />
                <div className="text-left">
                  <p className="font-medium">สร้าง Block ใหม่</p>
                  <p className="text-xs text-white/50">คัดลอกและสร้างเป็น Block ใหม่</p>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => { setShowEditModePopup(false); setEditingBlock(null); resetForm(); }}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 transition"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecorderPanel;
