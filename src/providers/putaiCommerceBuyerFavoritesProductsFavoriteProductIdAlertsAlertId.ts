import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAlert";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Update an existing alert configuration for a favorite product
 * (ai_commerce_favorites_alerts).
 *
 * Updates a specific alert configuration for a buyer's favorited product. The
 * operation edits an alert's settings (such as the notification status) in the
 * ai_commerce_favorites_alerts table, strictly referencing both favorite
 * product and alert IDs for context.
 *
 * This endpoint enforces that the alert is bound to the calling buyer and the
 * specified favorite product, and changes apply only to mutable fields (e.g.,
 * enabling/disabling). Schema-driven validation and business constraints (no
 * duplicate alerts per type) are applied.
 *
 * Security is handled through ownership checks and record validation; all
 * actions are fully audit-logged elsewhere. The updated alert configuration is
 * returned in the response on success. Possible error cases include lack of
 * ownership, forbidden edits, or constraint violations.
 *
 * @param props - Object containing buyer authentication, favorite and alert
 *   IDs, and the update body.
 * @param props.buyer - The authenticated BuyerPayload performing the operation
 * @param props.favoriteProductId - The ID of the favorited product associated
 *   with the alert (UUID)
 * @param props.alertId - The ID of the alert to update (UUID)
 * @param props.body - The alert update instruction
 * @returns The full updated alert configuration object
 * @throws {Error} If alert does not exist or does not match favorite, or if
 *   buyer is not owner
 */
export async function putaiCommerceBuyerFavoritesProductsFavoriteProductIdAlertsAlertId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  alertId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesAlert.IUpdate;
}): Promise<IAiCommerceFavoritesAlert> {
  // Fetch the alert and the parent favorite for strict matching and ownership check
  const alert = await MyGlobal.prisma.ai_commerce_favorites_alerts.findUnique({
    where: { id: props.alertId },
    select: {
      id: true,
      favorite_id: true,
      alert_type: true,
      is_enabled: true,
      last_triggered_at: true,
      // Relation
      favorite: { select: { user_id: true } },
    },
  });
  if (
    !alert ||
    alert.favorite_id !== props.favoriteProductId ||
    !alert.favorite ||
    alert.favorite.user_id !== props.buyer.id
  ) {
    throw new Error(
      "Not found or forbidden: Buyer does not own this alert on the specified favorite",
    );
  }

  // Only update mutable fields. Follow the DTO spec strictly (only is_enabled).
  const updated = await MyGlobal.prisma.ai_commerce_favorites_alerts.update({
    where: { id: props.alertId },
    data: {
      is_enabled: props.body.is_enabled ?? undefined,
    },
    select: {
      id: true,
      favorite_id: true,
      alert_type: true,
      is_enabled: true,
      last_triggered_at: true,
    },
  });
  return {
    id: updated.id,
    favorite_id: updated.favorite_id,
    alert_type: updated.alert_type,
    is_enabled: updated.is_enabled,
    last_triggered_at:
      updated.last_triggered_at !== null &&
      updated.last_triggered_at !== undefined
        ? toISOStringSafe(updated.last_triggered_at)
        : undefined,
  };
}
