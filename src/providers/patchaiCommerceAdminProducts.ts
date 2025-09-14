import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import { IPageIAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search, filter, and retrieve a filtered, paginated list of products (admin
 * only) in ai_commerce_products.
 *
 * This endpoint allows admin users to perform advanced searches for products,
 * supporting filters by name, status, seller, store, category, and price range.
 * It joins the category binding table as needed, supports full-text search on
 * name, and provides paginated, sorted results for bulk admin or analytical use
 * cases.
 *
 * @param props - Request props with admin payload and
 *   IAiCommerceProduct.IRequest filter/pagination.
 * @param props.admin - The authenticated admin performing the query.
 * @param props.body - Structured filter, sort, and pagination criteria.
 * @returns Paginated list of product summaries compliant with
 *   IPageIAiCommerceProduct.ISummary.
 * @throws {Error} If an invalid filter is specified or paging out of bounds
 *   occurs.
 */
export async function patchaiCommerceAdminProducts(props: {
  admin: AdminPayload;
  body: IAiCommerceProduct.IRequest;
}): Promise<IPageIAiCommerceProduct.ISummary> {
  const { body } = props;

  // Normalize page/limit with DTO default and branding requirements
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;

  // Build initial where filter
  const where: Record<string, unknown> = {
    deleted_at: null,
    ...(body.name !== undefined &&
      body.name !== null && {
        name: { contains: body.name },
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        seller_id: body.seller_id,
      }),
    ...(body.store_id !== undefined &&
      body.store_id !== null && {
        store_id: body.store_id,
      }),
    ...((body.min_price !== undefined && body.min_price !== null) ||
    (body.max_price !== undefined && body.max_price !== null)
      ? {
          current_price: {
            ...(body.min_price !== undefined &&
              body.min_price !== null && {
                gte: body.min_price,
              }),
            ...(body.max_price !== undefined &&
              body.max_price !== null && {
                lte: body.max_price,
              }),
          },
        }
      : {}),
  };

  // Filter by category: fetch product ids if category_id present
  let idsToInclude: string[] | undefined = undefined;
  if (body.category_id !== undefined && body.category_id !== null) {
    const categoryMapping =
      await MyGlobal.prisma.ai_commerce_product_category_bindings.findMany({
        where: { category_id: body.category_id },
        select: { product_id: true },
      });
    idsToInclude = categoryMapping.map((row) => row.product_id);
    if (idsToInclude.length > 0) {
      (where as Record<string, unknown>)["id"] = { in: idsToInclude };
    } else {
      (where as Record<string, unknown>)["id"] = "__NONE__";
    }
  }

  // Determine allowed sort_by fields
  const allowedSortFields = [
    "name",
    "current_price",
    "created_at",
    "product_code",
  ];
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort_by && allowedSortFields.includes(body.sort_by)) {
    orderBy = {
      [body.sort_by]: (body.sort_order === "asc" ? "asc" : "desc") as
        | "asc"
        | "desc",
    };
  }

  // Query products and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_products.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_products.count({ where }),
  ]);

  // Map each record to IAiCommerceProduct.ISummary using toISOStringSafe for date fields
  const summaryData = records.map((r) => ({
    id: r.id,
    product_code: r.product_code,
    name: r.name,
    status: r.status,
    current_price: r.current_price,
    inventory_quantity: r.inventory_quantity,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  // Structure pagination, enforcing necessary branding
  const pagination = typia.assert<{
    current: number;
    limit: number;
    records: number;
    pages: number;
  }>({
    current: page,
    limit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / limit),
  });

  return typia.assert<IPageIAiCommerceProduct.ISummary>({
    pagination,
    data: summaryData,
  });
}
