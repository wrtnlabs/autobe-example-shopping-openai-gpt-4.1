import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";
import { IPageIShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendDepositTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

/**
 * Retrieves a paginated and filterable list of all transactions for a specific
 * deposit ledger (owned by the authenticated customer).
 *
 * This endpoint allows the deposit owner (customer) to search, paginate, and
 * audit all financial events (accrual, usage, withdrawal, adjustments) related
 * to the deposit. The operation is strictly authorization-guarded; only the
 * account owner may view their transaction log. All list and filter operations
 * are performed on the 'shopping_mall_ai_backend_deposit_transactions' model
 * using the provided filters and pagination inputs. Returns paginated records
 * conforming to IPageIShoppingMallAiBackendDepositTransaction.ISummary.
 *
 * @param props - Request properties
 * @param props.customer - The authenticated customer requesting the transaction
 *   log (authorization enforced)
 * @param props.depositId - UUID of the deposit ledger to query
 * @param props.body - Filtering, sorting, and pagination parameters
 * @returns Paginated transaction summary list matching the provided filters
 * @throws {Error} If the deposit is not owned by the requesting customer, not
 *   found, or is deleted
 */
export async function patch__shoppingMallAiBackend_customer_deposits_$depositId_transactions(props: {
  customer: CustomerPayload;
  depositId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendDepositTransaction.IRequest;
}): Promise<IPageIShoppingMallAiBackendDepositTransaction.ISummary> {
  const { customer, depositId, body } = props;

  // 1. Authorization: Ensure the customer owns the deposit ledger
  const deposit =
    await MyGlobal.prisma.shopping_mall_ai_backend_deposits.findFirst({
      where: {
        id: depositId,
        shopping_mall_ai_backend_customer_id: customer.id,
        deleted_at: null,
      },
    });
  if (!deposit) {
    throw new Error(
      "Forbidden: You are not allowed to view this deposit transaction log.",
    );
  }

  // 2. Build Prisma 'where' filter for transactions (allowable by business/DTO)
  const where = {
    shopping_mall_ai_backend_deposit_id: depositId,
    deleted_at: null,
    ...(body.customer_id !== undefined &&
      body.customer_id !== null && {
        shopping_mall_ai_backend_customer_id: body.customer_id,
      }),
    ...(body.seller_id !== undefined &&
      body.seller_id !== null && {
        shopping_mall_ai_backend_seller_id: body.seller_id,
      }),
    ...(body.change_type !== undefined &&
      body.change_type !== null && {
        change_type: body.change_type,
      }),
    ...(body.description_query !== undefined &&
      body.description_query !== null && {
        description: {
          contains: body.description_query,
          mode: "insensitive" as const,
        },
      }),
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && {
                gte: body.created_from,
              }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && {
                lte: body.created_to,
              }),
          },
        }
      : {}),
  };

  // 3. Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // 4. Query in parallel for list and count
  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_deposit_transactions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        change_type: true,
        amount: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_deposit_transactions.count({
      where,
    }),
  ]);

  // 5. Map results to ISummary DTOs, converting date fields
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transactions.map(
      (tx): IShoppingMallAiBackendDepositTransaction.ISummary => ({
        id: tx.id,
        change_type: tx.change_type,
        amount: tx.amount,
        created_at: toISOStringSafe(tx.created_at),
      }),
    ),
  };
}
