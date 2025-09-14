import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesAlert";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Configure or update alert trigger settings for a favorited product
 * (ai_commerce_favorites_alerts).
 *
 * This endpoint allows a buyer to update the enabled status of personalized
 * alert triggers (like price drop, restock, answer posted) on a product they
 * have favorited.
 *
 * - The operation ensures only the owner of the favorite product can modify its
 *   alert triggers.
 * - The favorite must not be deleted, and the buyer must be authenticated and
 *   authorized.
 * - For each update entry, the function updates the `is_enabled` flag of the
 *   corresponding alert (if present) — new alert triggers are NOT created by
 *   this endpoint.
 * - The endpoint always returns the current/full set of alert triggers for the
 *   favorite after modification, with proper branding and ISO8601 string
 *   formatting for date fields.
 *
 * @param props - Parameters for the update operation.
 * @param props.buyer - The authenticated buyer (role: buyer) making the
 *   request.
 * @param props.favoriteProductId - UUID of the product favorite to update
 *   alerts for.
 * @param props.body - The list of updates to apply (each update may provide
 *   is_enabled for a trigger).
 * @returns A response listing the updated alert triggers for the given
 *   favorite.
 * @throws {Error} If the favorite product is missing or does not belong to the
 *   buyer.
 */
export async function patchaiCommerceBuyerFavoritesProductsFavoriteProductIdAlerts(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesAlert.IUpdateRequest;
}): Promise<IAiCommerceFavoritesAlert.IList> {
  const { buyer, favoriteProductId, body } = props;

  // Step 1: Validate favorite and ownership
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite product not found or not owned by buyer.");
  }

  // Step 2: Fetch all existing alert triggers for this favorite
  const alertsBefore =
    await MyGlobal.prisma.ai_commerce_favorites_alerts.findMany({
      where: { favorite_id: favoriteProductId },
      select: {
        id: true,
        favorite_id: true,
        alert_type: true,
        is_enabled: true,
        last_triggered_at: true,
      },
    });

  // Step 3: For each update entry in body, patch matching existing alert (we only allow updating is_enabled, never other fields)
  // Updates are positional. If more updates than alerts, skip extra updates.
  if (Array.isArray(body.updates) && body.updates.length > 0) {
    for (
      let i = 0, n = Math.min(body.updates.length, alertsBefore.length);
      i < n;
      ++i
    ) {
      const update = body.updates[i];
      if (typeof update.is_enabled === "boolean") {
        await MyGlobal.prisma.ai_commerce_favorites_alerts.update({
          where: { id: alertsBefore[i].id },
          data: { is_enabled: update.is_enabled },
        });
      }
    }
  }

  // Step 4: Fetch all up-to-date alert triggers for this favorite
  const alertsAfter =
    await MyGlobal.prisma.ai_commerce_favorites_alerts.findMany({
      where: { favorite_id: favoriteProductId },
      select: {
        id: true,
        favorite_id: true,
        alert_type: true,
        is_enabled: true,
        last_triggered_at: true,
      },
    });

  // Step 5: Map to DTO format with correct branding and date handling
  return {
    alerts: alertsAfter.map((rec) => ({
      id: rec.id,
      favorite_id: rec.favorite_id,
      alert_type: rec.alert_type,
      is_enabled: rec.is_enabled,
      last_triggered_at:
        rec.last_triggered_at !== null && rec.last_triggered_at !== undefined
          ? toISOStringSafe(rec.last_triggered_at)
          : null,
    })),
  };
}
