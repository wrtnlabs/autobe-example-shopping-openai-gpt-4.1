import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponNotification";
import { IPageIShoppingMallAiBackendCouponNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponNotification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated coupon notifications for a specific coupon.
 *
 * Search and retrieve a paginated list of coupon notification events for a
 * particular coupon. This endpoint enables operational users to monitor, audit,
 * and analyze all notifications linked to a coupon, such as issuance messages,
 * expiry warnings, redemption confirmations, or error alerts. The search can be
 * filtered by notification type, status, recipient, or timeframe, and returns
 * results in a paginated format with summary fields for each notification
 * event.
 *
 * Notifications are used in compliance reporting, customer notification
 * history, and marketing campaign analytics, with robust search and access
 * controls for authorized users. Each entry in the response includes details
 * like notification type, delivery status, send attempts, and any error or
 * result messages. Data retrieval is subject to access rights with audit
 * logging for each query.
 *
 * Related operations: notification detail retrieval, notification
 * download/export, campaign management endpoints.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin user
 * @param props.couponId - Unique identifier of the coupon for which to retrieve
 *   notifications
 * @param props.body - Search and pagination parameters for filtering coupon
 *   notifications
 * @returns Paginated list of coupon notification summary objects matching the
 *   search criteria
 * @throws {Error} If query construction or execution fails
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_notifications(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponNotification.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponNotification.ISummary> {
  const { admin, couponId, body } = props;

  // Compose where clause (only fields present in both schema and DTO)
  const where = {
    shopping_mall_ai_backend_coupon_id: couponId,
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_ai_backend_customer_id: body.customer_id,
      }),
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: body.notification_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(() => {
      // Numeric range (send_attempts)
      let send_attempts: { gte?: number; lte?: number } = {};
      if (
        body.send_attempts_min !== undefined &&
        body.send_attempts_min !== null
      ) {
        send_attempts.gte = body.send_attempts_min;
      }
      if (
        body.send_attempts_max !== undefined &&
        body.send_attempts_max !== null
      ) {
        send_attempts.lte = body.send_attempts_max;
      }
      return Object.keys(send_attempts).length > 0 ? { send_attempts } : {};
    })(),
    ...(() => {
      // DateTime range (last_attempted_at)
      let last_attempted_at: { gte?: string; lte?: string } = {};
      if (
        body.last_attempted_from !== undefined &&
        body.last_attempted_from !== null
      ) {
        last_attempted_at.gte = body.last_attempted_from;
      }
      if (
        body.last_attempted_to !== undefined &&
        body.last_attempted_to !== null
      ) {
        last_attempted_at.lte = body.last_attempted_to;
      }
      return Object.keys(last_attempted_at).length > 0
        ? { last_attempted_at }
        : {};
    })(),
    ...(() => {
      // DateTime range (created_at)
      let created_at: { gte?: string; lte?: string } = {};
      if (body.created_at_from !== undefined && body.created_at_from !== null) {
        created_at.gte = body.created_at_from;
      }
      if (body.created_at_to !== undefined && body.created_at_to !== null) {
        created_at.lte = body.created_at_to;
      }
      return Object.keys(created_at).length > 0 ? { created_at } : {};
    })(),
  };

  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  const orderByField = body.orderBy ?? "created_at";
  const direction = body.direction ?? "desc";

  // Query data and total count in parallel
  const [rows, total]: [
    Array<{
      id: string;
      notification_type: string;
      status: string;
      send_attempts: number;
      last_attempted_at: Date | null;
      created_at: Date;
    }>,
    number,
  ] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_notifications.findMany({
      where,
      orderBy: { [orderByField]: direction as "asc" | "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        notification_type: true,
        status: true,
        send_attempts: true,
        last_attempted_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_notifications.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id as string & tags.Format<"uuid">,
      notification_type: row.notification_type,
      status: row.status,
      send_attempts: row.send_attempts,
      last_attempted_at: row.last_attempted_at
        ? toISOStringSafe(row.last_attempted_at)
        : null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
