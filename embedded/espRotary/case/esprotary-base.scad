// Battery base for the CrowPanel 1.28" rotary module.
//
// The module is already a finished 48 x 48 x 33 mm enclosure, so this does not
// wrap it: it is a tray carrying a lithium cell and a charger, with a pocket in
// its top that the module's lower 8 mm presses into. The module is the lid.
//
// make-case.py emits the same tray as a watertight STL without needing CAD.
// This file adds the features a mesh script cannot cut cleanly — the connector
// window, the magnet pockets and the cable notch — so render here when those
// are wanted. OpenSCAD: openscad -o base-tray.stl esprotary-base.scad

/* [Module] */
module_size   = 48.0;   // published by Elecrow; verify with fit-gauge.stl first
clearance     = 0.5;    // FDM parts come out tight
pocket_depth  = 8.0;    // how much of the module's 33 mm the tray grips

/* [Cell] */
cell_l = 50.0;  cell_w = 34.0;  cell_h = 5.0;   // 503450, 1000 mAh
cell_gap  = 1.5;
charger_h = 2.0;                                 // TP4056 lying flat

/* [Shell] */
wall = 2.6;  floor_t = 2.4;  corner_r = 3.0;

/* [Options] */
connector_window = true;    // opening for the 5 V input lead
magnet_pockets   = true;    // 6 x 2 mm discs, for a steel plate on the wall
magnet_d = 6.2;  magnet_h = 2.2;  magnet_inset = 1.0;

pocket   = module_size + clearance;
bay_x    = cell_l + cell_gap;
bay_y    = cell_w + cell_gap;
bay_h    = cell_h + charger_h + cell_gap;
out_x    = max(pocket, bay_x) + 2 * wall;
out_y    = max(pocket, bay_y) + 2 * wall;
step_z   = floor_t + bay_h;
total_h  = step_z + pocket_depth;

module rrect(x, y, h, r) {
  linear_extrude(h)
    offset(r = r) offset(r = -r) square([x, y], center = true);
}

module tray() {
  difference() {
    rrect(out_x, out_y, total_h, corner_r);

    translate([0, 0, floor_t])            rrect(bay_x, bay_y, bay_h + 0.01, corner_r);
    translate([0, 0, step_z])             rrect(pocket, pocket, pocket_depth + 0.1, corner_r);

    if (connector_window)
      translate([out_x / 2 - wall - 0.5, 0, floor_t + 1])
        cube([wall + 2, 9, 5], center = false);

    if (magnet_pockets)
      for (dx = [-1, 1], dy = [-1, 1])
        translate([dx * (out_x / 2 - magnet_d), dy * (out_y / 2 - magnet_d), -0.01])
          cylinder(h = magnet_h, d = magnet_d, $fn = 48);
  }
}

// A 6 mm slice of the pocket alone. Print this first: it costs minutes and a
// gram, and it is the only way to know whether 48.0 plus 0.5 is right for a
// module whose published size and whose STEP file disagree.
module fit_gauge() {
  difference() {
    rrect(pocket + 2 * wall, pocket + 2 * wall, 6, corner_r);
    translate([0, 0, -0.01]) rrect(pocket, pocket, 6.02, corner_r);
  }
}

tray();
// fit_gauge();
