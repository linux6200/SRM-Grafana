var express = require('express')
var router = express.Router()
var unirest = require('unirest');

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    console.log('Time: ', Date.now())


    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin,User-Agent,DNT,Cache-Control,X-Mx-ReqToken,Keep-Alive,X-Requested-With,If-Modified-Since");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header('Access-Control-Expose-Headers', '*');

    console.log('req.method = %s', req.method);
    console.log('req.url = %s', req.url);

    if (req.method == "OPTIONS") res.send(200); /*让options请求快速返回*/
    else next();
})
const config = require('../config/config');
var arrayBaseFilter = 'source==\'VPLEX-Collector\'';
var arrayFilter = arrayBaseFilter + '&!parttype';

router.get('/', function (req, res) {
    var hostname = req.query.device;
    var appid = req.query.appid;
    var result = {};

    res.json(200, result);

});


router.post('/search', function (req, res) {
    /*
            var device1;
            VMAX.GetArrays( device1, function( ret) {  
                var result = [];
                for ( var i in ret ) {
                    result.push(ret[i].device);
                } 
                console.log(result);
                res.json(200 , result);
            });  
    */
    console.log("----------------- Search ----------------------");
    console.log(req.url);
    console.log(req.body);

    var fields = req.body.target;
    var filter;

    switch (fields) {
        case '':
        case 'name':
            fields = 'datagrp,parttype,name';
            filter = arrayBaseFilter;

            console.log("Number-1");
            console.log("fields=" + fields);
            console.log("filter=" + filter);

            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query({
                    'fields': fields,
                    'filter': filter
                })
                .end(function (response) {

                    var resultJson = JSON.parse(response.raw_body).values;
                    var result = []; 
                    for (var i in resultJson) {
                        var item = resultJson[i];
                        result.push(item.parttype + '+' + item.datagrp + '+' + item.name);
                    }


                    res.json(200, result.sort()); 

                });

            break;
        case 'sgname':
            filter = arrayBaseFilter;
            var device1;
            console.log("Number-2");

            VMAX.GetStorageGroups(device1, function (response) {
                var result = [];

                for (var i in response) {
                    var item = response[i];
                    var resultItem = item.device + '+' + item.sgname;
                    result.push(resultItem);
                }
                res.json(200, result.sort());
            });

            break;
        default:
            filter = arrayFilter;
            var fabricResult = [];
            console.log(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE + '/' + fields);
            console.log("Number-3");
            console.log(fields);
            console.log(filter);
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE + '/' + fields)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query({
                    'fields': fields,
                    'filter': filter
                })
                .end(function (response) {

                    var resultJson = JSON.parse(response.raw_body).values;
                    var result = [];
                    for (var i in resultJson) {
                        result.push(resultJson[i]);
                    }
                    console.log(result);
                    res.json(200, result);

                });

            break;
    }


});

