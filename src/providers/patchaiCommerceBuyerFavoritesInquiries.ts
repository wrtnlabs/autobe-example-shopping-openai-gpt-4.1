import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesInquiries } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesInquiries";
import { IPageIAiCommerceFavoritesInquiries } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceFavoritesInquiries";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * List/search favorited product inquiries for the authenticated user.
 *
 * Retrieves a paginated and optionally filtered list of the authenticated
 * buyer's favorited product inquiries. Filters may include organizational
 * folder, label, and the status of the associated inquiry. Results are sorted
 * and paginated with strict type compliance. Only summary data is returned for
 * list views.
 *
 * @param props - The input object containing:
 * @param props.buyer - Authenticated buyer payload ({ id, type: 'buyer' })
 * @param props.body - Filter and paging options for favorited inquiries
 *   retrieval
 * @returns Paginated and filtered list of the user's favorited inquiries,
 *   summary format
 * @throws {Error} If authentication is invalid or ordering/filtering fields are
 *   incorrect
 */
export async function patchaiCommerceBuyerFavoritesInquiries(props: {
  buyer: BuyerPayload;
  body: IAiCommerceFavoritesInquiries.IRequest;
}): Promise<IPageIAiCommerceFavoritesInquiries.ISummary> {
  const buyerId = props.buyer.id;
  const { body } = props;

  // Defensive values for page, limit (minimum 1)
  const page = Math.max(typeof body.page === "number" ? body.page : 1, 1);
  let limit = typeof body.limit === "number" ? body.limit : 20;
  if (limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  // Only allow valid sort_by fields.
  const sortableFields = ["created_at", "updated_at", "label"];
  const sortBy = sortableFields.includes(body.sort_by || "")
    ? body.sort_by!
    : "created_at";
  const sortOrder = body.sort_order === "asc" ? "asc" : "desc";

  // Build where condition
  const where = {
    user_id: buyerId,
    deleted_at: null,
    ...(body.folder_id !== undefined &&
      body.folder_id !== null && { folder_id: body.folder_id }),
    ...(body.label !== undefined &&
      body.label !== null && { label: body.label }),
    ...(body.status !== undefined &&
    body.status !== null &&
    Array.isArray(body.status) &&
    body.status.length > 0
      ? { inquiry: { status: { in: body.status } } }
      : {}),
  };

  // Fire paginated query and count in parallel
  const [rows, count] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_inquiries.findMany({
      where,
      include: { inquiry: true },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_favorites_inquiries.count({ where }),
  ]);

  // Map result and transform Date fields
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(count),
      pages: count === 0 ? 0 : Math.ceil(Number(count) / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      inquiry_id: row.inquiry_id,
      snapshot_id: row.snapshot_id,
      label: row.label === undefined ? null : row.label,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at:
        row.deleted_at !== null && row.deleted_at !== undefined
          ? toISOStringSafe(row.deleted_at)
          : null,
    })),
  };
}
