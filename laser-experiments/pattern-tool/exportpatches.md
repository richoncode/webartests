# XCS Export Patch Log

| Iteration | Changes Applied | Test Result |
| :--- | :--- | :--- |
| **Iteration 1** | Reset `pivot` to `0,0`; added `localSkew`; set `fill.visible: false` & `stroke.visible: true`; renamed canvas to `{panel}1`. | **Fail.** Missing settings UI. |
| **Iteration 2** | Populate `layerData` for all colors; add stroke boilerplate (`alignment: 0.5`, etc.); remove `mode: "vertical"`. | **Fail.** No device (F2) selected on open. |
| **Iteration 3** | Set `device.id: "GS006"`, `device.power: [5, 15]`, `mode: "LASER_PLANE"`, and add default `LASER_PLANE` config object. | **Fail.** Device F2 entry still missing in XCS. |
| **Iteration 4** | Switch all IDs (Canvas, Shape, Trace) to standard 36-char GUIDs. | **Fail.** (Structural improvement, but didn't fix device selection). |
| **Iteration 5** | Include all 4 mandatory operation nodes per shape; set `processingType: "FILL_VECTOR_ENGRAVING"`; align `processingLightSource: "blue"`. | **Fail.** Device selection still missing. |
| **Iteration 6** | Add **Root-Level** metadata: `extId: "GS006"`, `extName: "F2"`, `version: "1.5.8"`, `minRequiredVersion: "2.6.0"`. | *Pending Test* |
