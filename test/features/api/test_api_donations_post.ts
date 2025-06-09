import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IDonation } from "@ORGANIZATION/PROJECT-api/lib/structures/IDonation";

export async function test_api_donations_post(connection: api.IConnection) {
  const output: IDonation = await api.functional.donations.post(connection, {
    body: typia.random<IDonation.ICreate>(),
  });
  typia.assert(output);
}
