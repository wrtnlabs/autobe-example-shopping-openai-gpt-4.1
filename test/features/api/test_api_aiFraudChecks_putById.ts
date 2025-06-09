import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIFraudCheck";

export async function test_api_aiFraudChecks_putById(
  connection: api.IConnection,
) {
  const output: IAIFraudCheck = await api.functional.aiFraudChecks.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IAIFraudCheck.IUpdate>(),
    },
  );
  typia.assert(output);
}
