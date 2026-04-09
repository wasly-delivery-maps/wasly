import { useEffect, useState } from 'react';
import { X, MapPin, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OrderNotificationData {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  estimatedTime: number; // in minutes
  fare: number;
  customerName?: string;
  customerPhone?: string;
}

interface OrderNotificationProps {
  order: OrderNotificationData | null;
  onDismiss: () => void;
  onAccept: (orderId: string) => void;
  isVisible: boolean;
}

export function OrderNotification({
  order,
  onDismiss,
  onAccept,
  isVisible,
}: OrderNotificationProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setAnimate(true);
      // Play notification sound
      playNotificationSound();
    } else {
      setAnimate(false);
    }
  }, [isVisible]);

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Create a pleasant notification sound
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Audio notification not available');
    }
  };

  if (!isVisible || !order) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 pointer-events-none z-50 flex items-end justify-center pb-4',
        'transition-all duration-300'
      )}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/20 pointer-events-auto',
          animate ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onDismiss}
      />

      {/* Notification Card */}
      <div
        className={cn(
          'relative pointer-events-auto w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl',
          'transform transition-all duration-300',
          animate
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-8 opacity-0 scale-95'
        )}
      >
        {/* Header with Alert Icon */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg animate-pulse">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">طلب جديد!</h3>
              <p className="text-white/80 text-sm">توفر لك الآن</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Locations */}
          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-semibold">نقطة الاستلام</p>
                <p className="text-sm text-gray-800 truncate">
                  {order.pickupLocation}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gray-300" />
            </div>

            {/* Delivery */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-red-500" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-semibold">نقطة التسليم</p>
                <p className="text-sm text-gray-800 truncate">
                  {order.deliveryLocation}
                </p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Time */}
            <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-xs text-gray-600">الوقت المتوقع</p>
                <p className="text-sm font-semibold text-gray-800">
                  {order.estimatedTime} دقيقة
                </p>
              </div>
            </div>

            {/* Fare */}
            <div className="bg-green-50 rounded-lg p-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-xs text-gray-600">الأجرة</p>
                <p className="text-sm font-semibold text-gray-800">
                  {order.fare} ج.م
                </p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          {order.customerName && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">العميل</p>
              <p className="text-sm font-semibold text-gray-800">
                {order.customerName}
              </p>
              {order.customerPhone && (
                <p className="text-xs text-gray-500 mt-1">{order.customerPhone}</p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onDismiss}
            className={cn(
              'px-4 py-3 rounded-lg font-semibold transition-all',
              'bg-gray-200 text-gray-700 hover:bg-gray-300'
            )}
          >
            تجاهل
          </button>
          <button
            onClick={() => onAccept(order.id)}
            className={cn(
              'px-4 py-3 rounded-lg font-semibold transition-all',
              'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
              'hover:shadow-lg hover:scale-105 active:scale-95'
            )}
          >
            قبول الطلب
          </button>
        </div>
      </div>
    </div>
  );
}
