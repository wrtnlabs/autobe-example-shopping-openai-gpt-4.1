import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Remove (hard delete due to schema limitation) an alert trigger from a buyer’s
 * favorite product (ai_commerce_favorites_alerts).
 *
 * This endpoint allows a buyer to remove an alert trigger configuration from a
 * product they've previously favorited. It requires both the favorite product
 * ID and the alert configuration ID. The operation ensures:
 *
 * - The specified alert configuration exists
 * - The alert belongs to the same favorite product as provided in
 *   favoriteProductId
 * - The favorite belongs to the authenticated buyer
 *
 * Instead of a soft delete as described in the API contract, this implements a
 * physical delete because there is no 'deleted_at' field in the schema.
 *
 * @param props - Parameters for the alert delete operation
 * @param props.buyer - The authenticated buyer performing the delete
 * @param props.favoriteProductId - ID of the buyer's favorite product
 *   associated with this alert
 * @param props.alertId - ID of the alert configuration to be deleted
 * @returns Void (no value on success)
 * @throws {Error} If the alert is not found, not owned by buyer, or not tied to
 *   the specified favoriteId
 */
export async function deleteaiCommerceBuyerFavoritesProductsFavoriteProductIdAlertsAlertId(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  alertId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { buyer, favoriteProductId, alertId } = props;

  // Step 1: Load the alert by id and favorite_id
  const alert = await MyGlobal.prisma.ai_commerce_favorites_alerts.findFirst({
    where: {
      id: alertId,
      favorite_id: favoriteProductId,
    },
  });
  if (!alert) {
    throw new Error(
      "Alert not found or does not belong to the specified favorite product",
    );
  }

  // Step 2: Load the favorite record and check ownership
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findUnique({
      where: { id: favoriteProductId },
    });
  if (!favorite) {
    throw new Error("Favorite product record not found");
  }
  if (favorite.user_id !== buyer.id) {
    throw new Error("Alert does not belong to the authenticated buyer");
  }

  // Step 3: Delete the alert (hard delete due to schema constraint)
  await MyGlobal.prisma.ai_commerce_favorites_alerts.delete({
    where: { id: alertId },
  });
}
