declare module "*.css";
declare module "*.gif";

declare module "jimu-core" {
  export type AllWidgetProps<T = unknown> = {
    id: string;
    useMapWidgetIds?: string[];
    state?: unknown;
  } & Record<string, unknown>;

  export enum WidgetState {
    Opened = "OPENED",
    Active = "ACTIVE"
  }

  export const appActions: {
    requestAutoControlMapWidget: (mapWidgetId: string, widgetId: string) => unknown;
    releaseAutoControlMapWidget: (mapWidgetId: string) => unknown;
  };

  export function getAppStore(): {
    getState: () => unknown;
    dispatch: (action: unknown) => void;
  };
}

declare module "jimu-arcgis" {
  export type JimuMapView = {
    view: __esri.MapView;
  };

  export interface JimuMapViewComponentProps {
    useMapWidgetId?: string;
    onActiveViewChange?: (jimuMapView: JimuMapView) => void;
  }

  export const JimuMapViewComponent: (props: JimuMapViewComponentProps) => unknown;
}
