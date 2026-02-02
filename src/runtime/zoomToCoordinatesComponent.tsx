import { loadModules } from "esri-loader";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

export const zoomToCoordinateComponent = async (view: __esri.MapView, x: number, y: number) => {
  alert("Hello1");
  const resultsDiv = document.getElementById("resultsDiv");
  if (resultsDiv) {
    alert("Hello");
    resultsDiv.innerHTML = "TEST";
    
   }
  const [Graphic, Polygon, geometryEngine, Point] = await loadModules([
    "esri/Graphic",
    "esri/geometry/Polygon",
    "esri/geometry/geometryEngine",
    "esri/geometry/Point",
  ]);

  const mapPoint = new Point({
    x: x,
    y: y,
    spatialReference: { wkid: 2240 },
  });

  // Clear previous graphics
  if (view.map.layers.find((layer) => layer.type === "graphics")) {
    view.map.removeAll();
  }
  

  const url =
    "https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/ParcelQuery/MapServer/identify";

  const spatialReferenceWkid = 2240;

  const params = {
    f: "json",
    geometry: JSON.stringify({
      x,
      y,
      spatialReference: {
        wkid: spatialReferenceWkid,
      },
    }),
    geometryType: "esriGeometryPoint",
    sr: spatialReferenceWkid,
    tolerance: 10,
    returnGeometry: true, // Request geometry to get parcel polygon
    mapExtent: JSON.stringify({
      xmin: x - 1000,
      ymin: y - 1000,
      xmax: x + 1000,
      ymax: y + 1000,
      spatialReference: { wkid: 2240 },
    }),
    imageDisplay: [800, 600, 96],
    layers: "all",
  };

  try {
    const response = await request(url, {
      query: params,
      responseType: "json",
    });

    const result = response.data;

    if (result.results && result.results.length > 0) {
      const features = result.results[0]?.geometry;
      if (features) {
        const polygon = new Polygon({
          rings: features.rings,
          spatialReference: { wkid: spatialReferenceWkid },
        });

        const polygonGraphic = new Graphic({
          geometry: polygon,
          symbol: {
            type: "simple-fill",
            color: [0, 0, 255, 0.2], // Fill color with transparency
            outline: {
              color: [0, 0, 255, 1],
              width: 2,
            },
          },
        });

        view.graphics.add(polygonGraphic);

        // ... Rest of the code to display parcel information
        console.log(result.results[0].attributes.Owner);
          console.log(result.results[0].attributes.ParcelID);
          console.log(result.results[0].attributes.Address);

          const PropValue = result.results[0].attributes.TotAppr;
          const formattedPropValue = PropValue.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          });
          console.log(formattedPropValue); // Output: $1,234.56
        
          let info = "<div><table class='my-table'>";
          info +=
            "<thead><tr><th>Address Property:	</th><th>" +
            result.results[0].attributes.Address +
            "</th></tr></thead>";
          info +=
            "<tbody><tr><td>Parcel ID:	</td><td>" +
            result.results[0].attributes.ParcelID +
            "</td></tr>";
          info +=
            "<tr><td>Owner:	</td><td>" +
            result.results[0].attributes.Owner +
            "</td></tr>";
          info +=
            "<tr><td>Total Appraised:	</td><td>" +
            formattedPropValue +
            "</td></tr>";
          info +=
            "<tr><td>Neighborhood:	</td><td>" +
            result.results[0].attributes.Neighborhood +
            "</td></tr>";
          info +=
            "<tr><td>Area:	</td><td>" +
            result.results[0].attributes.LandAcres +
            " Acres</td></tr>";
           info += "</tbody></table></div>";

          const resultsDiv = document.getElementById("resultsDiv");
          if (resultsDiv) {
            resultsDiv.innerHTML = info;

           }
      }
    }
  } catch (error) {
    console.error("Identify error:", error);
  }

  try {
    await view
      .goTo({
        target: mapPoint, // Use the Point as the target
        zoom: 8, // Adjust zoom level as needed
      })
      .then(() => {
        console.log("View centered on:", mapPoint);
      })
      .catch((error) => {
        console.error("Error centering the view:", error);
      });
  } catch (error) {
    console.error("Zoom error:", error);
  }
};