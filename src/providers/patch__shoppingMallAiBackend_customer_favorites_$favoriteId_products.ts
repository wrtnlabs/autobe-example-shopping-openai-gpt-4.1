import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteProduct";
import { IPageIShoppingMallAiBackendFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteProduct";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a paginated, filterable list of products that the authenticated
 * customer has favorited in a specific favorite group/folder.
 *
 * This operation enforces ownership and logical deletion checks on the favorite
 * folder, returning a paginated summary of mappings between the favorite and
 * favorited products. Supports paging and basic sorting on creation date.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated customer making the request
 * @param props.favoriteId - Globally unique UUID of the favorite group/folder
 * @param props.body - Filtering, sorting, and pagination parameters
 * @returns Paginated response with pagination info and summary records of
 *   favorited products
 * @throws {Error} If the favorite group does not exist, is deleted, or does not
 *   belong to the customer
 */
export async function patch__shoppingMallAiBackend_customer_favorites_$favoriteId_products(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteProduct.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavoriteProduct.ISummary> {
  const { customer, favoriteId, body } = props;

  // Step 1: Verify favorite folder exists, belongs to this customer, and not logically deleted
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!favorite) {
    throw new Error("Favorite folder not found or not owned by customer");
  }

  // Step 2: Normalize paging/sorting/parsing
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;

  // Only support sorting on created_at
  let orderByField = "created_at";
  let orderDirection: "asc" | "desc" = "desc";
  if (body.sort) {
    const [field, dir] = body.sort.split(",");
    if (field === "created_at" && (dir === "asc" || dir === "desc")) {
      orderByField = field;
      orderDirection = dir;
    }
  }

  // Step 3: Fetch favorites and count in parallel for pagination
  const [records, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.findMany({
      where: { shopping_mall_ai_backend_favorite_id: favoriteId },
      orderBy: { [orderByField]: orderDirection },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_products.count({
      where: { shopping_mall_ai_backend_favorite_id: favoriteId },
    }),
  ]);

  // Step 4: Format response
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      shopping_mall_ai_backend_product_id:
        r.shopping_mall_ai_backend_product_id,
      created_at: toISOStringSafe(r.created_at),
    })),
  };
}
