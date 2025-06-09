import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIFraudCheck";

export async function test_api_aiFraudChecks_eraseById(
  connection: api.IConnection,
) {
  const output: IAIFraudCheck = await api.functional.aiFraudChecks.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
