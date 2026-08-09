const fs = require('fs');

try {
  const buffer = fs.readFileSync('public/characters/boy.vroid');
  const magic = buffer.toString('utf8', 0, 4);
  console.log("Magic bytes:", magic);
  if (magic === 'glTF') {
    console.log("It's a glTF/VRM file!");
    
    // Parse the JSON chunk to check VRM version and capabilities
    const chunkLength = buffer.readUInt32LE(12);
    const chunkType = buffer.toString('utf8', 16, 20);
    if (chunkType === 'JSON') {
      const jsonString = buffer.toString('utf8', 20, 20 + chunkLength);
      const gltf = JSON.parse(jsonString);
      
      const vrmExtension = gltf.extensions?.VRM || gltf.extensions?.VRMC_vrm;
      console.log("VRM Extension present:", !!vrmExtension);
      if (vrmExtension) {
        if (gltf.extensions?.VRMC_vrm) {
           console.log("Version: VRM 1.0");
           console.log("Expressions:", Object.keys(gltf.extensions.VRMC_vrm.expressions?.preset || {}));
        } else {
           console.log("Version: VRM 0.x");
           console.log("Blendshapes:", vrmExtension.blendShapeMaster?.blendShapeGroups?.map(g => g.name || g.presetName));
        }
      }
      
      console.log("Materials:", (gltf.materials || []).map(m => m.name).slice(0, 5), "...");
      console.log("Meshes:", (gltf.meshes || []).map(m => m.name).slice(0, 5), "...");
    }
  } else {
    console.log("Not a glTF file. First 4 bytes:", buffer.slice(0, 4));
  }
} catch (err) {
  console.error("Error reading file:", err);
}
