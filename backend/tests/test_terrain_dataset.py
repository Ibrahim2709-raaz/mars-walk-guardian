import unittest

from backend.app.main import TerrainRouteRequest, get_terrain_info, terrain_route
from backend.app.terrain_dataset import load_terrain_dataset


class TerrainDatasetTests(unittest.TestCase):
    def test_dataset_dimensions_and_sites_match_metadata(self) -> None:
        dataset = load_terrain_dataset()
        self.assertEqual(len(dataset.grid), 201)
        self.assertTrue(all(len(row) == 201 for row in dataset.grid))
        self.assertEqual((dataset.base.row, dataset.base.column), (32, 139))
        self.assertEqual((dataset.target.row, dataset.target.column), (100, 100))
        self.assertTrue(dataset.grid[32][139].valid)
        self.assertTrue(dataset.grid[100][100].valid)

    def test_terrain_info_labels_assumptions(self) -> None:
        info = get_terrain_info()
        self.assertEqual(info["roughness_normalization"]["classification"], "Project assumption")
        self.assertIn("slip_risk_0_1", info["simulated_fields"])
        self.assertIn("not direction-specific cross-slope", info["local_slope_proxy"]["classification"])

    def test_real_crop_route_and_emergency_reroute(self) -> None:
        normal_request = TerrainRouteRequest.model_validate(
            {
                "start": {"row": 32, "column": 139},
                "target": {"row": 100, "column": 100},
                "rover_state": {
                    "battery_wh": 100,
                    "battery_reserve_wh": 10,
                    "energy_per_meter_wh": 0.25,
                },
            }
        )
        normal = terrain_route(normal_request)
        self.assertTrue(normal["feasible"])
        self.assertGreater(normal["distance_m"], 79)
        self.assertLess(normal["distance_m"], 100)

        midpoint = normal["path"][len(normal["path"]) // 2]
        emergency_request = TerrainRouteRequest.model_validate(
            {
                "start": {"row": 100, "column": 100},
                "target": {"row": 32, "column": 139},
                "rover_state": {
                    "battery_wh": 65,
                    "battery_reserve_wh": 10,
                    "energy_per_meter_wh": 0.25,
                },
                "blocked_cells": [
                    {"row": midpoint["row"], "column": midpoint["column"]}
                ],
            }
        )
        emergency = terrain_route(emergency_request)
        self.assertTrue(emergency["feasible"])
        self.assertNotIn(
            (midpoint["row"], midpoint["column"]),
            [(cell["row"], cell["column"]) for cell in emergency["path"]],
        )


if __name__ == "__main__":
    unittest.main()
