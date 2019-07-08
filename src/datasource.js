import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = {'Content-Type': 'application/json'};
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  query(options) {
    var query = this.buildQueryParameters(options);

    var qos = query.targets[0].target.split("|")[0]
    var source = query.targets[0].target.split("|")[1]
    var target = query.targets[0].target.split("|")[2]
    var legend = query.targets[0].target.split("|")[3]

    var timerangeFrom = new Date(0); // The 0 there is the key, which sets the date to the epoch
    timerangeFrom.setMilliseconds(query.range.from);
    var timerangeTo = new Date(0);
    timerangeTo.setMilliseconds(query.range.to);


    query.targets = query.targets.filter(t => !t.hide);

    if (query.targets.length <= 0) {
      return this.q.when({data: []});
    }

    if (this.templateSrv.getAdhocFilters) {
      query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
    } else {
      query.adhocFilters = [];
    }

    if (target=="--alltarget--") {
      //if all target is selected. remove filter
      target=""
    }else if (target=="[source]") {
      //if target name is the same like source
      target=source
    }

    return this.doRequest({
      url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id='+source+'&metric_type_lookup=by_metric_name&metricFilter='+qos+'&target='+target+'&period='+timerangeFrom.toISOString()+'|'+timerangeTo.toISOString()+'&showSamples=true',
      data: query,
      method: 'GET'
    }).then(this.parseUIMResult);
  }

  parseUIMResult(result) {
    console.log("result: %o", result)
    var legend = result.config.data.targets[0].target.split("|")[3]
    var data =  _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        var timeAndValueList =  _.map(d.sample, (d2, j) => {
          var timeAndValue = [d2.value,d2.epochtime*1000]
          return timeAndValue
        })
        if (legend=="source") {
          return { target: d.source, datapoints: timeAndValueList.reverse() };
        }else if (legend=="target") {
          return { target: d.target, datapoints: timeAndValueList.reverse() };
        }else {
          return { target: d.source+' '+d.target, datapoints: timeAndValueList.reverse() };
        }

      }
      return { text: d, value: d };
    });
    console.log("result: %o", {data: data})
    return {data: data}
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    });
  }

  annotationQuery(options) {
    var query = this.templateSrv.replace(options.annotation.query, {}, 'glob');
    var annotationQuery = {
      range: options.range,
      annotation: {
        name: options.annotation.name,
        datasource: options.annotation.datasource,
        enable: options.annotation.enable,
        iconColor: options.annotation.iconColor,
        query: query
      },
      rangeRaw: options.rangeRaw
    };

    return this.doRequest({
      url: this.url + '/annotations',
      method: 'POST',
      data: annotationQuery
    }).then(result => {
      return result.data;
    });
  }

  metricFindQuery(query) {
    var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
    };

    return this.doRequest({
      url: this.url + '/search',
      data: interpolated,
      method: 'POST',
    }).then(this.mapToTextValue);
  }

  metricFindMetric(query) {
    var source = query.split("|")[1]
    var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
    };

    return this.doRequest({
      url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id='+source+'&period=latest&showSamples=false',
      data: interpolated,
      method: 'GET',
    }).then(this.parseMetricList);
  }

  parseMetricList(result) {
    var qosList = _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d.for_configuration_item.qosName, value: d.for_configuration_item.qosName};
      }
      return { text: d, value: d };
    });
    return qosList.map(JSON.stringify).reverse().filter(function (e, i, a) {
                return a.indexOf(e, i+1) === -1;
            }).reverse().map(JSON.parse)

  }

  metricFindTarget(query) {
    var source = query.split("|")[1]
    var qos = query.split("|")[0]
    var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
    };

    return this.doRequest({
      url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id='+source+'&metric_type_lookup=by_metric_name&metricFilter='+qos+'&period=latest&showSamples=true',
      data: interpolated,
      method: 'GET',
    }).then(this.parseTargetList);
  }

  parseTargetList(result) {

    var qosList = _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.target, value: d.target };
      } else if (_.isObject(d)) {
        return { text: d.target, value: d.target};
      }
      return { text: d, value: d };
    });
    qosList.push({text: "--alltarget--", value: "--alltarget--"})
    qosList.push({text: "[source]", value: "[source]"})
    return qosList.map(JSON.stringify).reverse().filter(function (e, i, a) {
                return a.indexOf(e, i+1) === -1;
            }).reverse().map(JSON.parse)

  }

  metricFindLegend(query) {
    var legendType = [
       {text: "source", value: "source"},
       {text: "target", value: "target"},
       {text: "source+target", value: "source+target"},
    ];
    return legendType
  }

  mapToTextValue(result) {
    return _.map(result.data, (d, i) => {
      if (d && d.text && d.value) {
        return { text: d.text, value: d.value };
      } else if (_.isObject(d)) {
        return { text: d, value: i};
      }
      return { text: d, value: d };
    });
  }

  doRequest(options) {
    options.withCredentials = this.withCredentials;
    options.headers = this.headers;

    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    //remove placeholder targets
    options.targets = _.filter(options.targets, target => {
      return target.target !== 'select metric';
    });

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.metric+"|"+target.source+"|"+target.target+"|"+target.legend, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }

  getTagKeys(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-keys',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

  getTagValues(options) {
    return new Promise((resolve, reject) => {
      this.doRequest({
        url: this.url + '/tag-values',
        method: 'POST',
        data: options
      }).then(result => {
        return resolve(result.data);
      });
    });
  }

}
