/* IFC2X3 coordination model with stable identities, physical openings and typed elements. */
(function (root) {
  "use strict";
  const W = root.WorkbenchModel,
    P = root.ProjectModel,
    M = root.PlanningModel,
    D = root.DesignModel;
  function ifc(p) {
    let n = 1;
    const lines = [],
      add = (s) => {
        const id = "#" + n++;
        lines.push(id + "=" + s + ";");
        return id;
      },
      str = (s) =>
        "'" +
        String(s ?? "")
          .replace(/'/g, "''")
          .replace(/[^\x20-\x7e]/g, "?") +
        "'",
      num = (n) => Number(n).toFixed(5),
      mm = (n) => num(n * 25.4);
    function guid(key) {
      const alphabet =
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$";
      let value = 0n;
      for (let seed of [2166136261, 333555777, 987654321, 314159265]) {
        for (const ch of String(key)) {
          seed ^= ch.charCodeAt(0);
          seed = Math.imul(seed, 16777619) >>> 0;
        }
        value = (value << 32n) | BigInt(seed);
      }
      let s = "";
      for (let i = 0; i < 22; i++) {
        s = alphabet[Number(value & 63n)] + s;
        value >>= 6n;
      }
      return str(s);
    }
    const person = add("IFCPERSON($,$,'ArchCAD',$,$,$,$,$)"),
      org = add("IFCORGANIZATION($,'ArchCAD',$,$,$)"),
      actor = add(`IFCPERSONANDORGANIZATION(${person},${org},$)`),
      app = add(`IFCAPPLICATION(${org},'3.0','ArchCAD','ArchCAD')`),
      owner = add(
        `IFCOWNERHISTORY(${actor},${app},$,.ADDED.,$,$,$,${Math.floor(Date.now() / 1000)})`,
      ),
      point = (x, y, z) =>
        add(
          `IFCCARTESIANPOINT((${mm(x)},${mm(-y)}${z === undefined ? "" : "," + mm(z)}))`,
        ),
      origin = point(0, 0, 0),
      zdir = add("IFCDIRECTION((0.,0.,1.))"),
      xdir = add("IFCDIRECTION((1.,0.,0.))"),
      axis = add(`IFCAXIS2PLACEMENT3D(${origin},${zdir},${xdir})`),
      placement = () => add(`IFCLOCALPLACEMENT($,${axis})`),
      context = add(
        `IFCGEOMETRICREPRESENTATIONCONTEXT($,'Model',3,0.001,${axis},$)`,
      ),
      unit = add("IFCSIUNIT(*,.LENGTHUNIT.,.MILLI.,.METRE.)"),
      units = add(`IFCUNITASSIGNMENT((${unit}))`),
      project = add(
        `IFCPROJECT(${guid("project:" + p.name)},${owner},${str(p.name)},$,$,$,$,(${context}),${units})`,
      ),
      site = add(
        `IFCSITE(${guid("site")},${owner},'Site',$,$,${placement()},$,$,.ELEMENT.,$,$,$,$,$)`,
      ),
      building = add(
        `IFCBUILDING(${guid("building")},${owner},${str(p.name)},$,$,${placement()},$,$,.ELEMENT.,$,$,$)`,
      );
    const aggregate = (key, parent, children) => {
      if (children.length)
        add(
          `IFCRELAGGREGATES(${guid(key)},${owner},$,$,${parent},(${children.join(",")}))`,
        );
    };
    aggregate("project-site", project, [site]);
    aggregate("site-building", site, [building]);
    const floors = [],
      contained = Array.from({ length: p.floorCount }, () => []),
      spaces = Array.from({ length: p.floorCount }, () => []),
      products = new Map();
    for (let f = 0; f < p.floorCount; f++) {
      floors.push(
        add(
          `IFCBUILDINGSTOREY(${guid("storey:" + f)},${owner},${str(p.planning.floorNames?.[f] || "Floor " + f)},$,$,${placement()},$,$,.ELEMENT.,${mm(W.floorBase(p, f))})`,
        ),
      );
    }
    aggregate("building-storeys", building, floors);
    function curve(ps) {
      const points = ps.concat([ps[0]]).map((q) => point(q.x, q.y));
      return add(`IFCPOLYLINE((${points.join(",")}))`);
    }
    function profile(poly) {
      const outer = curve(
        poly[0].map((q) => (Array.isArray(q) ? { x: q[0], y: q[1] } : q)),
      );
      return poly.length > 1
        ? add(
            `IFCARBITRARYPROFILEDEFWITHVOIDS(.AREA.,$,${outer},(${poly
              .slice(1)
              .map((r) =>
                curve(
                  r.map((q) => (Array.isArray(q) ? { x: q[0], y: q[1] } : q)),
                ),
              )
              .join(",")}))`,
          )
        : add(`IFCARBITRARYCLOSEDPROFILEDEF(.AREA.,$,${outer})`);
    }
    function representation(solids, type = "SweptSolid") {
      const shape = add(
        `IFCSHAPEREPRESENTATION(${context},'Body',${str(type)},(${solids.join(",")}))`,
      );
      return add(`IFCPRODUCTDEFINITIONSHAPE($,$,(${shape}))`);
    }
    function solids(geometry, base, height) {
      return geometry.map((poly) => {
        const pr = profile(poly),
          a = add(`IFCAXIS2PLACEMENT3D(${point(0, 0, base)},${zdir},${xdir})`);
        return add(`IFCEXTRUDEDAREASOLID(${pr},${a},${zdir},${mm(height)})`);
      });
    }
    function shape(geometry, base, height) {
      return representation(solids(geometry, base, height));
    }
    function properties(product, key, values) {
      const rows = Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([name, value]) =>
          add(
            `IFCPROPERTYSINGLEVALUE(${str(name)},$,${typeof value === "number" ? `IFCREAL(${num(value)})` : `IFCTEXT(${str(value)})`},$)`,
          ),
        );
      if (!rows.length) return;
      const set = add(
        `IFCPROPERTYSET(${guid("properties:" + key)},${owner},'ArchCAD',$,(${rows.join(",")}))`,
      );
      add(
        `IFCRELDEFINESBYPROPERTIES(${guid("defines:" + key)},${owner},$,$,(${product}),${set})`,
      );
    }
    function material(product, key, name) {
      const mat = add(`IFCMATERIAL(${str(name)})`);
      add(
        `IFCRELASSOCIATESMATERIAL(${guid("material:" + key)},${owner},$,$,(${product}),${mat})`,
      );
    }
    const walls = P.walls(p),
      openingProducts = new Map();
    for (const w of walls) {
      const geometry = [D.wallStrip(w, false)],
        base = w.base ?? W.floorBase(p, w.floor),
        height = w.height ?? W.floorHeight(p, w.floor),
        rep = shape(geometry, base, height),
        wall = add(
          `IFCWALL(${guid("wall:" + w.id)},${owner},${str(w.id)},$,$,${placement()},${rep},${str(w.id)})`,
        );
      contained[w.floor].push(wall);
      products.set(w.id, wall);
      const assembly = W.data(p).assemblies.find(
        (a) => a.id === W.data(p).wallTypes[w.id],
      );
      if (assembly) {
        const layers = assembly.layers.map((l) => {
            const mat = add(`IFCMATERIAL(${str(l.material)})`);
            return add(`IFCMATERIALLAYER(${mat},${mm(l.thickness)},.U.)`);
          }),
          set = add(
            `IFCMATERIALLAYERSET((${layers.join(",")}),${str(assembly.name)})`,
          ),
          usage = add(
            `IFCMATERIALLAYERSETUSAGE(${set},.AXIS2.,.POSITIVE.,${mm(-w.thickness / 2)})`,
          );
        add(
          `IFCRELASSOCIATESMATERIAL(${guid("assembly:" + w.id)},${owner},$,$,(${wall}),${usage})`,
        );
      } else material(wall, w.id, "Wall");
      properties(wall, w.id, {
        NativeId: w.id,
        ThicknessIn: w.thickness,
        ...W.data(p).values[w.id],
      });
      for (let k = 0; k < w.openings.length; k++) {
        const o = w.openings[k],
          f = p.fixtures.find((f) => f.id === o.id);
        if (!f) continue;
        const at = (t) => ({
            x: w.a.x + ((w.b.x - w.a.x) * t) / w.length,
            y: w.a.y + ((w.b.y - w.a.y) * t) / w.length,
          }),
          a = at(o.start),
          b = at(o.end),
          voidGeom = [D.wallStrip({ a, b, thickness: w.thickness + 2 }, false)],
          opening = add(
            `IFCOPENINGELEMENT(${guid("void:" + w.id + ":" + f.id + ":" + k)},${owner},${str(f.tag || f.type)},$,$,${placement()},${shape(voidGeom, base + o.sill, o.height)},$)`,
          );
        add(
          `IFCRELVOIDSELEMENT(${guid("void-rel:" + w.id + ":" + f.id + ":" + k)},${owner},$,$,${wall},${opening})`,
        );
        if (!openingProducts.has(f.id)) {
          const seg = M.openingSegment(p, f),
            panel = [
              D.wallStrip(
                {
                  a: seg.a,
                  b: seg.b,
                  thickness: f.type === "door" ? 1.5 : 0.5,
                },
                false,
              ),
            ],
            rep = shape(
              panel,
              W.roomBase(p, p.elements[f.roomId]) + f.sill,
              f.height,
            ),
            kind = f.type === "door" ? "IFCDOOR" : "IFCWINDOW",
            product = add(
              `${kind}(${guid("opening:" + f.id)},${owner},${str(f.tag || f.type)},$,$,${placement()},${rep},${str(f.id)},${mm(f.height)},${mm(f.size)})`,
            );
          add(
            `IFCRELFILLSELEMENT(${guid("fill:" + f.id)},${owner},$,$,${opening},${product})`,
          );
          contained[w.floor].push(product);
          openingProducts.set(f.id, product);
          products.set(f.id, product);
          material(product, f.id, f.type === "door" ? "Door panel" : "Glazing");
          properties(product, f.id, {
            NativeId: f.id,
            TypeId: W.data(p).openingLinks[f.id]?.type,
            Style: f.style,
            Hinge: f.handing,
            Swing: f.swing,
            ArchRiseIn: f.arch || 0,
            ...W.data(p).values[f.id],
          });
        }
      }
    }
    for (let f = 0; f < p.floorCount; f++) {
      const g = W.slabGeometry(p, f);
      if (g.length) {
        const thickness = 6,
          top = W.floorBase(p, f) + W.floorHeight(p, f),
          slab = add(
            `IFCSLAB(${guid("slab:" + f)},${owner},${str("Slab " + f)},$,$,${placement()},${shape(g, top - thickness, thickness)},$,.FLOOR.)`,
          );
        contained[f].push(slab);
        material(slab, "slab:" + f, "Concrete");
      }
    }
    for (const e of p.elements) {
      const geometry = e.isFurniture
        ? [D.polygon(M.points(e))]
        : D.clear(p, e).geometry;
      if (!geometry.length) continue;
      const height = e.isFurniture
          ? e.customHeight || 36
          : W.floorHeight(p, e.floor),
        rep = shape(geometry, W.roomBase(p, e), height);
      if (!e.isFurniture) {
        const space = add(
          `IFCSPACE(${guid("space:" + e.id)},${owner},${str(e.customName || e.type)},$,$,${placement()},${rep},$,.ELEMENT.,.INTERNAL.,$)`,
        );
        spaces[e.floor].push(space);
        products.set(e.id, space);
        properties(space, e.id, {
          NativeId: e.id,
          RoomType: e.type,
          ClearAreaSqft: D.clear(p, e).area / 144,
          ...p.design.finishes[e.id],
          ...W.data(p).values[e.id],
        });
      } else {
        const item = add(
          `IFCFURNISHINGELEMENT(${guid("furniture:" + e.id)},${owner},${str(e.customName || e.type)},$,$,${placement()},${rep},${str(e.id)})`,
        );
        contained[e.floor].push(item);
        products.set(e.id, item);
        material(item, e.id, e.material || "Furniture");
        properties(item, e.id, {
          NativeId: e.id,
          AssetId: e.assetId,
          ...W.data(p).values[e.id],
        });
      }
    }
    for (const member of W.data(p).structure) {
      const g = [member.points ? D.polygon(member.points) : W.box(member)],
        rep = shape(
          g,
          W.floorBase(p, member.floor) + (member.base || 0),
          member.height,
        ),
        kind = { column: "IFCCOLUMN", beam: "IFCBEAM", slab: "IFCSLAB" }[
          member.kind
        ],
        product = add(
          `${kind}(${guid("structure:" + member.id)},${owner},${str(member.name || member.kind)},$,$,${placement()},${rep},${str(member.id)}${member.kind === "slab" ? ",.FLOOR." : ""})`,
        );
      contained[member.floor].push(product);
      material(product, member.id, member.material || "Concrete");
      properties(product, member.id, {
        NativeId: member.id,
        ...W.data(p).values[member.id],
      });
    }
    for (const layout of W.data(p).interiors) {
      const room = p.elements.find((e) => e.id === layout.room);
      for (const item of layout.items) {
        const rep = shape(
            [W.box(item)],
            W.roomBase(p, room) + (item.base || 0),
            item.height,
          ),
          product = add(
            `IFCFURNISHINGELEMENT(${guid("interior:" + item.id)},${owner},${str(item.type)},$,$,${placement()},${rep},${str(item.id)})`,
          );
        contained[room.floor].push(product);
        properties(product, item.id, {
          NativeId: item.id,
          RoomId: room.id,
          ...W.data(p).values[item.id],
        });
      }
    }
    function brep(vertices, faces) {
      const pts = vertices.map((v) => point(v.x, v.y, v.z)),
        fs = faces.map((face) => {
          const loop = add(
              `IFCPOLYLOOP((${face.map((i) => pts[i]).join(",")}))`,
            ),
            bound = add(`IFCFACEOUTERBOUND(${loop},.T.)`);
          return add(`IFCFACE((${bound}))`);
        }),
        shell = add(`IFCCLOSEDSHELL((${fs.join(",")}))`);
      return add(`IFCFACETEDBREP(${shell})`);
    }
    const roof=p.design.roof, Roof=root.RoofModel || (typeof require==='function'?require('./roof-model.js'):null), surface=Roof.describe(p);
    if(surface){
      const solids=surface.patches.map(polygon=>{const {vertices,faces}=Roof.solid(surface,polygon);return brep(vertices,faces);}),
        rep=representation(solids,"Brep"),
        product=add(`IFCROOF(${guid("roof")},${owner},${str(roof.type+" roof")},$,$,${placement()},${rep},$,.${{flat:"FLAT_ROOF",gable:"GABLE_ROOF",shed:"SHED_ROOF",hip:"HIP_ROOF"}[roof.type]}.)`);
      contained[surface.floor].push(product);material(product,"roof","Roof");
      properties(product,"roof",{Drainage:roof.drain,OverhangIn:roof.overhang,ThicknessIn:roof.thickness,ThicknessDirection:"vertical"});
    }
    for (let f = 0; f < p.floorCount; f++) {
      aggregate("storey-spaces:" + f, floors[f], spaces[f]);
      if (contained[f].length)
        add(
          `IFCRELCONTAINEDINSPATIALSTRUCTURE(${guid("contains:" + f)},${owner},$,$,(${contained[f].join(",")}),${floors[f]})`,
        );
    }
    return `ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('ArchCAD typed coordination model'),'2;1');\nFILE_NAME('ArchCAD.ifc','${new Date().toISOString()}',(''),(''),'ArchCAD','ArchCAD','');\nFILE_SCHEMA(('IFC2X3'));\nENDSEC;\nDATA;\n${lines.join("\n")}\nENDSEC;\nEND-ISO-10303-21;`;
  }
  W.ifc = ifc;
  root.DesignModel.ifc = ifc;
  if (typeof module !== "undefined") module.exports = ifc;
})(typeof window !== "undefined" ? window : globalThis);
