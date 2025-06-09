import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductReview";

export async function test_api_productReviews_post(
  connection: api.IConnection,
) {
  const output: IProductReview = await api.functional.productReviews.post(
    connection,
    {
      body: typia.random<IProductReview.ICreate>(),
    },
  );
  typia.assert(output);
}
