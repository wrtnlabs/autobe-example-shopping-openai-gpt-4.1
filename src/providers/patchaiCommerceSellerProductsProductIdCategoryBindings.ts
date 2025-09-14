import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { IPageIAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductCategoryBindings";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * List all category bindings for a product, with pagination, filtering, and
 * search.
 *
 * Retrieves a paginated list of all product-category bindings for the specified
 * product. Supports filtering by category, date range, and sorting. Only the
 * owner seller may view these bindings. Results include pagination metadata and
 * an array of binding records. Throws errors on access to a product not owned
 * by the authenticated seller, or if the product does not exist.
 *
 * @param props - Request properties
 * @param props.seller - Authenticated seller making the request
 * @param props.productId - The UUID of the product to list category bindings
 *   for
 * @param props.body - Filtering, sorting, and pagination options
 * @returns Paginated result set of category bindings with standard pagination
 *   information
 * @throws {Error} When the product does not exist or the seller does not own it
 */
export async function patchaiCommerceSellerProductsProductIdCategoryBindings(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductCategoryBindings.IRequest;
}): Promise<IPageIAiCommerceProductCategoryBindings> {
  const { seller, productId, body } = props;

  // 1. Authorization: Only the seller who owns this product may list
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, seller_id: seller.id },
  });
  if (!product) {
    throw new Error(
      "Unauthorized: Only the owner seller can access this product's category bindings",
    );
  }

  // 2. Build where clause using verified fields only
  const createdAtFilter =
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          ...(body.created_after !== undefined &&
            body.created_after !== null && { gte: body.created_after }),
          ...(body.created_before !== undefined &&
            body.created_before !== null && { lte: body.created_before }),
        }
      : undefined;
  const where: Record<string, unknown> = {
    product_id: productId,
    ...(body.category_id !== undefined &&
      body.category_id !== null && { category_id: body.category_id }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  };

  // 3. Sorting
  const allowedSortFields = ["created_at", "category_id"];
  const sort_by = allowedSortFields.includes(body.sort_by ?? "")
    ? body.sort_by
    : "created_at";
  const sort_order = body.sort_order === "asc" ? "asc" : "desc";

  // 4. Pagination (using strict tags typing on fields with Number() strip)
  const rawPage = body.page ?? 1;
  const rawLimit = body.limit ?? 20;
  const page = Number(rawPage) as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = Number(rawLimit) as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const skip = (page - 1) * limit;

  // 5. Query total count and paged data
  const total =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.count({
      where,
    });
  const results =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findMany({
      where,
      orderBy: { [sort_by as "created_at" | "category_id"]: sort_order },
      skip,
      take: limit,
    });

  // 6. Structure response fully to DTO contract w/ date conversion, no native Date
  return {
    pagination: {
      current: page,
      limit: limit,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: results.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      category_id: row.category_id,
      created_at: toISOStringSafe(row.created_at),
    })),
  };
}
