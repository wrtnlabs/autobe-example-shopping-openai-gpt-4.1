import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductVariant";
import { IPageIAiCommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductVariant";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Paginate and search product variants/options for a given product (admin or
 * owner).
 *
 * This endpoint allows an authenticated seller to view a paginated, filterable
 * list of product variants (options/SKUs) under a given product. The seller
 * must own the product being queried. Optional filters allow search by SKU
 * code, option summary text, status (active, paused, discontinued), price
 * range, and inventory range. Results are sorted and paginated by the provided
 * criteria.
 *
 * @param props - Request properties
 * @param props.seller - The authenticated seller making the request (payload)
 * @param props.productId - UUID of the parent product whose variants to search
 * @param props.body - Search/filter/pagination criteria for product variants of
 *   the target product
 * @returns Paginated list of variant summaries for the specified product
 * @throws {Error} When the product does not exist or is not owned by the
 *   requesting seller
 */
export async function patchaiCommerceSellerProductsProductIdVariants(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductVariant.IRequest;
}): Promise<IPageIAiCommerceProductVariant.ISummary> {
  const { seller, productId, body } = props;

  // 1. Ownership check: Ensure product exists & is owned by seller and not deleted
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found or not owned by seller");
  }

  // 2. Extract and normalize filters from request
  const {
    sku_code,
    option_summary,
    status,
    min_price,
    max_price,
    min_inventory,
    max_inventory,
    sort,
    page,
    limit,
  } = body;

  // 3. Compute pagination parameters
  const currentPage = page ?? 1;
  const currentLimit = limit ?? 20;
  const skip = (currentPage - 1) * currentLimit;

  // 4. Build WHERE clause respecting only existing fields & filter logic
  const where: Record<string, unknown> = {
    product_id: productId,
    deleted_at: null,
  };
  if (sku_code !== undefined && sku_code !== null && sku_code.length > 0) {
    where.sku_code = { contains: sku_code };
  }
  if (
    option_summary !== undefined &&
    option_summary !== null &&
    option_summary.length > 0
  ) {
    where.option_summary = { contains: option_summary };
  }
  if (status !== undefined && status !== null && status.length > 0) {
    where.status = status;
  }
  if (min_price !== undefined && max_price !== undefined) {
    where.variant_price = { gte: min_price, lte: max_price };
  } else if (min_price !== undefined) {
    where.variant_price = { gte: min_price };
  } else if (max_price !== undefined) {
    where.variant_price = { lte: max_price };
  }
  if (min_inventory !== undefined && max_inventory !== undefined) {
    where.inventory_quantity = { gte: min_inventory, lte: max_inventory };
  } else if (min_inventory !== undefined) {
    where.inventory_quantity = { gte: min_inventory };
  } else if (max_inventory !== undefined) {
    where.inventory_quantity = { lte: max_inventory };
  }

  // 5. Parse sort field - allow only sortable fields in summary
  let orderBy: Record<string, "asc" | "desc"> = { created_at: "desc" };
  const allowedSortFields = [
    "sku_code",
    "option_summary",
    "variant_price",
    "inventory_quantity",
    "status",
    "created_at",
    "updated_at",
  ];
  if (sort && typeof sort === "string") {
    const [field, dirRaw] = sort.split(":");
    const fieldName = field?.trim();
    const dir = dirRaw?.toLowerCase() === "asc" ? "asc" : "desc";
    if (
      typeof fieldName === "string" &&
      allowedSortFields.includes(fieldName)
    ) {
      orderBy = { [fieldName]: dir };
    }
  }

  // 6. Fetch count and results in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_variants.findMany({
      where,
      orderBy,
      skip,
      take: currentLimit,
    }),
    MyGlobal.prisma.ai_commerce_product_variants.count({
      where,
    }),
  ]);

  // 7. Map result and convert Date fields using toISOStringSafe
  return {
    pagination: {
      current: Number(currentPage),
      limit: Number(currentLimit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(currentLimit)),
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
