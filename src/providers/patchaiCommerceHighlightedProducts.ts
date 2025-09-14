import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import { IPageIAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceHighlightedProduct";

/**
 * List paginated and filtered highlighted products
 * (ai_commerce_highlighted_products).
 *
 * Retrieves a paginated, filtered list of highlighted products. Allows
 * filtering by product, curator, scheduled and actual highlight times, and
 * activity status (active/scheduled/expired). Returns campaign and display
 * metadata for consumption by UI and analytics widgets.
 *
 * The function supports flexible client and admin uses for highlighted campaign
 * management and evidence.
 *
 * @param props - Request body containing filter/sort/page options for
 *   highlighted product retrieval
 * @param props.body - IAiCommerceHighlightedProduct.IRequest filter & page
 *   input
 * @returns IPageIAiCommerceHighlightedProduct.ISummary - Paginated, filtered
 *   highlight entries with status metadata
 * @throws {Error} If query or parameter errors occur
 */
export async function patchaiCommerceHighlightedProducts(props: {
  body: IAiCommerceHighlightedProduct.IRequest;
}): Promise<IPageIAiCommerceHighlightedProduct.ISummary> {
  const { body } = props;
  // Pagination options
  const page = body.page ?? 1;
  const limit = body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build where clause for direct DB filters
  // Only include filters if value is defined AND not null
  // Date filters: start_at_from, start_at_to -> gte/lte highlight_start_at
  let startAtFilter: { gte?: string; lte?: string } = {};
  if (body.start_at_from !== undefined && body.start_at_from !== null) {
    startAtFilter.gte = body.start_at_from;
  }
  if (body.start_at_to !== undefined && body.start_at_to !== null) {
    startAtFilter.lte = body.start_at_to;
  }

  const prismaWhere = {
    ...(body.product_id !== undefined &&
      body.product_id !== null && {
        ai_commerce_product_id: body.product_id,
      }),
    ...(body.highlighted_by !== undefined &&
      body.highlighted_by !== null && {
        highlighted_by: body.highlighted_by,
      }),
    ...(Object.keys(startAtFilter).length
      ? {
          highlight_start_at: startAtFilter,
        }
      : {}),
  };

  // Query all matching highlights (will filter status in app logic)
  // (Paging applied after filtering for highlight_status)
  const highlights =
    await MyGlobal.prisma.ai_commerce_highlighted_products.findMany({
      where: prismaWhere,
      orderBy: { highlight_start_at: "desc" },
    });

  // Evaluate highlight_status and is_active in app layer
  const now = toISOStringSafe(new Date());
  const nowDate = new Date(now);

  let filtered = highlights;

  if (body.highlight_status !== undefined && body.highlight_status !== null) {
    if (body.highlight_status === "active") {
      filtered = highlights.filter((row) => {
        // Active: now between start <= now && (end == null || now < end)
        const start = row.highlight_start_at;
        const end = row.highlight_end_at;
        return start <= nowDate && (end === null || nowDate < end);
      });
    } else if (body.highlight_status === "scheduled") {
      // Scheduled: now < start
      filtered = highlights.filter((row) => {
        const start = row.highlight_start_at;
        return nowDate < start;
      });
    } else if (body.highlight_status === "expired") {
      // Expired: end date exists and now >= end
      filtered = highlights.filter((row) => {
        const end = row.highlight_end_at;
        return end !== null && nowDate >= end;
      });
    }
  }

  const total = filtered.length;
  // Safe pagination: may result in empty page if skip >= total
  const items = filtered.slice(skip, skip + limit);

  const data = items.map((row) => {
    // Compute is_active for each
    const start = row.highlight_start_at;
    const end = row.highlight_end_at;
    const active = start <= nowDate && (end === null || nowDate < end);

    return {
      id: row.id,
      ai_commerce_product_id: row.ai_commerce_product_id,
      highlight_start_at: toISOStringSafe(start),
      highlight_end_at: end === null ? null : toISOStringSafe(end),
      is_active: active,
      reason: row.reason ?? null,
    };
  });

  return {
    pagination: {
      // Remove extra tag types by using Number()
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
