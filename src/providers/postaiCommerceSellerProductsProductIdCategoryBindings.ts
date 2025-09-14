import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * Create a new product-category binding association for a product (catalog
 * assignment).
 *
 * This operation allows an authenticated seller to create an association
 * between a product they own and a specified category. It verifies that the
 * seller owns the product and that no duplicate binding exists, enforcing
 * catalog integrity and correct relationship mapping for search and
 * merchandising. Attempting to bind a product to the same category more than
 * once results in an error. If the product does not exist or is not owned by
 * the seller, an error is thrown.
 *
 * @param props - Properties for operation
 * @param props.seller - Authenticated seller performing the action
 * @param props.productId - Product identifier to be assigned to the category
 * @param props.body - Request body containing the target category_id
 * @returns The newly created product-category binding
 * @throws {Error} If the product does not exist, is not owned by the seller, is
 *   deleted, or if the binding already exists
 */
export async function postaiCommerceSellerProductsProductIdCategoryBindings(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductCategoryBindings.ICreate;
}): Promise<IAiCommerceProductCategoryBindings> {
  const { seller, productId, body } = props;

  // 1. Verify product exists, is owned by seller, and is not deleted
  const product = await MyGlobal.prisma.ai_commerce_products.findFirst({
    where: {
      id: productId,
      seller_id: seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new Error("Product not found, not owned by seller, or deleted.");
  }

  // 2. Verify no duplicate binding exists
  const existing =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.findFirst({
      where: {
        product_id: productId,
        category_id: body.category_id,
      },
    });
  if (existing) {
    throw new Error("This product is already bound to the given category.");
  }

  // 3. Create new binding
  const now = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.ai_commerce_product_category_bindings.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        product_id: productId,
        category_id: body.category_id,
        created_at: now,
      },
    });

  // 4. Return the new binding (all fields as strings with correct branding)
  return {
    id: created.id,
    product_id: created.product_id,
    category_id: created.category_id,
    created_at: now,
  };
}
