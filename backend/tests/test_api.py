import unittest

from backend.app.main import RouteRequest, health, route


class RoutingApiTests(unittest.TestCase):
    def test_health_endpoint(self) -> None:
        self.assertEqual(health(), {"status": "ok"})

    def test_route_endpoint_returns_frontend_contract(self) -> None:
        grid = [
            [
                {
                    "row": row,
                    "column": column,
                    "longitude": 137.38 + column * 0.00001,
                    "latitude": -4.805 + row * 0.00001,
                    "elevation_m": 0,
                    "valid": True,
                    "roughness": 0,
                    "slip_risk": 0,
                    "blocked": False,
                }
                for column in range(3)
            ]
            for row in range(3)
        ]
        request = RouteRequest.model_validate(
            {
                "grid": grid,
                "start": {"row": 0, "column": 0},
                "target": {"row": 2, "column": 2},
                "rover_state": {
                    "battery_wh": 100,
                    "battery_reserve_wh": 10,
                    "energy_per_meter_wh": 0.25,
                },
            }
        )

        result = route(request)
        self.assertTrue(result["feasible"])
        self.assertEqual(len(result["path"]), 3)
        self.assertAlmostEqual(result["distance_m"], 14.1421356237)
        self.assertAlmostEqual(result["energy_wh"], 3.5355339059)
        self.assertIn("battery_remaining_wh", result)
        self.assertIn("route_score", result)


if __name__ == "__main__":
    unittest.main()