/* Request.body 
{
  "panelId": 1,
  "range": {
    "from": "2016-10-31T06:33:44.866Z",
    "to": "2016-10-31T12:33:44.866Z",
    "raw": {
      "from": "now-6h",
      "to": "now"
    }
  },
  "rangeRaw": {
    "from": "now-6h",
    "to": "now"
  },
  "interval": "30s",
  "intervalMs": 30000,
  "maxDataPoints": 550,
  "targets": [
     { "target": "upper_50", "refId": "A", "type": "timeseries", "data": { "additional": "optional json" } },
     { "target": "upper_75", "refId": "B", "type": "timeseries" }
  ],
  "adhocFilters": [{
    "key": "City",
    "operator": "=",
    "value": "Berlin"
  }]
}

   --------------- type="timeseries" response body ---------------------
   [
  {
    "target":"upper_75", // The field being queried for
    "datapoints":[
      [622,1450754160000],  // Metric value as a float , unixtimestamp in milliseconds
      [365,1450754220000]
    ]
  },
  {
    "target":"upper_90",
    "datapoints":[
      [861,1450754160000],
      [767,1450754220000]
    ]
  }
]
   --------------- type="table" response body ---------------------
[
  {
    "columns":[
      {"text":"Time","type":"time"},
      {"text":"Country","type":"string"},
      {"text":"Number","type":"number"}
    ],
    "rows":[
      [1234567,"SE",123],
      [1234567,"DE",231],
      [1234567,"US",321]
    ],
    "type":"table"
  }
]
*/
router.post('/query', function (req, res) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    console.log(req.url);
    console.log(req.body);



    var period = 0;
    var valuetype = 'average';
    var start = req.body.range.from;
    var end = req.body.range.to;
    var targets = req.body.targets;
    var scopedVars = req.body.scopedVars;
    var part;
    if (scopedVars.device !== undefined)
        var device = scopedVars.device.value;
    else
        var device;

    /*
      adhocFilters
    */
    var adhocFilters = req.body.adhocFilters;
    for (var i in adhocFilters) {
        var adhocItem = adhocFilters[i];
        switch (adhocItem.key) {
            case 'periods':
                period = adhocItem.value;
                break;
            case 'datatypes':
                valuetype = adhocItem.value;
                break;

            case 'device':
                device = adhocItem.value;
                break;

            case 'sgname':
                device = adhocItem.value.split('+')[0];
                var part_value = adhocItem.value.split('+')[1];
                var part_name = 'sgname';
                break;

        }
    }

    /*
      parse targets
    */

    var parttype = [];
    var datagrp = [];
    var matrics = [];

    var filter2;
    for (var i in targets) {

        var filterItem;
        var target = targets[i];
        fieldlist = target.target.split('+');
        parttype = fieldlist[0];
        datagrp = fieldlist[1];
        matrics = fieldlist[2];


        if (parttype !== undefined) {
            switch (parttype) {
                case 'Port':
                    var partkey = 'feport';
                    break;
                default:
                    var partkey = 'part';
                    var partvalue = part_value;
                    break;
            }
            filterItem = 'parttype==\'' + parttype + '\'';
        }

        if (datagrp !== undefined) {
            if (filterItem !== undefined) filterItem += '&';
            filterItem += 'datagrp==\'' + datagrp + '\'';
        }


        if (filterItem !== undefined) filterItem += '&';
        filterItem += 'name==\'' + matrics + '\'';

        if (partkey == 'part' && partvalue !== undefined) filterItem += '&part==\'' + partvalue + '\'';

        var filter1 = '(' + filterItem + ')';
        if (filter2 === undefined) filter2 = filter1;
        else filter2 += '|' + filter1;
    }
    filter2 = '(' + filter2 + ')';
    /*
      timeserie
    */
    if (targets[0].type == 'timeseries') {
        var param = {};
        param['keys'] = ['device'];
        param['fields'] = ['device', 'name'];
        if (partkey !== undefined) {
            param.fields.push(partkey);
        }
        param['period'] = period;
        param['start'] = start;
        param['end'] = end;
        param['type'] = valuetype;

        var filter = arrayBaseFilter;
        if (device !== undefined) filter += '&device=\'' + device + '\'';

        param['filter'] = filter + '&' + filter2;

        //param['filter_name'] = '(name==\'IORate\'|name==\'HitPercent\'|name==\'ReadRequests\'|name==\'WriteRequests\'|name==\'ReadThroughput\'|name==\'WriteThroughput\')';

        var queryString = {};
        queryString['properties'] = param.fields;

        var filter = config.SRM_RESTAPI.BASE_FILTER + param.filter;
        queryString['filter'] = param.filter;


        queryString['start'] = param.start;
        queryString['end'] = param.end;
        queryString['period'] = param.period;
        queryString['type'] = param.type;


        console.log(queryString);
        unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_SERIES_VALUE)
            .auth(config.Backend.USER, config.Backend.PASSWORD, true)
            .headers({
                'Content-Type': 'multipart/form-data'
            })
            .query(queryString)
            .end(function (response) {
                if (response.error) {
                    logger.error(response.error);
                    return response.error;
                } else {
                    //console.log(response.raw_body);   
                    var resultRecord = JSON.parse(response.raw_body);

                    var finalRecord = [];


                    for (var i in resultRecord.values) {
                        var item = resultRecord.values[i];

                        var recordItem = {};
                        if (targets.length > 1)
                            recordItem["target"] = item.properties['name'];
                        else {
                            recordItem["target"] = item.properties['device'] + ':' + item.properties[partkey];
                        }


                        var newPoint = [];
                        for (var j in item.points) {
                            var pointItem = item.points[j];

                            var newPointItem = [];
                            newPointItem.push(parseFloat(pointItem[1]));
                            newPointItem.push(parseFloat(pointItem[0]) * 1000);
                            newPoint.push(newPointItem);
                        }
                        recordItem["datapoints"] = newPoint;

                        finalRecord.push(recordItem);

                    }
                    console.log("resultRecord=" + finalRecord.length);
                    res.json(200, finalRecord);
                }

            });

    } else
    /*
      table
    */ {
        VMAX.GetArrays(device, function (ret) {

            var resultItem = {
                "columns": [],
                "rows": [],
                "type": "table"
            };

            for (var i in ret) {
                var item = ret[i];
                var row = [];
                for (var fieldname in item) {
                    if (i == 0) {
                        var column = {};
                        column["text"] = fieldname;
                        column["type"] = "string";
                        resultItem.columns.push(column);
                    }

                    row.push(item[fieldname]);
                }

                resultItem.rows.push(row);

            }

            var result = [];
            result.push(resultItem);
            res.json(200, result);

        });


    }


});

