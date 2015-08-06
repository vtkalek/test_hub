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
    import ArrayExtensions = jsCommon.ArrayExtensions;
    import CssConstants = jsCommon.CssConstants;
    import data = powerbi.data;
    import DataViewAnalysis = powerbi.DataViewAnalysis;
    import DataViewTransform = powerbi.data.DataViewTransform;
    import DataView = powerbi.DataView;
    import QueryProjectionCollection = powerbi.data.QueryProjectionCollection;
    import QueryProjectionsByRole = powerbi.data.QueryProjectionsByRole;
    import SQExprBuilder = powerbi.data.SQExprBuilder;
    import Treemap = powerbi.visuals.Treemap;
    import TreemapNode = powerbi.visuals.TreemapNode;
    import SelectionId = powerbi.visuals.SelectionId;
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;

    var DefaultWaitForRender = 500;

    powerbitests.mocks.setLocale();

    var dataViewMetadataCategorySeriesColumns: powerbi.DataViewMetadata = {
        columns: [
            { displayName: 'Squad', queryName: 'select0', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
            { displayName: 'Period', queryName: 'select1', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
            { displayName: null, queryName: 'select2', groupName: '201501', isMeasure: true, properties: { "Values": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
            { displayName: null, queryName: 'select2', groupName: '201502', isMeasure: true, properties: { "Values": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
            { displayName: null, queryName: 'select2', groupName: '201503', isMeasure: true, properties: { "Values": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
        ]
    };
    var categoryColumnRef = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'Squad' });
    var seriesColumnRef = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'Period' });

    var dataViewMetadataCategoryAndMeasures: powerbi.DataViewMetadata = {
        columns: [
            { displayName: 'Area', queryName: 'select0', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
            { displayName: 'BugsFiled', queryName: 'select1', isMeasure: true, properties: { "Values": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
            { displayName: 'BugsFixed', queryName: 'select2', isMeasure: true, properties: { "Values": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
        ]
    };

    describe("Treemap",() => {
        var categoryColumn: powerbi.DataViewMetadataColumn = { displayName: 'year', queryName: 'select0', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) };
        var measureColumn: powerbi.DataViewMetadataColumn = { displayName: 'sales', queryName: 'select1', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) };

        it('Treemap registered capabilities',() => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin('treemap').capabilities).toBe(powerbi.visuals.treemapCapabilities);
        });

        it('Capabilities should include dataViewMappings',() => {
            expect(powerbi.visuals.treemapCapabilities.dataViewMappings).toBeDefined();
        });

        it('Capabilities should include dataRoles',() => {
            expect(powerbi.visuals.treemapCapabilities.dataRoles).toBeDefined();
        });

        it('Capabilities should include objects',() => {
            expect(powerbi.visuals.treemapCapabilities.objects).toBeDefined();
        });

        it('Capabilities should include implicitSort',() => {
            expect(powerbi.visuals.treemapCapabilities.sorting.implicit).toBeDefined();
        });

        it('FormatString property should match calculated',() => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(powerbi.visuals.treemapCapabilities.objects)).toEqual(powerbi.visuals.treemapProps.general.formatString);
        });

        it('preferred capability does not support zero rows',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Year' },
                    { displayName: 'Value', isMeasure: true }],
            };

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: categoryColumn,
                        values: []
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: measureColumn,
                        values: []
                    }]),
                }
            };

            expect(DataViewAnalysis.supports(dataView, powerbi.visuals.treemapCapabilities.dataViewMappings[0], true))
                .toBe(false);
        });

        it('preferred capability does not support one row',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Year' },
                    { displayName: 'Value', isMeasure: true }],
            };

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: categoryColumn,
                        values: [2012, 2013]
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: measureColumn,
                        values: [200]
                    }]),
                }
            };

            expect(DataViewAnalysis.supports(dataView, powerbi.visuals.treemapCapabilities.dataViewMappings[0], true))
                .toBe(false);
        });

        it ('Capabilities should only allow one measure if there are group and detail',() => {
            var allowedProjections: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }]),
                    'Details': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([{ queryRef: '2' }]),
                };
            var disallowedProjections1: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }]),
                    'Details': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([
                        { queryRef: '2' },
                        { queryRef: '3' }
                    ])
                };
            var disallowedProjections2: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }]),
                    'Details': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([
                        { queryRef: '2' },
                        { queryRef: '3' },
                        { queryRef: '4' }
                    ])
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections1, dataViewMappings)).toBe(null);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections2, dataViewMappings)).toBe(null);
        });

        it('Capabilities should only allow one measure if is a detail group',() => {
            var allowedProjections: QueryProjectionsByRole =
                {
                    'Details': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([{ queryRef: '0' }]),
                };
            var disallowedProjections: QueryProjectionsByRole =
                {
                    'Details': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([
                        { queryRef: '2' },
                        { queryRef: '0' }
                    ]),
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections, dataViewMappings)).toBe(null);
        });

        it('Capabilities should allow multiple measures if there is no detail group',() => {
            var allowedProjections1: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '2' }]),
                    'Values': new QueryProjectionCollection([
                        { queryRef: '1' },
                        { queryRef: '0' }
                    ])
                };

            var allowedProjections2: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([
                        { queryRef: '2' },
                        { queryRef: '0' },
                        { queryRef: '3' }
                    ]),
                };

            var allowedProjections3: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '1' }]),
                    'Values': new QueryProjectionCollection([{ queryRef: '0' }]),
                };

            var allowedProjections4: QueryProjectionsByRole =
                {
                    'Values': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ]),
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections1, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections2, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections3, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections4, dataViewMappings)).toEqual(dataViewMappings);
        });

        it('Capabilities should not allow multiple category groups',() => {
            var disallowedProjections1: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ]),
                };

            var disallowedProjections2: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ]),
                    'Values': new QueryProjectionCollection([{ queryRef: '2' }]),
                };

            var disallowedProjections3: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ]),
                    'Details': new QueryProjectionCollection([{ queryRef: '2' }]),
                    'Values': new QueryProjectionCollection([{ queryRef: '3' }]),
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections1, dataViewMappings)).toBe(null);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections2, dataViewMappings)).toBe(null);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections3, dataViewMappings)).toBe(null);
        });

        it('Capabilities should not allow multiple detail groups',() => {
            var disallowedProjections1: QueryProjectionsByRole =
                {
                    'Details': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ])
                };

            var disallowedProjections2: QueryProjectionsByRole =
                {
                    'Details': new QueryProjectionCollection([
                        { queryRef: '0' },
                        { queryRef: '1' }
                    ]),
                    'Values': new QueryProjectionCollection([{ queryRef: '2' }])
                };

            var disallowedProjections3: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }]),
                    'Details': new QueryProjectionCollection([
                        { queryRef: '1' },
                        { queryRef: '2' }
                    ]),
                    'Values': new QueryProjectionCollection([{ queryRef: '3' }]),
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections1, dataViewMappings)).toBe(null);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections2, dataViewMappings)).toBe(null);
            expect(DataViewAnalysis.chooseDataViewMappings(disallowedProjections3, dataViewMappings)).toBe(null);
        });

        it('Capabilities should allow one category and/or one detail groups',() => {
            var allowedProjections1: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }])
                };

            var allowedProjections2: QueryProjectionsByRole =
                {
                    'Detail': new QueryProjectionCollection([{ queryRef: '0' }])
                };

            var allowedProjections3: QueryProjectionsByRole =
                {
                    'Group': new QueryProjectionCollection([{ queryRef: '0' }]),
                    'Detail': new QueryProjectionCollection([{ queryRef: '1' }]),
                };

            var allowedProjections4: QueryProjectionsByRole =
                {
                    'Values': new QueryProjectionCollection([{ queryRef: '0' }]),
                };

            var dataViewMappings = powerbi.visuals.treemapCapabilities.dataViewMappings;
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections1, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections2, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections3, dataViewMappings)).toEqual(dataViewMappings);
            expect(DataViewAnalysis.chooseDataViewMappings(allowedProjections4, dataViewMappings)).toEqual(dataViewMappings);
        });
    });

    describe("treemap data labels validation",() => {
        var v: powerbi.IVisual, element: JQuery;
        var hostServices: powerbi.IVisualHostServices;

        beforeEach(() => {
            hostServices = powerbitests.mocks.createVisualHostServices();
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('treemap').create();
            v.init({
                element: element,
                host: hostServices,
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true }
            });
        });

        it('NaN in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var dataChangedOptions = getOptionsForValueWarnings([NaN, 120]);
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('NaNNotSupported');
                done();
            }, DefaultWaitForRender);
        });

        it('Negative Infinity in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var dataChangedOptions = getOptionsForValueWarnings([Number.NEGATIVE_INFINITY, 120]);
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('InfinityValuesNotSupported');
                done();
            }, DefaultWaitForRender);
        });

        it('Positive Infinity in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var dataChangedOptions = getOptionsForValueWarnings([Number.POSITIVE_INFINITY, 120]);
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('GeometryCulledWarning');
                done();
            }, DefaultWaitForRender);
        });

        it('Out of range value in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var dataChangedOptions = getOptionsForValueWarnings([1e301, 120]);
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('GeometryCulledWarning');
                done();
            }, DefaultWaitForRender);
        });

        it('All okay in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var dataChangedOptions = getOptionsForValueWarnings([300, 120]);
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect(warningSpy).not.toHaveBeenCalled();
                done();
            }, DefaultWaitForRender);
        });

        function getOptionsForValueWarnings(values: number[]) {
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef]
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: values,
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }],
                            [seriesColumnRef],
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            return dataChangedOptions;
        }

        it('labels should be visible by default',(done) => {

            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef]
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            [seriesColumnRef],
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect($('.treemap .labels .minorLabel').css('opacity')).toBe('1');
                expect($('.treemap .labels .majorLabel').css('opacity')).toBe('1');
                done();
            }, DefaultWaitForRender);
        });

        it('labels should be visible',(done) => {

            dataViewMetadataCategorySeriesColumns.objects = { labels: { show: true } };

            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields:[categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect($('.treemap .labels .minorLabel').css('opacity')).toBe('1');
                expect($('.treemap .labels .majorLabel').css('opacity')).toBe('1');
                done();
            }, DefaultWaitForRender);
        });

        it('labels should be hidden',(done) => {

            dataViewMetadataCategorySeriesColumns.objects = { labels: { show: false } };

            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                expect($('.treemap .labels .minorLabel').length).toEqual(0);
                expect($('.treemap .labels .majorLabel').length).toEqual(0);
                done();
            }, DefaultWaitForRender);
        });

        it('hidden labels with highlights dom validation',(done) => {

            dataViewMetadataCategorySeriesColumns.objects = { labels: { show: false } };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity("Drama"),
                mocks.dataViewScopeIdentity("Comedy"),
                mocks.dataViewScopeIdentity("Documentary"),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['Drama', 'Comedy', 'Documentary'],
                            identity: categoryIdentities,
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[1],
                                values: [110, 120, 130],
                                highlights: [60, 80, 20]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.treemap .labels .majorLabel').length).toBe(0);
                expect($('.treemap .labels .minorLabel').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('labels color should changed from settings',(done) => {

            var colorRgb = 'rgb(120,110,100)';
            dataViewMetadataCategorySeriesColumns.objects = {
                labels: {
                    color: { solid: { color: colorRgb } },
                    show: true,
                }
            };
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                var minorActualColor = $('.treemap .labels .minorLabel').css('fill').replace(/\ /g, "");
                var majorActualColor = $('.treemap .labels .majorLabel').css('fill').replace(/\ /g, "");

                //convert the actual color to rgb format if target browser returns hex format
                minorActualColor = (minorActualColor[0] === '#') ? jsCommon.color.rgbString(jsCommon.color.parseRgb(minorActualColor)) : minorActualColor;
                majorActualColor = (majorActualColor[0] === '#') ? jsCommon.color.rgbString(jsCommon.color.parseRgb(majorActualColor)) : majorActualColor;

                expect(minorActualColor).toBe(colorRgb);
                expect(majorActualColor).toBe(colorRgb);

                done();
            }, DefaultWaitForRender);
        });
    });

    describe("Enumerate Objects",() => {
        var v: powerbi.IVisual, element: JQuery;
        
        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('treemap').create();
            v.init({
                element: element,
                host: powerbitests.mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true }
            });
        });

        it('Check basic enumeration',(done) => {
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                var points = v.enumerateObjectInstances({ objectName: 'dataPoint' });                
                expect(points.length).toBe(2);
                expect(points[0].displayName).toEqual('The Nuthatches');
                expect(points[0].properties['fill']).toBeDefined();
                expect(points[1].displayName).toEqual('Skylarks');
                expect(points[1].properties['fill']).toBeDefined();
                done();
            }, DefaultWaitForRender);
        });
    });

    describe("treemap web animation",() => {
        var v: powerbi.IVisual, element: JQuery;

        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.createMinerva({}).getPlugin('treemap').create();
            v.init({
                element: element,
                host: powerbitests.mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true }
            });
        });

        it('treemap highlight animation', (done) => {
            var noHighlightsDataViews = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            var highlightsDataViewsA = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                highlights: [60, 70],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                highlights: [160, 170],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                highlights: [260, 270],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            var highlightsDataViewsB = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                highlights: [20, 10],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                highlights: [120, 110],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                highlights: [220, 210],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            v.onDataChanged(noHighlightsDataViews);
            setTimeout(() => {
                var svgInit = $('.treemap');
                var initialHeight = svgInit.attr('height'), initialWidth = svgInit.attr('width');

                var animator = <powerbi.visuals.WebTreemapAnimator>(<Treemap>v).animator;
                spyOn(animator, 'animate').and.callThrough();

                v.onDataChanged(highlightsDataViewsA);
                v.onDataChanged(highlightsDataViewsB);
                v.onDataChanged(noHighlightsDataViews);

                expect(animator).toBeTruthy();
                expect(animator.animate).toHaveBeenCalled();

                setTimeout(() => {
                    var svg = $('.treemap');
                    expect(svg).toBeInDOM();

                    expect(svg.attr('height')).toBe(initialHeight);
                    expect(svg.attr('width')).toBe(initialWidth);

                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });

        it('treemap highlight animation - suppressAnimations', (done) => {
            var noHighlightsDataViews = {
                suppressAnimations: true,
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            var highlightsDataViewsA = {
                suppressAnimations: true,
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                highlights: [60, 70],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                highlights: [160, 170],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                highlights: [260, 270],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            var highlightsDataViewsB = {
                suppressAnimations: true,
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['The Nuthatches', 'Skylarks'],
                            identity: [
                                mocks.dataViewScopeIdentity('The Nuthatches'),
                                mocks.dataViewScopeIdentity('Skylarks'),
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                highlights: [20, 10],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201501')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                highlights: [120, 110],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201502')),
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                highlights: [220, 210],
                                identity: data.createDataViewScopeIdentity(SQExprBuilder.text('201503')),
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };

            v.onDataChanged(noHighlightsDataViews);
            setTimeout(() => {
                var svgInit = $('.treemap');
                var initialHeight = svgInit.attr('height'), initialWidth = svgInit.attr('width');

                var animator = <powerbi.visuals.WebTreemapAnimator>(<Treemap>v).animator;
                spyOn(animator, 'animate').and.callThrough();

                v.onDataChanged(highlightsDataViewsA);
                v.onDataChanged(highlightsDataViewsB);
                v.onDataChanged(noHighlightsDataViews);

                expect(animator).toBeTruthy();
                expect(animator.animate).not.toHaveBeenCalled();

                setTimeout(() => {
                    var svg = $('.treemap');
                    expect(svg).toBeInDOM();

                    expect(svg.attr('height')).toBe(initialHeight);
                    expect(svg.attr('width')).toBe(initialWidth);

                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });
    });

    describe("treemap interactivity",() => {
        var v: powerbi.IVisual, element: JQuery;
        var hostServices: powerbi.IVisualHostServices;
        var defaultOpacity = '';
        var dimmedOpacity = Treemap.DimmedShapeOpacity.toString();

        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            hostServices = mocks.createVisualHostServices();
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('treemap').create();
            v.init({
                element: element,
                host: hostServices,
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true },
                interactivity: { selection: true }
            });
        });

        it('treemap categories and series - single select', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
            ];
            var seriesIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('201501'),
                mocks.dataViewScopeIdentity('201502'),
                mocks.dataViewScopeIdentity('201503'),
            ];
            var onDataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['A', 'B'],
                            identity: categoryIdentities,
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: seriesIdentities[0],
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: seriesIdentities[1],
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: seriesIdentities[2],
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(onDataChangedOptions);

            setTimeout(() => {
                var rootShape = $('.treemap .shapes .rootNode');
                var shapes = $('.treemap .shapes .parentGroup');
                var nestedShapes = $('.treemap .shapes .nodeGroup');

                spyOn(hostServices, 'onSelect').and.callThrough();

                // Select a major label
                (<any>$('.majorLabel')).first().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                        data: [categoryIdentities[0]]
                            }
                        ]
                    });
                (<any>$('.majorLabel')).first().d3Click(0, 0);
                // Select the first nested shape
                (<any>$('.nodeGroup')).first().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[0], seriesIdentities[0]]
                            }
                        ]
                    });

                // Select the last minor label
                (<any>$('.minorLabel')).last().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1], seriesIdentities[2]]
                            }
                        ]
                    });

                (<any>$('.minorLabel')).last().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith({ data: [] });

                done();
            }, DefaultWaitForRender);
        });

        it('treemap categories and measures - single click on category node (parent shape must be selectable)', (done) => {
            var identities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('f'),
                mocks.dataViewScopeIdentity('b'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataCategoryAndMeasures,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategoryAndMeasures.columns[0],
                            values: ['Front end', 'Back end'],
                            identity: identities,
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategoryAndMeasures.columns[1],
                                values: [110, 120]
                            }, {
                                source: dataViewMetadataCategoryAndMeasures.columns[2],
                                values: [210, 220]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var rootShape = $('.treemap .shapes .rootNode');
                var shapes = $('.treemap .shapes .parentGroup');
                var nestedShapes = $('.treemap .shapes .nodeGroup');

                expect(shapes[0].style.fill).toBe(CssConstants.noneValue);
                expect(shapes[1].style.fill).toBe(CssConstants.noneValue);
                expect(nestedShapes[0].style.fill).not.toBe(CssConstants.noneValue);
                expect(nestedShapes[1].style.fill).not.toBe(CssConstants.noneValue);
                expect(nestedShapes[2].style.fill).not.toBe(CssConstants.noneValue);
                expect(nestedShapes[3].style.fill).not.toBe(CssConstants.noneValue);

                spyOn(hostServices, 'onSelect').and.callThrough();

                // Select the shape for the second category instance
                (<any>$('.parentGroup')).last().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                        data: [identities[1]]
                            }
                        ]
                    });

                done();
            }, DefaultWaitForRender);
        });

        // Disabling due to changes in how we handle selection breaking the preservation of selection across data view changes.  Bug filed as #4904881
        /*it('treemap categories and series onDataChanged - single click on old and new shapes', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
            ];

            var initialDataViews: DataView[] = [{
                metadata: dataViewMetadataCategorySeriesColumns,
                categorical: {
                    categories: [{
                        source: dataViewMetadataCategorySeriesColumns.columns[0],
                        values: ['A', 'B'],
                        identity: categoryIdentities
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadataCategorySeriesColumns.columns[2],
                            values: [110, 120],
                            identity: mocks.dataViewScopeIdentity('201501'),
                        }, {
                            source: dataViewMetadataCategorySeriesColumns.columns[3],
                            values: [210, 220],
                            identity: mocks.dataViewScopeIdentity('201502'),
                        }, {
                            source: dataViewMetadataCategorySeriesColumns.columns[4],
                            values: [310, 320],
                            identity: mocks.dataViewScopeIdentity('201503'),
                        }],
                        undefined,
                        dataViewMetadataCategorySeriesColumns.columns[1])
                }
            }];
            var updatedMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Squad', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'Period', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: '201503', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: '201504', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var updatedDataViewsSeriesIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('201503'),
                mocks.dataViewScopeIdentity('201504'),
            ];
            var updatedDataViews: DataView[] = [{
                metadata: updatedMetadata,
                categorical: {
                    categories: [{
                        source: updatedMetadata.columns[0],
                        values: ['A', 'B'],
                        identity: categoryIdentities
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: updatedMetadata.columns[2],
                            values: [210, 220],
                            identity: updatedDataViewsSeriesIdentities[0],
                        }, {
                            source: updatedMetadata.columns[3],
                            values: [310, 320],
                            identity: updatedDataViewsSeriesIdentities[1],
                        }],
                        undefined,
                        dataViewMetadataCategorySeriesColumns.columns[1])
                }
            }];

            v.onDataChanged({ dataViews: initialDataViews });

            setTimeout(() => {
                var rootShape = $('.treemap .shapes .rootNode');
                var shapes = $('.treemap .shapes .parentGroup');
                var nestedShapes = $('.treemap .shapes .nodeGroup');

                spyOn(hostServices, 'onSelect').and.callThrough();

                // Make a selection
                (<any>$('.majorLabel')).first().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);

                // Change data
                v.onDataChanged({ dataViews: updatedDataViews });
                setTimeout(() => {
                    shapes = $('.treemap .shapes .parentGroup');
                    nestedShapes = $('.treemap .shapes .nodeGroup');

                    expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[1].style.fillOpacity).toBe(dimmedOpacity);
                    expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);

                    // Select a new shape
                    (<any>$('.nodeGroup')).last().d3Click(0, 0);
                    expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[0].style.fillOpacity).toBe(dimmedOpacity);
                    expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[2].style.fillOpacity).toBe(dimmedOpacity);
                    expect(nestedShapes[3].style.fillOpacity).toBe(defaultOpacity);
                    expect(hostServices.onSelect).toHaveBeenCalledWith(
                        {
                            data: [categoryIdentities[1]]
                        });

                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        }); */

        it('treemap categories and series - selection across resize', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
            ];
            var seriesIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('201501'),
                mocks.dataViewScopeIdentity('201502'),
                mocks.dataViewScopeIdentity('201503'),
            ];
            var onDataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['A', 'B'],
                            identity: categoryIdentities,
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: seriesIdentities[0],
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: seriesIdentities[1],
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: seriesIdentities[2],
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(onDataChangedOptions);

            setTimeout(() => {
                var rootShape = $('.treemap .shapes .rootNode');
                var shapes = $('.treemap .shapes .parentGroup');
                var nestedShapes = $('.treemap .shapes .nodeGroup');

                spyOn(hostServices, 'onSelect').and.callThrough();

                // Select a major label
                (<any>$('.majorLabel')).first().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                        data: [categoryIdentities[0]]
                            }
                        ]
                    });

                v.onResizing({ width: 300, height: 300 });

                setTimeout(() => {
                    // Select a major label
                    expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                    expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                    expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                    expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);

                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });

        it('treemap external clear selection ', (done) => {
            var categoryIdentities = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
            ];
            var seriesIdentities = [
                mocks.dataViewScopeIdentity('201501'),
                mocks.dataViewScopeIdentity('201502'),
                mocks.dataViewScopeIdentity('201503'),
            ];
            var onDataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataCategorySeriesColumns,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataCategorySeriesColumns.columns[0],
                            values: ['A', 'B'],
                            identity: [
                                categoryIdentities[0],
                                categoryIdentities[1],
                            ],
                            identityFields: [categoryColumnRef],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataCategorySeriesColumns.columns[2],
                                values: [110, 120],
                                identity: seriesIdentities[0]
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[3],
                                values: [210, 220],
                                identity: seriesIdentities[1]
                            }, {
                                source: dataViewMetadataCategorySeriesColumns.columns[4],
                                values: [310, 320],
                                identity: seriesIdentities[2]
                            }],
                            undefined,
                            dataViewMetadataCategorySeriesColumns.columns[1])
                    }
                }]
            };
            v.onDataChanged(onDataChangedOptions);

            setTimeout(() => {
                var rootShape = $('.treemap .shapes .rootNode');
                var shapes = $('.treemap .shapes .parentGroup');
                var nestedShapes = $('.treemap .shapes .nodeGroup');

                spyOn(hostServices, 'onSelect').and.callThrough();

                (<any>$('.nodeGroup')).first().d3Click(0, 0);
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[0], seriesIdentities[0]]
                            }
                        ]
                    });

                v.onClearSelection();
                expect(rootShape[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(shapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[0].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[1].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[2].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[3].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[4].style.fillOpacity).toBe(defaultOpacity);
                expect(nestedShapes[5].style.fillOpacity).toBe(defaultOpacity);
                done();
            }, DefaultWaitForRender);
        });
    });

    describe("treemap converter validation",() => {

        var viewport: powerbi.IViewport = {
            width: 500,
            height: 500,
        };

        it('treemap dataView multi measure',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: 'EventCount',
                        queryName: 'EventCount',
                        isMeasure: true,
                        properties: { "Y": true },
                        type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double),
                        objects: { dataPoint: { fill: { solid: { color: 'red' } } } }
                    },
                    {
                        displayName: 'MedalCount',
                        queryName: 'MedalCount',
                        isMeasure: true,
                        properties: { "Y": true },
                        type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double)
                    }
                ]
            };

            var dataView = {
                metadata: metadata,
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[0],
                            values: [110]
                        }, {
                            source: metadata.columns[1],
                            values: [210]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;
            var selectionIds: SelectionId[] = [
                SelectionId.createWithMeasure("EventCount"),
                SelectionId.createWithMeasure("MedalCount"),
            ];

            var nodes = rootNode.children;
            expect(nodes.length).toBe(2);
            expect(nodes[0].name).toBe('EventCount');
            expect(nodes[0].size).toBe(110);
            expect(nodes[0].children).not.toBeDefined();
            expect((<TreemapNode>nodes[0]).key).toBe(selectionIds[0].getKey());

            expect(nodes[1].name).toBe('MedalCount');
            expect(nodes[1].size).toBe(210);
            expect(nodes[1].children).not.toBeDefined();
            expect((<TreemapNode>nodes[1]).key).toBe(selectionIds[1].getKey());

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));
            expect(shapeColors[0]).toEqual('red');

            // Legend
            expect(treeMapData.legendData.title).toBe('');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('EventCount');
        });

        it('treemap dataView multi measure with null values',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'EventCount', queryName: 'EventCount', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'MedalCount', queryName: 'MedalCount', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };

            var dataView = {
                metadata: metadata,
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[0],
                            values: [110]
                        }, {
                            source: metadata.columns[1],
                            values: [null]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;
            var selectionIds: SelectionId[] = [
                SelectionId.createWithMeasure("EventCount"),
                SelectionId.createWithMeasure("MedalCount"),
            ];

            var nodes = rootNode.children;
            expect(nodes.length).toBe(1);
            expect(nodes[0].name).toBe('EventCount');
            expect(nodes[0].size).toBe(110);
            expect(nodes[0].children).not.toBeDefined();
            expect((<TreemapNode>nodes[0]).key).toBe(selectionIds[0].getKey());

            // Legend
            expect(treeMapData.legendData.title).toBe('');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('EventCount');
        });

        it('treemap dataView multi category multi measure',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Continent', queryName: 'select0', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'EventCount', queryName: 'select1', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'MedalCount', queryName: 'select2', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];

            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['Africa', 'Asia', 'Australia', 'Europe', 'North America'],
                        identity: categoryIdentities,
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;

            var selectionIds: SelectionId[] = categoryIdentities.map((categoryId) => SelectionId.createWithId(categoryId));

            var nodes = rootNode.children;
            expect(nodes.length).toBe(5);

            var node: TreemapNode = <TreemapNode>nodes[0];
            expect(node.name).toBe('Africa');
            expect(node.size).toBe(320);
            expect(node.children).toBeDefined();
            expect(node.children.length).toBe(2);
            expect(node.key).toBe(selectionIds[0].getKey());

            node = <TreemapNode>nodes[1];
            expect(node.name).toBe('Asia');
            expect(node.size).toBe(340);
            expect(node.children).toBeDefined();
            expect(node.children.length).toBe(2);
            expect(node.key).toBe(selectionIds[1].getKey());

            node = <TreemapNode>nodes[2];
            expect(node.name).toBe('Australia');
            expect(node.size).toBe(360);
            expect(node.children).toBeDefined();
            expect(node.children.length).toBe(2);
            expect(node.key).toBe(selectionIds[2].getKey());

            node = <TreemapNode>nodes[3];
            expect(node.name).toBe('Europe');
            expect(node.size).toBe(380);
            expect(node.children).toBeDefined();
            expect(node.children.length).toBe(2);
            expect(node.key).toBe(selectionIds[3].getKey());

            node = <TreemapNode>nodes[4];
            expect(node.name).toBe('North America');
            expect(node.size).toBe(400);
            expect(node.children).toBeDefined();
            expect(node.children.length).toBe(2);
            expect(node.key).toBe(selectionIds[4].getKey());

            var childIds = [
                SelectionId.createWithIdAndMeasure(categoryIdentities[4], 'select1'),
                SelectionId.createWithIdAndMeasure(categoryIdentities[4], 'select2'),
            ];

            var childNode: TreemapNode = <TreemapNode>node.children[0];
            expect(childNode.name).toBe('EventCount');
            expect(childNode.size).toBe(150);
            expect(childNode.children).not.toBeDefined();
            expect((<TreemapNode>childNode).key).toBe(childIds[0].getKey());
            expect(childNode.color).toBe(node.color);

            childNode = <TreemapNode>node.children[1];
            expect(childNode.name).toBe('MedalCount');
            expect(childNode.size).toBe(250);
            expect(childNode.children).not.toBeDefined();
            expect((<TreemapNode>childNode).key).toBe(childIds[1].getKey());
            expect(childNode.color).toBe(node.color);

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('Continent');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('Africa');
        });

        it('treemap dataView multi series one measure',() => {

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Year', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'MedalCount', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
            ];

            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['2004', '2008', '2012'],
                        identity: categoryIdentities,
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;
            var selectionIds = [
                SelectionId.createWithId(categoryIdentities[0]),
                SelectionId.createWithId(categoryIdentities[2]),
            ];

            var nodes = rootNode.children;
            expect(nodes.length).toBe(3);
            expect(nodes[0].name).toBe('2004');
            expect(nodes[0].size).toBe(110);
            expect(nodes[0].children).not.toBeDefined();
            expect((<TreemapNode>nodes[0]).key).toBe(selectionIds[0].getKey());

            expect(nodes[2].name).toBe('2012');
            expect(nodes[2].size).toBe(130);
            expect(nodes[2].children).not.toBeDefined();
            expect((<TreemapNode>nodes[2]).key).toBe(selectionIds[1].getKey());

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('Year');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('2004');

        });

        it('treemap dataView multi category/series',() => {

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Continent', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'Year', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2004', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2008', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2012', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var seriesIdentities = [
                mocks.dataViewScopeIdentity(2004),
                mocks.dataViewScopeIdentity(2008),
                mocks.dataViewScopeIdentity(2012),
            ];

            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['Africa', 'Asia', 'Australia', 'Europe', 'North America'],
                        identity: categoryIdentities,
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[2],
                            values: [110, 120, 130, 140, 150],
                            identity: seriesIdentities[0],
                        }, {
                            source: metadata.columns[3],
                            values: [210, 220, 230, 240, 250],
                            identity: seriesIdentities[1],
                        }, {
                            source: metadata.columns[4],
                            values: [310, 320, 330, 340, 350],
                            identity: seriesIdentities[2],
                        }],
                        undefined,
                        metadata.columns[1])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;
            var selectionIds: SelectionId[] = [
                SelectionId.createWithId(categoryIdentities[0]),
                SelectionId.createWithId(categoryIdentities[4]),
                SelectionId.createWithIds(categoryIdentities[4], seriesIdentities[2]),
            ];

            var nodes = rootNode.children;
            expect(nodes.length).toBe(5);
            expect(nodes[0].name).toBe('Africa');
            expect(nodes[0].size).toBe(630);
            expect(nodes[0].children).toBeDefined();
            expect(nodes[0].children.length).toBe(3);
            expect((<TreemapNode>nodes[0]).key).toBe(selectionIds[0].getKey());

            var lastNode = (<TreemapNode>nodes[4]);
            expect(lastNode.name).toBe('North America');
            expect(lastNode.size).toBe(750);
            expect(lastNode.children).toBeDefined();
            expect(lastNode.children.length).toBe(3);
            expect(lastNode.key).toBe(selectionIds[1].getKey());

            var childNodes = lastNode.children;
            expect(childNodes[2].name).toBe('2012');
            expect(childNodes[2].size).toBe(350);
            expect(childNodes[2].children).not.toBeDefined();
            expect((<TreemapNode>childNodes[2]).key).toBe(selectionIds[2].getKey());
            childNodes.forEach(n => expect((<TreemapNode>n).color).toBe(lastNode.color));

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('Continent');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('Africa');
        });

        it('treemap dataView multi category/series with null values',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Continent', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'Year', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2004', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2008', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2012', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity(null),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var seriesIdentities = [
                mocks.dataViewScopeIdentity(2004),
                mocks.dataViewScopeIdentity(2008),
                mocks.dataViewScopeIdentity(2012),
            ];

            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: [null, 'Asia', 'Australia', 'Europe', 'North America'],
                        identity: categoryIdentities,
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[2],
                            values: [null, 120, 130, 140, null],
                            identity: seriesIdentities[0],
                        }, {
                            source: metadata.columns[3],
                            values: [210, 220, null, 240, null],
                            identity: seriesIdentities[1],
                        }, {
                            source: metadata.columns[4],
                            values: [null, 320, 330, 340, null],
                            identity: seriesIdentities[2],
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;

            var nodes = rootNode.children;
            expect(nodes.length).toBe(4);
            expect(nodes[0].name).toBe('(Blank)');
            expect(nodes[0].size).toBe(210);
            expect(nodes[0].children).toBeDefined();
            expect(nodes[0].children.length).toBe(1);
            expect((<TreemapNode>nodes[0]).key).toBe(SelectionId.createWithId(categoryIdentities[0]).getKey());

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('Continent');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('(Blank)');
            expect(treeMapData.legendData.dataPoints[1].label).toBe('Asia');
        });

        it('treemap dataView multi category/series with null values tooltip data test',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'Continent', properties: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'Year', properties: { "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2004', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2008', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: null, groupName: '2012', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities = [
                mocks.dataViewScopeIdentity(null),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var seriesIdentities = [
                mocks.dataViewScopeIdentity(2004),
                mocks.dataViewScopeIdentity(2008),
                mocks.dataViewScopeIdentity(2012),
            ];

            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: [null, 'Asia', 'Australia', 'Europe', 'North America'],
                        identity: categoryIdentities,
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[2],
                            values: [null, 120, 130, 140, null],
                            identity: seriesIdentities[0],
                        }, {
                            source: metadata.columns[3],
                            values: [210, 220, null, 240, null],
                            identity: seriesIdentities[1],
                        }, {
                            source: metadata.columns[4],
                            values: [null, 320, 330, 340, null],
                            identity: seriesIdentities[2],
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var rootNode = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport).root;

            var node1: TreemapNode = <TreemapNode>rootNode.children[0];
            var node11: TreemapNode = <TreemapNode>rootNode.children[0].children[0];
            var node2: TreemapNode = <TreemapNode>rootNode.children[1];
            var node3: TreemapNode = <TreemapNode>rootNode.children[2];
            var node4: TreemapNode = <TreemapNode>rootNode.children[3];

            expect(node1.tooltipInfo).toEqual([{ displayName: "Continent", value: "(Blank)" }]);
            expect(node11.tooltipInfo).toEqual([{ displayName: "Continent", value: "(Blank)" }, { displayName: null, value: "210" }]);

            expect(node2.tooltipInfo).toEqual([{ displayName: "Continent", value: "Asia" }, { displayName: null, value: "120" }]);

            expect(node3.tooltipInfo).toEqual([{ displayName: "Continent", value: "Australia" }, { displayName: null, value: "130" }]);
            expect(node4.tooltipInfo).toEqual([{ displayName: "Continent", value: "Europe" }, { displayName: null, value: "140" }]);
        });

        it('treemap non-categorical multi-measure tooltip values test',() => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'a', queryName: 'a', isMeasure: true },
                    { displayName: 'b', queryName: 'b', isMeasure: true },
                    { displayName: 'c', queryName: 'c', isMeasure: true }
                ]
            };

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadata.columns[0],
                            values: [1],
                        },
                        {
                            source: dataViewMetadata.columns[1],
                            values: [2],
                        },
                        {
                            source: dataViewMetadata.columns[2],
                            values: [3],
                        }
                    ])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var rootNode = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport).root;

            var node1: TreemapNode = <TreemapNode>rootNode.children[0];
            var node2: TreemapNode = <TreemapNode>rootNode.children[1];
            var node3: TreemapNode = <TreemapNode>rootNode.children[2];

            expect(node1.tooltipInfo).toEqual([{ displayName: 'a', value: '1' }]);
            expect(node2.tooltipInfo).toEqual([{ displayName: 'b', value: '2' }]);
            expect(node3.tooltipInfo).toEqual([{ displayName: 'c', value: '3' }]);
        });

        it('treemap dataView multi measure',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'EventCount', queryName: 'select1', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'MedalCount', queryName: 'select2', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[0],
                            values: [110]
                        }, {
                            source: metadata.columns[1],
                            values: [210]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;

            var selectionIds: SelectionId[] = metadata.columns.map((measure) => SelectionId.createWithMeasure(measure.queryName));

            var nodes = rootNode.children;
            expect(nodes.length).toBe(2);

            var node: TreemapNode = <TreemapNode>nodes[0];
            expect(node.name).toBe('EventCount');
            expect(node.size).toBe(110);
            expect(node.children).not.toBeDefined();
            expect(node.key).toBe(selectionIds[0].getKey());

            node = <TreemapNode>nodes[1];
            expect(node.name).toBe('MedalCount');
            expect(node.size).toBe(210);
            expect(node.children).not.toBeDefined();
            expect(node.key).toBe(selectionIds[1].getKey());

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('EventCount');
            expect(treeMapData.legendData.dataPoints[1].label).toBe('MedalCount');
        });

        it('treemap dataView single measure',() => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'EventCount', queryName: 'select1', isMeasure: true, properties: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var dataView: DataView = {
                metadata: metadata,
                categorical: {
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[0],
                            values: [110],
                        }
                    ]),
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var treeMapData = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport);
            var rootNode = treeMapData.root;

            var selectionIds: SelectionId[] = metadata.columns.map((measure) => SelectionId.createWithMeasure(measure.queryName));

            var nodes = rootNode.children;
            expect(nodes.length).toBe(1);

            var node: TreemapNode = <TreemapNode>nodes[0];
            expect(node.name).toBe('EventCount');
            expect(node.size).toBe(110);
            expect(node.children).not.toBeDefined();
            expect(node.key).toBe(selectionIds[0].getKey());

            var shapeColors = nodes.map(n => (<TreemapNode>n).color);
            expect(shapeColors).toEqual(ArrayExtensions.distinct(shapeColors));

            // Legend
            expect(treeMapData.legendData.title).toBe('');
            expect(treeMapData.legendData.dataPoints[0].label).toBe('EventCount');
        });

        it("treemap categories and measures with highlights tooltip data test", () => {
            var dataView: DataView = {
                metadata: dataViewMetadataCategoryAndMeasures,
                categorical: {
                    categories: [{
                        source: dataViewMetadataCategoryAndMeasures.columns[0],
                        values: ['Front end', 'Back end'],
                        identity: [
                            mocks.dataViewScopeIdentity('f'),
                            mocks.dataViewScopeIdentity('b'),
                        ],
                        identityFields: [categoryColumnRef],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewMetadataCategoryAndMeasures.columns[1],
                            values: [110, 120],
                            highlights: [60, 60]
                        }, {
                            source: dataViewMetadataCategoryAndMeasures.columns[2],
                            values: [210, 220],
                            highlights: [140, 200]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var rootNode = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport).root;
            var node1: TreemapNode = <TreemapNode>rootNode.children[0].children[0];
            var node2: TreemapNode = <TreemapNode>rootNode.children[0].children[1];
            var node3: TreemapNode = <TreemapNode>rootNode.children[1].children[0];
            var node4: TreemapNode = <TreemapNode>rootNode.children[1].children[1];

            expect(node1.tooltipInfo).toEqual([{ displayName: "Area", value: "Front end" }, { displayName: "BugsFiled", value: "110" }]);
            expect(node1.highlightedTooltipInfo).toEqual([{ displayName: "Area", value: "Front end" }, { displayName: "BugsFiled", value: "110" }, { displayName: powerbi.visuals.ToolTipComponent.localizationOptions.highlightedValueDisplayName, value: "60" }]);

            expect(node2.tooltipInfo).toEqual([{ displayName: "Area", value: "Front end" }, { displayName: "BugsFixed", value: "210" }]);
            expect(node2.highlightedTooltipInfo).toEqual([{ displayName: "Area", value: "Front end" }, { displayName: "BugsFixed", value: "210" }, { displayName: powerbi.visuals.ToolTipComponent.localizationOptions.highlightedValueDisplayName, value: "140" }]);

            expect(node3.tooltipInfo).toEqual([{ displayName: "Area", value: "Back end" }, { displayName: "BugsFiled", value: "120" }]);
            expect(node3.highlightedTooltipInfo).toEqual([{ displayName: "Area", value: "Back end" }, { displayName: "BugsFiled", value: "120" }, { displayName: powerbi.visuals.ToolTipComponent.localizationOptions.highlightedValueDisplayName, value: "60" }]);

            expect(node4.tooltipInfo).toEqual([{ displayName: "Area", value: "Back end" }, { displayName: "BugsFixed", value: "220" }]);
            expect(node4.highlightedTooltipInfo).toEqual([{ displayName: "Area", value: "Back end" }, { displayName: "BugsFixed", value: "220" }, { displayName: powerbi.visuals.ToolTipComponent.localizationOptions.highlightedValueDisplayName, value: "200" }]);
        });

        it("treemap gradient color test",() => {
            var dataPointColors = ["#d9f2fb", "#ff557f", "#b1eab7"];
            var objectDefinitions: powerbi.DataViewObjects[] = [
                { dataPoint: { fill: { solid: { color: dataPointColors[0] } } } },
                { dataPoint: { fill: { solid: { color: dataPointColors[1] } } } },
                { dataPoint: { fill: { solid: { color: dataPointColors[2] } } } }
            ];

            var dataViewGradientMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true, roles: { 'Gradient': true } }
                ]
            };

            var dataView: DataView = {
                metadata: dataViewGradientMetadata,
                categorical: {
                    categories: [{
                        source: dataViewGradientMetadata.columns[0],
                        values: ['Front end', 'Back end'],
                        objects: objectDefinitions,
                        identity: [
                            mocks.dataViewScopeIdentity('f'),
                            mocks.dataViewScopeIdentity('b'),
                        ]
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: dataViewGradientMetadata.columns[1],
                            values: [110, 120],
                            highlights: [60, 60]
                        }, {
                            source: dataViewGradientMetadata.columns[2],
                            values: [210, 220],
                            highlights: [140, 200]
                        }])
                }
            };

            var dataLabelSettings = powerbi.visuals.dataLabelUtils.getDefaultLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var rootNode = Treemap.converter(dataView, colors, dataLabelSettings, null, viewport, null).root;
            var node1: TreemapNode = <TreemapNode>rootNode.children[0];
            var node2: TreemapNode = <TreemapNode>rootNode.children[1];

            expect(node1.color).toEqual(dataPointColors[0]);
            expect(node2.color).toEqual(dataPointColors[1]);
        });
    });
}