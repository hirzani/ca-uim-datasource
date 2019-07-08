import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class GenericDatasourceQueryCtrl extends QueryCtrl {

  constructor($scope, $injector)  {
    super($scope, $injector);

    this.scope = $scope;
    this.target.metric = this.target.metric || 'select metric';
    this.target.source = this.target.source || 'select source';
    this.target.target = this.target.target || 'select target';
    this.target.legend = this.target.legend || 'select legend';
    this.target.type = this.target.type || 'timeserie';
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  getOptionsMetric(query) {
    query = query+'|'+this.target.source+'|'+this.target.target;
    return this.datasource.metricFindMetric(query || '');
  }

  getOptionsSource(query) {
    query = this.target.metric+'|'+query+'|'+this.target.target+"|"+this.target.legend;
    return this.datasource.metricFindMetric(query || '');
  }

  getOptionsTarget(query) {
    query = this.target.metric+'|'+this.target.source+'|'+query+"|"+this.target.legend;
    return this.datasource.metricFindTarget(query || '');
  }
  getOptionsLegend(query) {
    query = this.target.metric+'|'+this.target.source+'|'+this.target.target+'|'+query;
    return this.datasource.metricFindLegend(query || '');
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

GenericDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';
