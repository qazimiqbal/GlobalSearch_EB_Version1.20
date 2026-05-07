import * as React from "react";
import { type AllWidgetProps, appActions, getAppStore, WidgetState } from "jimu-core";
import { JimuMapViewComponent, type JimuMapView } from "jimu-arcgis";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import MapView from "@arcgis/core/views/MapView";
import Extent from "@arcgis/core/geometry/Extent";
import IHandle from "@arcgis/core/core/interfaces";
import loadingAnimate from "./images/loading_animated.gif";
import "./widgets.css";
import PropertyInfo from "./PropertyInfo";
import SearchHeader from "./components/SearchHeader";
import SearchForm from "./components/SearchForm";
import SearchResults from "./components/SearchResults";
import { getAddressVariants as buildAddressVariants } from "./utils/addressVariants";
import { searchAddressInMapService } from "./services/mapSearchService";
import { buildGroupedResultsHtml } from "./utils/resultsRenderer";
import { identifyParcelAndHighlight } from "./services/parcelIdentifyService";
import { isOtherMapToolActive } from "./utils/mapToolState";

interface State {
  extent: Extent | null;
  isIdentifyMode: boolean;
  jimuMapView: JimuMapView | null;
  addressInput: string;
  loading: boolean;
  error: string | null;
  myparcelData: string;
  myyearData: number | null;
  isActive: boolean;
  hasResults: boolean;
}

export default class Widget extends React.PureComponent<
  AllWidgetProps<unknown>,
  State
