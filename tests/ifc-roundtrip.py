"""Optional independent IFC2X3 schema and solid validation (ifcopenshell==0.9.0.post1)."""
import pathlib, subprocess, tempfile
import ifcopenshell, ifcopenshell.validate, ifcopenshell.geom
root = pathlib.Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory() as folder:
    subprocess.run(['node',str(root/'tests/export-ifc-fixture.cjs'),folder],check=True,cwd=root)
    for source in sorted(pathlib.Path(folder).glob('*.ifc')):
        model=ifcopenshell.open(str(source)); log=ifcopenshell.validate.json_logger()
        ifcopenshell.validate.validate(model,log)
        assert not log.statements, log.statements
        products=[p for p in model.by_type('IfcProduct') if p.Representation]
        for product in products:
            shape=ifcopenshell.geom.create_shape(ifcopenshell.geom.settings(),product)
            assert len(shape.geometry.verts)>0,product
        assert model.by_type('IfcRelVoidsElement') and model.by_type('IfcRelFillsElement')
        assert model.by_type('IfcMaterialLayerSetUsage')
        roots=model.by_type('IfcRoot'); assert len({p.GlobalId for p in roots})==len(roots)
        print(source.name, len(products),'represented products; schema, unique GUIDs and all solids passed')
