import React, { useState } from 'react';
import { Type, Trash2, FileText, MessageCircle } from 'lucide-react';

const CinematicStep = ({ stage, onUpdate, onRemove }) => {
    const [hoveredDensity, setHoveredDensity] = useState(null);
    const dialogueDensity = stage.dialogueDensity || 3; // Default 3 ประโยค
    
    // ข้อมูลแต่ละระดับ Dialogue Density
    const densityOptions = [
        { 
            value: 1, 
            speed: '1.0x',
            color: 'green',
            label: 'หนัง',
            tooltip: '🎬 เหมาะกับวีดีโอแนวหนัง/ดราม่า\n• พูดช้า มีน้ำหนัก\n• เน้นอารมณ์และบรรยากาศ\n• มี Intro Effect 3-4 วินาที'
        },
        { 
            value: 2, 
            speed: '1.0x',
            color: 'green',
            label: 'เรื่องราว',
            tooltip: '📖 เหมาะกับวีดีโอเล่าเรื่องสมจริง\n• พูดช้า ชัดเจน\n• เน้นความต่อเนื่องของเรื่อง\n• มี Intro Effect 2-3 วินาที'
        },
        { 
            value: 3, 
            speed: '2.0x',
            color: 'yellow',
            label: 'สมดุล',
            tooltip: '⚖️ สมดุลระหว่างเรื่องราวและการสอน\n• ความเร็วปานกลาง\n• เหมาะกับทุกประเภทวีดีโอ\n• มี Intro Effect 1-2 วินาที'
        },
        { 
            value: 4, 
            speed: '3.0x',
            color: 'orange',
            label: 'สอน',
            tooltip: '📚 เหมาะกับวีดีโอให้ความรู้/สอน\n• พูดเร็ว กระชับ\n• เน้นเนื้อหาสาระ\n• Intro Effect น้อย < 1 วินาที'
        },
        { 
            value: 5, 
            speed: '3.5x',
            color: 'red',
            label: 'ความรู้',
            tooltip: '🚀 เหมาะกับวีดีโอให้ความรู้เข้มข้น\n• ความเร็วสูงสุด 3.5x\n• เน้นการพูดเป็นหลัก\n• เริ่มพูดทันที ไม่มี Intro'
        }
    ];
    
    const currentOption = densityOptions.find(opt => opt.value === dialogueDensity) || densityOptions[2];
    
    const getColorClasses = (color, isActive) => {
        const colors = {
            green: isActive ? 'bg-green-500/30 text-green-300 border-green-500/50' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-green-500/10 hover:border-green-500/30',
            yellow: isActive ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-yellow-500/10 hover:border-yellow-500/30',
            orange: isActive ? 'bg-orange-500/30 text-orange-300 border-orange-500/50' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-orange-500/10 hover:border-orange-500/30',
            red: isActive ? 'bg-red-500/30 text-red-300 border-red-500/50' : 'bg-white/5 text-slate-400 border-white/10 hover:bg-red-500/10 hover:border-red-500/30'
        };
        return colors[color] || colors.yellow;
    };
    
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

            {/* Dialogue Density Buttons */}
            <div className="mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={12} className="text-purple-400" />
                    <span className="text-xs font-medium text-purple-300">Dialogue Density (ความหนาแน่นบทพูด)</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        currentOption.color === 'green' ? 'text-green-400 bg-green-500/20' :
                        currentOption.color === 'yellow' ? 'text-yellow-400 bg-yellow-500/20' :
                        currentOption.color === 'orange' ? 'text-orange-400 bg-orange-500/20' :
                        'text-red-400 bg-red-500/20'
                    }`}>
                        {dialogueDensity} ประโยค • {currentOption.speed} • {currentOption.label}
                    </span>
                </div>
                
                {/* 5 Buttons with Tooltips */}
                <div className="flex items-center gap-2 mb-2 relative">
                    {densityOptions.map((option) => (
                        <div key={option.value} className="relative">
                            <button
                                onClick={() => onUpdate('dialogueDensity', option.value)}
                                onMouseEnter={() => setHoveredDensity(option.value)}
                                onMouseLeave={() => setHoveredDensity(null)}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all border ${getColorClasses(option.color, dialogueDensity === option.value)}`}
                            >
                                {option.value}
                            </button>
                            
                            {/* Tooltip */}
                            {hoveredDensity === option.value && (
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-900 border border-white/20 rounded-lg shadow-xl z-50">
                                    <div className="text-xs text-white whitespace-pre-line leading-relaxed">
                                        {option.tooltip}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-white/10">
                                        Speed: <span className="text-white font-medium">{option.speed}</span>
                                    </div>
                                    {/* Arrow */}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-slate-900"></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                <p className="text-[10px] text-slate-500">
                    เลื่อนเม้าส์ไปที่ตัวเลขเพื่อดูรายละเอียด • 1-2 = หนัง • 3 = สมดุล • 4-5 = ให้ความรู้
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
