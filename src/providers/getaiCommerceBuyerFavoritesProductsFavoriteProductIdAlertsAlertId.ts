import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAlert";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * View the details of a specific alert trigger on a favorited product
 * (ai_commerce_favorites_alerts).
 *
 * This API endpoint allows a buyer to retrieve the configuration and metadata
 * for a specific alert on one of their favorite products. It verifies that the
 * buyer owns the favorite and that the alert belongs to that favorite. If the
 * alert is not found or not accessible by this buyer, an error is thrown. All
 * date values are returned as ISO 8601 strings. Access is strictly enforced via
 * favorite ownership.
 *
 * @param props - Properties for the request
 * @param props.buyer - The authenticated buyer making the request
 * @param props.favoriteProductId - The ID of the favorite product for which
 *   this alert is configured
 * @param props.alertId - The ID of the specific alert configuration to retrieve
 * @returns The alert configuration details (IAiCommerceFavoritesAlert)
 * @throws {Error} If the alert does not exist, is not owned by the buyer, or if
 *   access is forbidden
 */
export async function getaiCommerceBuyerFavoritesProductsFavoriteProductIdAlertsAlertId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  alertId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceFavoritesAlert> {
  const { buyer, favoriteProductId, alertId } = props;

  const alert = await MyGlobal.prisma.ai_commerce_favorites_alerts.findFirst({
    where: {
      id: alertId,
      favorite_id: favoriteProductId,
      favorite: {
        user_id: buyer.id,
        deleted_at: null,
      },
    },
    include: {
      favorite: true,
    },
  });

  if (!alert) {
    throw new Error("Alert not found or access forbidden");
  }

  return {
    id: alert.id,
    favorite_id: alert.favorite_id,
    alert_type: alert.alert_type,
    is_enabled: alert.is_enabled,
    last_triggered_at:
      alert.last_triggered_at !== null && alert.last_triggered_at !== undefined
        ? toISOStringSafe(alert.last_triggered_at)
        : undefined,
  };
}
