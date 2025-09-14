import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceInquiry";
import { IPageIAiCommerceInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceInquiry";

/**
 * List inquiries (with filtering and pagination) from ai_commerce_inquiries
 * table.
 *
 * Fetches a paginated, filtered, and optionally sorted list of product
 * inquiries as stored in the ai_commerce_inquiries table. Search parameters may
 * include filtering by product ID, author ID, inquiry status, and keywords.
 *
 * The operation supports both buyers searching for their own inquiries and
 * public browsing, with results subject to each inquiry's visibility property.
 * Backend filtering ensures compliance with privacy policies and returns only
 * those inquiries the requesting user is permitted to view.
 *
 * The response format includes a page of inquiry summary objects and pagination
 * metadata. The search and pagination logic is aligned to platform conventions
 * for performance and usability.
 *
 * @param props - Object containing the filter/search/pagination parameters
 * @param props.body - Search, filter, and paging parameters of type
 *   IAiCommerceInquiry.IRequest
 * @returns Paginated list of inquiry summary objects and paging metadata.
 */
export async function patchaiCommerceInquiries(props: {
  body: IAiCommerceInquiry.IRequest;
}): Promise<IPageIAiCommerceInquiry.ISummary> {
  const { body } = props;

  const limit = body.limit ?? 20;
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;

  // Restrict sorting to whitelisted columns only
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "question",
    "status",
    "visibility",
    "author_id",
    "product_id",
  ];
  const sortField =
    body.sort_field && allowedSortFields.includes(body.sort_field)
      ? body.sort_field
      : "created_at";
  const sortDirection: "asc" | "desc" =
    body.sort_direction === "asc" ? "asc" : "desc";

  // Compose dynamic where clause for filters
  const where = {
    deleted_at: null,
    ...(body.product_id !== undefined &&
      body.product_id !== null && { product_id: body.product_id }),
    ...(body.author_id !== undefined &&
      body.author_id !== null && { author_id: body.author_id }),
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.visibility !== undefined &&
      body.visibility !== null && { visibility: body.visibility }),
    ...(body.keyword !== undefined &&
      body.keyword.trim().length > 0 && {
        question: { contains: body.keyword },
      }),
  };

  // Query count and page data in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_inquiries.findMany({
      where,
      orderBy: { [sortField]: sortDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_inquiries.count({ where }),
  ]);

  // Map each inquiry to ISummary (date conversions)
  const summaries = rows.map((row) => ({
    id: row.id,
    author_id: row.author_id,
    product_id: row.product_id,
    question: row.question,
    visibility: row.visibility,
    status: row.status,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: summaries,
  };
}
