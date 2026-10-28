/* Embedded GLB validation shared by import and worker preparation. */
(function(root){
 function validate(buffer){
    const view = new DataView(buffer);
    if (
      buffer.byteLength > 3 * 1024 * 1024 ||
      buffer.byteLength < 20 ||
      view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 ||
      view.getUint32(8, true) !== buffer.byteLength
    )
      throw Error("Use a valid embedded GLB 2 file below 3 MB");
    let json;
    for (let offset = 12; offset + 8 <= buffer.byteLength; ) {
      const length = view.getUint32(offset, true),
        kind = view.getUint32(offset + 4, true);
      if (offset + 8 + length > buffer.byteLength)
        throw Error("Truncated GLB chunk");
      if (kind === 0x4e4f534a)
        json = JSON.parse(
          new TextDecoder()
            .decode(new Uint8Array(buffer, offset + 8, length))
            .trim(),
        );
      offset += 8 + length;
    }
    if (!json) throw Error("GLB has no model description");
    if (
      (json.extensionsRequired || []).some(
        (x) =>
          ![
            "KHR_materials_unlit",
            "KHR_texture_transform",
            "KHR_mesh_quantization",
          ].includes(x),
      )
    )
      throw Error(
        "This model requires an unsupported compression/material extension",
      );
    for (const r of [...(json.buffers || []), ...(json.images || [])])
      if (r.uri && !/^data:[\w/+.-]+;base64,[A-Za-z0-9+/=]+$/.test(r.uri))
        throw Error(
          "External model resources are not accepted; export a self-contained GLB",
        );
    const vertices = (json.accessors || []).reduce(
      (s, a) => s + (a.type === "VEC3" ? a.count || 0 : 0),
      0,
    );
    if (vertices > 500000) throw Error("Reduce the model mesh complexity");
    return json;

 }
 function decode(data){const text=atob(data.split(",")[1]),bytes=new Uint8Array(text.length);for(let i=0;i<text.length;i++)bytes[i]=text.charCodeAt(i);validate(bytes.buffer);return bytes;}
 root.GLBModel={validate,decode};if(typeof module==="object")module.exports=root.GLBModel;
})(globalThis);
