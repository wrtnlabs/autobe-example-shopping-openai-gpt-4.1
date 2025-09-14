import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceProductCategoryBindings } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductCategoryBindings";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create a new product-category binding association for a product (catalog
 * assignment).
 *
 * This endpoint allows an authenticated admin to create a new association
 * between a product and a category. The new binding controls catalog,
 * merchandising, and discovery assignments. Admin authorization is strictly
 * required. Attempts to duplicate an existing product-category relationship
 * will be rejected with an error.
 *
 * @param props - Properties for creating the binding
 * @param props.admin - The authenticated AdminPayload performing the request
 * @param props.productId - UUID of the product to bind to a category
 * @param props.body - Request body containing the target category_id
 * @returns The newly created product-category binding association entity
 * @throws {Error} If the binding already exists, or database error occurs
 */
export async function postaiCommerceAdminProductsProductIdCategoryBindings(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IAiCommerceProductCategoryBindings.ICreate;
}): Promise<IAiCommerceProductCategoryBindings> {
  try {
    // Compose the data object inline (no intermediate variable)
    const created =
      await MyGlobal.prisma.ai_commerce_product_category_bindings.create({
        data: {
          id: v4(),
          product_id: props.productId,
          category_id: props.body.category_id,
          created_at: toISOStringSafe(new Date()),
        },
      });
    // Map the DB entity back to DTO; all types inferred by structure
    return {
      id: created.id,
      product_id: created.product_id,
      category_id: created.category_id,
      created_at: toISOStringSafe(created.created_at),
    };
  } catch (err) {
    // Unique constraint violation (Prisma error code P2002)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new Error(
        "Duplicate binding: This product is already assigned to this category",
      );
    } else {
      throw err;
    }
  }
  // TODO: Implement catalog/audit logging if needed (infra).
}
