import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IPageIRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRecommendation";
import { IRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecommendation";

export async function test_api_recommendation_patch(
  connection: api.IConnection,
) {
  const output: IPageIRecommendation =
    await api.functional.recommendation.patch(connection, {
      body: typia.random<IRecommendation.IRequest>(),
    });
  typia.assert(output);
}
