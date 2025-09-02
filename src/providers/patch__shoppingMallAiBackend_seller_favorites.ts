import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavorite";
import { IPageIShoppingMallAiBackendFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavorite";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list paginated favorites for the authenticated user (seller).
 *
 * Retrieves the authenticated seller's favorites in a paginated result,
 * supporting search/filtering by target type, folder, or keywords. Only
 * non-deleted (active) favorites are shown. Advanced search allows sellers to
 * filter favorites by type (product, address, inquiry), folder, text, or date
 * range. Pagination and sorting options permit scalable browser navigation.
 *
 * Security checks ensure the authenticated seller can only view their own
 * favorites and not those of other sellers. Provides a summary view of each
 * favorite, with audit timestamps as per evidence policies.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller performing the request
 * @param props.body - Filtering and pagination options for favorite retrieval
 * @returns Paginated list of favorite summary entities matching the
 *   filter/search
 * @throws {Error} When seller is not found or not authorized for the resource
 */
export async function patch__shoppingMallAiBackend_seller_favorites(props: {
  seller: SellerPayload;
  body: IShoppingMallAiBackendFavorite.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavorite.ISummary> {
  const { seller, body } = props;
  // Default pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // Query favorites (non-deleted, owned by seller)
  const [favorites, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.findMany({
      where: {
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: seller.id,
        ...(body.target_type !== undefined && {
          target_type: body.target_type,
        }),
        ...(body.folder_id !== undefined && {
          shopping_mall_ai_backend_favorite_folder_id: body.folder_id,
        }),
        ...(body.q !== undefined && {
          title_snapshot: {
            contains: body.q,
            mode: "insensitive" as const,
          },
        }),
        ...(body.created_at_from !== undefined ||
        body.created_at_to !== undefined
          ? {
              created_at: {
                ...(body.created_at_from !== undefined && {
                  gte: body.created_at_from,
                }),
                ...(body.created_at_to !== undefined && {
                  lte: body.created_at_to,
                }),
              },
            }
          : {}),
      },
      orderBy: body.order_by
        ? { [body.order_by]: body.direction === "asc" ? "asc" : "desc" }
        : { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        target_type: true,
        title_snapshot: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorites.count({
      where: {
        deleted_at: null,
        shopping_mall_ai_backend_customer_id: seller.id,
        ...(body.target_type !== undefined && {
          target_type: body.target_type,
        }),
        ...(body.folder_id !== undefined && {
          shopping_mall_ai_backend_favorite_folder_id: body.folder_id,
        }),
        ...(body.q !== undefined && {
          title_snapshot: {
            contains: body.q,
            mode: "insensitive" as const,
          },
        }),
        ...(body.created_at_from !== undefined ||
        body.created_at_to !== undefined
          ? {
              created_at: {
                ...(body.created_at_from !== undefined && {
                  gte: body.created_at_from,
                }),
                ...(body.created_at_to !== undefined && {
                  lte: body.created_at_to,
                }),
              },
            }
          : {}),
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: favorites.map((fav) => ({
      id: fav.id,
      target_type: fav.target_type,
      title_snapshot: fav.title_snapshot ?? null,
      created_at: toISOStringSafe(fav.created_at),
    })),
  };
}
