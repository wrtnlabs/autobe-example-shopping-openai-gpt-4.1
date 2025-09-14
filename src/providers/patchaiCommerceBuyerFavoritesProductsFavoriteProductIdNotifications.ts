import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProductNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProductNotification";
import { IPageIAiCommerceFavoritesProductNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesProductNotification";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Retrieves a paginated, filtered, and sorted list of notification events for a
 * user's favorited product.
 *
 * This operation allows an authenticated buyer to view notifications such as
 * price drops, restocks, or status updates on a specific favorite product.
 * Results are paginated and may be filtered/sorted by notification type,
 * delivered/read status, or date range. Unauthorized or non-owner access is
 * denied.
 *
 * @param props - Parameters for this operation
 * @param props.buyer - Authenticated buyer making the request
 * @param props.favoriteProductId - UUID for the favorited product
 * @param props.body - Filter, sort, and pagination request parameters
 * @returns A paginated list of favorited-product notification entities
 * @throws {Error} When the favorite does not exist, is deleted, or is not owned
 *   by the user
 */
export async function patchaiCommerceBuyerFavoritesProductsFavoriteProductIdNotifications(props: {
  buyer: BuyerPayload;
  favoriteProductId: string & tags.Format<"uuid">;
  body: IAiCommerceFavoritesProductNotification.IRequest;
}): Promise<IPageIAiCommerceFavoritesProductNotification> {
  const { buyer, favoriteProductId, body } = props;
  // Step 1: Ownership validation -- only allow owner/active favorites
  const favorite =
    await MyGlobal.prisma.ai_commerce_favorites_products.findFirst({
      where: {
        id: favoriteProductId,
        user_id: buyer.id,
        deleted_at: null,
      },
    });
  if (favorite === null) {
    throw new Error("Favorite not found or not owned by this user");
  }
  // Step 2: Pagination + sort
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);

  // Step 3: Filtering conditions
  const deliveredAtCondition =
    (body.delivered_from !== undefined && body.delivered_from !== null) ||
    (body.delivered_to !== undefined && body.delivered_to !== null)
      ? {
          delivered_at: {
            ...(body.delivered_from !== undefined &&
              body.delivered_from !== null && { gte: body.delivered_from }),
            ...(body.delivered_to !== undefined &&
              body.delivered_to !== null && { lte: body.delivered_to }),
          },
        }
      : {};
  const where = {
    favorite_id: favoriteProductId,
    user_id: buyer.id,
    ...(body.notification_type !== undefined &&
      body.notification_type !== null && {
        notification_type: body.notification_type,
      }),
    ...deliveredAtCondition,
    ...(body.read_status === "read" && { read_at: { not: null } }),
    ...(body.read_status === "unread" && { read_at: null }),
  };
  // Step 4: Query rows and total - embed orderBy directly
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_notifications.findMany({
      where,
      orderBy:
        body.sort_by === "created_at"
          ? {
              created_at:
                body.sort_order === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            }
          : {
              delivered_at:
                body.sort_order === "asc"
                  ? ("asc" as const)
                  : ("desc" as const),
            },
      skip,
      take: Number(limit),
    }),
    MyGlobal.prisma.ai_commerce_favorites_notifications.count({ where }),
  ]);
  // Step 5: Results mapping
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(limit) > 0 ? Math.ceil(total / Number(limit)) : 1,
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      favorite_id: row.favorite_id,
      notification_type: row.notification_type,
      delivered_at: toISOStringSafe(row.delivered_at),
      read_at:
        row.read_at === null || row.read_at === undefined
          ? null
          : toISOStringSafe(row.read_at),
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
