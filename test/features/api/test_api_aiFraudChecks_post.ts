import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IAIFraudCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIFraudCheck";

export async function test_api_aiFraudChecks_post(connection: api.IConnection) {
  const output: IAIFraudCheck = await api.functional.aiFraudChecks.post(
    connection,
    {
      body: typia.random<IAIFraudCheck.ICreate>(),
    },
  );
  typia.assert(output);
}
