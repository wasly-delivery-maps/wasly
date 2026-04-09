import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcryptjs from "bcryptjs";
import { sdk } from "./_core/sdk";
import type { Request, Response } from "express";
import { notifyDriversOfNewOrder } from "./notifications";

// Note: COOKIE_NAME is imported above from @shared/const

export const appRouter = router({
  system: systemRouter,

  /**
   * Authentication routes
   */
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    
    // Register new user
    register: publicProcedure
      .input(
        z.object({
          phone: z.string().min(10, "رقم الهاتف غير صحيح"),
          password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
          name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
          email: z.string().email("البريد الإلكتروني غير صحيح").optional(),
          role: z.enum(["customer", "driver", "admin"]).default("customer"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Check if user already exists
        const existingUser = await db.getUserByPhone(input.phone);
        if (existingUser) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "رقم الهاتف مسجل بالفعل",
          });
        }

        // Hash password
        const hashedPassword = await bcryptjs.hash(input.password, 10);

        // Create user
        const openId = `phone-${input.phone}`;
        await db.upsertUser({
          openId,
          phone: input.phone,
          password: hashedPassword,
          name: input.name,
          email: input.email,
          role: input.role,
          isActive: true,
        });

        // Get the created user
        const user = await db.getUserByPhone(input.phone);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "فشل في إنشاء المستخدم",
          });
        }

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        });

        return {
          success: true,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),

    // Login with phone and password
    login: publicProcedure
      .input(
        z.object({
          phone: z.string().min(10, "رقم الهاتف غير صحيح"),
          password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Find user by phone
        const user = await db.getUserByPhone(input.phone);
        if (!user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "رقم الهاتف أو كلمة المرور غير صحيحة",
          });
        }

        // Check if user is active
        if (!user.isActive) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "الحساب معطل",
          });
        }

        // Verify password
        if (!user.password) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "رقم الهاتف أو كلمة المرور غير صحيحة",
          });
        }
        const isPasswordValid = await bcryptjs.compare(input.password, user.password);
        if (!isPasswordValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "رقم الهاتف أو كلمة المرور غير صحيحة",
          });
        }

        // Update last signed in
        await db.upsertUser({
          openId: user.openId,
          phone: user.phone || undefined,
          password: user.password || undefined,
          lastSignedIn: new Date(),
        });

        // Create session token
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
        });

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        });

        return {
          success: true,
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  /**
   * User management routes
   */
  users: router({
    // Get current user
    getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        latitude: user.latitude ? parseFloat(user.latitude.toString()) : null,
        longitude: user.longitude ? parseFloat(user.longitude.toString()) : null,
      };
    }),

    // Update user profile
    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().min(2).optional(),
          email: z.string().email().optional(),
          phone: z.string().min(10).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const updatedUser = await db.updateUserProfile(ctx.user.id, input);
        if (!updatedUser) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        return {
          success: true,
          user: {
            id: updatedUser.id,
            phone: updatedUser.phone,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
          },
        };
      }),

    // Get all users (Admin only)
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const users = await db.getAllUsers();
      return users.map((u) => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      }));
    }),

    // Update user location
    updateLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.number(),
          longitude: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await db.updateUserLocation(ctx.user.id, input.latitude, input.longitude);

        // If driver, also update driver availability
        if (ctx.user.role === "driver") {
          await db.updateDriverLocation(ctx.user.id, input.latitude, input.longitude);
        }

        return { success: true };
      }),

    // Get all drivers
    getAllDrivers: publicProcedure.query(async () => {
      const drivers = await db.getAllDrivers();
      return drivers.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        isActive: d.isActive,
      }));
    }),
  }),

  /**
   * Order management routes
   */
  orders: router({
    // Create new order
    createOrder: protectedProcedure
      .input(
        z.object({
          pickupLocation: z.object({
            address: z.string(),
            latitude: z.number(),
            longitude: z.number(),
            neighborhood: z.string().optional(),
          }),
          deliveryLocation: z.object({
            address: z.string(),
            latitude: z.number(),
            longitude: z.number(),
            neighborhood: z.string().optional(),
          }),
          price: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "customer") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only customers can create orders",
          });
        }

        // Calculate distance (simplified - using Haversine formula)
        const distance = calculateDistance(
          input.pickupLocation.latitude,
          input.pickupLocation.longitude,
          input.deliveryLocation.latitude,
          input.deliveryLocation.longitude
        );

        // Estimate time (5 minutes per km + 5 minutes base)
        const estimatedTime = Math.round(distance * 5 + 5);

        // Use price from frontend if provided, otherwise calculate it
        let calculatedPrice = input.price;
        if (!calculatedPrice) {
          const { calculateOrderPrice } = await import("../shared/pricing");
          calculatedPrice = calculateOrderPrice(
            input.pickupLocation.neighborhood || "",
            input.deliveryLocation.neighborhood,
            distance
          );
        }

        // Create order in database
        const result = await db.createOrder({
          customerId: ctx.user.id,
          pickupLocation: input.pickupLocation,
          deliveryLocation: input.deliveryLocation,
          price: calculatedPrice,
          distance,
          estimatedTime,
          notes: input.notes,
          status: "pending",
        });

        // Send notifications to drivers about new order
        // Extract order ID from result (could be insertId or id depending on DB implementation)
        const orderId = (result as any)?.insertId || (result as any)?.id;
        if (orderId) {
          try {
            await notifyDriversOfNewOrder(
              orderId,
              input.pickupLocation.address,
              input.deliveryLocation.address
            );
          } catch (error) {
            console.error("[Orders] Failed to send driver notifications:", error);
            // Don't throw error - order creation should succeed even if notifications fail
          }
        }

        return result;
      }),

    // Get customer orders
     getCustomerOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "customer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only customers can view their orders",
        });
      }
      const orders = await db.getOrdersByCustomerId(ctx.user.id);
      
      // Load driver data for each order
      const ordersWithDriver = await Promise.all(
        orders.map(async (o) => {
          let assignedDriver = null;
          if (o.driverId) {
            const driver = await db.getUserById(o.driverId);
            if (driver) {
              assignedDriver = {
                id: driver.id,
                name: driver.name,
                phone: driver.phone,
                email: driver.email,
              };
            }
          }
          
          return {
            id: o.id,
            status: o.status,
            pickupLocation: o.pickupLocation,
            deliveryLocation: o.deliveryLocation,
            price: o.price ? parseFloat(o.price.toString()) : 0,
            distance: o.distance ? parseFloat(o.distance.toString()) : 0,
            estimatedTime: o.estimatedTime,
            driverId: o.driverId,
            assignedDriver,
            createdAt: o.createdAt,
            deliveredAt: o.deliveredAt,
          };
        })
      );
      
      return ordersWithDriver;
    }),

    // Get driver orders
    getDriverOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "driver") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only drivers can view their orders",
        });
      }

      const orders = await db.getOrdersByDriverId(ctx.user.id);
      return orders.map((o) => ({
        id: o.id,
        status: o.status,
        pickupLocation: o.pickupLocation,
        deliveryLocation: o.deliveryLocation,
        price: o.price ? parseFloat(o.price.toString()) : 0,
        distance: o.distance ? parseFloat(o.distance.toString()) : 0,
        estimatedTime: o.estimatedTime,
        customerId: o.customerId,
        createdAt: o.createdAt,
      }));
    }),

    // Get available orders for drivers
    getAvailableOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "driver") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only drivers can view available orders",
        });
      }

      const orders = await db.getAvailableOrders();
      return orders.map((o) => ({
        id: o.id,
        pickupLocation: o.pickupLocation,
        deliveryLocation: o.deliveryLocation,
        price: o.price ? parseFloat(o.price.toString()) : 0,
        distance: o.distance ? parseFloat(o.distance.toString()) : 0,
        estimatedTime: o.estimatedTime,
        createdAt: o.createdAt,
      }));
    }),

    // Cancel order (customer only)
    cancelOrder: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "customer") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only customers can cancel orders",
          });
        }

        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        if (order.customerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only cancel your own orders",
          });
        }

        // Can only cancel if order is pending or assigned (not yet in transit)
        if (["in_transit", "arrived", "delivered", "cancelled"].includes(order.status)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot cancel order with status: ${order.status}`,
          });
        }

        await db.updateOrderStatus(input.orderId, "cancelled");

        return { success: true, message: "تم إلغاء الطلب بنجاح" };
      }),

    // Update order status
    updateOrderStatus: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          status: z.enum([
            "pending",
            "assigned",
            "accepted",
            "in_transit",
            "arrived",
            "delivered",
            "cancelled",
          ]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // If driver is accepting the order, assign it to them first
        if (ctx.user.role === "driver" && input.status === "accepted" && !order.driverId) {
          await db.assignOrderToDriver(input.orderId, ctx.user.id);
        }

        // Verify permissions
        if (
          ctx.user.role === "driver" &&
          order.driverId !== ctx.user.id &&
          !(input.status === "accepted" && !order.driverId)
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own orders",
          });
        }

        if (ctx.user.role === "customer" && order.customerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update your own orders",
          });
        }

        await db.updateOrderStatus(input.orderId, input.status);

        return { success: true };
      }),

    // Get order details
    getOrderDetails: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // Verify permissions
        if (
          ctx.user.role === "customer" &&
          order.customerId !== ctx.user.id
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view your own orders",
          });
        }

        if (ctx.user.role === "driver" && order.driverId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only view assigned orders",
          });
        }

        return {
          id: order.id,
          status: order.status,
          pickupLocation: order.pickupLocation,
          deliveryLocation: order.deliveryLocation,
          price: order.price ? parseFloat(order.price.toString()) : 0,
          distance: order.distance ? parseFloat(order.distance.toString()) : 0,
          estimatedTime: order.estimatedTime,
          customerId: order.customerId,
          driverId: order.driverId,
          notes: order.notes,
          rating: order.rating,
          ratingComment: order.ratingComment,
          createdAt: order.createdAt,
          deliveredAt: order.deliveredAt,
        };
      }),

    // Get order with customer details
    getOrderWithCustomer: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // Get customer details
        const customer = await db.getUserById(order.customerId);
        if (!customer) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Customer not found" });
        }

        return {
          id: order.id,
          status: order.status,
          pickupLocation: order.pickupLocation,
          deliveryLocation: order.deliveryLocation,
          price: order.price ? parseFloat(order.price.toString()) : 0,
          distance: order.distance ? parseFloat(order.distance.toString()) : 0,
          estimatedTime: order.estimatedTime,
          notes: order.notes,
          customer: {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          },
          createdAt: order.createdAt,
        };
      }),

    // Accept order by driver (First-come, first-served)
    acceptOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "driver") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only drivers can accept orders",
          });
        }

        // Check if driver account is suspended
        const driver = await db.getUserById(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
        }

        if (driver.accountStatus !== "active") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "حسابك موقوف. يرجى سداد العمولات المستحقة لتفعيل الحساب",
          });
        }

        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // Check if order is still available (not assigned to another driver)
        if (order.driverId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Order has already been accepted by another driver",
          });
        }

        // Assign order to driver
        await db.assignOrderToDriver(input.orderId, ctx.user.id);
        await db.updateOrderStatus(input.orderId, "assigned");

        return { success: true };
      }),

    // Reject order by driver (removes from their view only)
    rejectOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "driver") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only drivers can reject orders",
          });
        }

        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        // Check if order is still available (not assigned)
        if (order.driverId) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Order has already been accepted",
          });
        }

        // Store rejection in database (for future analytics)
        // For now, we just return success - the order remains available for other drivers
        return { success: true };
      }),

    // Complete order and apply commission
    completeOrder: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          paymentConfirmation: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "driver") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only drivers can complete orders",
          });
        }

        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        if (order.driverId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only complete your own orders",
          });
        }

        // Import pricing functions
        const { getCommissionPerOrder, shouldBlockDriver } = await import("@shared/pricing");
        
        // Get commission amount
        const commission = getCommissionPerOrder();
        
        // Update order status to delivered
        await db.updateOrderStatus(input.orderId, "delivered");
        
        // Update driver debt and commission
        const driver = await db.getUserById(ctx.user.id);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
        }

        const currentDebt = parseFloat(driver.totalDebt?.toString() || "0");
        const currentCommission = parseFloat(driver.totalCommission?.toString() || "0");
        const newDebt = currentDebt + commission;
        const isSuspended = shouldBlockDriver(newDebt);

        // Update driver record
        // تحديث العمولات المستحقة
        const updatedDriver = await db.updateDriverCommission(ctx.user.id, commission);
        
        // تحديث حالة الحساب إذا لزم الأمر
        if (isSuspended) {
          await db.updateAccountStatus(ctx.user.id, "disabled", "عمولات مستحقة تجاوزت 30 جنيه");
        }

        // Send real-time notifications
        const app = (ctx.req as any)?.app;
        if (app?.sendNotificationToUser && updatedDriver) {
          const pendingAmount = parseFloat(updatedDriver.pendingCommission?.toString() || "0");
          
          if (isSuspended) {
            app.sendNotificationToUser(ctx.user.id, {
              type: "commission_suspended",
              title: "تم إيقاف الحساب",
              message: `تم إيقاف حسابك بسبب عمولات مستحقة بقيمة ج.م ${pendingAmount.toFixed(2)}`,
              amount: pendingAmount,
              timestamp: new Date().toISOString(),
            });
          } else if (pendingAmount >= 20 && pendingAmount < 30) {
            app.sendNotificationToUser(ctx.user.id, {
              type: "commission_warning",
              title: "تنبيه: عمولات مستحقة",
              message: `لديك ج.م ${pendingAmount.toFixed(2)} عمولات مستحقة. المتبقي: ج.م ${(30 - pendingAmount).toFixed(2)} قبل إيقاف الحساب`,
              amount: pendingAmount,
              timestamp: new Date().toISOString(),
            });
          }
        }

        return {
          success: true,
          commission,
          newDebt,
          isSuspended,
          message: isSuspended
            ? "تم إكمال الطلب. تم حظر حسابك بسبب تجاوز حد المديونية. يرجى الدفع عبر Vodafone Cash."
            : `تم إكمال الطلب. تم خصم ${commission} جنيه عمولة. رصيدك المتبقي: ${newDebt} جنيه`,
        };
      }),

    // Rate driver
    rateDriver: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          rating: z.number().min(1).max(5),
          comment: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const order = await db.getOrderById(input.orderId);
        if (!order) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }

        if (order.customerId !== ctx.user.id) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the customer can rate the driver",
          });
        }

        await db.rateOrder(input.orderId, input.rating, input.comment);

        return { success: true };
      }),
  }),

  /**
   * Driver location tracking
   */
  location: router({
    // Update driver location
    updateDriverLocation: protectedProcedure
      .input(
        z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          orderId: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "driver") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only drivers can update location",
          });
        }

        // Update driver location in both users and driversAvailability tables
        await db.updateUserLocation(ctx.user.id, input.latitude, input.longitude);
        await db.updateDriverLocation(ctx.user.id, input.latitude, input.longitude);

        // Broadcast location update via WebSocket
        // This will be handled by the client-side WebSocket connection

        return { success: true };
      }),

    // Get driver location
    getDriverLocation: protectedProcedure
      .input(z.object({ driverId: z.number() }))
      .query(async ({ ctx, input }) => {
        const driver = await db.getUserById(input.driverId);
        if (!driver) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
        }

        return {
          driverId: driver.id,
          latitude: driver.latitude ? parseFloat(driver.latitude.toString()) : null,
          longitude: driver.longitude ? parseFloat(driver.longitude.toString()) : null,
        };
      }),

    // Get current driver location
    getCurrentLocation: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "driver") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only drivers can access this",
        });
      }

      const driver = await db.getUserById(ctx.user.id);
      if (!driver) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
      }

      return {
        latitude: driver.latitude ? parseFloat(driver.latitude.toString()) : null,
        longitude: driver.longitude ? parseFloat(driver.longitude.toString()) : null,
      };
    }),

    // Get all active drivers
    getActiveDrivers: publicProcedure.query(async () => {
      return await db.getActiveDrivers();
    }),
  }),

  /**
   * Notifications
   */
  notifications: router({
    // Send notification to drivers about new order
    notifyNewOrder: protectedProcedure
      .input(
        z.object({
          orderId: z.number(),
          title: z.string(),
          message: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "customer") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only customers can trigger notifications",
          });
        }

        // In a real app, this would send push notifications to all available drivers
        // For now, we just return success
        return { success: true, message: "Notification sent to available drivers" };
      }),
  }),

  /**
   * Admin Management Routes
   */
  admin: router({
    // Get all orders
    getAllOrders: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const orders = await db.getAllOrders();
      return orders.map((o) => ({
        id: o.id,
        status: o.status,
        customerId: o.customerId,
        driverId: o.driverId,
        price: o.price ? parseFloat(o.price.toString()) : 0,
        createdAt: o.createdAt,
      }));
    }),

    // Get statistics
    getStatistics: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const stats = await db.getStatistics();
      return stats;
    }),
    // Get all users
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const users = await db.getAllUsers();
      return users.map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        role: u.role,
        accountStatus: u.accountStatus,
        pendingCommission: parseFloat(u.pendingCommission?.toString() || "0"),
        paidCommission: parseFloat(u.paidCommission?.toString() || "0"),
        createdAt: u.createdAt,
      }));
    }),

    // Get suspended drivers
    getSuspendedDrivers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const drivers = await db.getSuspendedDrivers();
      return drivers.map((d) => ({
        id: d.id,
        name: d.name,
        phone: d.phone,
        accountStatus: d.accountStatus,
        pendingCommission: parseFloat(d.pendingCommission?.toString() || "0"),
      }));
    }),

    // Update account status (suspend/resume)
    updateAccountStatus: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          status: z.enum(["active", "suspended", "disabled"]),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }

        const user = await db.updateAccountStatus(input.userId, input.status, input.reason);
        if (!user) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }

        // Send real-time notifications
        const app = (ctx.req as any)?.app;
        if (app?.sendNotificationToUser) {
          if (input.status === "active") {
            app.sendNotificationToUser(input.userId, {
              type: "commission_resumed",
              title: "تم تفعيل الحساب",
              message: "تم تفعيل حسابك بنجاح. يمكنك الآن استقبال الطلبات الجديدة",
              timestamp: new Date().toISOString(),
            });
          } else if (input.status === "disabled") {
            app.sendNotificationToUser(input.userId, {
              type: "commission_suspended",
              title: "تم إيقاف الحساب",
              message: input.reason || "تم إيقاف حسابك من قبل الإدارة",
              timestamp: new Date().toISOString(),
            });
          }
        }

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            accountStatus: user.accountStatus,
          },
        };
      }),

    // Delete user
    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }

        await db.deleteUser(input.userId);
        return { success: true, message: "User deleted successfully" };
      }),

    // Delete order
    deleteOrder: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }

        await db.deleteOrder(input.orderId);
        return { success: true, message: "Order deleted successfully" };
      }),

    // Get report data for export
    getReportData: protectedProcedure
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
        }

        const drivers = await db.getAllDrivers();
        let orders = await db.getAllOrders();
        
        if (input.startDate && input.endDate) {
          orders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= input.startDate! && orderDate <= input.endDate!;
          });
        }

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.price?.toString() || "0")), 0);
        const completedOrders = orders.filter(order => order.status === "delivered").length;
        const totalCommission = drivers.reduce((sum, driver) => sum + (parseFloat(driver.pendingCommission?.toString() || "0")), 0);
        const paidCommission = drivers.reduce((sum, driver) => sum + (parseFloat(driver.paidCommission?.toString() || "0")), 0);

        return {
          drivers: drivers.map(d => ({
            id: d.id,
            name: d.name,
            phone: d.phone,
            accountStatus: d.accountStatus,
            totalOrders: orders.filter(o => o.driverId === d.id).length,
            earnings: orders
              .filter(o => o.driverId === d.id && o.status === "delivered")
              .reduce((sum, o) => sum + parseFloat(o.price?.toString() || "0"), 0),
            pendingCommission: parseFloat(d.pendingCommission?.toString() || "0"),
            paidCommission: parseFloat(d.paidCommission?.toString() || "0"),
          })),
          orders: orders.map(o => ({
            id: o.id,
            customerId: o.customerId,
            driverId: o.driverId,
            pickupLocation: o.pickupLocation,
            deliveryLocation: o.deliveryLocation,
            price: parseFloat(o.price?.toString() || "0"),
            status: o.status,
            createdAt: o.createdAt,
          })),
          statistics: {
            totalOrders,
            completedOrders,
            totalRevenue,
            totalCommission,
            paidCommission,
            pendingCommission: totalCommission - paidCommission,
          },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

/**
 * Helper function to calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
