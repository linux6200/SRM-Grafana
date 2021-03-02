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

var arrayBaseFilter = 'source==\'VMAX-Collector\'';
var arrayFilter = arrayBaseFilter + '&!parttype';

const config = require('../config/config');

// define the home page route
// router.get('/', function (req, res) {
//     res.send('VMAX home page')
// })
router.get('/', function (req, res) {
    var hostname = req.query.device;
    var appid = req.query.appid;
    var result = {};

    res.json(200, result);

});


router.post('/search', function (req, res) {
    console.log("----------------- Search ----------------------");
    console.log(req.url);
    console.log(req.body);

    var target = req.body.target;

    switch (target) {
        case '':
            var filter = arrayFilter;
            var key = ['datagrp', 'name'];

            break;
        case 'device':
            var filter = arrayFilter;
            var key = ['device'];

            break;
    }

    console.log(filter);
    console.log(key.toString());

    unirest.get(config.Backend.URL + config.SRM_RESTAPI.METRICS_PROPERTIES_VALUE)
        .auth(config.Backend.USER, config.Backend.PASSWORD, true)
        .headers({
            'Content-Type': 'multipart/form-data'
        })
        .query({
            'fields': key,
            'filter': filter
        })
        .end(function (response) {

            if ( response.error ) {
                console.log(JSON.stringify(response.error));
                res.json(501,JSON.stringify(response.error));
            } else {
                var resultJson = JSON.parse(response.raw_body).values;
                var result = [];
    
                result.push('UsedCapacityPercent');
    
    
                for (var i in resultJson) {
                    var item = resultJson[i];
                    var itemValue = '';
    
                    for (var j in key) {
                        var fieldname = key[j];
                        itemValue += (itemValue === '') ? item[fieldname] : '+' + item[fieldname];
                    }
    
                    result.push(itemValue);
    
                }
                res.json(200, result.sort());
            }


        });



});

router.post('/query', function (req, res) {

    console.log(req.url);
    console.log(JSON.stringify(req.body));


    var start = req.body.range.from;
    var end = req.body.range.to;
    var targets = req.body.targets;
    var scopedVars = req.body.scopedVars;
    var scopedFilter;
    for (var fieldname in scopedVars) {
        if (fieldname.substring(0, 2) == '__') continue;
        var temp = fieldname + '==\'' + scopedVars[fieldname].value + '\'';
        var scopedFilter = (scopedFilter === undefined) ? temp : scopedFilter + '&' + temp;
    }

    /*
      timeserie
    */

    for (var i in targets) {
        var target = targets[i];

    }
    if (target.type == 'timeseries') {

        var targetName = target.target;
        var datagrp = targetName.split('+')[0];
        var metric = targetName.split('+')[1];

        if (target.data !== null && target.data != '') {
            var fields = target.data.fields;
            var fieldKey = target.data.key
        }
        else {
            var fields = 'device,name';
            var fieldKey = 'device';
        }





        // 
        // combine the filter string
        //
        var filter = config.SRM_RESTAPI.BASE_FILTER + arrayBaseFilter
        switch (targetName) {
            case 'UsedCapacityPercent':
                filter += '&!parttype' +
                    '&(name==\'ConfiguredUsableCapacity\'|name==\'LogicalUsedCapacity\')' +
                    ((scopedFilter === undefined) ? '' : '&' + scopedFilter);

                break;
            default:
                filter = filter + '&datagrp==\'' + datagrp + '\'' +
                    '&name==\'' + metric + '\'' +
                    ((scopedFilter === undefined) ? '' : '&' + scopedFilter);
                break;
        }


        var queryString = {};
        queryString['properties'] = fields;
        queryString['filter'] = filter;


        queryString['start'] = start;
        queryString['end'] = end;
        //queryString['period'] = param.period;
        //queryString['type'] = valuetype;

        console.log(JSON.stringify(queryString));
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
                        if (item.properties === undefined) continue;
                        if (item.points.length == 0) continue;

                        var recordItem = {};
                        recordItem["target"] = item.properties[fieldKey];

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

    } else {
        /*
          table
        */

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
    }];

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