'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDatasource = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var GenericDatasource = exports.GenericDatasource = function () {
  function GenericDatasource(instanceSettings, $q, backendSrv, templateSrv) {
    _classCallCheck(this, GenericDatasource);

    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.withCredentials = instanceSettings.withCredentials;
    this.headers = { 'Content-Type': 'application/json' };
    if (typeof instanceSettings.basicAuth === 'string' && instanceSettings.basicAuth.length > 0) {
      this.headers['Authorization'] = instanceSettings.basicAuth;
    }
  }

  _createClass(GenericDatasource, [{
    key: 'query',
    value: function query(options) {
      var query = this.buildQueryParameters(options);

      var qos = query.targets[0].target.split("|")[0];
      var source = query.targets[0].target.split("|")[1];
      var target = query.targets[0].target.split("|")[2];
      var legend = query.targets[0].target.split("|")[3];

      var timerangeFrom = new Date(0); // The 0 there is the key, which sets the date to the epoch
      timerangeFrom.setMilliseconds(query.range.from);
      var timerangeTo = new Date(0);
      timerangeTo.setMilliseconds(query.range.to);

      query.targets = query.targets.filter(function (t) {
        return !t.hide;
      });

      if (query.targets.length <= 0) {
        return this.q.when({ data: [] });
      }

      if (this.templateSrv.getAdhocFilters) {
        query.adhocFilters = this.templateSrv.getAdhocFilters(this.name);
      } else {
        query.adhocFilters = [];
      }

      if (target == "--alltarget--") {
        //if all target is selected. remove filter
        target = "";
      } else if (target == "[source]") {
        //if target name is the same like source
        target = source;
      }

      return this.doRequest({
        url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id=' + source + '&metric_type_lookup=by_metric_name&metricFilter=' + qos + '&target=' + target + '&period=' + timerangeFrom.toISOString() + '|' + timerangeTo.toISOString() + '&showSamples=true',
        data: query,
        method: 'GET'
      }).then(this.parseUIMResult);
    }
  }, {
    key: 'parseUIMResult',
    value: function parseUIMResult(result) {
      console.log("result: %o", result);
      var legend = result.config.data.targets[0].target.split("|")[3];
      var data = _lodash2.default.map(result.data, function (d, i) {
        if (d && d.text && d.value) {
          return { text: d.text, value: d.value };
        } else if (_lodash2.default.isObject(d)) {
          var timeAndValueList = _lodash2.default.map(d.sample, function (d2, j) {
            var timeAndValue = [d2.value, d2.epochtime * 1000];
            return timeAndValue;
          });
          if (legend == "source") {
            return { target: d.source, datapoints: timeAndValueList.reverse() };
          } else if (legend == "target") {
            return { target: d.target, datapoints: timeAndValueList.reverse() };
          } else {
            return { target: d.source + ' ' + d.target, datapoints: timeAndValueList.reverse() };
          }
        }
        return { text: d, value: d };
      });
      console.log("result: %o", { data: data });
      return { data: data };
    }
  }, {
    key: 'testDatasource',
    value: function testDatasource() {
      return this.doRequest({
        url: this.url + '/',
        method: 'GET'
      }).then(function (response) {
        if (response.status === 200) {
          return { status: "success", message: "Data source is working", title: "Success" };
        }
      });
    }
  }, {
    key: 'annotationQuery',
    value: function annotationQuery(options) {
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
      }).then(function (result) {
        return result.data;
      });
    }
  }, {
    key: 'metricFindQuery',
    value: function metricFindQuery(query) {
      var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
      };

      return this.doRequest({
        url: this.url + '/search',
        data: interpolated,
        method: 'POST'
      }).then(this.mapToTextValue);
    }
  }, {
    key: 'metricFindMetric',
    value: function metricFindMetric(query) {
      var source = query.split("|")[1];
      var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
      };

      return this.doRequest({
        url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id=' + source + '&period=latest&showSamples=false',
        data: interpolated,
        method: 'GET'
      }).then(this.parseMetricList);
    }
  }, {
    key: 'parseMetricList',
    value: function parseMetricList(result) {
      var qosList = _lodash2.default.map(result.data, function (d, i) {
        if (d && d.text && d.value) {
          return { text: d.text, value: d.value };
        } else if (_lodash2.default.isObject(d)) {
          return { text: d.for_configuration_item.qosName, value: d.for_configuration_item.qosName };
        }
        return { text: d, value: d };
      });
      return qosList.map(JSON.stringify).reverse().filter(function (e, i, a) {
        return a.indexOf(e, i + 1) === -1;
      }).reverse().map(JSON.parse);
    }
  }, {
    key: 'metricFindTarget',
    value: function metricFindTarget(query) {
      var source = query.split("|")[1];
      var qos = query.split("|")[0];
      var interpolated = {
        target: this.templateSrv.replace(query, null, 'regex')
      };

      return this.doRequest({
        url: this.url + '/uimapi/metrics?id_lookup=by_metric_source&id=' + source + '&metric_type_lookup=by_metric_name&metricFilter=' + qos + '&period=latest&showSamples=true',
        data: interpolated,
        method: 'GET'
      }).then(this.parseTargetList);
    }
  }, {
    key: 'parseTargetList',
    value: function parseTargetList(result) {

      var qosList = _lodash2.default.map(result.data, function (d, i) {
        if (d && d.text && d.value) {
          return { text: d.target, value: d.target };
        } else if (_lodash2.default.isObject(d)) {
          return { text: d.target, value: d.target };
        }
        return { text: d, value: d };
      });
      qosList.push({ text: "--alltarget--", value: "--alltarget--" });
      qosList.push({ text: "[source]", value: "[source]" });
      return qosList.map(JSON.stringify).reverse().filter(function (e, i, a) {
        return a.indexOf(e, i + 1) === -1;
      }).reverse().map(JSON.parse);
    }
  }, {
    key: 'metricFindLegend',
    value: function metricFindLegend(query) {
      var legendType = [{ text: "source", value: "source" }, { text: "target", value: "target" }, { text: "source+target", value: "source+target" }];
      return legendType;
    }
  }, {
    key: 'mapToTextValue',
    value: function mapToTextValue(result) {
      return _lodash2.default.map(result.data, function (d, i) {
        if (d && d.text && d.value) {
          return { text: d.text, value: d.value };
        } else if (_lodash2.default.isObject(d)) {
          return { text: d, value: i };
        }
        return { text: d, value: d };
      });
    }
  }, {
    key: 'doRequest',
    value: function doRequest(options) {
      options.withCredentials = this.withCredentials;
      options.headers = this.headers;

      return this.backendSrv.datasourceRequest(options);
    }
  }, {
    key: 'buildQueryParameters',
    value: function buildQueryParameters(options) {
      var _this = this;

      //remove placeholder targets
      options.targets = _lodash2.default.filter(options.targets, function (target) {
        return target.target !== 'select metric';
      });

      var targets = _lodash2.default.map(options.targets, function (target) {
        return {
          target: _this.templateSrv.replace(target.metric + "|" + target.source + "|" + target.target + "|" + target.legend, options.scopedVars, 'regex'),
          refId: target.refId,
          hide: target.hide,
          type: target.type || 'timeserie'
        };
      });

      options.targets = targets;

      return options;
    }
  }, {
    key: 'getTagKeys',
    value: function getTagKeys(options) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.doRequest({
          url: _this2.url + '/tag-keys',
          method: 'POST',
          data: options
        }).then(function (result) {
          return resolve(result.data);
        });
      });
    }
  }, {
    key: 'getTagValues',
    value: function getTagValues(options) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        _this3.doRequest({
          url: _this3.url + '/tag-values',
          method: 'POST',
          data: options
        }).then(function (result) {
          return resolve(result.data);
        });
      });
    }
  }]);

  return GenericDatasource;
}();
//# sourceMappingURL=datasource.js.map
