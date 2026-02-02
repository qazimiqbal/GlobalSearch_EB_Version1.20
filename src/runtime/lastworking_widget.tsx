import { React, type AllWidgetProps } from "jimu-core";
import { JimuMapViewComponent, type JimuMapView } from "jimu-arcgis";
import request from "@arcgis/core/request";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import { loadModules } from "esri-loader";
import identifyIcon_disable from "./images/identify_disable.png";
import identifyIcon_enable from "./images/identify_enable.png";
import "./widgets.css";
import PropertyInfo from "./PropertyInfo";


interface State {
  extent: __esri.Extent;
  parcelInfo: { Owner: string; ParcelID: string; Address: string } | null;
  isIdentifyMode: boolean;
  jimuMapView: JimuMapView | null;
  addressInput: string;
  loading: boolean;
  error: string | null;
  data: { [key: string]: Array<{ name: string; attributes: any }> };
  myparcelData: string;
}

export default class Widget extends React.PureComponent<
  AllWidgetProps<unknown>,
  State
> {
  view: __esri.MapView | null = null;
  identifyHandler: __esri.Handle | null = null;
  graphicsLayer: __esri.GraphicsLayer | null = null;

  state: State = {
    extent: null,
    parcelInfo: null,
    isIdentifyMode: true,
    jimuMapView: null,
    addressInput: "5440",
    loading: false,
    error: null,
    data: {},
    myparcelData: ""
  };

  
  // This function will be triggered by PropertyInfo component
  passparcelData = (parcelID: string) => {
    console.log(parcelID);
    const resultsDiv = document.getElementById('resultsDiv');
    const moreResultsDiv = document.getElementById('moreResultsDiv');

    // Hide resultsDiv and show moreResultsDiv
    resultsDiv.style.display = 'none';
    moreResultsDiv.style.display = 'block';
    moreResultsDiv.style.flex = 1;
      this.setState({ myparcelData: parcelID });
};


  
  isConfigured = () => {
    return (
      this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1
    );
  };

  componentDidMount() {
    (window as any).zoomToCoordinates = (x: number, y: number) => {
      this.zoomToCoordinates(x, y);
    };
  }

  componentWillUnmount() {
    if (this.graphicsLayer) {
      this.graphicsLayer.removeAll();
    }
    if (this.identifyHandler) {
      this.identifyHandler.remove();
      this.identifyHandler = null;
    }
  }

  onActiveViewChange = (jimuMapView: JimuMapView) => {
    this.view = jimuMapView.view as __esri.MapView;

    if (this.view) {
      // Capture the initial extent only once
      if (!this.state.extent) {
        this.setState({ extent: this.view.extent.clone() }); // Store the initial extent
      }

      // Create the graphics layer if not already created
      if (!this.graphicsLayer) {
        this.graphicsLayer = new GraphicsLayer();
        this.view.map.add(this.graphicsLayer);
      }
      if (this.state.isIdentifyMode) {
        this.identifyHandler = this.view.on(
          "click",
          this.handleMapClick as any
        );
      } else if (this.identifyHandler) {
        this.identifyHandler.remove();
        this.identifyHandler = null;
      }
    }
  };

  handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.getdata(this.state.addressInput);
  };

  handleAddressInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ addressInput: event.target.value });
  };

  handleSearchClick = () => {
    const resultsDiv = document.getElementById('resultsDiv');
    const moreResultsDiv = document.getElementById('moreResultsDiv');
    resultsDiv.innerHTML = "";
    // Hide resultsDiv and show moreResultsDiv
    resultsDiv.style.display = 'block';
    moreResultsDiv.style.display = 'none';
    resultsDiv.style.flex = 1;

    this.getdata(this.state.addressInput);
  };

  // New clear button function
  handleClearClick = () => {
    const resultsDiv = document.getElementById("resultsDiv");
    const moreResultsDiv = document.getElementById("moreResultsDiv");
    if (resultsDiv) {
      resultsDiv.innerHTML = "No data available";
    }
    if (moreResultsDiv) {
      moreResultsDiv.style.display = 'none';
    }

    if (this.graphicsLayer) {
      this.graphicsLayer.removeAll();
    }

    if (this.view && this.state.extent) {
      this.view.goTo(this.state.extent); // Use the stored initial extent
    }

    this.setState({
      parcelInfo: null,
      data: {},
    });
  };

  handleMapClick = async (event: __esri.ViewClickEvent) => {
    const resultsDiv = document.getElementById("resultsDiv");
    const moreResultsDiv = document.getElementById("moreResultsDiv");

    moreResultsDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    
  
    
    console.log("Map clicked at screen coordinates:", event.x, event.y);
    if (this.view) {
    
      const screenPoint = { x: event.x, y: event.y };
      const mapPoint = this.view.toMap(screenPoint);
      //alert(mapPoint.x);
      this.zoomToCoordinates(mapPoint.x, mapPoint.y);
    }
  };

  getdata = async (addressInput: string) => {
    //alert(addressInput);
    const resultsDiv = document.getElementById("resultsDiv");
         
    if (!addressInput.trim()) {
      console.log("Please enter the address");
    } 
    else {
      console.log("Zooming to address:", addressInput);

      console.log(`${addressInput}`);
      try {
        const url = 'https://gis.fultoncountyga.gov/Scripts/PHP/GlobalSearch/GlobalSearch_customWidget.php';
    
        const response = await fetch(`${url}?token=${addressInput}`);
    
        if (!response.ok) {
          throw new Error('Network error. Please try again later.');
        }
        else{
          console.log('Response OK.');
        }
    
        const data = await response.json();
        //alert(data.length);
        if (!data || data.length === 0) {
         // setMessage('No results found for the given address.');
          console.log('No results found for the given address.');
          if (resultsDiv) {
            resultsDiv.innerHTML = "No results found for the given address.";
          }
        } else if (data.length > 500) {
          //setMessage('Too many results. Please refine your search.');
          console.log('More than 100 results for the given address.');
          if (resultsDiv) {
            resultsDiv.innerHTML = "More than 500 results found for the given address. Please narrow down your search.";
          }
        } else {
              // Group the data by FeatType
              const groupedData = data.reduce((acc: any, obj: any) => {
                const featType = obj["FeatType"];
                if (!acc[featType]) {
                    acc[featType] = [];
                }
                acc[featType].push({ name: obj["Name"], labelX: obj["LabelX"], labelY: obj["LabelY"] });
                return acc;
            }, {});

            console.log('Grouped Data:', groupedData);

               if (resultsDiv) {
              this.renderResults(groupedData, resultsDiv);
            }

            
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        // setMessage('An error occurred. Please try again later.');
        console.log('An error occurred. Please try again later.');
      } finally {
        // setLoading(false);
        console.log('Loading complete.');
      }
      }
    
  };
  
  renderResults = (groupedData: any, resultsDiv: HTMLElement) => {
    //resultsDiv.innerHTML = '';
    const groupedHTML = Object.entries(groupedData)
      .map(([featType, items]: [string, any[]]) => {
        return `
          <h3>${featType}</h3>
          <ul>
            ${items
              .map(
                item => `
                <li>
                  <a href="#" onclick="window.zoomToCoordinates(${item.labelX}, ${item.labelY}); return false;" style="color: blue; text-decoration: none;">
                    ${item.name}
                  </a>
                </li>`
              )
              .join('')}
          </ul>
        `;
      })
      .join('');
  
    resultsDiv.innerHTML = `
      <p>Found ${Object.values(groupedData).flat().length} results for the given address.</p>
      ${groupedHTML}
    `;
  };

// Separate function for showing "More Info"
const showMoreInfo = (labelX: number, labelY: number, index: number) => {
  try {
    // Get the target item in the results
    const resultItem = document.getElementById(`result-item-${index}`);
    
    // Check if the element exists
    if (resultItem) {
      // Example: Toggle "More Info" link or show additional info
      const moreInfoLink = resultItem.querySelector('a[href="#"]:nth-child(2)');
      if (moreInfoLink) {
        moreInfoLink.textContent = "Less Info";
      }
      // You can also fetch more details for this item based on labelX, labelY
      console.log("Showing more info for:", labelX, labelY);
      // Further handling of "More Info" could be done here (e.g., fetching more data or showing a modal)
    }
  } catch (error) {
    console.error("Error in showMoreInfo function:", error);
  }
};

  // New function to zoom to predefined coordinates
  zoomToCoordinates = async (x: number, y: number) => {
    console.log("Zooming to coordinates:", x, y);
    // alert("inside zoom To Coordinates");
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
    if (this.graphicsLayer) {
      this.graphicsLayer.removeAll();
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
        console.log("Results returned = ", result.results.length);
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

          if (this.graphicsLayer) {
            this.graphicsLayer.add(polygonGraphic);
          }
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
            "<thead><tr><th>Address:	</th><th>" +
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
            " Acres</td></tr></tbody>";
          info += `
              <td colspan="2">
                <button class="moreinfo" data-parcelid="${result.results[0].attributes.ParcelID}">
                  More Info
                </button>
              </td>
            `;
          info += "</tbody></table></div>";

          const resultsDiv = document.getElementById("resultsDiv");
          if (resultsDiv) {
            resultsDiv.innerHTML = info;

            // Attach event listeners to the button with class 'open-modal'
            document.querySelectorAll('.moreinfo').forEach(button => {
              button.addEventListener('click', (event) => {
                const parcelID = event.target.getAttribute('data-parcelid');
                //alert(parcelID);
                this.passparcelData(parcelID);

                
        
              });
            });
          }
        }
      }
    } catch (error) {
      console.error("Identify error:", error);
    }
    try {
      if (this.view) {
        await this.view
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
      }
    } catch (error) {
      console.error("Zoom error:", error);
    }
  };


  
  toggleIdentifyMode = () => {
    this.setState(
      (prevState) => ({
        isIdentifyMode: !prevState.isIdentifyMode,
        parcelInfo: null,
      }),
      () => {
        if (this.view) {
          if (this.state.isIdentifyMode) {
            this.identifyHandler = this.view.on(
              "click",
              this.handleMapClick as any
            );
          } else if (this.identifyHandler) {
            this.identifyHandler.remove();
            this.identifyHandler = null;
          }
        }
      }
    );
  };

  render() {
    if (!this.isConfigured()) {
      return "In Widget Configuration, please select a map";
    }
    const { loading, error, data, addressInput } = this.state;
    return (
      <div
        className="widget-use-map-view">
        <JimuMapViewComponent
          useMapWidgetId={this.props.useMapWidgetIds?.[0]}
          onActiveViewChange={this.onActiveViewChange}
        ></JimuMapViewComponent>
        
        <div style={{ marginLeft: "5px", marginRight: "5px" }}>
           {/* <h4 className="widget-title"> */}
            <table width={"80%"}>
              <tr>
                <td>
                <span className="title-text">Global Search</span>
                </td>
                <td>
                <div className="toggle-icon">
              <button onClick={this.toggleIdentifyMode}>
                {this.state.isIdentifyMode ? (
                  <img
                    className="identify-icon"
                    src={identifyIcon_enable}
                    alt="Disable Identify Icon"
                  />
                ) : (
                  <img
                    className="identify-icon"
                    src={identifyIcon_disable}
                    alt="Enable Identify Icon"
                  />
                )}
              </button>
            </div>
                </td>
              </tr>
            </table>
            

          {/* </h4> */}
          <hr style={{ color: "red", height: 2 }} />

          <form onSubmit={this.handleFormSubmit}>
            <div className="parent">
              <div className="child1">
                <input
                  className="input-text"
                  type="text"
                  placeholder="141 Pryor St"
                  value={addressInput}
                  onChange={this.handleAddressInputChange}
                />
              </div>
              <div className="child2">
                <button
                  className="toggle-icon"
                  type="button"
                  onClick={this.handleSearchClick}
                >
                  Search
                </button>
              </div>
              <div className="clearDiv">
                <button type="button" onClick={this.handleClearClick}>
                  Clear
                </button>
              </div>
            </div>
          </form>
          <hr style={{ color: "gray"}}/>
          
        </div>
     
        {loading && <p>Loading...</p>}
        {error && <p>{error}+kkkk</p>}
       
        <div id="resultsDiv">
            
      </div>

      <div id="moreResultsDiv">
              {this.state.myparcelData ? (
                    <PropertyInfo parcelID={this.state.myparcelData} />
                ) : (
                    <div>No parcel data yet.</div>
                )}</div> 
            </div>
    );
  }
}
