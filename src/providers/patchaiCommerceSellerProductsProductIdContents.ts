import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import { IPageIAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductContent";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and paginate content records for a product from
 * ai_commerce_product_contents
 *
 * Retrieves a filtered and paginated list of product content records for a
 * specified product owned by the seller. Enables sellers or admins to search,
 * sort, and paginate content records with advanced filtering. Supports
 * full-text search, locale, content_type, format, sort, and pagination as per
 * business rules.
 *
 * @param props - The function parameters
 * @param props.seller - The authenticated seller payload, injected by
 *   SellerAuth
 * @param props.productId - The UUID of the product to look up content for
 * @param props.body - The search/filter/sort/pagination request DTO
 * @returns The page result with content metadata for UI
 * @throws {Error} If the product does not exist or the seller is not the owner
 */
export async function patchaiCommerceSellerProductsProductIdContents(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductContent.IRequest;
}): Promise<IPageIAiCommerceProductContent> {
  const { seller, productId, body } = props;

  // 1. Ownership check: product must exist and be owned by seller
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
    },
  });
  if (!product) {
    throw new Error("Product not found or you do not have access.");
  }

  // 2. Pagination defaults and branding
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 3. Build dynamic Prisma where clause for filters (no undefined properties)
  const where = {
    deleted_at: null,
    product_id: productId,
    ...(body.content_type !== undefined && { content_type: body.content_type }),
    ...(body.format !== undefined && { format: body.format }),
    ...(body.locale !== undefined && { locale: body.locale }),
    ...(body.search !== undefined &&
      body.search !== "" && {
        content_body: { contains: body.search }, // no 'mode' for sqlite support
      }),
  };

  // 4. Sorting
  const sortField = body.sortBy ?? "display_order";
  const sortOrder = body.order ?? "asc";

  // 5. DB query and total count
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_contents.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_contents.count({ where }),
  ]);

  // 6. Map content to IAiCommerceProductContent DTO
  const data = rows.map((row) => {
    return {
      id: row.id,
      product_id: row.product_id,
      content_type: row.content_type,
      format: row.format,
      // locale is optional in the DTO, only include if not null
      ...(row.locale !== null && row.locale !== undefined
        ? { locale: row.locale }
        : {}),
      content_body: row.content_body,
      display_order: row.display_order,
    };
  });

  // 7. Pagination metadata
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
