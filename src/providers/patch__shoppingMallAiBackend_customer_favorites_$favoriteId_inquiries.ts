import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendFavoriteInquiry";
import { IPageIShoppingMallAiBackendFavoriteInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendFavoriteInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and filter among a customer's favorite inquiries (Q&A/bookmarked
 * threads).
 *
 * Enables customers to search through their favorited inquiries (Q&A threads)
 * using filtering, sorting, and pagination parameters. Supports complex
 * business queries, such as filtering by status, date, content keyword, or
 * folder/tags association.
 *
 * Reference is to the 'shopping_mall_ai_backend_favorite_inquiries' model,
 * which links favorites to inquiries and caches inquiry status for notification
 * and evidence. Only authenticated customers can access their own favorited
 * inquiries, with business logic enforcing row-level ownership checks.
 *
 * The response provides paginated summary information about each favorited
 * inquiry, including key metadata, favorited snapshot details, and optional
 * updates or notifications triggered by inquiry changes. Supports use cases
 * such as after-sales support follow-up, helpdesk ticket review, and personal
 * Q&A curation. Integrates with customer dashboard UI for improved service
 * personalization and retention.
 *
 * @param props - Request properties
 * @param props.customer - Authenticated CustomerPayload for ownership
 *   enforcement
 * @param props.favoriteId - UUID of the parent favorite entity
 *   (bookmark/folder) to search within
 * @param props.body - Filtering, search, sort, and pagination options
 * @returns Paginated summary list of the customer's favorited inquiry questions
 *   based on applied search criteria
 * @throws {Error} When the favorite does not exist or access is forbidden
 */
export async function patch__shoppingMallAiBackend_customer_favorites_$favoriteId_inquiries(props: {
  customer: CustomerPayload;
  favoriteId: string & tags.Format<"uuid">;
  body: import("../api/structures/IShoppingMallAiBackendFavoriteInquiry").IShoppingMallAiBackendFavoriteInquiry.IRequest;
}): Promise<
  import("../api/structures/IPageIShoppingMallAiBackendFavoriteInquiry").IPageIShoppingMallAiBackendFavoriteInquiry.ISummary
> {
  const { customer, favoriteId, body } = props;

  // Enforce ownership: favorite must belong to authenticated customer
  const favorite =
    await MyGlobal.prisma.shopping_mall_ai_backend_favorites.findFirst({
      where: {
        id: favoriteId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!favorite) throw new Error("Favorite not found or access denied");

  // Extract and normalize pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Parse sort string (only support created_at)
  let sortColumn = "created_at" as const;
  let sortOrder: "asc" | "desc" = "desc";
  if (body.sort) {
    const [col, dir] = body.sort.split(":");
    if (col === "created_at" && (dir === "asc" || dir === "desc")) {
      sortColumn = col;
      sortOrder = dir;
    }
  }

  // Build WHERE filter
  const where = {
    shopping_mall_ai_backend_favorite_id: favoriteId,
    deleted_at: null,
    ...(body.search &&
      body.search.length > 0 && {
        inquiry_snapshot: {
          contains: body.search,
          mode: "insensitive" as const,
        },
      }),
  };

  // Query and count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.findMany({
      where,
      orderBy: { [sortColumn]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        inquiry_snapshot: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_favorite_inquiries.count({
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
    data: rows.map((row) => ({
      id: row.id,
      inquiry_snapshot: row.inquiry_snapshot ?? null,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
