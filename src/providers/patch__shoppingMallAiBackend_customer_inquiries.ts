import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendInquiry";
import { IPageIShoppingMallAiBackendInquiry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendInquiry";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Search and paginate user inquiries/QnA tickets with advanced filtering.
 *
 * This endpoint retrieves a paginated and filtered list of user inquiries
 * (questions, support threads, or tickets) from across the shopping mall
 * platform. Results are always scoped to the authenticated customer.
 *
 * Supports filter by inquiry status, product/order, privacy flag, partial
 * title, and created_at date range. Only non-deleted inquiries are returned.
 * Pagination and sorting are also supported.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer making the request
 * @param props.body - Inquiry search and filter options (pagination, status,
 *   etc)
 * @returns Paginated summary list of inquiries matching the search/filter
 * @throws {Error} If database access fails or invalid parameters are used
 */
export async function patch__shoppingMallAiBackend_customer_inquiries(props: {
  customer: CustomerPayload;
  body: IShoppingMallAiBackendInquiry.IRequest;
}): Promise<IPageIShoppingMallAiBackendInquiry.ISummary> {
  const { customer, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (Number(page) - 1) * Number(limit);
  const allowedSorts = ["created_at", "updated_at", "title", "status"];
  let sortField = "created_at";
  let sortOrder = "desc";
  if (body.sort) {
    const s = body.sort.trim().split(/\s+/);
    if (allowedSorts.includes(s[0])) {
      sortField = s[0];
      if (s[1] && ["asc", "desc"].includes(s[1].toLowerCase())) {
        sortOrder = s[1].toLowerCase();
      }
    }
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_inquiries.findMany({
      where: {
        deleted_at: null,
        customer_id: customer.id,
        ...(body.status !== undefined &&
          body.status !== null && { status: body.status }),
        ...(body.product_id !== undefined &&
          body.product_id !== null && { product_id: body.product_id }),
        ...(body.order_id !== undefined &&
          body.order_id !== null && { order_id: body.order_id }),
        ...(body.title !== undefined &&
          body.title !== null && {
            title: { contains: body.title, mode: "insensitive" as const },
          }),
        ...(body.private !== undefined &&
          body.private !== null && { private: body.private }),
        ...((body.created_from !== undefined && body.created_from !== null) ||
        (body.created_to !== undefined && body.created_to !== null)
          ? {
              created_at: {
                ...(body.created_from !== undefined &&
                  body.created_from !== null && {
                    gte: body.created_from,
                  }),
                ...(body.created_to !== undefined &&
                  body.created_to !== null && {
                    lte: body.created_to,
                  }),
              },
            }
          : {}),
      },
      orderBy: { [sortField]: sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: Number(limit),
      select: {
        id: true,
        title: true,
        status: true,
        private: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_inquiries.count({
      where: {
        deleted_at: null,
        customer_id: customer.id,
        ...(body.status !== undefined &&
          body.status !== null && { status: body.status }),
        ...(body.product_id !== undefined &&
          body.product_id !== null && { product_id: body.product_id }),
        ...(body.order_id !== undefined &&
          body.order_id !== null && { order_id: body.order_id }),
        ...(body.title !== undefined &&
          body.title !== null && {
            title: { contains: body.title, mode: "insensitive" as const },
          }),
        ...(body.private !== undefined &&
          body.private !== null && { private: body.private }),
        ...((body.created_from !== undefined && body.created_from !== null) ||
        (body.created_to !== undefined && body.created_to !== null)
          ? {
              created_at: {
                ...(body.created_from !== undefined &&
                  body.created_from !== null && {
                    gte: body.created_from,
                  }),
                ...(body.created_to !== undefined &&
                  body.created_to !== null && {
                    lte: body.created_to,
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
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      private: row.private,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
