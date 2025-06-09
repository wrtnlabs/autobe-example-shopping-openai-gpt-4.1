import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IRecommendation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRecommendation";

export async function test_api_recommendation_post(
  connection: api.IConnection,
) {
  const output: IRecommendation = await api.functional.recommendation.post(
    connection,
    {
      body: typia.random<IRecommendation.ICreate>(),
    },
  );
  typia.assert(output);
}
