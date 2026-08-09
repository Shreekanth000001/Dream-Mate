const fs = require('fs');
const buffer = fs.readFileSync('public/avatar.glb');
if (buffer.toString('utf8', 0, 4) !== 'glTF') throw 'Not a glTF';
const chunkLength = buffer.readUInt32LE(12);
const chunkType = buffer.toString('utf8', 16, 20);
if (chunkType !== 'JSON') throw 'First chunk not JSON';
const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
const gltf = JSON.parse(jsonString);

console.log("=== MESHES ===");
(gltf.meshes || []).forEach(m => {
  let targetNames = m.extras?.targetNames || [];
  let numTargets = 0;
  if (m.primitives && m.primitives[0] && m.primitives[0].targets) {
    numTargets = m.primitives[0].targets.length;
  }
  console.log(`Mesh: ${m.name}, targets: ${numTargets}, targetNames: ${targetNames.join(',')}`);
});

console.log("\n=== MATERIALS ===");
(gltf.materials || []).forEach(m => console.log(`Material: ${m.name}`));

console.log("\n=== NODES ===");
(gltf.nodes || []).forEach(n => console.log(`Node: ${n.name}`));

console.log("\n=== ANIMATIONS ===");
(gltf.animations || []).forEach(a => console.log(`Animation: ${a.name}`));