> {
  view: MapView | null = null;
  identifyHandler: any | null = null;
  graphicsLayer: GraphicsLayer | null = null;
  observer: MutationObserver | null = null;
  visibilityCheckInterval: ReturnType<typeof setInterval> | null = null;

  state: State = {
    extent: null,
    isIdentifyMode: true,
    jimuMapView: null,
    addressInput: "",
    loading: false,
    error: null,
    myparcelData: "",
    myyearData: 2025,
    isActive: true,
    hasResults: false
  };

  passparcelData = (parcelID: string, myyear: number | null) => {
    const resultsDiv = document.getElementById('resultsDiv');
    const moreResultsDiv = document.getElementById('moreResultsDiv');
    if (!resultsDiv || !moreResultsDiv) {
      return;
    }
    // Hide resultsDiv and show moreResultsDiv
    resultsDiv.style.display = 'none';
    moreResultsDiv.style.display = 'block';
    moreResultsDiv.style.flex = '1';
    this.setState({ myparcelData: parcelID, myyearData: myyear });
  };

  isConfigured = () => {
    return (
      this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1
    );
  };

  componentDidMount() {
    this.checkWidgetVisibility();
    window.setTimeout(() => {
      this.view = jimuMapView.view as MapView;
    }, 0);
    this.observeWidgetChanges();
    this.setupWidgetClickListener();
    // Periodically check widget visibility to catch missed state changes
    this.visibilityCheckInterval = setInterval(() => {
      this.checkWidgetVisibility();
    }, 500); // Check every 500ms
    (window as any).zoomToCoordinates = (x: number, y: number) => {
      this.zoomToCoordinates(x, y);
    };
    // Set initial message in resultsDiv
    const resultsDiv = document.getElementById('resultsDiv');
    if (resultsDiv) {
      resultsDiv.innerHTML = '<p style="color: #666; padding: 10px; margin: 5px 0; text-align: center;">Please enter your address above in the input box</p>';
    }
  }

  componentDidUpdate(prevProps: AllWidgetProps<unknown>) {
    // Detect when widget state changes (e.g., widget becomes active/inactive)
    if (prevProps.state !== this.props.state) {
      this.checkWidgetVisibility();
      // Force re-check after a short delay to ensure state is fully updated
      window.setTimeout(() => {
        this.checkWidgetVisibility();
      }, 100);
    }
  }

  handleMapClick = async (event: any) => {
    if (!this.canIdentify()) {
      return;
    }
    if (isOtherMapToolActive(this.view)) {
      return;
    }
    const resultsDiv = document.getElementById("resultsDiv");
    const moreResultsDiv = document.getElementById("moreResultsDiv");
    if (!resultsDiv || !moreResultsDiv) {
      return;
    }
    moreResultsDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    if (this.view) {
      const screenPoint = { x: event.x, y: event.y };
      const mapPoint = this.view.toMap(screenPoint);
      this.zoomToCoordinates(mapPoint.x, mapPoint.y);
    }
  };

  componentWillUnmount() {
    if (this.graphicsLayer) {
      this.graphicsLayer.removeAll();
    }
    if (this.identifyHandler) {
      this.identifyHandler.remove();
      this.identifyHandler = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.visibilityCheckInterval) {
      clearInterval(this.visibilityCheckInterval);
      this.visibilityCheckInterval = null;
    }
    this.setAutoControlMapWidget(false);
  }

  // Simple wrapper that triggers focus-state synchronization.
  checkWidgetVisibility = () => {
    this.syncFocusState();
  };

  // References Experience Builder store (`widgetsRuntimeInfo`, `mapWidgetsInfo`) and widget DOM
  // visibility to determine whether this widget should actively control identify behavior.
  syncFocusState = () => {
    const widgetElement =
      document.getElementById(`widget-${this.props.id}`) ||
      (document.querySelector(`[data-widgetid="${this.props.id}"]`) as HTMLElement | null);
    const isVisible = !!(
      widgetElement &&
      ((widgetElement.offsetParent || widgetElement.getClientRects().length) &&
        (widgetElement.clientWidth > 0 || widgetElement.clientHeight > 0))
    );
    const state = getAppStore().getState() as any;
    const widgetState = state?.widgetsRuntimeInfo?.[this.props.id]?.state;
    const isOpen = widgetState
      ? widgetState === WidgetState.Opened || widgetState === WidgetState.Active
      : true;
    const viewActive = !!this.state.jimuMapView;
    const nextActive = isVisible && isOpen && viewActive;

    const mapWidgetId = this.props.useMapWidgetIds?.[0];
    const autoControlId = mapWidgetId
      ? state?.mapWidgetsInfo?.[mapWidgetId]?.autoControlWidgetId
      : null;

    if (this.state.isActive !== nextActive) {
      this.setState({ isActive: nextActive }, () => {
        this.syncIdentifyHandler();
        if (nextActive && autoControlId !== this.props.id) {
          this.setAutoControlMapWidget(true);
        } else if (!nextActive && autoControlId === this.props.id) {
          this.setAutoControlMapWidget(false);
        }
      });
    } else {
      // Always sync the handler even if isActive didn't change
      // This handles cases where widget was switched but isActive state is same
      this.syncIdentifyHandler();
      if (nextActive && autoControlId !== this.props.id) {
        this.setAutoControlMapWidget(true);
      } else if (!nextActive && autoControlId === this.props.id) {
        this.setAutoControlMapWidget(false);
      }
    }
  };

  // Observes DOM mutations to detect open/close/visibility shifts from controller panels.
  observeWidgetChanges = () => {
    const targetNode = document.body;
    if (!targetNode) return;

    this.observer = new MutationObserver(() => {
      this.checkWidgetVisibility();
    });

    this.observer.observe(targetNode, { childList: true, subtree: true });
  };

  // Adds click listeners on widget shell/header to trigger visibility/focus re-evaluation.
  setupWidgetClickListener = () => {
    // Add click listener to detect when user clicks on this widget
    const checkOnClick = () => {
      window.setTimeout(() => {
        this.checkWidgetVisibility();
      }, 50);
    };
    
    // Listen for clicks on the widget element
    const widgetElement = document.getElementById(`widget-${this.props.id}`) ||
      document.querySelector(`[data-widgetid="${this.props.id}"]`);
    
    if (widgetElement) {
      widgetElement.addEventListener('click', checkOnClick);
    }
    
    // Also check when any widget header is clicked (for controller/panel widgets)
    window.setTimeout(() => {
      const widgetHeaders = document.querySelectorAll(`[data-widgetid="${this.props.id}"] .widget-header, .jimu-widget-header`);
      widgetHeaders.forEach(header => {
        header.addEventListener('click', checkOnClick);
      });
    }, 1000);
  };



  // Delegates to shared street-suffix normalization utility for address query variants.
  getAddressVariants = (input: string) => {
    return buildAddressVariants(input);
  };

  // Receives the active Jimu map view, initializes map references/graphics layer,
  // and synchronizes identify handler state against active/open widget state.
  onActiveViewChange = (jimuMapView: JimuMapView) => {    
    if (!jimuMapView) {
      this.view = null;
      this.setState({ jimuMapView: null }, () => {
        this.syncFocusState();
      });
      return;
    }

    this.view = jimuMapView.view as MapView;

      if (this.view) {
        // Capture the initial extent only once
        if (!this.state.extent) {
          this.setState({ extent: this.view.extent.clone() }); // Store the initial extent
          //console.log("TEst");
        }

        // Create the graphics layer if not already created
        if (!this.graphicsLayer) {
          this.graphicsLayer = new GraphicsLayer();
          this.view.map.add(this.graphicsLayer);
        }
        if (this.state.isIdentifyMode && this.state.isActive && !this.identifyHandler) {
          this.identifyHandler = this.view.on(
            "click",
            this.handleMapClick as any
          );
        } else if ((!this.state.isIdentifyMode || !this.state.isActive) && this.identifyHandler) {
          this.identifyHandler.remove();
          this.identifyHandler = null;
        }
      }

    this.setState({ jimuMapView }, () => {
      this.syncFocusState();
      window.setTimeout(() => {
        this.syncFocusState();
      }, 0);
    });
  };

  // Decides whether identify click handling should be enabled based on view/activity state.
  syncIdentifyHandler = () => {
    const viewActive = !!this.state.jimuMapView;
    if (this.view && this.state.isIdentifyMode && viewActive && this.canIdentify()) {
      this.enableIdentify();
    } else {
      this.disableIdentify();
    }
  };

  // References Experience Builder map auto-control ownership to prevent tool conflicts.
  canIdentify = () => {
    const mapWidgetId = this.props.useMapWidgetIds?.[0];
    if (!mapWidgetId) {
      return false;
    }
    const state = getAppStore().getState() as any;
    const autoControlId = state?.mapWidgetsInfo?.[mapWidgetId]?.autoControlWidgetId;
    if (!this.state.isActive) {
      return false;
    }
    return !autoControlId || autoControlId === this.props.id;
  };

  // Requests or releases auto-control of the map widget through Experience Builder actions.
  setAutoControlMapWidget = (shouldControl: boolean) => {
    const mapWidgetId = this.props.useMapWidgetIds?.[0];
    if (!mapWidgetId) {
      return;
    }

    const state = getAppStore().getState() as any;
    const autoControlId = state?.mapWidgetsInfo?.[mapWidgetId]?.autoControlWidgetId;
    if (shouldControl && autoControlId === this.props.id) {
      return;
    }
    if (!shouldControl && autoControlId && autoControlId !== this.props.id) {
      return;
    }

    const action = shouldControl
      ? appActions.requestAutoControlMapWidget(mapWidgetId, this.props.id)
      : appActions.releaseAutoControlMapWidget(mapWidgetId);
    getAppStore().dispatch(action);
  };

  // Removes identify click listener from the current map view.
  disableIdentify = () => {
    if (this.view && this.identifyHandler) {
      this.identifyHandler.remove();
      this.identifyHandler = null;
    }
  };

  // Attaches identify click listener when identify mode and map context are valid.
  enableIdentify = () => {
    if (this.view && this.state.isIdentifyMode && this.state.jimuMapView) {
      if (this.identifyHandler) {
        return;
      }
      this.identifyHandler = this.view.on("click", this.handleMapClick as any);
    }
  };

  // Updates `addressInput` from SearchForm text input.
  handleAddressInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ addressInput: event.target.value });
  };

  // Handles SearchForm submit and delegates to explicit search action.
  handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    this.handleSearchClick();
  };

  // References `resultsDiv` and `moreResultsDiv` DOM nodes to switch result panels,
  // validates input, and starts map-service search workflow.
  handleSearchClick = () => {
    const resultsDiv = document.getElementById('resultsDiv');
    const moreResultsDiv = document.getElementById('moreResultsDiv');
    if (!resultsDiv || !moreResultsDiv) {
      return;
    }
    
    // Check if input is empty
    if (!this.state.addressInput.trim()) {
      resultsDiv.innerHTML = '<p style="color: #d32f2f; padding: 10px; margin: 5px 0;">Please enter an address to search.</p>';
      resultsDiv.style.display = 'block';
      moreResultsDiv.style.display = 'none';
      this.setState({ hasResults: false });
      return;
    }
    
    resultsDiv.innerHTML = "";
    // Hide resultsDiv and show moreResultsDiv
    resultsDiv.style.display = 'block';
    moreResultsDiv.style.display = 'none';
    resultsDiv.style.flex = '1';

    this.getdataFromMapService(this.state.addressInput);
  };

  // Clears UI/data state: resets panel content, removes map graphics, and zooms to initial extent.
  // New clear button function
  handleClearClick = () => {
    const resultsDiv = document.getElementById("resultsDiv");
    const moreResultsDiv = document.getElementById("moreResultsDiv");
    if (resultsDiv) {
      resultsDiv.innerHTML = '<p style="color: #666; padding: 10px; margin: 5px 0; text-align: center;">Please enter your address above in the input box</p>';
      resultsDiv.style.display = 'block';
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
      addressInput: "", // Clear the addressInput field
      hasResults: false // Hide Clear button
    });
  };

  // Calls shared map search service, then renders grouped HTML into `resultsDiv`.
  // References address variants utility and grouped-results HTML builder.
  // New function to get data from MapService
  getdataFromMapService = async (addressInput: string) => {
    const resultsDiv = document.getElementById("resultsDiv");

    if (!addressInput.trim()) {
      console.log("Please enter an address");
      return;
    }

    try {
      this.setState({ loading: true, error: null });
      const searchResult = await searchAddressInMapService(
        addressInput,
        this.getAddressVariants
      );

      if (!resultsDiv) {
        return;
      }

      if (searchResult.type === "message") {
        resultsDiv.innerHTML = searchResult.message;
        return;
      }

      resultsDiv.innerHTML = buildGroupedResultsHtml(searchResult.groupedData);
      this.setState({ hasResults: true });
    } catch (error) {
      console.error('Error fetching data from MapService:', error);
      this.setState({ error: 'An error occurred. Please try again later.' });
      if (resultsDiv) {
        resultsDiv.innerHTML = 'An error occurred. Please try again later.';
      }
    } finally {
      this.setState({ loading: false });
    }
  };

  // Calls parcel identify service (geometry + parcel details), updates `resultsDiv`,
  // binds More Info button -> `passparcelData`, and recenters map view.
  // New function to zoom to predefined coordinates
  zoomToCoordinates = async (x: number, y: number) => {
    console.log("Zooming to coordinates:", x, y);
    const resultsDiv = document.getElementById("resultsDiv");

    try {
      const identifyResult = await identifyParcelAndHighlight(x, y, this.graphicsLayer);

      if (resultsDiv) {
        if (identifyResult.infoHtml) {
          resultsDiv.innerHTML = identifyResult.infoHtml;
          this.setState({ hasResults: true });

          const moreInfoButton = document.querySelector(".moreinfo");
          if (moreInfoButton) {
            moreInfoButton.addEventListener("click", (event: Event) => {
              const target = event.currentTarget as HTMLElement | null;
              const parcelID = target?.getAttribute("data-parcelid") || "";
              const myyear = this.state.myyearData;
              this.passparcelData(parcelID, myyear);
            });
          }
        } else {
          resultsDiv.innerHTML = "No results returned";
        }
      }

      if (this.view) {
        await this.view
          .goTo({
            target: identifyResult.mapPoint,
            zoom: 9,
          })
          .then(() => {
            console.log("View centered on:", identifyResult.mapPoint);
          })
          .catch((error) => {
            console.error("Error centering the view:", error);
          });
      }
    } catch (error) {
      console.error("Zoom error:", error);
    }
  };

  // Main render tree: map view bridge + search UI + loading/error + details panel.
  render() {
    if (!this.isConfigured()) {
      return "In Widget Configuration, please select a map";
    }
    const { loading, error, addressInput } = this.state;
    return (
      <div className="global-search-widget-container">
        <div className="widget-use-map-view">
          <JimuMapViewComponent
            useMapWidgetId={this.props.useMapWidgetIds?.[0]}
            onActiveViewChange={this.onActiveViewChange}
          ></JimuMapViewComponent>
          <div style={{ marginLeft: "5px", marginRight: "5px" }}>
            <SearchHeader />
            <SearchForm
              addressInput={addressInput}
              hasResults={this.state.hasResults}
              onSubmit={this.handleFormSubmit}
              onAddressInputChange={this.handleAddressInputChange}
              onSearchClick={this.handleSearchClick}
              onClearClick={this.handleClearClick}
            />
          </div>
          <SearchResults
            loading={loading}
            error={error}
            loadingImage={loadingAnimate}
            detailsContent={
              this.state.myparcelData ? (
                <PropertyInfo
                  parcelID={this.state.myparcelData}
                  myYear={this.state.myyearData}
                  key={`${this.state.myparcelData}-${this.state.myyearData}`}
                />
              ) : (
                <div>No parcel data yet.</div>
              )
            }
          />
        </div>
      </div>
    );
  }
}
