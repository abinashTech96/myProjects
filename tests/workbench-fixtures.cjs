const pdf = () => {
  const stream =
      "2 w 20 20 m 280 20 l 280 280 l 20 280 l h S 140 20 m 140 280 l S BT /F1 18 Tf 40 150 Td (120 240) Tj ET",
    objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ];
  let value = "%PDF-1.4\n",
    offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(value));
    value += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(value);
  value +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(value);
};
const glb = (extra = {}) => {
  const positions = Buffer.alloc(36);
  [0, 0, 0, 1, 0, 1, 0, 1, 0].forEach((n, i) =>
    positions.writeFloatLE(n, i * 4),
  );
  const object = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    buffers: [{ byteLength: 36 }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36, target: 34962 }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 3,
        type: "VEC3",
        min: [0, 0, 0],
        max: [1, 1, 1],
      },
    ],
    ...extra,
  };
  let json = Buffer.from(JSON.stringify(object));
  const padding = (4 - (json.length % 4)) % 4;
  json = Buffer.concat([json, Buffer.alloc(padding, 32)]);
  const bytes = Buffer.alloc(12 + 8 + json.length + 8 + positions.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(json.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  json.copy(bytes, 20);
  bytes.writeUInt32LE(positions.length, 20 + json.length);
  bytes.writeUInt32LE(0x004e4942, 24 + json.length);
  positions.copy(bytes, 28 + json.length);
  return bytes;
};
module.exports = { pdf, glb };
