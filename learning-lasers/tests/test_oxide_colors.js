const fs = require('fs');
const path = require('path');

// 1. Load the OxidePhysics.js file dynamically
const oxidePath = path.join(__dirname, '../physics-of-the-beam/js/OxidePhysics.js');
const oxideCode = fs.readFileSync(oxidePath, 'utf8');

// 2. Evaluate the class into the current context so we don't have to modify the source file
const OxidePhysics = new Function(oxideCode + ';\nreturn OxidePhysics;')();

// 3. Initialize the physics engine
const physics = new OxidePhysics();

console.log("=========================================");
console.log(" SS304 OXIDE PHYSICS SIMULATION TEST");
console.log("=========================================\n");
console.log("| nm | Computed RGB | Color Name |");
console.log("|:---|:---|:---|");

// 4. Iterate from 0 to 250 nm (the full range of 1st and 2nd Order structural colors)
for (let nm = 0; nm <= 250; nm += 10) {
    // We pass roughness (ra) = 0 to get the pure structural color
    const result = physics.getColor(nm, 0);

    // Output the markdown table row
    console.log(`| ${nm} nm | \`rgb(${result.rgb[0]}, ${result.rgb[1]}, ${result.rgb[2]})\` | ${result.name} |`);
}

console.log("\n✅ Test completed. If the color ranges align with physical expectations and match the 'Deep Blue' visual requirements, no regressions have occurred.");
