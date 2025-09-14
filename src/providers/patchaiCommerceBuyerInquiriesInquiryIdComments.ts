import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceComment";
import { IPageIAiCommerceComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceComment";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

/**
 * Get paginated list of comments under a specific inquiry
 * (ai_commerce_comments).
 *
 * Retrieves a paginated, filtered list of comments for a given inquiry. Only
 * the author of the inquiry can list the comments under their inquiry. Comments
 * are filterable by author, status, parent_comment, created_at range, and text
 * search, and results are paginated with summary info.
 *
 * @param props.buyer - The authenticated buyer (role: buyer) making the request
 * @param props.inquiryId - The UUID of the inquiry to list comments for
 * @param props.body - Search, filter, and pagination options for listing
 *   comments
 * @returns Paginated summary of comments attached to the given inquiry
 * @throws {Error} If the inquiry does not exist or the buyer is not the inquiry
 *   owner
 */
export async function patchaiCommerceBuyerInquiriesInquiryIdComments(props: {
  buyer: BuyerPayload;
  inquiryId: string & tags.Format<"uuid">;
  body: IAiCommerceComment.IRequest;
}): Promise<IPageIAiCommerceComment.ISummary> {
  const { buyer, inquiryId, body } = props;

  // Authorization: only inquiry author can list comments
  const inquiry = await MyGlobal.prisma.ai_commerce_inquiries.findFirst({
    where: {
      id: inquiryId,
      author_id: buyer.id,
    },
    select: { id: true },
  });
  if (inquiry === null) {
    throw new Error(
      "Unauthorized: Buyer can only list comments for their own inquiries",
    );
  }

  // Pagination (strict number conversion)
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build created_at filter as always object
  const created_at: Record<string, string & tags.Format<"date-time">> = {};
  if (body.created_at_from !== undefined && body.created_at_from !== null) {
    created_at.gte = body.created_at_from;
  }
  if (body.created_at_to !== undefined && body.created_at_to !== null) {
    created_at.lte = body.created_at_to;
  }

  // Build Prisma where object, skipping undefined/nulls
  const where = {
    deleted_at: null,
    inquiry_id: inquiryId,
    ...(body.author_id !== undefined &&
      body.author_id !== null && {
        author_id: body.author_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.parent_comment_id !== undefined &&
      body.parent_comment_id !== null && {
        parent_comment_id: body.parent_comment_id,
      }),
    ...(body.bulletin_id !== undefined &&
      body.bulletin_id !== null && {
        bulletin_id: body.bulletin_id,
      }),
    ...(body.review_id !== undefined &&
      body.review_id !== null && {
        review_id: body.review_id,
      }),
    ...(Object.keys(created_at).length > 0 ? { created_at } : {}),
    ...(body.search !== undefined &&
      body.search !== null && {
        body: { contains: body.search },
      }),
  };

  // Only allow certain sort fields
  const allowedSortFields = ["created_at", "status", "author_id"];
  const sortBy =
    body.sort_by !== undefined && allowedSortFields.includes(body.sort_by)
      ? body.sort_by
      : "created_at";
  const sortOrder =
    body.sort_order === "asc" || body.sort_order === "desc"
      ? body.sort_order
      : "desc";
  const orderBy = [{ [sortBy]: sortOrder }];

  // Query data and count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_comments.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        author_id: true,
        body: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_comments.count({ where }),
  ]);

  // Map to ISummary
  const data: IAiCommerceComment.ISummary[] = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    body: row.body,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // Pagination
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
