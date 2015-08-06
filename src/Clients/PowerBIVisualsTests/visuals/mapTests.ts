﻿/*
 *  Power BI Visualizations
 *
 *  Copyright (c) Microsoft Corporation
 *  All rights reserved. 
 *  MIT License
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the ""Software""), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *   
 *  The above copyright notice and this permission notice shall be included in 
 *  all copies or substantial portions of the Software.
 *   
 *  THE SOFTWARE IS PROVIDED *AS IS*, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

module powerbitests {
    import DataViewTransform = powerbi.data.DataViewTransform;
    import Map = powerbi.visuals.Map;
    import DataLabelUtils = powerbi.visuals.dataLabelUtils;
    import MapSeriesInfo = powerbi.visuals.MapSeriesInfo;
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;
    import SQExprShortSerializer = powerbi.data.SQExprShortSerializer;
    import LegendPosition = powerbi.visuals.LegendPosition;
    import ILegend = powerbi.visuals.ILegend;

    powerbitests.mocks.setLocale();

    describe("Map",() => {
        var element: JQuery;
        var mockGeotaggingAnalyzerService;

        beforeEach(() => {
            mockGeotaggingAnalyzerService = powerbi.createGeoTaggingAnalyzerService((stringId: string) => mocks.getLocalizedString(stringId));
            element = powerbitests.helpers.testDom('800', '500');
        });

        it('Map registered capabilities',() => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin('map').capabilities).toBe(powerbi.visuals.mapCapabilities);
        });

        it('Capabilities should include dataViewMappings',() => {
            expect(powerbi.visuals.mapCapabilities.dataViewMappings).toBeDefined();
        });

        it('Capabilities should include dataRoles',() => {
            expect(powerbi.visuals.mapCapabilities.dataRoles).toBeDefined();
        });

        it('Capabilities should not suppressDefaultTitle',() => {
            expect(powerbi.visuals.mapCapabilities.suppressDefaultTitle).toBeUndefined();
        });

        it('Capabilities DataRole preferredTypes',() => {
            //Map's Category, X and Y fieldWells have preferences for geographic locations, longitude and latitude respectively
            expect(powerbi.visuals.mapCapabilities.dataRoles.map(r => !!r.preferredTypes)).toEqual([
                true,
                false,
                true,
                true,
                false,
                false,
            ]);

            expect(powerbi.visuals.mapCapabilities.dataRoles[0].preferredTypes.map(ValueType.fromDescriptor)).toEqual([
                ValueType.fromExtendedType(powerbi.ExtendedType.Address),
                ValueType.fromExtendedType(powerbi.ExtendedType.City),
                ValueType.fromExtendedType(powerbi.ExtendedType.Continent),
                ValueType.fromExtendedType(powerbi.ExtendedType.Country),
                ValueType.fromExtendedType(powerbi.ExtendedType.County),
                ValueType.fromExtendedType(powerbi.ExtendedType.Place),
                ValueType.fromExtendedType(powerbi.ExtendedType.PostalCode_Text),
                ValueType.fromExtendedType(powerbi.ExtendedType.Region),
                ValueType.fromExtendedType(powerbi.ExtendedType.StateOrProvince)
            ]);

            expect(powerbi.visuals.mapCapabilities.dataRoles[2].preferredTypes.map(ValueType.fromDescriptor)).toEqual([
                ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double, "Longitude")
            ]);

            expect(powerbi.visuals.mapCapabilities.dataRoles[3].preferredTypes.map(ValueType.fromDescriptor)).toEqual([
                ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double, "Latitude")
            ]);
        });

        it('FormatString property should match calculated',() => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(powerbi.visuals.mapCapabilities.objects)).toEqual(powerbi.visuals.mapProps.general.formatString);
        });

        it('Map.getMeasureIndexOfRole',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true, roles: { "Size": true } },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, roles: { "X": true } }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 800
                    }, {
                            source: dataViewMetadata.columns[2],
                            values: [1, 2, 3],
                            subtotal: 6
                        }])
                }
            };
            var grouped = dataView.categorical.values.grouped();

            var result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "InvalidRoleName");
            expect(result).toBe(-1);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "Size");
            expect(result).toBe(0);

            result = powerbi.visuals.DataRoleHelper.getMeasureIndexOfRole(grouped, "X");
            expect(result).toBe(1);
        });

        it('Map.calculateGroupSizes',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 1000
                    }])
                }
            };
            var grouped = dataView.categorical.values.grouped();

            var groupSizeTotals = [];
            var range = null;
            var sizeIndex = 0;
            var result = Map.calculateGroupSizes(dataView.categorical, grouped, groupSizeTotals, sizeIndex, range);
            expect(result.min).toBe(-100);
            expect(result.max).toBe(700);
            expect(groupSizeTotals.length).toBe(3);
            expect(groupSizeTotals[0]).toBe(-100);
            expect(groupSizeTotals[1]).toBe(200);
            expect(groupSizeTotals[2]).toBe(700);

            groupSizeTotals = [];
            sizeIndex = -1;
            result = Map.calculateGroupSizes(dataView.categorical, grouped, groupSizeTotals, sizeIndex, range);
            expect(result).toBe(null);
            expect(groupSizeTotals.length).toBe(3);
            expect(groupSizeTotals[0]).toBe(null);
            expect(groupSizeTotals[1]).toBe(null);
            expect(groupSizeTotals[2]).toBe(null);
        });

        it('Map.createMapDataPoint',() => {
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var group = "Arizona";
            var value = 100;
            var mapSeriesInfo: MapSeriesInfo = {
                sizeValuesForGroup: [{
                    value: 100,
                    index: 0,
                    fill: "#112233",
                    stroke: "#223344",
                    seriesId: mocks.dataViewScopeIdentity("Sales"),
                }],
                latitude: null,
                longitude: null,

            };
            var radius = 3;

            // No seriesInfo means the result is null
            var result = Map.createMapDataPoint(group, value, null, radius, colors, null);
            expect(result).toBe(null);

            result = Map.createMapDataPoint(group, value, mapSeriesInfo, radius, colors, mocks.dataViewScopeIdentity("Arizona"));
            expect(result.seriesInfo).toBe(mapSeriesInfo);
            expect(result.radius).toBe(radius);
            expect(result.location).toBe(null);
            expect(result.cachedLocation).toBe(result.location);
            expect(result.geocodingQuery).toBe(group);
            expect(result.categoryValue).toBe(group);

            // No group, latitude, or longitude shouldn't render
            group = null;
            result = Map.createMapDataPoint(group, value, mapSeriesInfo, radius, colors, null);
            expect(result).toBe(null);

        });

        it('Map.calculateSeriesInfo',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 800
                    }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var result = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), groupIndex, sizeIndex, latIndex, longIndex, colors);
            expect(result.sizeValuesForGroup.length).toBe(1);
            expect(result.sizeValuesForGroup[0].value).toBe(-100);
            expect(result.sizeValuesForGroup[0].index).toBe(0);
            expect(result.latitude).toBe(null);
            expect(result.longitude).toBe(null);
        });

        function getDataViewMultiSeries(firstGroupName: string = 'Canada', secondGroupName: string = 'United States'): powerbi.DataView {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: '',
                        format: '0',
                    }, {
                        displayName: '',
                    }, {
                        displayName: '',
                        format: '#,0.00',
                        isMeasure: true,
                        groupName: firstGroupName,
                    }, {
                        displayName: '',
                        format: '#,0',
                        isMeasure: true,
                        groupName: firstGroupName,
                    }, {
                        displayName: '',
                        format: '#,0.00',
                        isMeasure: true,
                        groupName: secondGroupName,
                    }, {
                        displayName: '',
                        format: '#,0',
                        isMeasure: true,
                        groupName: secondGroupName,
                    }, {
                        displayName: '',
                        format: '#,0.00',
                        isMeasure: true,
                    }, {
                        displayName: '',
                        format: '#,0',
                        isMeasure: true,
                    }
                ]
            };

            var colP1Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 't', column: 'p1' });
            var colP2Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 't', column: 'p2' });

            var seriesValues = [null, firstGroupName, secondGroupName];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));

            var dataViewValueColumns: powerbi.DataViewValueColumn[] = [
                {
                    source: dataViewMetadata.columns[2],
                    values: [150, 177, 157],
                    identity: seriesIdentities[1],
                }, {
                    source: dataViewMetadata.columns[3],
                    values: [30, 25, 28],
                    identity: seriesIdentities[1],
                }, {
                    source: dataViewMetadata.columns[4],
                    values: [100, 149, 144],
                    identity: seriesIdentities[2],
                }, {
                    source: dataViewMetadata.columns[5],
                    values: [300, 250, 280],
                    identity: seriesIdentities[2],
                }
            ];

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: [2012, 2011, 2010],
                        identity: [seriesIdentities[0]],
                        identityFields: [
                            colP1Ref
                        ]
                    }],
                    values: DataViewTransform.createValueColumns(dataViewValueColumns, [colP2Ref])
                },
            };

            dataView.categorical.values.source = dataViewMetadata.columns[1];

            return dataView;
        }

        it('Map.calculateSeriesInfo multi-series',() => {
            var dataView: powerbi.DataView = getDataViewMultiSeries();

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var categoryColumnRef = dataView.categorical.values.identityFields;
            var result = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), groupIndex, sizeIndex, longIndex, latIndex, colors, undefined, undefined, categoryColumnRef);
            expect(result.sizeValuesForGroup.length).toBe(2);
            expect(result.sizeValuesForGroup[0].value).toBe(150);
            expect(result.sizeValuesForGroup[0].index).toBe(0);
            expect(result.sizeValuesForGroup[0].fill).not.toBeNull();
            expect(result.sizeValuesForGroup[0].stroke).not.toBeNull();

            expect(result.sizeValuesForGroup[1].value).toBe(100);
            expect(result.sizeValuesForGroup[1].index).toBe(1);
            expect(result.sizeValuesForGroup[1].fill).not.toBeNull();
            expect(result.sizeValuesForGroup[1].stroke).not.toBeNull();

            expect(result.sizeValuesForGroup[1].fill).not.toBe(result.sizeValuesForGroup[0].fill);

            expect(result.latitude).toBe(null);
            expect(result.longitude).toBe(null);
        });

        it('Map.calculateSeriesInfo with lat long and no size', () => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [46.87, 37.81, 34.68],
                        subtotal: 72.49
                    }, {
                        source: dataViewMetadata.columns[2],
                        values: [-114, -122.46, -111.76],
                        subtotal: -348.22
                    }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = -1;
            var latIndex = 0;
            var longIndex = 1;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var result = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), groupIndex, sizeIndex, longIndex, latIndex, colors);
            expect(result.sizeValuesForGroup.length).toBe(1);
            expect(result.sizeValuesForGroup[0].value).toBe(null);
            expect(result.sizeValuesForGroup[0].index).toBe(0);
            expect(result.latitude).toBe(46.87);
            expect(result.longitude).toBe(-114);
        });

        it('Map.calculateSeriesLegend colors from palette with dynamic series',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2' },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, groupName: 'a' },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, groupName: 'b' },
                ]
            };
            var col3Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'col3' });
            var seriesIdentities = [
                mocks.dataViewScopeIdentityWithEquality(col3Ref, 'a'),
                mocks.dataViewScopeIdentityWithEquality(col3Ref, 'b')
            ];
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona'],
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[2],
                        values: [-100, 200, 700],
                        identity: seriesIdentities[0],
                    }, {
                            source: dataViewMetadata.columns[3],
                            values: [200, 400, 500],
                            identity: seriesIdentities[1],
                        }],
                        [col3Ref])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;

            var series1Color = colors.getColorScaleByKey(SQExprShortSerializer.serialize(col3Ref)).getColor('a');
            var series2Color = colors.getColorScaleByKey(SQExprShortSerializer.serialize(col3Ref)).getColor('b');

            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors, undefined, [col3Ref]);

            expect(result.length).toBe(2);
            expect(result[0].color).toBe(series1Color.value);
            expect(result[1].color).toBe(series2Color.value);
        });

        it('Map.calculateSeriesLegend colors from palette with static series',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true },
                ]
            };
            var col1Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'col1' });
            var seriesIdentities = [
                mocks.dataViewScopeIdentity('col2'),
                mocks.dataViewScopeIdentity('col3'),
            ];
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona'],
                        identityFields: [col1Ref],
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        identity: seriesIdentities[0],
                    }, {
                            source: dataViewMetadata.columns[2],
                            values: [200, 400, 500],
                            identity: seriesIdentities[1],
                        }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;

            var series1Color = colors.getColorScaleByKey(SQExprShortSerializer.serialize(col1Ref)).getColor('col2').value;
            var series2Color = colors.getColorScaleByKey(SQExprShortSerializer.serialize(col1Ref)).getColor('col3').value;

            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors, undefined, [col1Ref]);

            expect(result.length).toBe(2);
            expect(result[0].color).toBe(series1Color);
            expect(result[1].color).toBe(series2Color);
        });

        // TODO: verify this works when 4906998 is fixed
        //it('Map.calculateSeriesInfo same field category & series',() => {
        //    var dataViewMetadata: powerbi.DataViewMetadata = {
        //        columns: [
        //            { displayName: 'col1', roles: { 'Category': true, 'Series': true } },
        //            { displayName: 'col2', isMeasure: true, queryName: 'selectCol2' },
        //            { displayName: 'lat', isMeasure: true, queryName: 'selectLat' },
        //            { displayName: 'long', isMeasure: true, queryName: 'selectLong' },
        //        ]
        //    };
        //    var dataView: powerbi.DataView = powerbi.data.DataViewSelfCrossJoin.apply({
        //        metadata: dataViewMetadata,
        //        categorical: {
        //            categories: [{
        //                source: dataViewMetadata.columns[0],
        //                values: ['Montana', 'California', 'Arizona'],
        //                identity: [mocks.dataViewScopeIdentity('M'), mocks.dataViewScopeIdentity('C'), mocks.dataViewScopeIdentity('A')]
        //            }],
        //            values: DataViewTransform.createValueColumns([
        //                {
        //                    source: dataViewMetadata.columns[1],
        //                    values: [-100, 200, 700],
        //                }, {
        //                    source: dataViewMetadata.columns[2],
        //                    values: [49, 54, 101],
        //                }, {
        //                    source: dataViewMetadata.columns[3],
        //                    values: [0, 40, 20],
        //                }
        //            ])
        //        }
        //    });
        //    var groupedValues = dataView.categorical.values.grouped();

        //    var sizeIndex = 0;
        //    var latIndex = 1;
        //    var longIndex = 2;
        //    var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
        //    var result0 = Map.calculateSeriesInfo(groupedValues, 0, sizeIndex, longIndex, latIndex, colors);
        //    expect(result0.sizeValuesForGroup.length).toBe(1);
        //    expect(result0.sizeValuesForGroup[0].value).toBe(-100);
        //    expect(result0.sizeValuesForGroup[0].index).toBe(0);
        //    expect(result0.sizeValuesForGroup[0].fill).not.toBeNull();
        //    expect(result0.sizeValuesForGroup[0].stroke).not.toBeNull();
        //    expect(result0.latitude).toBe(49);
        //    expect(result0.longitude).toBe(0);

        //    var result1 = Map.calculateSeriesInfo(groupedValues, 1, sizeIndex, longIndex, latIndex, colors);
        //    expect(result1.sizeValuesForGroup.length).toBe(1);
        //    expect(result1.latitude).toBe(54);
        //    expect(result1.longitude).toBe(40);

        //    var result2 = Map.calculateSeriesInfo(groupedValues, 2, sizeIndex, longIndex, latIndex, colors);
        //    expect(result2.sizeValuesForGroup.length).toBe(1);
        //    expect(result2.latitude).toBe(101);
        //    expect(result2.longitude).toBe(20);

        //    expect(result0.sizeValuesForGroup[0].fill).not.toBe(result1.sizeValuesForGroup[0].fill);
        //    expect(result1.sizeValuesForGroup[0].fill).not.toBe(result2.sizeValuesForGroup[0].fill);
        //    expect(result0.sizeValuesForGroup[0].fill).not.toBe(result2.sizeValuesForGroup[0].fill);
        //});

        it('Map.calculateSeriesLegend',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona'],
                        objects: [
                            { dataPoint: { fill: { solid: { color: "#FF0000" } } } },
                            { dataPoint: { fill: { solid: { color: "#00FF00" } } } },
                            { dataPoint: { fill: { solid: { color: "#0000FF" } } } }
                        ]
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 800
                    }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors);
            expect(result.length).toBe(1);
        });

        it('Map.calculateSeriesLegend default color',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 800
                    }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var hexDefaultColorRed = "#FF0000";
            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors, hexDefaultColorRed);
            expect(result.length).toBe(1);
            expect(result[0].color).toBe(hexDefaultColorRed);
        });

        it('Map.calculateSeriesLegend multi-series',() => {
            var dataView: powerbi.DataView = getDataViewMultiSeries();

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors);
            expect(result.length).toBe(2);
        });

        it('Map.calculateSeriesLegend null legend',() => {
            var dataView: powerbi.DataView = getDataViewMultiSeries(null);

            var groupIndex: number = 0,
                sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var result = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors);
            expect(result[0].label).toBe(powerbi.visuals.valueFormatter.format(null));
        });

        it('Map.calculateRadius',() => {
            var range: powerbi.visuals.SimpleRange = { min: -100, max: 100 };

            // Null should be the minimum size
            var diff = 0;
            var result = Map.calculateRadius(range, 0, null);
            expect(result).toBe(6);

            // Min
            diff = range.max - range.min;
            result = Map.calculateRadius(range, diff, -100);
            expect(result).toBe(6);

            // Middle of zero
            result = Map.calculateRadius(range, diff, 0);
            expect(result).toBe(14 / 2 + 6);

            // Max
            result = Map.calculateRadius(range, diff, 100);
            expect(result).toBe(20);

            // No scale (div by zero or no range scenario
            result = Map.calculateRadius({ min: 100, max: 100 }, 0, 100);
            expect(result).toBe(6);
        });

        it('Map.getGeocodingCategory',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', roles: { "StateOrProvince": true } },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true, roles: { "Size": true } }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 1000
                    }])
                }
            };
            var result = Map.getGeocodingCategory(dataView.categorical, mockGeotaggingAnalyzerService);
            expect(result).toBe("StateOrProvince");
        });

        it('Map.getGeocodingCategoryDataCategory',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', type: ValueType.fromDescriptor({ geography: { stateOrProvince: true } }) },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true, roles: { "Size": true } }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 1000
                    }])
                }
            };
            var result = Map.getGeocodingCategory(dataView.categorical, mockGeotaggingAnalyzerService);
            expect(result).toBe("StateOrProvince");
        });

        /* Disable due to way tests run in GCI */
        /*
        it('Map Geocode With Size',() => {
            
            v = powerbi.visuals.VisualFactory.getPlugin('map').create();
            v.init({
                element: element,
                host: mocks.createHostService(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                }
            });

            v.onDataChanged([dataView]);
            
            // Only validation at this point is no exceptions are thrown
        });
        */

        it('Map.hasSizeField',() => {
            var dataViewMetadataOneColumn: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', roles: { 'Category': true } }
                ]
            };
            var dataViewMetadataTwoColumnsWithRoles: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', roles: { 'Category': true } },
                    { displayName: 'col2', queryName: 'col2', roles: { 'Size': true } }
                ]
            };
            var dataViewMetadataTwoColumnsWithoutRoles: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', type: ValueType.fromDescriptor({ text: true }) },
                    { displayName: 'col2', queryName: 'col2', type: ValueType.fromDescriptor({ numeric: true }) }
                ]
            };
            var dataViewMetadataThreeColumns: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', roles: { 'Category': true } },
                    { displayName: 'col2', queryName: 'col2', roles: { 'Y': true } },
                    { displayName: 'col3', queryName: 'col3', roles: { 'X': true } }
                ]
            };

            var dataViewOneColumn: powerbi.DataView = {
                metadata: dataViewMetadataOneColumn,
                categorical: {
                    categories: [{
                        source: dataViewMetadataOneColumn.columns[0],
                        values: ['98052', '98004', '98034', '12345', '67890']
                    }]
                }
            };
            var dataViewTwoColumnsWithRoles: powerbi.DataView = {
                metadata: dataViewMetadataTwoColumnsWithRoles,
                categorical: {
                    categories: [{
                        source: dataViewMetadataTwoColumnsWithRoles.columns[0],
                        values: ['San Diego', 'San Francisco', 'Seattle']
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadataTwoColumnsWithRoles.columns[1],
                            values: [3, 4, 5],
                            subtotal: 12
                        }
                    ])
                }
            };
            var dataViewTwoColumnsWithoutRoles: powerbi.DataView = {
                metadata: dataViewMetadataTwoColumnsWithoutRoles,
                categorical: {
                    categories: [{
                        source: dataViewMetadataTwoColumnsWithoutRoles.columns[0],
                        values: ['San Diego', 'San Francisco', 'Seattle']
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadataTwoColumnsWithoutRoles.columns[1],
                            values: [3, 4, 5],
                            subtotal: 12
                        }
                    ])
                }
            };
            var dataViewThreeColumns: powerbi.DataView = {
                metadata: dataViewMetadataThreeColumns,
                categorical: {
                    categories: [{
                        source: dataViewMetadataThreeColumns.columns[0],
                        values: ['San Diego', 'San Francisco', 'Seattle']
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadataThreeColumns.columns[1],
                            values: [32.715691, 37.777119, 47.603569],
                            subtotal: 39.36545966666666
                        },
                        {
                            source: dataViewMetadataThreeColumns.columns[2],
                            values: [-117.16172, -122.41964, -122.329453],
                            subtotal: -120.63693766666667
                        }
                    ])
                }
            };

            var actual = Map.hasSizeField(dataViewOneColumn.categorical.values, 0);
            expect(actual).toBe(false);
            actual = Map.hasSizeField(dataViewTwoColumnsWithRoles.categorical.values, 0);
            expect(actual).toBe(true);
            actual = Map.hasSizeField(dataViewTwoColumnsWithoutRoles.categorical.values, 0);
            expect(actual).toBe(true);
            actual = Map.hasSizeField(dataViewThreeColumns.categorical.values, 0);
            expect(actual).toBe(false);
        });

        it('Map.tooltipInfo single series',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [-100, 200, 700],
                        subtotal: 800
                    }])
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var categoryValue = dataView.categorical.categories[0].values[0];
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var seriesInfo = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), groupIndex, sizeIndex, longIndex, latIndex, colors);
            var value = seriesInfo.sizeValuesForGroup[0].value;
            var tooltipInfo: powerbi.visuals.TooltipDataItem[] = powerbi.visuals.TooltipBuilder.createTooltipInfo(powerbi.visuals.mapProps.general.formatString, dataView.categorical.categories, categoryValue, dataView.categorical.values, value, null, 0);
            var tooltipInfoTestData: powerbi.visuals.TooltipDataItem[] = [{ displayName: "col1", value: "Montana" }, { displayName: "col2", value: "-100" }];
            expect(tooltipInfo).toEqual(tooltipInfoTestData);
        });

        it('Map.tooltipInfo multi series',() => {
            var dataView: powerbi.DataView =
                powerbi.data.DataViewTransform.apply({
                    prototype: getDataViewMultiSeries(),
                    colorAllocatorFactory: powerbi.visuals.createColorAllocatorFactory(),
                    dataViewMappings: powerbi.visuals.mapCapabilities.dataViewMappings,
                    objectDescriptors: powerbi.visuals.mapCapabilities.objects,
                    transforms: {
                        selects: [
                            {queryName: 'select0'},
                            {queryName: 'select1'},
                            {queryName: 'select2'},
                            {queryName: 'select3'}
                        ]
                    }
                })[0];

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var categoryValue = dataView.categorical.categories[0].values[0];
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var seriesInfo = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), groupIndex, sizeIndex, longIndex, latIndex, colors);
            var value = seriesInfo.sizeValuesForGroup[0].value;
            var tooltipInfo: powerbi.visuals.TooltipDataItem[] = powerbi.visuals.TooltipBuilder.createTooltipInfo(powerbi.visuals.mapProps.general.formatString, dataView.categorical.categories, categoryValue, dataView.categorical.values, value, null, 0);
            var tooltipInfoTestData: powerbi.visuals.TooltipDataItem[] = [{ displayName: '', value: '2012' }, { displayName: '', value: 'Canada' }, { displayName: '', value: '150.00' }];
            expect(tooltipInfo).toEqual(tooltipInfoTestData);
        });

        it('Map.createMapDataLabel bubble',() => {

            var mockDatalabelSettings: powerbi.visuals.PointDataLabelsSettings = {
                show: true,
                displayUnits: null,
                position: powerbi.visuals.PointLabelPosition.Above,
                precision: 2,
                labelColor: "#000000",
                overrideDefaultColor: false,
                formatterOptions: null,
            };

            var mockBubbleData: powerbi.visuals.MapBubble[] = [{
                x: 50,
                y: 50,
                radius: 10,
                fill: "#000000",
                stroke: "2",
                strokeWidth: 2,
                selected: true,
                identity: null,
                labeltext: "Test Label",
            }];

            var mockLayout: powerbi.visuals.ILabelLayout = DataLabelUtils.getMapLabelLayout(mockDatalabelSettings);

            var mockBubbleGraphicsContext: D3.Selection = d3.select('body')
                .append('svg')
                .style("position", "absolute")
                .append("g")
                .classed("mapBubbles", true);

            var mockViewPort = {
                height: 150,
                width: 300
            };
            var result = DataLabelUtils.drawDefaultLabelsForDataPointChart(mockBubbleData, mockBubbleGraphicsContext, mockLayout, mockViewPort);

            //Should render
            expect(result).toBeDefined();
            expect(result[0][0]).toBeDefined();
            //Data input length
            expect(result.data.length).toBe(2);
            //Color setting properly
            expect(result[0][0].__data__.fill).toBe(mockDatalabelSettings.labelColor);
            //text
            expect(result[0][0].__data__.labeltext).toBe(powerbi.visuals.dataLabelUtils.getLabelFormattedText('Test Label'));
        });

        it('Map.createMapDataLabel slice',() => {

            var mockDatalabelSettings: powerbi.visuals.PointDataLabelsSettings = {
                show: true,
                displayUnits: null,
                position: powerbi.visuals.PointLabelPosition.Above,
                precision: 2,
                labelColor: "#000000",
                overrideDefaultColor: false,
                formatterOptions: null,
            };

            var mockSliceData: powerbi.visuals.MapSlice[] = [{
                x: 50,
                y: 50,
                radius: 10,
                fill: "#000000",
                stroke: "2",
                strokeWidth: 2,
                selected: true,
                identity: null,
                labeltext: 'Test Label',
                value: 0,
            }];

            var mockLayout: powerbi.visuals.ILabelLayout = DataLabelUtils.getMapLabelLayout(mockDatalabelSettings);

            var mockBubbleGraphicsContext: D3.Selection = d3.select('body')
                .append('svg')
                .style("position", "absolute")
                .append("g")
                .classed("mapBubbles", true);

            var viewPort = {
                height: element.height(),
                width: element.width()
            };
            var result = DataLabelUtils.drawDefaultLabelsForDataPointChart(mockSliceData, mockBubbleGraphicsContext, mockLayout, viewPort);

            //Should render
            expect(result).toBeDefined();
            expect(result[0][0]).toBeDefined();
            //Data input length
            expect(result.data.length).toBe(2);
            //Color setting properly
            expect(result[0][0].__data__.fill).toBe(mockDatalabelSettings.labelColor);
            //text
            expect(result[0][0].__data__.labeltext).toBe(powerbi.visuals.dataLabelUtils.getLabelFormattedText('Test Label'));
        });

        it('Map.createMapDataLabel hide bubble',() => {

            var mockDatalabelSettings: powerbi.visuals.PointDataLabelsSettings = {
                show: true,
                displayUnits: null,
                position: powerbi.visuals.PointLabelPosition.Above,
                precision: 2,
                labelColor: "#000000",
                overrideDefaultColor: false,
                formatterOptions: null,
            };

            var mockBubbleData: powerbi.visuals.MapBubble[] = [{
                x: 50,
                y: 50,
                radius: 10,
                fill: "#000000",
                stroke: "2",
                strokeWidth: 2,
                selected: true,
                identity: null,
                labeltext: "Test Label",
            }];

            var mockLayout: powerbi.visuals.ILabelLayout = DataLabelUtils.getMapLabelLayout(mockDatalabelSettings);

            var mockBubbleGraphicsContext: D3.Selection = d3.select('body')
                .append('svg')
                .style("position", "absolute")
                .append("g")
                .classed("mapBubbles1", true);

            var mockViewPort = {
                height: 150,
                width: 300
            };
            var result = DataLabelUtils.drawDefaultLabelsForDataPointChart(mockBubbleData, mockBubbleGraphicsContext, mockLayout, mockViewPort);

            // Simulate the clean function of dataLabelUtils when 'show' is set to false
            DataLabelUtils.cleanDataLabels(mockBubbleGraphicsContext);

            expect(result).toBeDefined();
            expect($('.mapBubbles1 text').length).toBe(0);

        });

        it('Map.createMapDataLabel hide slice',() => {

            var mockDatalabelSettings: powerbi.visuals.PointDataLabelsSettings = {
                show: true,
                displayUnits: null,
                position: powerbi.visuals.PointLabelPosition.Above,
                precision: 2,
                labelColor: "#000000",
                overrideDefaultColor: false,
                formatterOptions: null,
            };

            var mockSliceData: powerbi.visuals.MapSlice[] = [{
                x: 50,
                y: 50,
                radius: 10,
                fill: "#000000",
                stroke: "2",
                strokeWidth: 2,
                selected: true,
                identity: null,
                labeltext: "Test Label",
                value: 0,
            }];

            var mockLayout: powerbi.visuals.ILabelLayout = DataLabelUtils.getMapLabelLayout(mockDatalabelSettings);

            var mockBubbleGraphicsContext: D3.Selection = d3.select('body')
                .append('svg')
                .style("position", "absolute")
                .append("g")
                .classed("mapSlice1", true);

            var mockViewPort = {
                height: 150,
                width: 300
            };
            var result = DataLabelUtils.drawDefaultLabelsForDataPointChart(mockSliceData, mockBubbleGraphicsContext, mockLayout, mockViewPort);

            // Simulate the clean function of dataLabelUtils when 'show' is set to false
            DataLabelUtils.cleanDataLabels(mockBubbleGraphicsContext);

            expect(result).toBeDefined();
            expect($('.mapSlice1 text').length).toBe(0);
        });

        it('Map.tooltipInfo no series, no values',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                }
            };

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var categoryValue = dataView.categorical.categories[0].values[0];
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var seriesInfo = Map.calculateSeriesInfo(undefined, groupIndex, sizeIndex, latIndex, longIndex, colors);
            var value = seriesInfo.sizeValuesForGroup[0].value;
            var tooltipInfo: powerbi.visuals.TooltipDataItem[] = powerbi.visuals.TooltipBuilder.createTooltipInfo(powerbi.visuals.mapProps.general.formatString, dataView.categorical.categories, categoryValue, dataView.categorical.values, value, null, 0);
            var tooltipInfoTestData: powerbi.visuals.TooltipDataItem[] = [{ displayName: "col1", value: "Montana" }];
            expect(tooltipInfo).toEqual(tooltipInfoTestData);
        });

        it('Map shows warning with no Location set',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [{ displayName: 'NotLocation', roles: { 'NotCategory': true, }, }],
                }
            };

            var warnings = Map.showLocationMissingWarningIfNecessary(dataView);
            expect(warnings[0]).not.toBeNull();
        });

        it('Map shows warning with no columns set',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                }
            };

            var warnings = Map.showLocationMissingWarningIfNecessary(dataView);
            expect(warnings[0]).not.toBeNull();
        });

        it('Map does not show warning with location set',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [{ displayName: 'Location', queryName: 'Location', roles: { 'Category': true, }, }],
                }
            };

            var warnings = Map.showLocationMissingWarningIfNecessary(dataView);
            expect(warnings.length).toEqual(0);
        });

        it('Map legend is hidden:show false',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                    objects: {
                        legend: {
                            show: false
                        }
                    }
                }
            };

            expect(Map.isLegendHidden(dataView)).toBe(true);
        });

        it('Map legend is hidden:show true',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                    objects: {
                        legend: {
                            show: true
                        }
                    }
                }
            };

            expect(Map.isLegendHidden(dataView)).toBe(false);
        });

        it('Map legend is hidden:no legend object',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                    objects: {
                    }
                }
            };

            expect(Map.isLegendHidden(dataView)).toBe(false);
        });

        it('Map legend is hidden:no objects',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                }
            };

            expect(Map.isLegendHidden(dataView)).toBe(false);
        });

        it('Map legend is bottom',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                    objects: {
                        legend: {
                            position: 'Bottom'
                        }
                    }
                }
            };

            expect(Map.legendPosition(dataView)).toBe(LegendPosition.Bottom);
        });

        it('Map enumerateLegend',() => {
            var dataView: powerbi.DataView = {
                metadata: {
                    columns: [],
                    objects: {
                        legend: {
                            show: true
                        }
                    }
                }
            };

            var legend: ILegend = {
                changeOrientation: () => { },
                drawLegend: () => { },
                getMargins: () => <powerbi.IViewport>{
                    width: 0,
                    height: 0
                },
                getOrientation: () => LegendPosition.Top,
                isVisible: () => true,
                reset: () => { },
            };

            var objects = Map.enumerateLegend(dataView, legend, "");
            expect(objects.length).toBe(1);
            var firstObject = objects[0];
            expect(firstObject.objectName).toBe('legend');
            expect(firstObject.selector).toBeNull();
            expect(firstObject.properties).toBeDefined();
            var properties = firstObject.properties;
            expect(properties['show']).toBe(true);
            expect(properties['position']).toBe('Top');
        });

        it('Map.calculateSeriesInfo - Gradient color',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, roles: { 'Gradient': true } }
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['Montana', 'California', 'Arizona']
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadata.columns[1],
                            values: [-100, 200, 700],
                        },
                        {
                            source: dataViewMetadata.columns[2],
                            values: [75, 50, 0],
                        }])
                }
            };

            var sizeIndex = 0;
            var latIndex = -1;
            var longIndex = -1;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var objectDefinitions: powerbi.DataViewObjects[] = [
                { dataPoint: { fill: { solid: { color: "#d9f2fb" } } } },
                { dataPoint: { fill: { solid: { color: "#b1eab7" } } } }
            ];
            var result = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), 0, sizeIndex, longIndex, latIndex, colors, null, objectDefinitions);
            expect(result.sizeValuesForGroup[0].fill).toBe('rgba(217,242,251,0.6)');

            result = Map.calculateSeriesInfo(dataView.categorical.values.grouped(), 1, sizeIndex, longIndex, latIndex, colors, null, objectDefinitions);
            expect(result.sizeValuesForGroup[0].fill).toBe('rgba(177,234,183,0.6)');
        });

        it('Map.shouldEnumerateDataPoints filledMap',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true, roles: { "Size": true } },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(Map.shouldEnumerateDataPoints(dataView, /*usesSizeForGradient*/ true)).toBe(false);
        });

        it('Map.shouldEnumerateDataPoints filledMap series overrides size',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1', roles: { 'Series': true } },
                    { displayName: 'col2', queryName: 'col2', isMeasure: true, roles: { "Size": true } },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(Map.shouldEnumerateDataPoints(dataView, /*usesSizeForGradient*/ true)).toBe(true);
        });

        it('Map.shouldEnumerateDataPoints filledMap',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(Map.shouldEnumerateDataPoints(dataView, /*usesSizeForGradient*/ true)).toBe(true);
        });

        it('Map.shouldEnumerateDataPoints Map',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Gradient": true } },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(Map.shouldEnumerateDataPoints(dataView, /*usesSizeForGradient*/ false)).toBe(false);
        });

        it('Map.shouldEnumerateDataPoints Map',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                ]
            };
            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata
            };
            expect(Map.shouldEnumerateDataPoints(dataView, /*usesSizeForGradient*/ false)).toBe(true);
        });

        it("Map: enumerate data points with dynamic series",() => {            

            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', queryName: 'col1' },
                    { displayName: 'col2', queryName: 'col2', type: ValueType.fromDescriptor({ text: true })},
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, groupName: 'a', type: ValueType.fromDescriptor({ text: true }) },
                    { displayName: 'col3', queryName: 'col3', isMeasure: true, groupName: 'b' },
                ]
            };            

            var categoryColumn: powerbi.DataViewMetadataColumn = { displayName: 'year', queryName: 'selectYear', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) };
            var measureColumn: powerbi.DataViewMetadataColumn = { displayName: 'sales', queryName: 'selectSales', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer), objects: { general: { formatString: '$0' } } };
            var measureColumnDynamic1: powerbi.DataViewMetadataColumn = { displayName: 'sales', queryName: 'selectSales', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer), objects: { general: { formatString: '$0' } }, groupName: 'A' };
            var measureColumnDynamic2: powerbi.DataViewMetadataColumn = { displayName: 'sales', queryName: 'selectSales', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer), objects: { general: { formatString: '$0' } }, groupName: 'B' };
            var measureColumnDynamic1RefExpr = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'sales' });

            var categoryIdentities = [
                mocks.dataViewScopeIdentity("2011"),
                mocks.dataViewScopeIdentity("2012"),
            ];

            var col3Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'col2' });
            var seriesIdentities = [
                mocks.dataViewScopeIdentityWithEquality(col3Ref, "A"),
                mocks.dataViewScopeIdentityWithEquality(col3Ref, "B"),
            ];

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: categoryColumn,
                        values: [2011, 2012],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: measureColumnDynamic1,
                            values: [100, 200],
                            identity: seriesIdentities[0],
                        }, {
                            source: measureColumnDynamic2,
                            values: [62, 55],
                            identity: seriesIdentities[1],
                        }],
                        [measureColumnDynamic1RefExpr])
                }
            };

            dataView.categorical.values.source = measureColumn;                      

            var groupIndex: number = 0;
            var sizeIndex = 0;
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;

            var legendDataPoints = Map.calculateSeriesLegend(dataView.categorical.values.grouped(), groupIndex, sizeIndex, colors, undefined, [col3Ref]);            
            var enumeratedDataPoints = Map.enumerateDataPoints(legendDataPoints, colors, true, null, false, []);

            expect(enumeratedDataPoints.length).toBe(legendDataPoints.length);
            // ensure first object is 'fill' and not 'defaultColor'
            expect(enumeratedDataPoints[0]['properties']['fill']).toBeDefined();
        });
    });
}