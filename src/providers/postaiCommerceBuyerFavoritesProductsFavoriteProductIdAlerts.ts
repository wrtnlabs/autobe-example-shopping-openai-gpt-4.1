import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAlert";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Create a new alert trigger for a favorited product
 * (ai_commerce_favorites_alerts).
 *
 * Allows the authenticated buyer to register a personalized alert condition
 * (e.g., price drop, restock, answer posted) for a specific favorite product.
 * Ownership and uniqueness are strictly enforced: only the favorite owner may
 * create an alert and each alert_type is unique per favorite product. The new
 * alert trigger is immediately associated with the buyer's favorite and is
 * returned in full detail for user interface and audit purposes.
 *
 * @param props - Parameters for alert creation
 * @param props.buyer - The authenticated buyer making the request (must own the
 *   favorite)
 * @param props.favoriteProductId - ID of the buyer's favorited product for
 *   which to create the alert
 * @param props.body - Alert trigger details (alert_type, is_enabled)
 * @returns The full alert configuration for the favorite product
 * @throws {Error} If the favorite does not exist, is not owned by the buyer, or
 *   is soft deleted
 * @throws {Error} If an alert of the requested type already exists for this
 *   favorite
 */
export async function postaiCommerceBuyerFavoritesProductsFavoriteProductIdAlerts(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesAlert.ICreate;
}): Promise<IAiCommerceFavoritesAlert> {
  const { buyer, favoriteProductId, body } = props;

  // 1. Ensure the favorite exists, is not deleted, and belongs to this buyer
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error(
      "Forbidden: Favorite product not found or not owned by current buyer",
    );
  }

  // 2. Ensure uniqueness: only one alert_type per favorite
  const existing = await MyGlobal.prisma.ai_commerce_favorites_alerts.findFirst(
    {
      where: {
        favorite_id: favoriteProductId,
        alert_type: body.alert_type,
      },
    },
  );
  if (existing) {
    throw new Error(
      "Alert trigger of this type already exists for this favorite",
    );
  }

  // 3. Create the alert (no value for last_triggered_at at creation)
  const created = await MyGlobal.prisma.ai_commerce_favorites_alerts.create({
    data: {
      id: v4(),
      favorite_id: favoriteProductId,
      alert_type: body.alert_type,
      is_enabled: body.is_enabled,
      last_triggered_at: null,
    },
  });

  // 4. Return strictly typed DTO for API contract
  return {
    id: created.id,
    favorite_id: created.favorite_id,
    alert_type: created.alert_type,
    is_enabled: created.is_enabled,
    // Field is optional and nullable in the DTO; exclude if null.
    ...(created.last_triggered_at !== null &&
    created.last_triggered_at !== undefined
      ? { last_triggered_at: created.last_triggered_at }
      : {}),
  };
}
