import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIFraudCheck";

export async function test_api_aiFraudChecks_getById(
  connection: api.IConnection,
) {
  const output: IAIFraudCheck = await api.functional.aiFraudChecks.getById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
