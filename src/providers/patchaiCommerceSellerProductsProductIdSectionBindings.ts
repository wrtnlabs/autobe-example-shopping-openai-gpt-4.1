import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import { IPageIAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductSectionBinding";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Search and list product-section bindings for a product.
 *
 * This endpoint allows an authenticated seller to list all section bindings
 * linked to a product they own. It supports filtering by section, advanced
 * sorting (section_id, product_id, display_order only), and pagination. Access
 * is denied if the product is not owned by the seller.
 *
 * @param props -
 * @param props.seller - Authenticated seller payload (must own the product)
 * @param props.productId - The UUID of the product to list bindings for
 * @param props.body - Advanced filtering and pagination options
 * @returns Paginated list of section bindings for the product
 * @throws {Error} If seller does not own the product or
 *   authentication/authorization fails
 */
export async function patchaiCommerceSellerProductsProductIdSectionBindings(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductSectionBinding.IRequest;
}): Promise<IPageIAiCommerceProductSectionBinding> {
  const { seller, productId, body } = props;

  // Step 1. Resolve seller_id (ai_commerce_seller.buyer_id = seller.id)
  const sellerRow = await MyGlobal.prisma.ai_commerce_seller.findFirst({
    where: { buyer_id: seller.id },
    select: { id: true },
  });
  if (!sellerRow) {
    throw new Error("Seller not found or deactivated");
  }
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: { id: productId, seller_id: sellerRow.id },
    select: { id: true },
  });
  if (!product) {
    throw new Error("Unauthorized: Seller does not own this product");
  }

  // Step 2. Build filtering
  const filters: Record<string, string> = { product_id: productId };
  if (body.section_id !== undefined && body.section_id !== null) {
    filters.section_id = body.section_id;
  }

  // Step 3. Sorting -- only on allowed schema fields
  const allowedSortFields = ["section_id", "product_id", "display_order"];
  let orderBy;
  if (body.sort_by && allowedSortFields.includes(body.sort_by)) {
    orderBy = { [body.sort_by]: body.sort_order === "desc" ? "desc" : "asc" };
  } else {
    orderBy = { display_order: "asc" };
  }

  // Step 4. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Step 5. Query
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_product_section_bindings.findMany({
      where: filters,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_product_section_bindings.count({
      where: filters,
    }),
  ]);

  const data = rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    section_id: r.section_id,
    display_order: r.display_order,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(Number(total) / Number(limit)),
    },
    data,
  };
}
