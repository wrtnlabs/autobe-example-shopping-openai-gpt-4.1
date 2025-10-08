import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerProductsProductIdReviews(props: {
  customer: CustomerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  // 1. Validate product exists and is active
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      deleted_at: null,
      is_active: true,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or inactive", 404);
  }

  // 2. Validate order exists, belongs to customer, relates to this product, and is completed
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
      status: "delivered",
    },
    include: {
      shopping_mall_order_items: true,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found, not owned by customer, or is not completed",
      400,
    );
  }
  // Confirm product was bought in this order
  const hasProduct = order.shopping_mall_order_items.some(
    (item) => item.shopping_mall_product_sku_id === props.productId,
  );
  if (!hasProduct) {
    throw new HttpException(
      "The specified product was not purchased in this order",
      400,
    );
  }

  // 3. Check for duplicate review (review for same (customer, product, order))
  const existingReview = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      shopping_mall_product_id: props.productId,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (existingReview) {
    throw new HttpException(
      "A review already exists for this customer, product, and order",
      409,
    );
  }

  // 4. Create review
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_reviews.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_id: props.productId,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      rating: props.body.rating,
      body: props.body.body,
      status: "pending",
      created_at: now,
      updated_at: now,
      comment: undefined,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    rating: created.rating,
    body: created.body,
    status: created.status,
    comment: created.comment ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
