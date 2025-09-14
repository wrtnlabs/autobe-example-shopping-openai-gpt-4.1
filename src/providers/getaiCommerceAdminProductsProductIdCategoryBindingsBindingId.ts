import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Get details of a specific product-category binding by its identifier for a
 * product.
 *
 * This endpoint enables catalog managers and admins to fetch details about the
 * association between a product and a category using the binding's unique
 * identifier, scoped to the parent product. Primarily used in catalog
 * management, auditing, and product management workflows.
 *
 * Authorization: Only admin users may access this endpoint. Admins have global
 * read access for all product-category bindings.
 *
 * @param props - Request object
 * @param props.admin - The authenticated admin making the request (must be
 *   type="admin")
 * @param props.productId - The unique identifier of the parent product to which
 *   the binding is attached
 * @param props.bindingId - The unique identifier (UUID) of the binding between
 *   the product and category
 * @returns The details of the specified product-category binding (id,
 *   product_id, category_id, created_at)
 * @throws {Error} If no binding exists with this id and product, or if access
 *   is not permitted
 */
export async function getaiCommerceAdminProductsProductIdCategoryBindingsBindingId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  bindingId: string & tags.Format<"uuid">;
}): Promise<IAiCommerceProductCategoryBindings> {
  const { productId, bindingId } = props;
  const binding =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: {
        id: bindingId,
        product_id: productId,
      },
      select: {
        id: true,
        product_id: true,
        category_id: true,
        created_at: true,
      },
    });
  if (!binding) {
    throw new Error("Product-category binding not found");
  }
  return {
    id: binding.id,
    product_id: binding.product_id,
    category_id: binding.category_id,
    created_at: toISOStringSafe(binding.created_at),
  };
}
