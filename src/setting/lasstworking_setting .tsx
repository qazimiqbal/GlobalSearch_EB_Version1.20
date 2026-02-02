import { React, Immutable, DataSourceManager } from "jimu-core";
import { type AllWidgetSettingProps } from "jimu-for-builder";
import { MapWidgetSelector } from "jimu-ui/advanced/setting-components";
import { ArcGISDataSourceTypes } from "jimu-arcgis";

export default class Setting extends React.PureComponent<
  AllWidgetSettingProps<unknown>,
  unknown
> {
  supportedTypes = Immutable([ArcGISDataSourceTypes.WebMap]);
  dsManager = DataSourceManager.getInstance();

  onMapSelected = (useMapWidgetIds: string[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds: useMapWidgetIds,
    });
  };

  render() {
    return (
      <div className="sample-use-map-view-setting p-2">
        <MapWidgetSelector
          onSelect={this.onMapSelected}
          useMapWidgetIds={this.props.useMapWidgetIds}
        />
      </div>
    );
  }
}