router.post('/annotations', function (req, res) {

    console.log(req.body);

    var annotation = req.body;

    var annotations = [{
        annotation: annotation,
        "title": "Donlad trump is kinda funny",
        "time": 1539655200000,
        text: "teeext",
        tags: "taaags"
    }
    ];

    res.json(annotations);
    res.end();
});


router.post('/tag-keys', function (req, res) {
    var keys = [{
        type: "string",
        text: "device"
    },
    {
        type: "string",
        text: "sgname"
    },
    {
        type: "string",
        text: "periods"
    },
    {
        type: "string",
        text: "datatypes"
    }
    ];

    res.json(keys);
    res.end();
});


router.post('/tag-values', function (req, res) {

    console.log(req.body);
    switch (req.body.key) {
        case 'device':
            var fields = 'name';
            var filter = arrayFilter;

            var fabricResult = [];
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE + '/' + req.body.key)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query({
                    'fields': fields,
                    'filter': filter
                })
                .end(function (response) {

                    var resultJson = JSON.parse(response.raw_body).values;
                    var result = [];
                    for (var i in resultJson) {
                        var item = {};
                        item["text"] = resultJson[i];
                        result.push(item);
                    }


                    res.json(result);
                    res.end();
                });

            break;
        case 'periods':
        case 'datatypes':
            var fabricResult = [];
            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_AGGREGATES)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .end(function (response) {
                    var result = [];
                    if (req.body.key == 'periods') {
                        var resultJson = JSON.parse(response.raw_body).periods;
                    } else {
                        var resultJson = JSON.parse(response.raw_body).types;
                    }
                    for (var i in resultJson) {
                        var item = {};
                        item["text"] = resultJson[i];
                        result.push(item);
                    }
                    res.json(result);
                    res.end();
                });

            break;

        case 'sgname':

            fields = 'device,part';
            filter = arrayBaseFilter + '&datagrp==\'VMAX-StorageGroup\'';

            console.log(filter);

            unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
                .auth(config.Backend.USER, config.Backend.PASSWORD, true)
                .headers({
                    'Content-Type': 'multipart/form-data'
                })
                .query({
                    'fields': fields,
                    'filter': filter
                })
                .end(function (response) {

                    var resultJson = JSON.parse(response.raw_body).values;
                    var result = [];
                    for (var i in resultJson) {
                        var item = resultJson[i];
                        var resultItem = item.device + '+' + item.part;
                        item["text"] = resultItem;
                        result.push(item);
                    }

                    res.json(result.sort());
                    res.end();

                });



            break;
    }




});









module.exports = router