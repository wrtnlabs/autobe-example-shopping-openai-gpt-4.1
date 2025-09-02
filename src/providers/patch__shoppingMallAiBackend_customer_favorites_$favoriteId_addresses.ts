import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteAddress";
import { IPageIShoppingMallAiBackendFavoriteAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a paginated, filterable list of addresses favorited by the customer
 * in a specific favorite folder/group.
 *
 * Lists customer-favorited addresses under a given favorite group/folder by
 * favoriteId. Returns a paginated list of address snapshot records as stored at
 * the time of favoriting, supporting legacy business requirement for snapshot
 * integrity regardless of later address changes. Only covers addresses
 * favorited by the customer, not other customers. Ownership and access to the
 * favorite group are enforced for security.
 *
 * @param props - Request properties
 * @param props.customer - CustomerPayload: The currently authenticated customer
 *   (ownership/authorization enforced)
 * @param props.favoriteId - Favorite folder/group UUID being queried
 * @param props.body - Filter/search/sort/pagination params for query
 * @returns Paginated result set of favorited address snapshot summary info
 * @throws {Error} If a database/prisma query error occurs (will throw up)
 */
export async function patch__shoppingMallAiBackend_customer_favorites_$favoriteId_addresses(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendFavoriteAddress.IRequest;
}): Promise<IPageIShoppingMallAiBackendFavoriteAddress.ISummary> {
  const { customer, favoriteId, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Parse sort order: default is created_at:desc
  let sortField: "created_at" = "created_at";
  let sortDirection: "desc" | "asc" = "desc";
  if (body.sort) {
    const [field, dir] = body.sort.split(":");
    if (field === "created_at" && (dir === "desc" || dir === "asc")) {
      sortDirection = dir as "desc" | "asc";
    }
  }
  const where = {
    shopping_mall_ai_backend_favorite_id: favoriteId,
    shopping_mall_ai_backend_customer_id: customer.id,
    ...(body.search && body.search.length > 0
      ? {
          address_snapshot: {
            contains: body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };
  // Inline orderBy, brand-typed for Prisma inference
  const [results, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.findMany({
      where,
      orderBy: {
        created_at: sortDirection as "desc" | "asc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        address_snapshot: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_addresses.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((row) => ({
      id: row.id,
      address_snapshot: row.address_snapshot,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
