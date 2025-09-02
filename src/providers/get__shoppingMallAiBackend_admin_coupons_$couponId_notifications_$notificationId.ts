import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponNotification";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get full notification details for a specific coupon notification event.
 *
 * Retrieve full details of a specific coupon notification by notification ID
 * for a given coupon. This operation provides all business, delivery, and audit
 * metadata linked to a single notification event—such as notification type,
 * delivery status, send attempts, recipient, attempt timestamps, and any
 * associated error or result information. It enables advanced business
 * auditing, compliance verification, or notification delivery troubleshooting.
 *
 * Access is limited to authorized administrators due to the sensitive nature of
 * notification and delivery evidence. If the notification does not exist, an
 * error is returned. This endpoint is commonly used following a search or list
 * operation for notification audits and is essential during compliance reviews
 * or delivery investigations.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin making the request
 * @param props.couponId - UUID of the coupon associated with the notification
 * @param props.notificationId - UUID of the notification event to retrieve
 * @returns The coupon notification event detail per
 *   IShoppingMallAiBackendCouponNotification
 * @throws {Error} When the notification does not exist or admin lacks
 *   permission
 */
export async function get__shoppingMallAiBackend_admin_coupons_$couponId_notifications_$notificationId(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAiBackendCouponNotification> {
  const { couponId, notificationId } = props;

  // Admin authorization guaranteed by contract (decorator)
  // Query for the notification - must match both couponId and notificationId
  const record =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupon_notifications.findFirst(
      {
        where: {
          id: notificationId,
          shopping_mall_ai_backend_coupon_id: couponId,
        },
        select: {
          id: true,
          shopping_mall_ai_backend_coupon_id: true,
          shopping_mall_ai_backend_coupon_issuance_id: true,
          shopping_mall_ai_backend_coupon_code_id: true,
          shopping_mall_ai_backend_customer_id: true,
          notification_type: true,
          status: true,
          send_attempts: true,
          last_attempted_at: true,
          result_message: true,
          created_at: true,
        },
      },
    );
  if (!record) throw new Error("Notification not found");

  // Convert date fields and return in contract shape
  return {
    id: record.id as string & tags.Format<"uuid">,
    shopping_mall_ai_backend_coupon_id:
      record.shopping_mall_ai_backend_coupon_id
        ? (record.shopping_mall_ai_backend_coupon_id as string &
            tags.Format<"uuid">)
        : null,
    shopping_mall_ai_backend_coupon_issuance_id:
      record.shopping_mall_ai_backend_coupon_issuance_id
        ? (record.shopping_mall_ai_backend_coupon_issuance_id as string &
            tags.Format<"uuid">)
        : null,
    shopping_mall_ai_backend_coupon_code_id:
      record.shopping_mall_ai_backend_coupon_code_id
        ? (record.shopping_mall_ai_backend_coupon_code_id as string &
            tags.Format<"uuid">)
        : null,
    shopping_mall_ai_backend_customer_id:
      record.shopping_mall_ai_backend_customer_id
        ? (record.shopping_mall_ai_backend_customer_id as string &
            tags.Format<"uuid">)
        : null,
    notification_type: record.notification_type,
    status: record.status,
    send_attempts: record.send_attempts,
    last_attempted_at: record.last_attempted_at
      ? toISOStringSafe(record.last_attempted_at)
      : null,
    result_message: record.result_message ?? null,
    created_at: toISOStringSafe(record.created_at),
  };
}
