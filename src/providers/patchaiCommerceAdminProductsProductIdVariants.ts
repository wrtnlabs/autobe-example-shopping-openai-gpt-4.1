import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { IPageIAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Paginate and search product variants/options under a given product (admin).
 *
 * This operation lets a system administrator search for, filter, and paginate
 * option/variant records for a given product. Admins can view all variants
 * linked to any product. The response includes a paginated list of variant
 * summaries.
 *
 * @param props - Parameters for product variant listing
 * @param props.admin - The authenticated admin making the request
 * @param props.productId - UUID of the product whose variants should be
 *   searched
 * @param props.body - Search, filter, and pagination structure for variants
 *   (IAiCommerceProductVariant.IRequest)
 * @returns Paginated list of product variant summaries as
 *   IPageIAiCommerceProductVariant.ISummary
 * @throws {Error} If the referenced productId does not exist
 */
export async function patchaiCommerceAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductVariant.IRequest;
}): Promise<IPageIAiCommerceProductVariant.ISummary> {
  const { admin, productId, body } = props;

  // Step 1: Verify the product exists (admin can view all products)
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId },
  });
  if (product === null) {
    throw new Error("Product not found");
  }

  // Step 2: Pagination (defaults)
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit = body.limit && body.limit > 0 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Step 3: Sorting
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  if (body.sort) {
    const match = /^([a-zA-Z0-9_]+):(asc|desc)$/i.exec(body.sort);
    if (match) {
      const field = match[1];
      const direction = match[2].toLowerCase() as "asc" | "desc";
      orderBy = { [field]: direction };
    }
  }

  // Step 4: Filtering
  const where = {
    product_id: productId,
    deleted_at: null,
    ...(body.sku_code !== undefined && {
      sku_code: { contains: body.sku_code },
    }),
    ...(body.option_summary !== undefined && {
      option_summary: { contains: body.option_summary },
    }),
    ...(body.status !== undefined && {
      status: body.status,
    }),
    ...(body.min_price !== undefined && {
      variant_price: { gte: body.min_price },
    }),
    ...(body.max_price !== undefined &&
      body.min_price === undefined && {
        variant_price: { lte: body.max_price },
      }),
    ...(body.max_price !== undefined &&
      body.min_price !== undefined && {
        variant_price: { gte: body.min_price, lte: body.max_price },
      }),
    ...(body.min_inventory !== undefined && {
      inventory_quantity: { gte: body.min_inventory },
    }),
    ...(body.max_inventory !== undefined &&
      body.min_inventory === undefined && {
        inventory_quantity: { lte: body.max_inventory },
      }),
    ...(body.max_inventory !== undefined &&
      body.min_inventory !== undefined && {
        inventory_quantity: {
          gte: body.min_inventory,
          lte: body.max_inventory,
        },
      }),
  };

  // Step 5: Query count and page records in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_variants.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_variants.count({ where }),
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
      sku_code: row.sku_code,
      option_summary: row.option_summary,
      variant_price: row.variant_price,
      inventory_quantity: row.inventory_quantity,
      status: row.status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
