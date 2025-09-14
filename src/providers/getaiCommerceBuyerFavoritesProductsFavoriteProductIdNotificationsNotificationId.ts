import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProductNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProductNotification";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get detailed information about a specific notification for a user's favorited
 * product.
 *
 * This function retrieves the details of a single notification event associated
 * with a buyer's favorite product. It enforces ownership, ensures the favorite
 * is active, and that the notification belongs to the buyer. If the favorite or
 * notification does not exist, or does not belong to the buyer, an error is
 * thrown.
 *
 * @param props - Request parameters
 * @param props.buyer - The authenticated buyer (authorization context)
 * @param props.favoriteProductId - The UUID of the favorited product as
 *   context
 * @param props.notificationId - The UUID of the notification to retrieve
 * @returns Notification detail object for audit, UX, and compliance views
 * @throws {Error} If ownership is violated, or if favorite/product/notification
 *   is not found
 */
export async function getaiCommerceBuyerFavoritesProductsFavoriteProductIdNotificationsNotificationId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  notificationId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesProductNotification> {
  const { buyer, favoriteProductId, notificationId } = props;
  // Step 1: Ownership and active-favorite check
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite not found or access denied");
  }
  // Step 2: Precise notification lookup, enforcing cross-table integrity
  const notification =
    await MyGlobal.prisma.ai_commerce_favorites_notifications.findFirst({
      where: {
        id: notificationId,
        favorite_id: favoriteProductId,
        user_id: buyer.id,
      },
    });
  if (!notification) {
    throw new Error("Notification not found or access denied");
  }
  // Step 3: Explicit mapping. Dates as string & tags.Format<'date-time'>. Optional/nullable read_at.
  return {
    id: notification.id,
    user_id: notification.user_id,
    favorite_id: notification.favorite_id,
    notification_type: notification.notification_type,
    delivered_at: notification.delivered_at,
    read_at: notification.read_at ?? undefined,
    created_at: notification.created_at,
  };
}
