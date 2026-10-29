/* Ephemeral view recovery. The saved project and undo history are never replaced. */
window.FourDSession = {
  capture() {
    if(!Engine3D.camera||!Engine3D.controls||!FourDWorkspace.running)return null;
    return {
      pose:FourDViews.pose(),history:structuredClone(FourDViews.history),section:structuredClone(StudioEnhancements.section),
      selection:[...Selection.ids],selected:elements[selectedElIndex]?.id,annotations:FourDWorkspace.annotations,
      annotationPreference:FourDWorkspace.annotationPreference,dimensions:FourDWorkspace.dimensions,
      motion:FourDViews.motion,reveal:FourDViews.reveal,dayHour:FourDViews.dayHour,
      materialChannel:FourDViews.materialMode,advancedFloor:ViewportUI.advancedFloor,cutPercent:ViewportUI.cutPercent,
    };
  },
  restore(saved) {
    if(!saved||!FourDWorkspace.running||!Engine4D.ready)return;
    FourDViews.motion='off';FourDViews.restorePose(saved.pose,{duration:0});
    FourDViews.motion=saved.motion;FourDViews.reveal=saved.reveal;FourDViews.history=structuredClone(saved.history);
    FourDViews.materialMode=saved.materialChannel;ViewportUI.advancedFloor=saved.advancedFloor;ViewportUI.cutPercent=saved.cutPercent;
    StudioEnhancements.section=structuredClone(saved.section);if(saved.section)StudioEnhancements.applySection();
    if(saved.dayHour!=null)FourDViews.previewDay(saved.dayHour);
    Selection.ids=new Set(saved.selection.filter(id=>elements.some(e=>e.id===id)));selectedElIndex=elements.findIndex(e=>e.id===saved.selected);
    FourDWorkspace.annotationPreference=saved.annotationPreference;FourDWorkspace.setAnnotations(saved.annotations,false);FourDWorkspace.showDimensions(saved.dimensions);
    AppEvents.triggerSelectionChange();FourDViews.breadcrumbs();Engine3D.needsRender=true;
  },
};
