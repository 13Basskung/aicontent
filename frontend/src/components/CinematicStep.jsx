import React, { useState } from 'react';
import { Type, Trash2, FileText, MessageCircle } from 'lucide-react';

const CinematicStep = ({ stage, onUpdate, onRemove }) => {
    const [showCustomInput, setShowCustomInput] = useState(false);
    const dialogueDensity = stage.dialogueDensity || 4; // Default 4 ประโยค
    
    // คำนวณสีตาม density
    const getDensityColor = (value) => {
        if (value <= 2) return { bg: 'bg-green-500', text: 'text-green-400', label: 'น้อย' };
        if (value <= 4) return { bg: 'bg-yellow-500', text: 'text-yellow-400', label: 'ปานกลาง' };
        if (value <= 6) return { bg: 'bg-orange-500', text: 'text-orange-400', label: 'มาก' };
        return { bg: 'bg-red-500', text: 'text-red-400', label: 'เข้มข้น' };
    };
    
    const densityInfo = getDensityColor(dialogueDensity);
    
    return (
        <div className="bg-slate-800 rounded-lg p-3 border border-white/5 shadow-lg relative group">
            {/* Header: STEP % + Delete Button (ลบ Scene Template แล้ว - Expander จะขยายให้) */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Type size={12} className="text-blue-400" />
                    <span className="text-xs text-gray-400">Step {stage.id ? `#${stage.id}` : ''}</span>
                    <span className="text-[10px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">Expander จะขยายให้อัตโนมัติ</span>
                </div>

                <div className="flex items-center gap-2">
                    {/* PERCENTAGE INPUT */}
                    <div className="flex flex-row items-center gap-2 min-w-fit">
                        <span className="text-sm font-bold text-gray-400 uppercase whitespace-nowrap">STEP %</span>
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={stage.stepPercentage || 0}
                            onChange={(e) => onUpdate('stepPercentage', parseInt(e.target.value) || 0)}
                            className="w-12 bg-gray-800 text-white text-sm text-center border border-gray-600 rounded py-1 focus:border-yellow-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors p-1.5 hover:bg-red-500/10 rounded-md"
                        title="Remove Step"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Dialogue Density Slider */}
            <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={12} className="text-purple-400" />
                    <span className="text-xs font-medium text-purple-300">Dialogue Density (ความหนาแน่นบทพูด)</span>
                    <span className={`text-[10px] ${densityInfo.text} ${densityInfo.bg}/20 px-1.5 py-0.5 rounded font-medium`}>
                        {dialogueDensity} ประโยค • {densityInfo.label}
                    </span>
                </div>
                
                {/* Preset Buttons */}
                <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={() => { onUpdate('dialogueDensity', 2); setShowCustomInput(false); }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            dialogueDensity === 2 
                                ? 'bg-green-500/30 text-green-300 border border-green-500/50' 
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        🟢 2
                    </button>
                    <button
                        onClick={() => { onUpdate('dialogueDensity', 4); setShowCustomInput(false); }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            dialogueDensity === 4 
                                ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50' 
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        🟡 4
                    </button>
                    <button
                        onClick={() => { onUpdate('dialogueDensity', 8); setShowCustomInput(false); }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            dialogueDensity === 8 
                                ? 'bg-red-500/30 text-red-300 border border-red-500/50' 
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        🔴 8
                    </button>
                    <button
                        onClick={() => setShowCustomInput(!showCustomInput)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                            showCustomInput || ![2, 4, 8].includes(dialogueDensity)
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' 
                                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                        }`}
                    >
                        ✏️ กำหนดเอง
                    </button>
                </div>
                
                {/* Custom Input or Slider */}
                {(showCustomInput || ![2, 4, 8].includes(dialogueDensity)) && (
                    <div className="flex items-center gap-3 mb-2">
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={dialogueDensity}
                            onChange={(e) => onUpdate('dialogueDensity', parseInt(e.target.value))}
                            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                            style={{
                                background: `linear-gradient(to right, 
                                    #22c55e 0%, 
                                    #eab308 30%, 
                                    #f97316 60%, 
                                    #ef4444 100%)`
                            }}
                        />
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={dialogueDensity}
                            onChange={(e) => {
                                const val = Math.min(10, Math.max(1, parseInt(e.target.value) || 1));
                                onUpdate('dialogueDensity', val);
                            }}
                            className="w-12 bg-black/30 text-white text-sm text-center border border-purple-500/30 rounded py-1 focus:border-purple-500 outline-none"
                        />
                    </div>
                )}
                
                <p className="text-[10px] text-slate-500">
                    กำหนดจำนวนประโยคบทพูดที่ AI จะสร้างสำหรับฉากนี้ (1-10)
                </p>
            </div>

            {/* Scene Instruction Textarea */}
            <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <FileText size={12} className="text-orange-400" />
                    <span className="text-xs font-medium text-orange-300">Scene Instruction (คำสั่งฉาก)</span>
                </div>
                <textarea
                    value={stage.sceneInstruction || ''}
                    onChange={(e) => onUpdate('sceneInstruction', e.target.value)}
                    placeholder="เขียนคำสั่งสำหรับฉากนี้... เช่น: เปิดฉากด้วย wide shot บรรยากาศสงบ ค่อยๆ zoom เข้าหาตัวละครหลัก..."
                    className="w-full h-20 bg-black/30 border border-orange-500/20 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-orange-500/50 focus:bg-black/40 outline-none transition-colors resize-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                    AI จะใช้คำสั่งนี้เป็นแนวทางในการขยาย Prompt สำหรับฉากนี้
                </p>
            </div>
        </div>
    );
};

export default CinematicStep;
