import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import bcryptjs from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export const appRouter = router({
  auth: router({
    login: publicProcedure
      .input(z.object({ phone: z.string(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

        const result = await db.select().from(users).where(eq(users.phone, input.phone)).limit(1);
        const user = result[0];

        if (!user || !user.password) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        }

        const isValid = await bcryptjs.compare(input.password, user.password);
        if (!isValid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة" });
        }

        // Set session cookie
        ctx.res.cookie("session", JSON.stringify({ userId: user.id, role: user.role }), {
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { success: true, user };
      }),

    me: publicProcedure.query(({ ctx }) => ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie("session");
      return { success: true };
    }),
  }),

  users: router({
    getAllUsers: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(users);
    }),
  }),

  orders: router({
    getAllOrders: protectedProcedure.query(async () => {
      return [];
    }),
  }),
});

export type AppRouter = typeof appRouter;
