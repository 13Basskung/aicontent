import React from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'ยืนยัน', 
    message, 
    confirmText = 'ตกลง', 
    cancelText = 'ยกเลิก',
    type = 'confirm', // 'confirm', 'alert', 'success', 'error', 'warning'
    showCancel = true
}) => {
    if (!isOpen) return null;

    const getTypeConfig = () => {
        switch (type) {
            case 'success':
                return {
                    icon: CheckCircle,
                    iconColor: 'text-green-400',
                    iconBg: 'bg-green-500/20',
                    borderColor: 'border-green-500/30',
                    confirmBg: 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400'
                };
            case 'error':
                return {
                    icon: XCircle,
                    iconColor: 'text-red-400',
                    iconBg: 'bg-red-500/20',
                    borderColor: 'border-red-500/30',
                    confirmBg: 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400'
                };
            case 'warning':
                return {
                    icon: AlertTriangle,
                    iconColor: 'text-amber-400',
                    iconBg: 'bg-amber-500/20',
                    borderColor: 'border-amber-500/30',
                    confirmBg: 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400'
                };
            case 'alert':
                return {
                    icon: Info,
                    iconColor: 'text-blue-400',
                    iconBg: 'bg-blue-500/20',
                    borderColor: 'border-blue-500/30',
                    confirmBg: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400'
                };
            default:
                return {
                    icon: Info,
                    iconColor: 'text-purple-400',
                    iconBg: 'bg-purple-500/20',
                    borderColor: 'border-purple-500/30',
                    confirmBg: 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400'
                };
        }
    };

    const config = getTypeConfig();
    const IconComponent = config.icon;

    const handleConfirm = () => {
        if (onConfirm) onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className={`relative w-full max-w-md bg-slate-900 border ${config.borderColor} rounded-2xl shadow-2xl transform transition-all duration-300 scale-100`}>
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Content */}
                <div className="p-8 text-center">
                    {/* Icon */}
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.iconBg} flex items-center justify-center`}>
                        <IconComponent className={config.iconColor} size={32} />
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-white mb-3">
                        {title}
                    </h3>

                    {/* Message */}
                    <div className="text-slate-300 text-base mb-6 whitespace-pre-line leading-relaxed">
                        {message}
                    </div>

                    {/* Buttons */}
                    <div className={`flex gap-3 ${showCancel ? 'justify-center' : 'justify-center'}`}>
                        {showCancel && (
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all font-medium min-w-[100px]"
                            >
                                {cancelText}
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            className={`px-6 py-3 rounded-xl text-white transition-all font-medium min-w-[100px] shadow-lg ${config.confirmBg}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
