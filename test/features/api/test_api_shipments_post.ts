import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShipment";

export async function test_api_shipments_post(connection: api.IConnection) {
  const output: IShipment = await api.functional.shipments.post(connection, {
    body: typia.random<IShipment.ICreate>(),
  });
  typia.assert(output);
}
