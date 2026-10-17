/* Common controls and workflow labels; project content is never translated. */
const WorkbenchI18n = {
  language: "en",
  originals: new WeakMap(),
  attributes: new WeakMap(),
  busy: false,
  rows: [
    ["Widgets", "विजेट", "ୱିଜେଟ୍"],
    ["Tools", "उपकरण", "ଉପକରଣ"],
    ["Design", "डिज़ाइन", "ଡିଜାଇନ୍"],
    ["Project", "परियोजना", "ପ୍ରକଳ୍ପ"],
    ["Save JSON", "JSON सहेजें", "JSON ସଞ୍ଚୟ"],
    ["Open", "खोलें", "ଖୋଲନ୍ତୁ"],
    ["Export", "निर्यात", "ନିର୍ଯାତ"],
    ["Versions", "संस्करण", "ସଂସ୍କରଣ"],
    ["Assets", "सामग्री", "ସାମଗ୍ରୀ"],
    ["Properties", "गुण", "ଗୁଣ"],
    ["Undo", "पूर्ववत", "ପୂର୍ବବତ୍"],
    ["Redo", "फिर करें", "ପୁଣି କରନ୍ତୁ"],
    ["Close", "बंद करें", "ବନ୍ଦ କରନ୍ତୁ"],
    ["Cancel", "रद्द करें", "ବାତିଲ୍"],
    ["Apply", "लागू करें", "ପ୍ରୟୋଗ"],
    ["Preview", "पूर्वावलोकन", "ପୂର୍ବଦର୍ଶନ"],
    ["Name", "नाम", "ନାମ"],
    ["Width", "चौड़ाई", "ପ୍ରସ୍ଥ"],
    ["Depth", "गहराई", "ଗଭୀରତା"],
    ["Height", "ऊँचाई", "ଉଚ୍ଚତା"],
    ["Floor", "मंज़िल", "ମହଲା"],
    ["Move", "खिसकाएँ", "ସ୍ଥାନାନ୍ତର"],
    ["Duplicate", "प्रतिलिपि", "ନକଲ"],
    ["Isolate", "अलग दिखाएँ", "ଅଲଗା ଦେଖାନ୍ତୁ"],
    ["More", "और", "ଅଧିକ"],
    ["Professional workbench", "उन्नत कार्यक्षेत्र", "ଉନ୍ନତ କାର୍ଯ୍ୟକ୍ଷେତ୍ର"],
    ["Wall faces & assemblies", "दीवार सतह और परतें", "କାନ୍ଥ ପୃଷ୍ଠ ଓ ସ୍ତର"],
    ["Constraint diagnostics", "बाधा जाँच", "ନିୟମ ଯାଞ୍ଚ"],
    ["Site boundary & setbacks", "भूखंड सीमा और दूरी", "ଜମି ସୀମା ଓ ଛାଡ଼"],
    [
      "Building levels & voids",
      "भवन स्तर और खुले भाग",
      "ଭବନ ସ୍ତର ଓ ଖୋଲା ସ୍ଥାନ",
    ],
    [
      "Linked door/window types",
      "संबद्ध दरवाज़े और खिड़कियाँ",
      "ସଂଯୁକ୍ତ କବାଟ ଓ ଝରକା",
    ],
    ["Advanced stairs & ramps", "सीढ़ियाँ और रैंप", "ସିଡ଼ି ଓ ରାମ୍ପ"],
    ["Lifts & service shafts", "लिफ्ट और सेवा शाफ्ट", "ଲିଫ୍ଟ ଓ ସେବା ଶାଫ୍ଟ"],
    ["Structural grid", "संरचनात्मक ग्रिड", "ସଂରଚନା ଗ୍ରିଡ୍"],
    [
      "Bathroom & kitchen planner",
      "स्नानघर और रसोई योजना",
      "ସ୍ନାନାଗାର ଓ ରୋଷେଇ ଯୋଜନା",
    ],
    ["Furniture optimization", "फर्नीचर व्यवस्था", "ଆସବାବ ବିନ୍ୟାସ"],
    ["Custom furniture catalog", "निजी फर्नीचर सूची", "ନିଜସ୍ୱ ଆସବାବ ତାଲିକା"],
    ["Linked assemblies", "संबद्ध घटक", "ସଂଯୁକ୍ତ ଉପାଦାନ"],
    ["Facade alignment", "मुखभाग संरेखण", "ସମ୍ମୁଖ ଭାଗ ସମରେଖଣ"],
    [
      "Outdoor & boundary design",
      "बाहरी क्षेत्र और सीमा",
      "ବାହ୍ୟ ଅଞ୍ଚଳ ଓ ସୀମା",
    ],
    ["Terrain & earthwork", "भूमि और मिट्टी कार्य", "ଭୂମି ଓ ମାଟି କାମ"],
    ["Roof water collection", "छत का जल संग्रह", "ଛାତ ଜଳ ସଂଗ୍ରହ"],
    ["Solar panel layout", "सौर पैनल योजना", "ସୌର ପ୍ୟାନେଲ୍ ଯୋଜନା"],
    ["3D service coordination", "3D सेवा समन्वय", "3D ସେବା ସମନ୍ୱୟ"],
    ["Design options", "डिज़ाइन विकल्प", "ଡିଜାଇନ୍ ବିକଳ୍ପ"],
    [
      "3D editing & inspection",
      "3D संपादन और निरीक्षण",
      "3D ସମ୍ପାଦନ ଓ ନିରୀକ୍ଷଣ",
    ],
    ["PDF & scanned plan import", "PDF और स्कैन आयात", "PDF ଓ ସ୍କାନ୍ ଆମଦାନୀ"],
    [
      "Material & procurement planning",
      "सामग्री और खरीद योजना",
      "ସାମଗ୍ରୀ ଓ କ୍ରୟ ଯୋଜନା",
    ],
    ["Cutting optimization", "कटाई योजना", "କାଟିବା ଯୋଜନା"],
    ["Construction details", "निर्माण विवरण", "ନିର୍ମାଣ ବିବରଣୀ"],
    ["Review issues & markup", "समीक्षा और टिप्पणियाँ", "ସମୀକ୍ଷା ଓ ଟିପ୍ପଣୀ"],
    ["Custom object properties", "निजी वस्तु गुण", "ନିଜସ୍ୱ ବସ୍ତୁ ଗୁଣ"],
    ["Action macros", "कार्य मैक्रो", "କାର୍ଯ୍ୟ ମାକ୍ରୋ"],
    ["Language & accessibility", "भाषा और सुगमता", "ଭାଷା ଓ ସୁଗମତା"],
    [
      "Cloud connection & offline queue",
      "क्लाउड और ऑफ़लाइन कतार",
      "କ୍ଲାଉଡ୍ ଓ ଅଫଲାଇନ୍ ଧାଡ଼ି",
    ],
    ["Client presentation export", "प्रस्तुति निर्यात", "ଉପସ୍ଥାପନ ନିର୍ଯାତ"],
    ["Select", "चुनें", "ବାଛନ୍ତୁ"],
    ["Search objects", "वस्तुएँ खोजें", "ବସ୍ତୁ ଖୋଜନ୍ତୁ"],
    ["Interface language", "इंटरफ़ेस भाषा", "ଇଣ୍ଟରଫେସ୍ ଭାଷା"],
    ["Save interface preferences", "वरीयताएँ सहेजें", "ପସନ୍ଦ ସଞ୍ଚୟ କରନ୍ତୁ"],
  ],
  translate(value) {
    const row = this.rows.find((r) => r[0] === value);
    return row
      ? row[this.language === "hi" ? 1 : this.language === "or" ? 2 : 0]
      : value;
  },
  scan(root = document.body) {
    if (this.busy) return;
    this.busy = true;
    try {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (
          node.parentElement?.closest(
            "script,style,svg,input,textarea,#studio-project-name,#studio-toast,#wb-3d-labels,#wb-context-toolbar strong",
          )
        )
          continue;
        const current = node.nodeValue,
          known = this.originals.get(node);
        let original =
          known && current === known.translated ? known.original : current;
        const trimmed = original.trim(),
          translated = this.translate(trimmed);
        if (translated !== trimmed || known) {
          const next = original.replace(trimmed, translated);
          this.originals.set(node, { original, translated: next });
          if (current !== next) node.nodeValue = next;
        }
      }
      for (const element of root.querySelectorAll?.(
        "[placeholder],[aria-label],[title]",
      ) || []) {
        let saved = this.attributes.get(element);
        if (!saved) {
          saved = {};
          this.attributes.set(element, saved);
        }
        for (const key of ["placeholder", "aria-label", "title"])
          if (element.hasAttribute(key)) {
            const value = element.getAttribute(key),
              previous = saved[key],
              original =
                previous && value === previous.translated
                  ? previous.original
                  : value,
              translated = this.translate(original);
            saved[key] = { original, translated };
            if (value !== translated) element.setAttribute(key, translated);
          }
      }
    } finally {
      this.busy = false;
    }
  },
  apply(prefs) {
    this.language = ["en", "hi", "or"].includes(prefs.language)
      ? prefs.language
      : "en";
    document.documentElement.lang = this.language;
    document.documentElement.style.setProperty(
      "--wb-text-scale",
      Math.max(1, Math.min(1.4, Number(prefs.scale) || 1)),
    );
    document.body.classList.toggle("wb-text-large", Number(prefs.scale) > 1);
    document.body.classList.toggle(
      "wb-colorblind",
      prefs.colors === "colorblind",
    );
    this.scan();
  },
  init() {
    this.observer = new MutationObserver(() => {
      if (this.queued) return;
      this.queued = true;
      queueMicrotask(() => {
        this.queued = false;
        this.scan();
      });
    });
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    this.apply(WorkbenchUI.preferences || {});
    window.addEventListener(
      "keydown",
      (event) => {
        if (
          event.target.closest?.(
            'input,textarea,select,[contenteditable="true"]',
          ) ||
          document.querySelector("dialog[open]") ||
          RoomStudio.activeRoom
        )
          return;
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push("Ctrl");
        if (event.altKey) parts.push("Alt");
        if (event.shiftKey) parts.push("Shift");
        parts.push(
          event.key.length === 1 ? event.key.toUpperCase() : event.key,
        );
        const key = parts.join("+"),
          bindings = {
            menu: "Alt+P",
            view2d: "Alt+1",
            view3d: "Alt+3",
            measure: "Alt+M",
            ...(WorkbenchUI.preferences?.keys || {}),
          },
          action = Object.entries(bindings).find(
            ([, value]) => value.toLowerCase() === key.toLowerCase(),
          )?.[0];
        if (action) {
          event.preventDefault();
          event.stopImmediatePropagation();
          ({
            menu: () => WorkbenchUI.menu(),
            view2d: () => setWorkspaceLayout("2d"),
            view3d: () => setWorkspaceLayout("3d"),
            measure: () => Workbench3D.startMeasure(),
          })[action]();
        }
      },
      true,
    );
  },
};
document.addEventListener("DOMContentLoaded", () => WorkbenchI18n.init());
