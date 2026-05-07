import request from "@arcgis/core/request";


import Graphic from "@arcgis/core/Graphic";
import Polygon from "@arcgis/core/geometry/Polygon";
import Point from "@arcgis/core/geometry/Point";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";



interface IdentifyResult {
  mapPoint: Point;
  infoHtml: string | null;
  parcelId: string | null;
}


export async function identifyParcelAndHighlight(
  x: number,
  y: number,
  graphicsLayer: GraphicsLayer | null
): Promise<IdentifyResult> {
  const mapPoint = new Point({
    x,
    y,
    spatialReference: { wkid: 2240 },
  });

  if (graphicsLayer) {
    graphicsLayer.removeAll();
  }

  const url =
    "https://gismaps.fultoncountyga.gov/arcgispub2/rest/services/PropertyMapViewer/ParcelQuery/MapServer/identify";
  const spatialReferenceWkid = 2240;

  const fetchIdentify = async (tolerance: number, extentPadding: number) => {
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
      tolerance,
      returnGeometry: true,
      mapExtent: JSON.stringify({
        xmin: x - extentPadding,
        ymin: y - extentPadding,
        xmax: x + extentPadding,
        ymax: y + extentPadding,
        spatialReference: { wkid: spatialReferenceWkid },
      }),
      imageDisplay: [800, 600, 96],
      layers: "all",
    };

    const response = await request(url, {
      query: params,
      responseType: "json",
    });

    return response.data;
  };

  let result = await fetchIdentify(10, 1000);
  if (!result?.results || result.results.length === 0) {
    result = await fetchIdentify(50, 3000);
  }

  if (!result?.results || result.results.length === 0) {
    return { mapPoint, infoHtml: null, parcelId: null };
  }

  const firstResult = result.results[0];
  const features = firstResult?.geometry;

  if (features) {
    const polygon = new Polygon({
      rings: features.rings,
      spatialReference: { wkid: spatialReferenceWkid },
    });

    const polygonGraphic = new Graphic({
      geometry: polygon,
      symbol: {
        type: "simple-fill",
        color: [0, 0, 255, 0.2],
        outline: {
          color: [0, 0, 255, 1],
          width: 2,
        },
      },
    });

    if (graphicsLayer) {
      graphicsLayer.add(polygonGraphic);
    }
  }

  const attrs = firstResult.attributes || {};
  const parcelId = attrs.ParcelID || null;
  const propValue = attrs.TotAppr;
  const formattedPropValue = Number(propValue).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  let info = "<div><table class='my-table'>";
  info += "<thead><tr><th>Address</th><th>" + (attrs.Address || "") + "</th></tr></thead>";
  info += "<tbody>";
  info += "<tr><td>Parcel ID</td><td>" + (attrs.ParcelID || "") + "</td></tr>";
  info += "<tr><td>Owner</td><td>" + (attrs.Owner || "") + "</td></tr>";
  info += "<tr><td>Total Appraised</td><td>" + formattedPropValue + "</td></tr>";
  info += "<tr><td>Neighborhood</td><td>" + (attrs.Neighborhood || "") + "</td></tr>";
  info += "<tr><td>Area</td><td>" + (attrs.LandAcres || "") + " Acres</td></tr>";
  info += `
    <tr>
      <td colspan="2" style="padding: 0; border: none;">
        <button class="moreinfo" data-parcelid="${attrs.ParcelID || ""}" aria-label="View more information about this property" title="View more information about this property">
          More Info
        </button>
      </td>
    </tr>
  `;
  info += "</tbody></table></div>";

  return { mapPoint, infoHtml: info, parcelId };
};
