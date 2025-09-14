import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductImage";
import { IPageIAiCommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductImage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Paginate/list product images associated with a product
 * (ai_commerce_product_images table).
 *
 * This operation allows an authorized seller to retrieve a paginated and
 * optionally filtered list of images for a specific product. The result
 * contains summary fields suitable for image gallery management or admin
 * interfaces.
 *
 * Access control: Only the seller who owns the product can access its images.
 * Product and image records that are soft-deleted are excluded.
 *
 * Filtering: Locale (optional) and ordering via allowed fields (display_order,
 * id, locale, attachment_id) are supported. Pagination uses page/limit. Default
 * sorting is display_order desc.
 *
 * @param props - Seller: SellerPayload. Authenticated seller. Must be the owner
 *   of the product. productId: string (uuid). Target product for image search.
 *   body: IAiCommerceProductImage.IRequest. Filtering, ordering, pagination
 *   parameters.
 * @returns IPageIAiCommerceProductImage.ISummary - Paginated result of product
 *   image summaries for display or management.
 * @throws {Error} If the product does not exist, is deleted, or does not belong
 *   to the seller.
 */
export async function patchaiCommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductImage.IRequest;
}): Promise<IPageIAiCommerceProductImage.ISummary> {
  const { seller, productId, body } = props;
  // 1. Permission + existence check
  await MyGlobal.prisma.ai_commerce_products.findFirstOrThrow({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });

  // 2. Prepare where for images
  const where = {
    product_id: productId,
    deleted_at: null,
    ...(body.locale !== undefined &&
      body.locale !== null && { locale: body.locale }),
  };

  // 3. Allowed sort fields
  const allowedSortFields = ["display_order", "id", "locale", "attachment_id"];
  const sortFieldRaw = body.sort ?? "display_order";
  const sortField =
    allowedSortFields.indexOf(sortFieldRaw) !== -1
      ? sortFieldRaw
      : "display_order";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // 4. Pagination and type branding
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_images.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_images.count({ where }),
  ]);

  // 5. Map to ISummary (all DTO-compliant, no Date)
  const data: IAiCommerceProductImage.ISummary[] = items.map((img) => ({
    id: img.id,
    display_order: img.display_order,
    locale: img.locale ?? null,
    attachment_id: img.attachment_id,
  }));

  // 6. Prepare pagination info (uint32 tags compliance)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data,
  };
}
