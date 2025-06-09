import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIProductReview";
import { IProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReview";

export async function test_api_productReviews_patch(
  connection: api.IConnection,
) {
  const output: IPageIProductReview = await api.functional.productReviews.patch(
    connection,
    {
      body: typia.random<IProductReview.IRequest>(),
    },
  );
  typia.assert(output);
}
