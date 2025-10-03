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

export async function postShoppingMallCustomerReviews(props: {
  customer: CustomerPayload;
  body: IShoppingMallReview.ICreate;
}): Promise<IShoppingMallReview> {
  const now = toISOStringSafe(new Date());

  // Validate product existence
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.body.shopping_mall_product_id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or deleted", 404);
  }

  // Validate order existence, customer association
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.body.shopping_mall_order_id,
      deleted_at: null,
      shopping_mall_customer_id: props.customer.id,
    },
  });
  if (!order) {
    throw new HttpException(
      "Order not found or deleted, or does not belong to customer",
      404,
    );
  }

  // Ensure order contains the product
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      shopping_mall_order_id: order.id,
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      deleted_at: null,
    },
  });
  if (!orderItem) {
    throw new HttpException(
      "Order does not contain the specified product",
      400,
    );
  }

  // Enforce uniqueness: one review per (product, order, customer)
  const existing = await MyGlobal.prisma.shopping_mall_reviews.findFirst({
    where: {
      shopping_mall_product_id: props.body.shopping_mall_product_id,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException(
      "Review already exists for this product, order, and customer.",
      409,
    );
  }

  // Attempt create, catch unique error just in case
  try {
    const created = await MyGlobal.prisma.shopping_mall_reviews.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        shopping_mall_order_id: props.body.shopping_mall_order_id,
        shopping_mall_customer_id: props.customer.id,
        rating: props.body.rating,
        title: props.body.title ?? undefined,
        body: props.body.body,
        moderation_status: "pending",
        notified_at: undefined,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      shopping_mall_product_id: created.shopping_mall_product_id,
      shopping_mall_order_id: created.shopping_mall_order_id,
      shopping_mall_customer_id: created.shopping_mall_customer_id,
      shopping_mall_seller_id: undefined,
      rating: created.rating,
      title: created.title ?? undefined,
      body: created.body,
      moderation_status: created.moderation_status,
      notified_at:
        created.notified_at === null || created.notified_at === undefined
          ? undefined
          : toISOStringSafe(created.notified_at),
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null || created.deleted_at === undefined
          ? undefined
          : toISOStringSafe(created.deleted_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Cannot create duplicate review for this product, order, and customer.",
        409,
      );
    }
    throw err;
  }
}
