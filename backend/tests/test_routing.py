import math
import unittest

from backend.app.routing import GridCell, GridPosition, RoverState, calculate_route


CELL_SIZE_M = 5.0
ROVER_STATE = RoverState(
    battery_wh=100.0,
    battery_reserve_wh=10.0,
    energy_per_meter_wh=0.25,
)


def make_grid(rows: int, columns: int) -> list[list[GridCell]]:
    return [
        [
            GridCell(
                row=row,
                column=column,
                longitude=137.38 + column * 0.00001,
                latitude=-4.805 + row * 0.00001,
                elevation_m=0.0,
                valid=True,
                roughness=0.0,
                slip_risk=0.0,
                blocked=False,
            )
            for column in range(columns)
        ]
        for row in range(rows)
    ]


class CalculateRouteTests(unittest.TestCase):
    def test_uses_diagonal_movement_across_flat_grid(self) -> None:
        result = calculate_route(
            make_grid(3, 3),
            GridPosition(0, 0),
            GridPosition(2, 2),
            ROVER_STATE,
        )
        self.assertTrue(result.feasible)
        self.assertEqual(len(result.path), 3)
        self.assertAlmostEqual(result.distance_m, 2 * CELL_SIZE_M * math.sqrt(2))
        self.assertAlmostEqual(result.energy_wh, result.distance_m * 0.25)

    def test_routes_around_blocked_rock_field(self) -> None:
        grid = make_grid(5, 5)
        grid[2][2].blocked = True
        result = calculate_route(
            grid,
            GridPosition(0, 0),
            GridPosition(4, 4),
            ROVER_STATE,
        )
        self.assertTrue(result.feasible)
        self.assertNotIn(grid[2][2], result.path)
        self.assertGreater(result.distance_m, 4 * CELL_SIZE_M * math.sqrt(2))

    def test_rejects_steep_cells_and_selects_detour(self) -> None:
        grid = make_grid(3, 5)
        for column in (1, 2, 3):
            grid[1][column].elevation_m = 10.0
        result = calculate_route(
            grid,
            GridPosition(1, 0),
            GridPosition(1, 4),
            ROVER_STATE,
        )
        self.assertTrue(result.feasible)
        self.assertNotIn(grid[1][1], result.path)
        self.assertTrue(any(cell.row != 1 for cell in result.path))

    def test_avoids_slip_rejection_threshold(self) -> None:
        grid = make_grid(3, 5)
        grid[1][2].slip_risk = 0.8
        result = calculate_route(
            grid,
            GridPosition(1, 0),
            GridPosition(1, 4),
            ROVER_STATE,
        )
        self.assertTrue(result.feasible)
        self.assertNotIn(grid[1][2], result.path)

    def test_returns_infeasible_when_battery_reserve_cannot_be_maintained(self) -> None:
        constrained_state = RoverState(
            battery_wh=12.0,
            battery_reserve_wh=10.0,
            energy_per_meter_wh=0.25,
        )
        result = calculate_route(
            make_grid(1, 5),
            GridPosition(0, 0),
            GridPosition(0, 4),
            constrained_state,
        )
        self.assertFalse(result.feasible)
        self.assertIn("No safe route", result.reason or "")

    def test_recalculates_emergency_route_around_new_blockage(self) -> None:
        grid = make_grid(5, 5)
        base = GridPosition(0, 0)
        rover = GridPosition(4, 4)
        original = calculate_route(grid, rover, base, ROVER_STATE)
        self.assertTrue(original.feasible)

        original_middle = original.path[len(original.path) // 2]
        original_middle.blocked = True
        emergency = calculate_route(grid, rover, base, ROVER_STATE)

        self.assertTrue(emergency.feasible)
        self.assertNotIn(original_middle, emergency.path)
        self.assertNotEqual(
            [(cell.row, cell.column) for cell in original.path],
            [(cell.row, cell.column) for cell in emergency.path],
        )


if __name__ == "__main__":
    unittest.main()
