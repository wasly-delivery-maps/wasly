import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';

// Store active driver connections
const activeDriverConnections = new Map<number, Socket>();

export function setupOrderNotifications(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('[OrderNotifications] Client connected:', socket.id);

    // Driver connects to receive order notifications
    socket.on('driver_connect', (data: { driverId: number }) => {
      try {
        const { driverId } = data;
        console.log(`[OrderNotifications] Driver ${driverId} connected for notifications`);

        // Store driver connection
        activeDriverConnections.set(driverId, socket);
        socket.join(`driver:${driverId}`);
        socket.join('drivers:all');

        // Emit confirmation
        socket.emit('driver_connected', { success: true, driverId });
      } catch (error) {
        console.error('[OrderNotifications] Error in driver_connect:', error);
        socket.emit('error', { message: 'Failed to connect for notifications' });
      }
    });

    // Handle order acceptance
    socket.on('accept_order', (data: { orderId: string; driverId: number }) => {
      try {
        console.log(`[OrderNotifications] Driver ${data.driverId} accepted order ${data.orderId}`);
        // Broadcast to all clients that order was accepted
        io.emit('order_accepted', {
          orderId: data.orderId,
          driverId: data.driverId,
        });
      } catch (error) {
        console.error('[OrderNotifications] Error in accept_order:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('[OrderNotifications] Client disconnected:', socket.id);
      // Remove driver from active connections
      activeDriverConnections.forEach((driverSocket, driverId) => {
        if (driverSocket.id === socket.id) {
          activeDriverConnections.delete(driverId);
          console.log(`[OrderNotifications] Driver ${driverId} removed from active connections`);
        }
      });
    });

    socket.on('error', (error) => {
      console.error('[OrderNotifications] Socket error:', error);
    });
  });
}

/**
 * Send a new order notification to all connected drivers
 */
export function notifyDriversOfNewOrder(
  io: SocketIOServer,
  order: {
    id: string;
    pickupLocation: string;
    deliveryLocation: string;
    estimatedTime?: number;
    fare?: number;
    customerName?: string;
    customerPhone?: string;
  }
) {
  try {
    console.log(`[OrderNotifications] Broadcasting new order ${order.id} to all drivers`);

    // Broadcast to all connected drivers
    io.to('drivers:all').emit('new_order', {
      type: 'new_order',
      orderId: order.id,
      pickupLocation: order.pickupLocation,
      deliveryLocation: order.deliveryLocation,
      estimatedTime: order.estimatedTime || 15,
      fare: order.fare || 0,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
    });

    console.log(`[OrderNotifications] Order notification sent for order ${order.id}`);
  } catch (error) {
    console.error('[OrderNotifications] Error broadcasting order:', error);
  }
}

/**
 * Get active driver connections count
 */
export function getActiveDriversCount(): number {
  return activeDriverConnections.size;
}

/**
 * Get list of active driver IDs
 */
export function getActiveDriverIds(): number[] {
  const ids: number[] = [];
  activeDriverConnections.forEach((_, driverId) => {
    ids.push(driverId);
  });
  return ids;
}
