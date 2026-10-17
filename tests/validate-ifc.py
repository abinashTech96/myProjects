"""Independent optional IFC2X3 schema and geometry round trip. Requires IfcOpenShell."""
import json
import pathlib
import subprocess
import tempfile
import ifcopenshell
import ifcopenshell.geom
import ifcopenshell.validate

root = pathlib.Path(__file__).resolve().parent.parent
source = r"""
require('./js/project-model.js');require('./js/planning-model.js');
const D=require('./js/design-model.js');
const p=ProjectModel.normalize({floorCount:2,elements:[
{id:'ground',type:'bedroom',x:20,y:20,w:180,h:144,floor:0},
{id:'upper',type:'bedroom',x:20,y:20,w:180,h:144,floor:1}],
fixtures:[{id:'door',type:'door',roomId:0,edge:'top',offset:30,size:36,arch:12}],
planning:{walls:[{id:'curve',floor:0,a:{x:240,y:20},b:{x:240,y:200},thickness:4.5,curve:{control:{x:280,y:100},steps:16}}]}});
process.stdout.write(D.ifc(p));
"""
with tempfile.TemporaryDirectory(prefix="archcad-ifc-") as directory:
    target = pathlib.Path(directory) / "coordination.ifc"
    target.write_bytes(subprocess.check_output(["node", "-e", source], cwd=root))
    model = ifcopenshell.open(str(target))
    logger = ifcopenshell.validate.json_logger()
    ifcopenshell.validate.validate(model, logger)
    assert not logger.statements, json.dumps(logger.statements, default=str, indent=2)
    settings = ifcopenshell.geom.settings()
    walls = model.by_type("IfcWall")
    assert len(model.by_type("IfcBuildingStorey")) == 2
    assert len(model.by_type("IfcSpace")) == 2
    for wall in walls:
        shape = ifcopenshell.geom.create_shape(settings, wall)
        assert len(shape.geometry.verts) >= 12
    print(f"IFC round trip passed: zero schema issues, {len(walls)} readable wall solids, two storeys/spaces")
