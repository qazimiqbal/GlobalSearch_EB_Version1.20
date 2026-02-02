import { React, type AllWidgetProps } from "jimu-core";
import { JimuMapViewComponent, type JimuMapView } from "jimu-arcgis";
import { Modal, Button } from "react-bootstrap"; // Import Modal and Button
import Draggable from 'react-draggable';
import request from "@arcgis/core/request";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import { loadModules } from "esri-loader";
import identifyIcon_disable from "./images/identify_disable.png";
import identifyIcon_enable from "./images/identify_enable.png";
import "./widgets.css";
import ParcelModel from './PropertyInfo'; // Adjust the path as necessary
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
  showModal: boolean;  // Modal visibility
  modalData: string;  // Data to pass to the modal
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
    addressInput: "750 Distribution",
    loading: false,
    error: null,
    data: {},
    showModal: false, // Initialize modal state
    modalData: "" // Initialize modal data
  };

  // Function to open the modal
  openModalWithData = (parcelID: string) => {
    // Your modal opening logic goes here
    this.setState({ modalData: `Parcel ID: ${parcelID}`, showModal: true });
  };
  openModalWithData2 = (data: string) => {
    this.setState({
      showModal: true,
      modalData: data // Pass the data to the modal
    });
  };

  // Function to close the modal
  closeModal = () => {
    this.setState({
      showModal: false,
      modalData: ""
    });
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
    this.getdata(this.state.addressInput);
  };

  // New clear button function
  handleClearClick = () => {
    const resultsDiv = document.getElementById("resultsDiv");
    if (resultsDiv) {
      resultsDiv.innerHTML = "No data available";
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
    console.log("Map clicked at screen coordinates:", event.x, event.y);
    if (this.view) {
      // const [
      //   Graphic,
      //   Polygon,
      // ] = await loadModules([
      //   "esri/Graphic",
      //   "esri/geometry/Polygon",
      // ]);

      const screenPoint = { x: event.x, y: event.y };
      const mapPoint = this.view.toMap(screenPoint);
      //alert(mapPoint.x);
      this.zoomToCoordinates(mapPoint.x, mapPoint.y);
    }
  };

  getdata = async (addressInput: string) => {
    if (!addressInput.trim()) {
      console.log("Please enter the address");
    } else {
      console.log("Zooming to address:", addressInput);
      try {
        const serviceUrl =
          "https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Temp/GlobalSearch_Dialog/MapServer/1/query";

        console.log(
          "https://gismaps.fultoncountyga.gov/arcgispub/rest/services/Temp/GlobalSearch_Dialog/MapServer/1/query"
        );
        const trimmedAddress = addressInput.trim();
        const params = {
          where: `Name LIKE '${trimmedAddress}%'`,
          outFields:
            "ObjID, Name, FeatType, MinX, MinY, MaxX, MaxY, LabelX, LabelY",
          f: "json",
        };

        // Fetch the data
        const response = await fetch(
          `${serviceUrl}?${new URLSearchParams(params)}`
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        const jsonData = await response.json();
        if (jsonData.error) {
          throw new Error(jsonData.error.message);
        }

        // Organize the data by featType
        const organizedData = {};
        jsonData.features.forEach((feature) => {
          const featType = feature.attributes.FeatType;
          const name = feature.attributes.Name;
          const labelX = feature.attributes.LabelX;
          const labelY = feature.attributes.LabelY;

          if (!organizedData[featType]) {
            organizedData[featType] = [];
          }
          organizedData[featType].push({
            name,
            labelX,
            labelY,
          });
        });

        // Generate the HTML content
        let content = "<div>";
        Object.keys(organizedData).forEach((featType) => {
          content += `<h3>${featType}</h3><ul>`;
          organizedData[featType].forEach((item) => {
            // Create each item as a hyperlink
            content += `
              <li>
                <a href="#" onclick="window.zoomToCoordinates(${item.labelX}, ${item.labelY}); return false;" style="color: black; text-decoration: none;">
                  ${item.name}
                </a>
              </li>
            `;
          });
          content += "</ul>";
        });
        content += "</div>";

        // Bind the generated content to the DIV with id 'resultsDiv'
        const resultsDiv = document.getElementById("resultsDiv");
        if (resultsDiv) {
          resultsDiv.innerHTML = content;
        } else {
          console.error("DIV with id 'resultsDiv' not found.");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        const resultsDiv = document.getElementById("resultsDiv");
        if (resultsDiv) {
          resultsDiv.innerHTML =
            "<p>Error fetching data. Please try again.</p>";
        }
      }
    }
  };
  
  // New function to zoom to predefined coordinates
  zoomToCoordinates = async (x: number, y: number) => {
    console.log(x);
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
    console.log("Test it");

    
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
                <button class="open-modal" data-parcelid="${result.results[0].attributes.ParcelID}">
                  View Full Property Info
                </button>
              </td>
            
            `;
            
          // info +=
          //   // "<tr><td colspan='2'><a href='#' target='_new'>View Full Property Profile</a></td></tr></tbody>";
          //   "<td><Button onClick={() => openModalWithData("+result.results[0].attributes.ParcelID+")}Open Modal for Parcel ID: {result.results[0].attributes.ParcelID}</Button></td> <td></td>";
          info += "</tbody></table></div>";

          const resultsDiv = document.getElementById("resultsDiv");
          if (resultsDiv) {
            resultsDiv.innerHTML = info;

            // Attach event listeners to the button with class 'open-modal'
            document.querySelectorAll('.open-modal').forEach(button => {
              button.addEventListener('click', (event) => {
                const parcelID = event.target.getAttribute('data-parcelid');
                this.openModalWithData(parcelID);
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
        className="widget-use-map-view"
        style={{ width: "100%", height: "100%", overflow: "hidden" }}
      >
        <JimuMapViewComponent
          useMapWidgetId={this.props.useMapWidgetIds?.[0]}
          onActiveViewChange={this.onActiveViewChange}
        ></JimuMapViewComponent>
        <div style={{ marginLeft: "5px", marginRight: "5px" }}>
          {/* <div className="parent">
            <div className="child1">child 1</div>
            <div className="child2">child 2</div>
          </div> */}
          <h4 className="widget-title">
            <span className="title-text">Global Search</span>
            <div className="toggle-icon">
              {/* <img src={identifyIcon_enable} alt="Identify Icon" /> */}
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
          </h4>
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
            </div>
          </form>

          <div className="clearDiv">
            <button type="button" onClick={this.handleClearClick}>
              Clear
            </button>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {error && <p>{error}</p>}
        <p>


        </p>
        <div id="resultsDiv"> </div>

       

  


          // Inside your render method
          <Modal show={this.state.showModal} onHide={this.closeModal}>
            {/* <Draggable> */}
            <Modal.Dialog>
            <Modal.Header>
            <Modal.Title>Property Profile</Modal.Title>
            <Button variant="secondary" onClick={this.closeModal}>
              Close
            </Button>
          </Modal.Header>

            <Modal.Body>
              {this.state.modalData.includes('Parcel ID:') ? (
                <PropertyInfo parcelID={this.state.modalData.split(': ')[1]} />
              ) : (
                <div>{this.state.modalData}</div>
              )}
            </Modal.Body>
            <Modal.Footer>
              
            </Modal.Footer>
            </Modal.Dialog>
            {/* </Draggable> */}
          </Modal>





      </div>
    );
  }
}
