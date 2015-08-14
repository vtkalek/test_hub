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

/// <reference path="../_references.ts"/>

module powerbitests {
    import ScatterChart = powerbi.visuals.ScatterChart;
    import ArrayExtensions = jsCommon.ArrayExtensions;
    import DataViewPivotCategorical = powerbi.data.DataViewPivotCategorical;
    import DataViewTransform = powerbi.data.DataViewTransform;
    import ColorUtility = utils.ColorUtility;
    import ValueType = powerbi.ValueType;
    import PrimitiveType = powerbi.PrimitiveType;

    import AxisType = powerbi.axisType;

    powerbitests.mocks.setLocale();

    var axisLabelVisibleMinHeight: number = powerbi.visuals.visualPluginFactory.MobileVisualPluginService.MinHeightAxesVisible;
    var axisLabelVisibleGreaterThanMinHeight: number = axisLabelVisibleMinHeight + 1;
    var axisLabelVisibleSmallerThanMinHeight: number = axisLabelVisibleMinHeight - 1;
    var axisLabelVisibleGreaterThanMinHeightString: string = axisLabelVisibleGreaterThanMinHeight.toString();
    var axisLabelVisibleSmallerThanMinHeightString: string = axisLabelVisibleSmallerThanMinHeight.toString();

    var legendVisibleMinHeight: number = powerbi.visuals.visualPluginFactory.MobileVisualPluginService.MinHeightLegendVisible;
    var legendVisibleGreaterThanMinHeight: number = legendVisibleMinHeight + 1;
    var legendVisibleSmallerThanMinHeight: number = legendVisibleMinHeight - 1;
    var legendVisibleGreaterThanMinHeightString: string = legendVisibleGreaterThanMinHeight.toString();
    var legendVisibleSmallerThanMinHeightString: string = legendVisibleSmallerThanMinHeight.toString();

    var labelColor = powerbi.visuals.dataLabelUtils.defaultLabelColor;
    
    describe("ScatterChart", () => {
        var categoryColumn: powerbi.DataViewMetadataColumn = { displayName: 'year', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) };
        var measureColumn: powerbi.DataViewMetadataColumn = { displayName: 'sales', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) };

        it('ScatterChart registered capabilities', () => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').capabilities).toBe(powerbi.visuals.scatterChartCapabilities);
        });

        it('Capabilities should include dataViewMappings', () => {
            expect(powerbi.visuals.scatterChartCapabilities.dataViewMappings).toBeDefined();
        });

        it('Capabilities should include dataRoles', () => {
            expect(powerbi.visuals.scatterChartCapabilities.dataRoles).toBeDefined();
        });

        it('Capabilities should not suppressDefaultTitle', () => {
            expect(powerbi.visuals.scatterChartCapabilities.suppressDefaultTitle).toBeUndefined();
        });

        it('FormatString property should match calculated',() => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(powerbi.visuals.scatterChartCapabilities.objects)).toEqual(powerbi.visuals.scatterChartProps.general.formatString);
        });

        it('preferred capability does not support zero rows', () => {
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

            expect(powerbi.DataViewAnalysis.supports(dataView, powerbi.visuals.scatterChartCapabilities.dataViewMappings[0], true))
                .toBe(false);
        });

        it('preferred capability does not support one row', () => {
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

            expect(powerbi.DataViewAnalysis.supports(dataView, powerbi.visuals.scatterChartCapabilities.dataViewMappings[0], true))
                .toBe(false);
        });
    });
    
    function scatterChartDomValidation(interactiveChart: boolean) {
        var v: powerbi.IVisual, element: JQuery;
        var dataViewMetadataFourColumn: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'col1', roles: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col3', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col4', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
            ]
        };

        var dataViewMetadata: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'col1', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'col2', isMeasure: true, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }],
        };

        var hostServices: powerbi.IVisualHostServices;

        beforeEach(() => {
            hostServices = powerbitests.mocks.createVisualHostServices();
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
            v.init({
                element: element,
                host: hostServices,
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true },
                interactivity: { isInteractiveLegend: interactiveChart },
            });
        });

        function getOptionsForValueWarnings(values: number[]) {
            var options = {
                dataViews: [{
                    metadata: dataViewMetadata,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: values,
                            subtotal: 2465000
                        }])
                    }
                }]
            };

            return options;
        }

        it('NaN in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var options = getOptionsForValueWarnings([500000, 495000, 490000, NaN, 500000]);
            v.onDataChanged(options);

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

            var options = getOptionsForValueWarnings([500000, 495000, 490000, Number.NEGATIVE_INFINITY, 500000]);
            v.onDataChanged(options);

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

            var options = getOptionsForValueWarnings([500000, 495000, 490000, Number.POSITIVE_INFINITY, 500000]);
            v.onDataChanged(options);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('InfinityValuesNotSupported');
                done();
            }, DefaultWaitForRender);
        });

        it('Out of range value in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var options = getOptionsForValueWarnings([500000, 495000, 490000, 1e301, 500000]);
            v.onDataChanged(options);

            setTimeout(() => {
                expect(warningSpy).toHaveBeenCalled();
                expect(warningSpy.calls.count()).toBe(1);
                expect(warningSpy.calls.argsFor(0)[0][0].code).toBe('ValuesOutOfRange');
                done();
            }, DefaultWaitForRender);
        });

        it('All okay in values shows a warning', (done) => {
            var warningSpy = jasmine.createSpy('warning');
            hostServices.setWarnings = warningSpy;

            var options = getOptionsForValueWarnings([500000, 495000, 490000, 480000, 500000]);
            v.onDataChanged(options);

            setTimeout(() => {
                expect(warningSpy).not.toHaveBeenCalled();
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart single measure dom validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                            subtotal: 2465000
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').first().text()).toBe('480K');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart two measure dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true, objects: { general: { formatString: '0%' } } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120, 130, 140, 150]
                            }, {
                                source: metadata.columns[2],
                                values: [.21, .22, .23, .24, .25]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').first().text()).toBe('110');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').first().text()).toBe('21%');
                expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(5);
                expect($('.scatterChart .mainGraphicsContext .dot')[0].style.fillOpacity).toBe("0");
                expect($('.scatterChart .mainGraphicsContext .dot')[0].style.strokeOpacity).toBe("0.85");
                expect($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r')).toBe('6');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart series dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', roles: { 'Series': true } },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true, objects: { general: { formatString: '0%' } } },
                    { displayName: 'col4', isMeasure: true },
                ]
            };
            v.onDataChanged({
                dataViews: [DataViewPivotCategorical.apply({
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b'],
                            identity: [
                                mocks.dataViewScopeIdentity('a'),
                                mocks.dataViewScopeIdentity('b'),
                            ]
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120]
                            }, {
                                source: metadata.columns[2],
                                values: [210, 220]
                            }, {
                                source: metadata.columns[3],
                                values: [310, 320]
                            }])
                    }
                })]
            });

            var legendClassSelector = interactiveChart ? ".interactive-legend" : '.legend';
            var itemsNumber = interactiveChart ? 3 : 2;
            setTimeout(() => {
                expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(2);
                var length = $(legendClassSelector + (interactiveChart ? ' .item' : 'Text')).length;
                expect($(legendClassSelector).length).toBe(1);
                expect(length).toBe(itemsNumber);
                if (!interactiveChart)
                    expect($('.legendTitle').text()).toBe('col1');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart measure and size dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120, 130, 140, 150]
                            }, {
                                source: metadata.columns[2],
                                values: [210, 220, 230, 240, 250]
                            }, {
                                source: metadata.columns[3],
                                values: [310, 320, 330, 340, 350]
                            }])
                    }
                }]
            });
            var r = interactiveChart ? 45 : 51.5;  // interactive legend is bigger
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').first().text()).toBe('110');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').first().text()).toBe('210');
                expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(5);
                var expectedR0 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r'));
                expect(expectedR0).toBeCloseTo(r, -0.31);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart gridline dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: [50000, 49500, 49000, 48000, 50000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .x.axis.showLinesOnAxis').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .y.axis.showLinesOnAxis').length).toBe(2);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart single category value dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'col3', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'col4', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a'],
                            identity: [mocks.dataViewScopeIdentity('a')],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110]
                            }, {
                                source: metadata.columns[2],
                                values: [210]
                            }, {
                                source: metadata.columns[3],
                                values: [310]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBe(4);
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').first().text()).toBe('80');
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').last().text()).toBe('140');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBe(3);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').first().text()).toBe('200');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').last().text()).toBe('400');
                expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(1);
                var r = (interactiveChart ? 45 : 51.5).toString();
                expect($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r')).toBe(r);
                expect($('.legendItem').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart no category dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'col3', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'col4', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: null,
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[0],
                                values: [110]
                            }, {
                                source: metadata.columns[1],
                                values: [210]
                            }, {
                                source: metadata.columns[2],
                                values: [310]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBe(4);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBe(3);
                expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(1);
                var r = (interactiveChart ? 45 : 51.5).toString();// interactive legend is bigger
                expect($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r')).toBe(r);
                expect($('.scatterChart .mainGraphicsContext .dot').find('title').first().text()).toBe('');
                expect($('.legendItem').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('empty scatter chart dom validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: []
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: []
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: []
                            }
                        ])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(0);
                done();
            }, DefaultWaitForRender);
        });

        it('ensure scatter chart is cleared when an empty dataview is applied', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: [50000, 49500, 49000, 48000, 50000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                var scatterCount = $('.scatterChart').find('.dot').length;
                expect(scatterCount).toBe(5);
                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadata,
                        categorical: {
                            categories: [{
                                source: dataViewMetadata.columns[0],
                                values: []
                            }],
                            values: DataViewTransform.createValueColumns([{
                                source: dataViewMetadata.columns[1],
                                values: [],
                                subtotal: 0
                            }])
                        }
                    }]
                });
                setTimeout(() => {
                    var scatterCount = $('.scatterChart').find('.dot').length;
                    expect(scatterCount).toBe(0);
                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });

        it('scatter chart with small interval dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [0.5, 2.0, 1.5, 1.0, 2.5]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.5, 2.0, 1.5, 1.0, 2.5]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1.2, 2.3, 1.8, 3.7, 2.6]
                            }
                        ])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').last().text()).toBe('2.50');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').last().text()).toBe('2.50');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart nested svg dom validation', () => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [5, 20, 15, 10, 25]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.5, 2.0, 1.5, 1.0, 2.5]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1.2, 2.3, 1.8, 3.7, 2.6]
                            }
                        ])
                    }
                }]
            });

            expect($('.scatterChart .mainGraphicsContext .dot').length).toBe(5);
            expect($('.scatterChart .mainGraphicsContext').find('svg')).toBeDefined();
        });

        it('scatter chart does not show less ticks dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [32, 45]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [26.125, 26.125]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [3, 5]
                            }
                        ])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(1);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').last().text()).toBe('30');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels dom validation', (done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'X-Axis', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'Size', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'Y-Axis', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120, 130, 140, 150]
                            }, {
                                source: metadata.columns[2],
                                values: [210, 220, 230, 240, 250]
                            }, {
                                source: metadata.columns[3],
                                values: [310, 320, 330, 340, 350]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').text()).toBe('X-Axis');
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').text()).toBe('Y-Axis');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart on small tile shows at least two tick lines dom validation', (done) => {
            v.onResizing({
                height: 101,
                width: 226
            });
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [3, 5, 7]
                            }
                        ])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').length).toBeGreaterThan(1);
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').first().text()).toBe('0.15');
                expect($('.scatterChart .axisGraphicsContext .y.axis .tick').find('text').last().text()).toBe('0.16');
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').length).toBeGreaterThan(1);
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').first().text()).toBe('0.15');
                expect($('.scatterChart .axisGraphicsContext .x.axis .tick').find('text').last().text()).toBe('0.16');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart onResize big tile radius dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [3, 15, 27],
                                min: 0,
                                max: 30
                            }
                        ])
                    }
                }]
            });

            v.onResizing({
                height: 500,
                width: 500
            });

            var r0, r1, r2;
            if (interactiveChart) {
                r0 = 42.5;
                r1 = 32.5;
                r2 = 18;
            } else {
                r0 = 49;
                r1 = 37.5;
                r2 = 20.5;
            }

            setTimeout(() => {
                var expectedR0 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r'));
                expect(expectedR0).toBeCloseTo(r0, -0.31);

                var expectedR1 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[1].getAttribute('r'));
                expect(expectedR1).toBeCloseTo(r1, -0.31);

                var expectedR2 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[2].getAttribute('r'));
                expect(expectedR2).toBeCloseTo(r2, -0.31);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart onResize medium tile radius dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [3, 15, 27],
                                min: 0,
                                max: 30
                            }
                        ])
                    }
                }]
            });

            v.onResizing({
                height: 300,
                width: 300
            });

            var r0, r1, r2;
            if (interactiveChart) {
                r0 = 23;
                r1 = 17.5;
                r2 = 9.5;
            } else {
                r0 = 29.5;
                r1 = 22.5;
                r2 = 12.5;
            };
            setTimeout(() => {
                var expectedR0 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r'));
                expect(expectedR0).toBeCloseTo(r0, -0.31);

                var expectedR1 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[1].getAttribute('r'));
                expect(expectedR1).toBeCloseTo(r1, -0.31);

                var expectedR2 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[2].getAttribute('r'));
                expect(expectedR2).toBeCloseTo(r2, -0.31);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart onResize small tile radius dom validation', (done) => {
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [0.1495, 0.15, 0.1633]
                            },
                            {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [3, 15, 27],
                                min: 0,
                                max: 30
                            }
                        ])
                    }
                }]
            });

            v.onResizing({
                height: 100,
                width: 200
            });

            var r0, r1, r2;
            if (interactiveChart) {
                r0 = 3.5;
                r1 = 2.5;
                r2 = 1.5;
            } else {
                r0 = 10;
                r1 = 7.5;
                r2 = 4;
            }
            setTimeout(() => {
                var expectedR0 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[0].getAttribute('r'));
                expect(expectedR0).toBeCloseTo(r0, -0.31);

                var expectedR1 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[1].getAttribute('r'));
                expect(expectedR1).toBeCloseTo(r1, -0.31);

                var expectedR2 = parseFloat($('.scatterChart .mainGraphicsContext .dot')[2].getAttribute('r'));
                expect(expectedR2).toBeCloseTo(r2, -0.31);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart zero axis line is darkened',(done) => {
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'X-Axis', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'Size', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'Y-Axis', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120, -130, 140, 150]
                            }, {
                                source: metadata.columns[2],
                                values: [210, -220, -230, 240, -250]
                            }, {
                                source: metadata.columns[3],
                                values: [-310, 320, 330, -340, 350]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var zeroTicks = $('g.tick:has(line.zero-line)');

                expect(zeroTicks.length).toBe(2);
                zeroTicks.each(function (i, item) {
                    expect(d3.select(item).datum() === 0).toBe(true);
                });

                done();
            }, DefaultWaitForRender);
        });
    }

    describe("scatterChart DOM validation", () => scatterChartDomValidation(false));

    describe("interactive scatterChart DOM validation", () => scatterChartDomValidation(true));

    //Data Labels
    function scatterChartDataLabelsValidation(interactiveChart: boolean) {
        var v: powerbi.IVisual, element: JQuery;
        var dataViewMetadata: powerbi.DataViewMetadata = {
            columns: [
                {
                    displayName: 'col1',
                    type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text)
                },
                {
                    displayName: 'col2',
                    isMeasure: true,
                    type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double),
                    format: '0.000'
                },
                {
                    displayName: 'col3',
                    isMeasure: false,
                    type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.DateTime),
                    format: 'd'
                }],
        };
        var hostServices = powerbitests.mocks.createVisualHostServices();

        var dataViewMetadataWithLabelsOnObject = powerbi.Prototype.inherit(dataViewMetadata);
        dataViewMetadataWithLabelsOnObject.objects = { categoryLabels: { show: true }, labels: { show: true, labelPrecision: 0 } };

        var dataViewMetadataWithLabelsOffObject = powerbi.Prototype.inherit(dataViewMetadata);
        dataViewMetadataWithLabelsOffObject.objects = { categoryLabels: { show: false } };

        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
            v.init({
                element: element,
                host: hostServices,
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true },
                interactivity: { isInteractiveLegend: interactiveChart },
            });
        });

        it('scatter chart show labels validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataWithLabelsOnObject.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadataWithLabelsOnObject.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBeGreaterThan(0);
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').first().text()).toBe('a');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart labels style validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataWithLabelsOnObject.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadataWithLabelsOnObject.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                var labelFill = $('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').first().css('fill');
                expect(ColorUtility.convertFromRGBorHexToHex(labelFill)).toBe(labelColor);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart labels custom style validation', (done) => {

            var color = { solid: { color: "rgb(255, 0, 0)" } }; // Red

            var dataViewMetadataWithLabelsFillObject = powerbi.Prototype.inherit(dataViewMetadata);
            dataViewMetadataWithLabelsFillObject.objects = { categoryLabels: { show: true, color: color }, labels: { show: true, labelPrecision: 0 } };

            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsFillObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataWithLabelsFillObject.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadataWithLabelsFillObject.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                var fill = $('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').first().css('fill');
                expect(ColorUtility.convertFromRGBorHexToHex(fill).toUpperCase()).toBe('#FF0000');
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart hide labels validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOffObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadataWithLabelsOffObject.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                            subtotal: 246500
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart data labels multi-series',(done) => {
            // Category and series are the same field
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: {
                    categoryLabels: { show: true },
                    // Force axis ranges to ensure data labels are visible
                    valueAxis: { start: 0, end: 100 },
                    categoryAxis: { start: -100, end: 300 },
                },
            };
            var seriesValues = ['a', 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: seriesValues,
                            identity: seriesIdentities,
                            identityFields: [seriesIdentityField],
                        }],
                        values: valueColumns
                    }
                }]
            });

            setTimeout(() => {
                var labels = $('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels');
                var dots = $('.scatterChart .axisGraphicsContext .mainGraphicsContext .dot');

                expect(dots.length).toBe(labels.length);

                for (var i = 0; i < dots.length; i++) {
                    var labelFill = labels.eq(i).css('fill');
                    expect(labelColor).toBe(ColorUtility.convertFromRGBorHexToHex(labelFill));
                }
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart interactiveLenged of data labels multi-series without categories should not be null',(done) => {
            // Category and series are the same field
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: {
                    categoryLabels: { show: true },
                    // Force axis ranges to ensure data labels are visible
                    valueAxis: { start: 0, end: 100 },
                    categoryAxis: { start: -100, end: 300 },
                },
            };
            var seriesValues = ['a', 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        values: valueColumns
                    }
                }]
            });

            setTimeout(() => {
                var interactiveLenged = $('.scatterChart .interactive-legend');
                var title = interactiveLenged.children('.title').children('span').last().text();

                if (interactiveChart) {
                    expect(title).toBe('a');
                }
                else {
                    expect(interactiveLenged.length).toBe(0);
                }

                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart with nulls dom validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: [null, 10, null, 15, null],
                            subtotal: 20
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBe(2);
                done();
            }, DefaultWaitForRender);
        });

        it('change scatter chart dom data label validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadataWithLabelsOnObject.columns[1],
                            values: [500000, 495000, 490000, 480000, 500000],
                        }])
                    }
                }]
            });

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBe(4);
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').first().text()).toBe('a');

                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadataWithLabelsOnObject,
                        categorical: {
                            categories: [{
                                source: dataViewMetadata.columns[0],
                                values: ['q', 'w', 'r', 't']
                            }],
                            values: DataViewTransform.createValueColumns([{
                                source: dataViewMetadataWithLabelsOnObject.columns[1],
                                values: [400, 500, 300, 200],
                            }])
                        }
                    }]
                });

                setTimeout(() => {
                    expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBe(4);
                    expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').first().text()).toBe('q');
                    done();
                }, DefaultWaitForRender);
            }, DefaultWaitForRender);
        });

        //empty dom
        it('empty scatter chart dom data labels validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: []
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: []
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        //One point
        it('scatter chart with single point dom data label validation', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataWithLabelsOnObject,
                    categorical: {
                        categories: [{
                            source: dataViewMetadata.columns[0],
                            values: ['a']
                        }],
                        values: DataViewTransform.createValueColumns([{
                            source: dataViewMetadata.columns[1],
                            values: [4]
                        }])
                    }
                }]
            });
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .mainGraphicsContext .data-labels').text()).toBe('a');
                done();
            }, DefaultWaitForRender);
        });

    }

    describe("scatterChart Data Labels validation", () => scatterChartDataLabelsValidation(false));

    describe("interactive scatterChart Data Labels validation", () => scatterChartDataLabelsValidation(true));

    describe("scatterChart bubble radius validation", () => {

        it('scatter chart getBubblePixelAreaSizeRange validation', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            var bubblePixelArea = ScatterChart.getBubblePixelAreaSizeRange(viewport, 100, 200);
            expect(bubblePixelArea.minRange).toBe(278);
            expect(bubblePixelArea.maxRange).toBe(556);
            expect(bubblePixelArea.delta).toBe(278);
        });

        it('scatter chart projectSizeToPixel validation', () => {
            var element = powerbitests.helpers.testDom('500', '500');
            var v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
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

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: metadata,
                    categorical: {
                        categories: [{
                            source: metadata.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: metadata.columns[1],
                                values: [110, 120, 130, 140, 150]
                            }, {
                                source: metadata.columns[2],
                                values: [210, 220, 230, 240, 250]
                            }, {
                                source: metadata.columns[3],
                                values: [310, 320, 330, 340, 350]
                            }])
                    }
                }]
            });

            var actualSizeDataRange = {
                minRange: 310,
                maxRange: 350,
                delta: 40
            };

            var bubblePixelAreaSizeRange = {
                minRange: 278,
                maxRange: 556,
                delta: 278
            };

            var projectedSize = ScatterChart.projectSizeToPixels(310, actualSizeDataRange, bubblePixelAreaSizeRange);
            expect(projectedSize).toBe(19);
            projectedSize = ScatterChart.projectSizeToPixels(320, actualSizeDataRange, bubblePixelAreaSizeRange);
            expect(projectedSize).toBe(21);
            projectedSize = ScatterChart.projectSizeToPixels(330, actualSizeDataRange, bubblePixelAreaSizeRange);
            expect(projectedSize).toBe(23);
        });
    });

    describe("scatterChart converter validation", () => {

        it('scatter chart dataView with role validation', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            // Category and series are the same field
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: { categoryLabels: { show: true } },
            };
            var seriesValues = ['a', 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: seriesValues,
                        identity: seriesIdentities,
                    }],
                    values: valueColumns,
                }
            };
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);

            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].category).toBe("a");
            expect(dataPoints[0].x).toBe(0);
            expect(dataPoints[0].y).toBe(10);
            expect(dataPoints[0].fill).toBeDefined();
            expect(dataPoints[0].fill).not.toBe(dataPoints[1].fill);
            expect(scatterChartData.xCol).toBe(metadata.columns[1]);
            expect(scatterChartData.size).toBe(metadata.columns[2]);
            expect(scatterChartData.yCol).toBe(metadata.columns[3]);

            // No legend if we don't have a field in legend
            expect(scatterChartData.legendData.dataPoints.map(l => l.label)).toEqual(['a', 'b', 'c']);
            var legendColors = scatterChartData.legendData.dataPoints.map(l => l.color);
            expect(legendColors).toEqual(ArrayExtensions.distinct(legendColors));

            expect(scatterChartData.legendData.title).toBe('series');

            //Tooltips
            expect(dataPoints[0].tooltipInfo).toEqual([{ displayName: 'series', value: 'a' }, { displayName: 'value1', value: '0' }, { displayName: 'value3', value: '10' }, { displayName: 'value2', value: '1' }]);
            expect(dataPoints[1].tooltipInfo).toEqual([{ displayName: 'series', value: 'b' }, { displayName: 'value1', value: '100' }, { displayName: 'value3', value: '20' }, { displayName: 'value2', value: '2' }]);
            expect(dataPoints[2].tooltipInfo).toEqual([{ displayName: 'series', value: 'c' }, { displayName: 'value1', value: '200' }, { displayName: 'value3', value: '30' }, { displayName: 'value2', value: '3' }]);
        });

        it('scatter chart null legend',() => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            // Category and series are the same field
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: null, isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: null, isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: null, isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: { categoryLabels: { show: true } },
            };
            var seriesValues = [null, 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            var groupedValues = valueColumns.grouped();
            groupedValues[0].objects = { dataPoint: { fill: { solid: { color: '#41BEE1' } } } };
            valueColumns.grouped = () => groupedValues;

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: seriesValues,
                        identity: seriesIdentities,
                    }],
                    values: valueColumns,
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var legendItems = scatterChartData.legendData.dataPoints;
            expect(legendItems[0].label).toBe(powerbi.visuals.valueFormatter.format(null));
            expect(legendItems[0].color).toBe('#41BEE1');

            var legendColors = legendItems.map(l => l.color);
            expect(legendColors).toEqual(ArrayExtensions.distinct(legendColors));

            //Tooltips
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].tooltipInfo).toEqual([{ displayName: 'series', value: '(Blank)' }, { displayName: 'value1', value: '0' }, { displayName: 'value3', value: '10' }, { displayName: 'value2', value: '1' }]);
            expect(dataPoints[1].tooltipInfo).toEqual([{ displayName: 'series', value: 'b' }, { displayName: 'value1', value: '100' }, { displayName: 'value3', value: '20' }, { displayName: 'value2', value: '2' }]);
            expect(dataPoints[2].tooltipInfo).toEqual([{ displayName: 'series', value: 'c' }, { displayName: 'value1', value: '200' }, { displayName: 'value3', value: '30' }, { displayName: 'value2', value: '3' }]);
        });

        it('scatter chart empty categories should return not-null category',() => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: { categoryLabels: { show: true } },
            };
            var seriesValues = [null, 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            var groupedValues = valueColumns.grouped();
            groupedValues[0].objects = { dataPoint: { fill: { solid: { color: '#41BEE1' } } } };
            valueColumns.grouped = () => groupedValues;

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    values: valueColumns,
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            expect(scatterChartData.dataPoints[0].category).not.toBe(null);
        });

        it('scatter chart dataView without role validation', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            
            // Category and series are the same field
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'series', isMeasure: false, queryName: 'series', type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                    { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "y", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "size", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "y", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "size", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "y", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                    { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "size", type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                ],
                objects: { categoryLabels: { show: true } },
            };
            var seriesValues = ['a', 'b', 'c'];
            var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
            var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

            var valueColumns = DataViewTransform.createValueColumns([
                {
                    source: metadata.columns[1],
                    values: [0, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[2],
                    values: [10, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[3],
                    values: [1, null, null],
                    identity: seriesIdentities[0],
                }, {
                    source: metadata.columns[4],
                    values: [null, 100, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[5],
                    values: [null, 20, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[6],
                    values: [null, 2, null],
                    identity: seriesIdentities[1],
                }, {
                    source: metadata.columns[7],
                    values: [null, null, 200],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[8],
                    values: [null, null, 30],
                    identity: seriesIdentities[2],
                }, {
                    source: metadata.columns[9],
                    values: [null, null, 3],
                    identity: seriesIdentities[2],
                }],
                [seriesIdentityField]);
            valueColumns.source = metadata.columns[0];

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: seriesValues,
                        identity: seriesIdentities,
                    }],
                    values: valueColumns,
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].category).toBe("a");
            expect(dataPoints[0].x).toBe(0);
            expect(dataPoints[0].y).toBe(10);
            expect(dataPoints[0].fill).toBeDefined();
            expect(dataPoints[0].fill).not.toBe(dataPoints[1].fill);
            var legendItems = scatterChartData.legendData.dataPoints;
            expect(legendItems.map(l => l.label)).toEqual(['a', 'b', 'c']);

            var legendColors = legendItems.map(l => l.color);
            expect(legendColors).toEqual(ArrayExtensions.distinct(legendColors));

            //Tooltips
            expect(dataPoints[0].tooltipInfo).toEqual([{ displayName: 'series', value: 'a' }, { displayName: 'value1', value: '0' }, { displayName: 'value2', value: '10' }, { displayName: 'value3', value: '1' }]);
            expect(dataPoints[1].tooltipInfo).toEqual([{ displayName: 'series', value: 'b' }, { displayName: 'value1', value: '100' }, { displayName: 'value2', value: '20' }, { displayName: 'value3', value: '2' }]);
            expect(dataPoints[2].tooltipInfo).toEqual([{ displayName: 'series', value: 'c' }, { displayName: 'value1', value: '200' }, { displayName: 'value2', value: '30' }, { displayName: 'value3', value: '3' }]);
        });

        it('scatter chart dataView with min/max', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [310, 320, 330, 340, 350],
                            min: 310,
                            max: 350
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);

            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].category).toBe("a");
            expect(dataPoints[0].x).toBe(110);
            expect(dataPoints[0].y).toBe(210);
            expect(ScatterChart.getBubbleRadius(dataPoints[0].radius, scatterChartData.sizeRange, viewport)).toBe(48.5);
        });

        it('scatter chart dataView with minLocal/maxLocal', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [310, 320, 330, 340, 350],
                            minLocal: 310,
                            maxLocal: 350
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].category).toBe("a");
            expect(dataPoints[0].x).toBe(110);
            expect(dataPoints[0].y).toBe(210);
            expect(ScatterChart.getBubbleRadius(dataPoints[0].radius, scatterChartData.sizeRange, viewport)).toBe(48.5);
            expect(dataPoints[0].fill).toBeDefined();
        });

        it('scatter chart dataView without min/minLocal/max/maxLocal', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [310, 320, 330, 340, 350],
                        }])
                }
            };
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].category).toBe("a");
            expect(dataPoints[0].x).toBe(110);
            expect(dataPoints[0].y).toBe(210);
            expect(ScatterChart.getBubbleRadius(dataPoints[0].radius, scatterChartData.sizeRange, viewport)).toBe(48.5);
            expect(dataPoints[0].fill).toBeDefined();
        });

        function getDataViewMultiSeries(firstGroupName: string = 'Canada', secondGroupName: string = 'United States'): powerbi.DataView {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: '',
                        format: 'yyyy',
                        type: ValueType.fromDescriptor({ dateTime: true })
                    }, {
                        displayName: ''
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
                        values: [
                            powerbitests.helpers.parseDateString("2012-01-01T00:00:00"),
                            powerbitests.helpers.parseDateString("2011-01-01T00:00:00"),
                            powerbitests.helpers.parseDateString("2010-01-01T00:00:00")
                        ],
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

        it('scatterChart multi-series', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var dataView: powerbi.DataView = getDataViewMultiSeries();

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors).dataPoints;
            expect(scatterChartData[0].category).toBe('1/1/2012');
            expect(scatterChartData[0].x).toBe(150);
            expect(scatterChartData[0].y).toBe(30);
            expect(scatterChartData[0].fill).toBeDefined();
            expect(scatterChartData[0].fill).not.toBe(scatterChartData[3].fill);

            //Tooltips
            expect(scatterChartData[0].tooltipInfo).toEqual([{ displayName: '', value: '2012' }, { displayName: '', value: 'Canada' }, { displayName: '', value: '150.00' }, { displayName: '', value: '30' }]);
            expect(scatterChartData[1].tooltipInfo).toEqual([{ displayName: '', value: '2012' }, { displayName: '', value: 'United States' }, { displayName: '', value: '100.00' }, { displayName: '', value: '300' }]);
            expect(scatterChartData[2].tooltipInfo).toEqual([{ displayName: '', value: '2011' }, { displayName: '', value: 'Canada' }, { displayName: '', value: '177.00' }, { displayName: '', value: '25' }]);
            expect(scatterChartData[3].tooltipInfo).toEqual([{ displayName: '', value: '2011' }, { displayName: '', value: 'United States' }, { displayName: '', value: '149.00' }, { displayName: '', value: '250' }]);
            expect(scatterChartData[4].tooltipInfo).toEqual([{ displayName: '', value: '2010' }, { displayName: '', value: 'Canada' }, { displayName: '', value: '157.00' }, { displayName: '', value: '28' }]);
            expect(scatterChartData[5].tooltipInfo).toEqual([{ displayName: '', value: '2010' }, { displayName: '', value: 'United States' }, { displayName: '', value: '144.00' }, { displayName: '', value: '280' }]);
        });

        it('scatterChart multi-series with default color', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var dataView: powerbi.DataView = getDataViewMultiSeries();

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var hexDefaultColorRed = "#FF0000";

            dataView.metadata = {
                columns: null,
                objects: { dataPoint: { defaultColor: { solid: { color: hexDefaultColorRed } } } }
            };

            var scatterChartData = ScatterChart.converter(dataView, viewport, colors, null).dataPoints;
            expect(scatterChartData[0].category).toBe('1/1/2012');
            expect(scatterChartData[0].x).toBe(150);
            expect(scatterChartData[0].y).toBe(30);
            expect(scatterChartData[0].fill).toBe(hexDefaultColorRed);
            expect(scatterChartData[0].fill).toBe(scatterChartData[2].fill);
            expect(scatterChartData[0].fill).toBe(scatterChartData[3].fill);
        });

        it('scatterChart multi-series with explicit colors',() => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var dataView: powerbi.DataView = getDataViewMultiSeries();

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            
            var groupedValues = dataView.categorical.values.grouped();
            groupedValues[0].objects = { dataPoint: { fill: { solid: { color: 'red' } } } };
            groupedValues[1].objects = { dataPoint: { fill: { solid: { color: 'green' } } } };
            dataView.categorical.values.grouped = () => groupedValues;

            var scatterChartData = ScatterChart.converter(dataView, viewport, colors, null).dataPoints;
            expect(scatterChartData[0].fill).toBe('red');
            expect(scatterChartData[1].fill).toBe('green');
        });

        it('scatterChart categorical with explicit colors',() => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };
            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true },
                    { displayName: 'col4', isMeasure: true }
                ]
            };
            var categoryValues = ['a', 'b', 'c', 'd', 'e'];
            var categoryIdentities = categoryValues.map(v => mocks.dataViewScopeIdentity(v));
            var categoryIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'category' });

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: categoryValues,
                        identity: categoryIdentities,
                        identityFields: [categoryIdentityField],
                        objects: [{ dataPoint: { fill: { solid: { color: '#41BEE0' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE1' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE2' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE3' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE4' } } } }]
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [310, 320, 330, 340, 350],
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;

            var scatterChartData = ScatterChart.converter(dataView, viewport, colors, null).dataPoints;
            expect(scatterChartData[0].fill).toBe('#41BEE0');
            expect(scatterChartData[1].fill).toBe('#41BEE1');
            expect(scatterChartData[2].fill).toBe('#41BEE2');
            expect(scatterChartData[3].fill).toBe('#41BEE3');
            expect(scatterChartData[4].fill).toBe('#41BEE4');
        });

        it('scatterChart multi-series with min/max', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var groupNames: string[] = [
                'Equipment Failure',
                'Scheduled Outage',
                'Trees/Vegetation',
                'Under Investigation',
                ''
            ];

            var columns = [
                {
                    format: '#,0.00',
                    index: 1
                }, {
                    
                    format: '#,0',
                    index: 2
                }, {
                    format: '#,0',
                    index: 3
                }
            ];

            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    {
                        displayName: '',
                        format: '0',
                        index: 0
                    }, {
                        displayName: '',
                        index: 4
                    }
                ]
            };

            for (var i = 0; i < groupNames.length; i++) {
                var groupName = groupNames[i];

                for (var j = 0; j < columns.length; j++) {
                    var column = {
                        displayName: groupName,
                        format: columns[j].format,
                        isMeasure: true,
                        index: columns[j].index
                    };

                    dataViewMetadata.columns.push(column);
                }
            }

            var colP1Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 't', column: 'p1' });
            var colP2Ref = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 't', column: 'p2' });

            var seriesNames: string[] = [
                'Bellevue, WA',
                'Deming, WA'
            ];
            
            var seriesIdentities = [
                mocks.dataViewScopeIdentityWithEquality(colP1Ref, seriesNames[0]),
                mocks.dataViewScopeIdentityWithEquality(colP1Ref, seriesNames[1])
            ];

            var seriesIdentiesForGroupNames = [
                mocks.dataViewScopeIdentityWithEquality(colP2Ref, groupNames[0]),
                mocks.dataViewScopeIdentityWithEquality(colP2Ref, groupNames[1]),
                mocks.dataViewScopeIdentityWithEquality(colP2Ref, groupNames[2]),
                mocks.dataViewScopeIdentityWithEquality(colP2Ref, groupNames[3])
            ];

            var dataViewValueColumns: powerbi.DataViewValueColumn[] = [
                {
                    source: dataViewMetadata.columns[2],
                    values: [null, null],
                    identity: seriesIdentiesForGroupNames[0],
                }, {
                    source: dataViewMetadata.columns[3],
                    values: [null, null],
                    identity: seriesIdentiesForGroupNames[0],
                }, {
                    source: dataViewMetadata.columns[4],
                    values: [null, null],
                    max: 404,
                    min: 1,
                    identity: seriesIdentiesForGroupNames[0],
                }, {
                    source: dataViewMetadata.columns[5],
                    values: [null, 353],
                    identity: seriesIdentiesForGroupNames[1],
                }, {
                    source: dataViewMetadata.columns[6],
                    values: [null, 8078.00000000163],
                    identity: seriesIdentiesForGroupNames[1],
                }, {
                    source: dataViewMetadata.columns[7],
                    values: [null, 4],
                    max: 404,
                    min: 1,
                    identity: seriesIdentiesForGroupNames[1],
                }, {
                    source: dataViewMetadata.columns[8],
                    values: [126439, null],
                    identity: seriesIdentiesForGroupNames[2],
                }, {
                    source: dataViewMetadata.columns[9],
                    values: [4244.000000003725, null],
                    identity: seriesIdentiesForGroupNames[2],
                }, {
                    source: dataViewMetadata.columns[10],
                    values: [1, null],
                    max: 404,
                    min: 1,
                    identity: seriesIdentiesForGroupNames[2],
                }, {
                    source: dataViewMetadata.columns[11],
                    values: [126439, null],
                    identity: seriesIdentiesForGroupNames[3],
                }, {
                    source: dataViewMetadata.columns[12],
                    values: [239.99999999650754, null],
                    identity: seriesIdentiesForGroupNames[3],
                }, {
                    source: dataViewMetadata.columns[13],
                    values: [1, null],
                    max: 404,
                    min: 1,
                    identity: seriesIdentiesForGroupNames[3],
                }
            ];

            var dataView: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: seriesNames,
                        identity: seriesIdentities,
                        identityFields: [
                            colP1Ref
                        ]
                    }],
                    values: DataViewTransform.createValueColumns(dataViewValueColumns, [colP2Ref])
                },
            };

            dataView.categorical.values.source = dataViewMetadata.columns[1];
            

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors).dataPoints;
            expect(scatterChartData[0].category).toBe('Bellevue, WA');
            expect(scatterChartData[0].x).toBe(126439);
            expect(scatterChartData[0].y).toBe(4244.000000003725);
            expect(scatterChartData[0].fill).toBeDefined();
            expect(scatterChartData[0].fill).not.toBe(scatterChartData[2].fill);
        });

        it('scatter chart dataView that should pivot categories', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: '', queryName: '$s1', index: 0 },
                    { displayName: '', queryName: '$s2', isMeasure: true, index: 1 },
                    { displayName: '', queryName: '$s3', isMeasure: true, index: 2 },
                    { displayName: '', queryName: '$s4', isMeasure: true, index: 3 }
                ]
            };

            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b'],
                        identity: [
                            mocks.dataViewScopeIdentity('a'),
                            mocks.dataViewScopeIdentity('b'),
                        ]
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220]
                        }, {
                            source: metadata.columns[3],
                            values: [310, 320]
                        }])
                }
            };
            var pivotedDataView = DataViewTransform.apply({
                prototype: dataView,
                objectDescriptors: powerbi.visuals.plugins.scatterChart.capabilities.objects,
                dataViewMappings: powerbi.visuals.plugins.scatterChart.capabilities.dataViewMappings,
                transforms: {
                    selects: [
                        { displayName: 'col1', queryName: '$s1', roles: { 'Series': true } },
                        { displayName: 'col2', queryName: '$s2', roles: { 'Y': true } },
                        { displayName: 'col3', queryName: '$s3', roles: { 'Size': true } },
                        { displayName: 'col4', queryName: '$s4', roles: { 'X': true } },
                    ]
                },
                colorAllocatorFactory: powerbi.visuals.createColorAllocatorFactory(),
            })[0];
            expect(pivotedDataView).not.toBe(dataView);

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(pivotedDataView, viewport, colors).dataPoints;
            expect(scatterChartData[0].category).toBe(powerbi.visuals.valueFormatter.format(null));
            expect(scatterChartData[0].fill).not.toBe(scatterChartData[1].fill);

            //Tooltips
            expect(scatterChartData[0].tooltipInfo).toEqual([{ displayName: 'col1', value: 'a' }, { displayName: 'col4', value: '310' }, { displayName: 'col2', value: '110' }, { displayName: 'col3', value: '210' }]);
            expect(scatterChartData[1].tooltipInfo).toEqual([{ displayName: 'col1', value: 'b' }, { displayName: 'col4', value: '320' }, { displayName: 'col2', value: '120' }, { displayName: 'col3', value: '220' }]);
        });

        it('scatter chart bubble color category no size', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
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

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].fill).toBe(dataPoints[1].fill);

            //Tooltips
            expect(dataPoints[0].tooltipInfo).toEqual([{ displayName: 'col1', value: 'a' }, { displayName: 'col3', value: '210' }, { displayName: 'col2', value: '110' }]);
            expect(dataPoints[1].tooltipInfo).toEqual([{ displayName: 'col1', value: 'b' }, { displayName: 'col3', value: '220' }, { displayName: 'col2', value: '120' }]);
            expect(dataPoints[2].tooltipInfo).toEqual([{ displayName: 'col1', value: 'c' }, { displayName: 'col3', value: '230' }, { displayName: 'col2', value: '130' }]);
            expect(dataPoints[3].tooltipInfo).toEqual([{ displayName: 'col1', value: 'd' }, { displayName: 'col3', value: '240' }, { displayName: 'col2', value: '140' }]);
            expect(dataPoints[4].tooltipInfo).toEqual([{ displayName: 'col1', value: 'e' }, { displayName: 'col3', value: '250' }, { displayName: 'col2', value: '150' }]);
        });

        it('scatter chart bubble color category no size default color', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "X": true } }
                ]
            };

            var hexDefaultColorRed = "#FF0000";

            metadata.objects = {
                dataPoint: { defaultColor: { solid: { color: hexDefaultColorRed } } }
            };            
           
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
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

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors, null);
            var dataPoints = scatterChartData.dataPoints;
            expect(dataPoints[0].fill).toBe(hexDefaultColorRed);
        });

        it('scatter chart null X axes values', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "Size": true } },
                    { displayName: 'col4', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                        objects: [{ dataPoint: { fill: { solid: { color: '#41BEE0' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE1' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE2' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE3' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE4' } } } }],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [null, null, null, null, null]
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var scatterChartDataPoints = scatterChartData.dataPoints;
            expect(scatterChartDataPoints.length).toBe(0);
        });

        it('scatter chart null Y axes values', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "Size": true } },
                    { displayName: 'col4', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [null, null, null, null, null]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [110, 120, 130, 140, 150]
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var scatterChartDataPoints = scatterChartData.dataPoints;
            expect(scatterChartDataPoints.length).toBe(0);
        });

        it('scatter chart null X measure', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true },
                    { displayName: 'col3', isMeasure: true, roles: { "Y": true } }
                ]
            };

            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e']
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: null
                        }
                        , {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var scatterChartDataPoints = scatterChartData.dataPoints;
            expect(scatterChartDataPoints.length).toBe(0);
        });

        it('scatter chart null Y measure', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col4', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView: powerbi.DataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                        objects: [{ dataPoint: { fill: { solid: { color: '#41BEE0' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE1' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE2' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE3' } } } },
                            { dataPoint: { fill: { solid: { color: '#41BEE4' } } } }],
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [210, 220, 230, 240, 250]
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var scatterChartDataPoints = scatterChartData.dataPoints;
            expect(scatterChartDataPoints[0].category).toBe('a');
            expect(scatterChartDataPoints[1].fill).toBe('#41BEE1');
            expect(scatterChartDataPoints[0].x).toBe(210);
            expect(scatterChartDataPoints[0].y).toBe(0);
        });

        it('scatter chart null X and Y measure', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: null
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var scatterChartDataPoints = scatterChartData.dataPoints;
            expect(scatterChartDataPoints.length).toBe(0);
        });

        it('scatter chart converter data labels default values', () => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "X": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a'],
                        identity: categoryIdentities,
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110]
                        }, {
                            source: metadata.columns[2],
                            values: [210]
                        }])
                }
            };
            var dataLabelsSettings = powerbi.visuals.dataLabelUtils.getDefaultPointLabelSettings();
            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;

            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            
            expect(scatterChartData.dataLabelsSettings).toEqual(dataLabelsSettings);
        });

        it('scatter chart bubble gradient color',() => {
            var viewport: powerbi.IViewport = {
                height: 500,
                width: 500
            };

            var metadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true, roles: { "Y": true } },
                    { displayName: 'col3', isMeasure: true, roles: { "X": true } },
                    { displayName: 'col4', isMeasure: true, roles: { "Size": true } },
                    { displayName: 'col5', isMeasure: true, roles: { "Gradient": true } }
                ]
            };
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            var objectDefinitions: powerbi.DataViewObjects[] = [
                { dataPoint: { fill: { solid: { color: "#d9f2fb" } } } },
                { dataPoint: { fill: { solid: { color: "#b1eab7" } } } },
                { dataPoint: { fill: { solid: { color: "#cceab7" } } } },
                { dataPoint: { fill: { solid: { color: "#b100b7" } } } },
                { dataPoint: { fill: { solid: { color: "#cceab7" } } } }
            ];
            var dataView = {
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: ['a', 'b', 'c', 'd', 'e'],
                        identity: categoryIdentities,
                        objects: objectDefinitions
                    }],
                    values: DataViewTransform.createValueColumns([
                        {
                            source: metadata.columns[1],
                            values: [110, 120, 130, 140, 150]
                        }, {
                            source: metadata.columns[2],
                            values: [210, 220, 230, 240, 250]
                        }, {
                            source: metadata.columns[3],
                            values: [10, 20, 15, 10, 100]
                        }, {
                            source: metadata.columns[4],
                            values: [13, 33, 55, 11, 55]
                        }])
                }
            };

            var colors = powerbi.visuals.visualStyles.create().colorPalette.dataColors;
            var scatterChartData = ScatterChart.converter(dataView, viewport, colors);
            var dataPoints = scatterChartData.dataPoints;
            
            expect(dataPoints[0].fill).toBe('#d9f2fb');
            expect(dataPoints[1].fill).toBe('#b1eab7');
            expect(dataPoints[2].fill).toBe('#cceab7');
            expect(dataPoints[3].fill).toBe('#b100b7');
            expect(dataPoints[4].fill).toBe('#cceab7');
        });
    });

    describe('scatterChart interactivity', () => {
        var v: powerbi.IVisual, element: JQuery;
        var hostServices: powerbi.IVisualHostServices;
        var dataViewMetadataFourColumn: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'col1', roles: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col3', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col4', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
            ]
        };
        
        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            hostServices = mocks.createVisualHostServices();
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
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

        it('scatter chart single select', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var mockEvent = {
                    abc: 'def',
                    stopPropagation: () => { },
                };

                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger(mockEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]
                    });

                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart repeated single select', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger1 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var trigger3 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[3]);
                var mockEvent = {
                    abc: 'def',
                    stopPropagation: () => { },
                };
                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger1(mockEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]
                    });
                trigger3(mockEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1]]
                            }
                        ]
                    });
                trigger3(mockEvent);
                expect(dots[0].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: []
                    });

                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart multi select', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger1 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var trigger3 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[3]);
                var trigger4 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[4]);
                var mockEvent = {
                    abc: 'def',
                    ctrlKey: true,
                    stopPropagation: () => { },
                };

                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger1(mockEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]
                    });
                trigger3(mockEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]

                    });
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1]]
                            }
                        ]

                    });
                trigger4(mockEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]], 
                            }
                        ]
                    });
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1]]
                            }
                        ]
                    });
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[0]]
                            }
                        ]
                    });
                trigger1(mockEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [                            
                            {
                                data: [categoryIdentities[0]]
                            }
                        ]
                    });
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart single and multi select', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var categoryIdentities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger1 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var trigger3 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[3]);
                var trigger4 = powerbitests.helpers.getClickTriggerFunctionForD3(dots[4]);
                var singleEvent = {
                    abc: 'def',
                    stopPropagation: () => { },
                };
                var multiEvent = {
                    abc: 'def',
                    ctrlKey: true,
                    stopPropagation: () => { },
                };

                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger1(singleEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]
                    });
                trigger3(multiEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            },
                        ]
                    });
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1]]
                            }
                        ]
                    });
                trigger1(singleEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                trigger4(multiEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[3]]
                            }
                        ]
                    });
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[0]]
                            }
                        ]
                    });
                trigger3(singleEvent);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data: [categoryIdentities[1]]
                            }
                        ]
                    });
                
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart external clear', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var identities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: identities
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var mockEvent = {
                    abc: 'def',
                    stopPropagation: () => { },
                };

                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger(mockEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data:
                                [
                                    identities[3]
                                ]
                            }
                        ]
                    });

                v.onClearSelection();
                expect(dots[0].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(defaultOpacity);

                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart clear on clearCatcher click', (done) => {
            var dimmedOpacity = ScatterChart.DimmedBubbleOpacity.toString();
            var defaultOpacity = ScatterChart.DefaultBubbleOpacity.toString();
            var identities: powerbi.DataViewScopeIdentity[] = [
                mocks.dataViewScopeIdentity('a'),
                mocks.dataViewScopeIdentity('b'),
                mocks.dataViewScopeIdentity('c'),
                mocks.dataViewScopeIdentity('d'),
                mocks.dataViewScopeIdentity('e'),
            ];
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: identities
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            });

            setTimeout(() => {
                var dots = element.find('.dot');
                var trigger = powerbitests.helpers.getClickTriggerFunctionForD3(dots[1]);
                var mockEvent = {
                    abc: 'def',
                    stopPropagation: () => { },
                };

                spyOn(hostServices, 'onSelect').and.callThrough();

                trigger(mockEvent);

                expect(dots.length).toBe(5);
                expect(dots[0].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[3].style.fillOpacity).toBe(dimmedOpacity);
                expect(dots[4].style.fillOpacity).toBe(dimmedOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: [
                            {
                                data:
                                [
                                    identities[3]
                                ]
                            }
                        ]
                    });

                (<any>($('.clearCatcher').last())).d3Click(0, 0);
                expect(dots[0].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[1].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[2].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[3].style.fillOpacity).toBe(defaultOpacity);
                expect(dots[4].style.fillOpacity).toBe(defaultOpacity);
                expect(hostServices.onSelect).toHaveBeenCalledWith(
                    {
                        data: []
                    });

                done();
            }, DefaultWaitForRender);
        });
    });

    describe("interactive legend scatterChart validation", () => {
        var v: powerbi.IVisual;
        var element: JQuery;
        var dataViewMetadataFourColumn: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'col1', roles: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer) },
                { displayName: 'col3', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer) },
                { displayName: 'col4', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Integer) }
            ]
        };
        var identities: powerbi.DataViewScopeIdentity[] = [
            mocks.dataViewScopeIdentity('a'),
            mocks.dataViewScopeIdentity('b'),
            mocks.dataViewScopeIdentity('c'),
            mocks.dataViewScopeIdentity('d'),
            mocks.dataViewScopeIdentity('e'),
        ];
        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
            v.init({
                element: element,
                host: powerbitests.mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                animation: { transitionImmediate: true },
                interactivity: { isInteractiveLegend: true },
            });
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                            identity: identities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [110, 120, 130, 140, 150]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [210, 220, 230, 240, 250]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [310, 320, 330, 340, 350]
                            }])
                    }
                }]
            });
        });

        it('Interaction scatter chart click validation', (done) => {
            var scatterChart = (<any>v).layers[0];
            var selectedCircle = scatterChart.mainGraphicsContext.selectAll('circle.dot').filter(function (d, i) { return d.category === 'd'; });
            var x = selectedCircle.attr('cx');
            var y = selectedCircle.attr('cy');
            var mouseCordinate = { x: x + 3, y: y + 2 };
            spyOn(scatterChart.interactivityService.behavior, 'getMouseCoordinates').and.returnValue(mouseCordinate);
            scatterChart.interactivityService.behavior.onClick();
            setTimeout(() => {
                validateInteraction(x, y, scatterChart);
                done();
            }, DefaultWaitForRender);
        });

        it('Scatter chart drag interaction validation', (done) => {
            var scatterChart = (<any>v).layers[0];
            var selectedCircle = scatterChart.mainGraphicsContext.selectAll('circle.dot').filter(function (d, i) { return d.category === 'd'; });
            var x = selectedCircle.attr('cx');
            var y = selectedCircle.attr('cy');
            var mouseCordinate = { x: x, y: y };
            spyOn(scatterChart.interactivityService.behavior, 'getMouseCoordinates').and.returnValue(mouseCordinate);
            scatterChart.interactivityService.behavior.onDrag();
            setTimeout(() => {
                validateInteraction(x, y, scatterChart);
                done();
            }, DefaultWaitForRender);
        });

        it('Interaction scatter chart dotClick validation', (done) => {
            var scatterChart = (<any>v).layers[0];
            var selectedCircle = scatterChart.mainGraphicsContext.selectAll('circle.dot').filter(function (d, i) { return d.category === 'd'; });
            var x = selectedCircle.attr('cx');
            var y = selectedCircle.attr('cy');
            var selectedDotIndex = scatterChart.interactivityService.behavior.findClosestDotIndex(x, y);
            scatterChart.interactivityService.behavior.selectDotByIndex(selectedDotIndex);
            setTimeout(() => {
                validateInteraction(x, y, scatterChart);
                done();
            }, DefaultWaitForRender);
        });
    });

    function validateInteraction(x: number, y: number, scatterChart: any): void {
        //test crosshair position
        expect(scatterChart.interactivityService.behavior.crosshair.select(".horizontal").attr('y1')).toBe(y.toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".horizontal").attr('y2')).toBe(y.toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".vertical").attr('x1')).toBe(x.toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".vertical").attr('x2')).toBe(x.toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".horizontal").attr('x1')).toBe('0');
        expect(scatterChart.interactivityService.behavior.crosshair.select(".horizontal").attr('x2')).toBe(scatterChart.mainGraphicsContext.attr('width').toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".vertical").attr('y1')).toBe(scatterChart.mainGraphicsContext.attr('height').toString());
        expect(scatterChart.interactivityService.behavior.crosshair.select(".vertical").attr('y2')).toBe('0');

        //test style => dot 3 should be selected
        expect(scatterChart.mainGraphicsContext.selectAll('circle.dot').filter(function (d, i) { return (d.x !== 140) && (d.y !== 240); }).attr('class')).toBe("dot notSelected");
        expect(scatterChart.mainGraphicsContext.selectAll('circle.dot').filter(function (d, i) { return (d.x === 140) && (d.y === 240); }).attr('class')).toBe("dot selected");
        //test legend
        expect($('.interactive-legend').find('.title').text().trim()).toMatch("d");
        expect($('.interactive-legend').find('.item').find('.itemName')[0].innerText.trim()).toBe('col2');
        expect($('.interactive-legend').find('.item').find('.itemName')[1].innerText.trim()).toBe('col4');
        expect($('.interactive-legend').find('.item').find('.itemName')[2].innerText.trim()).toBe('col3');
        expect($('.interactive-legend').find('.item').find('.itemMeasure')[0].innerText.trim()).toBe('140');
        expect($('.interactive-legend').find('.item').find('.itemMeasure')[1].innerText.trim()).toBe('340');
        expect($('.interactive-legend').find('.item').find('.itemMeasure')[2].innerText.trim()).toBe('240');
    }

    describe("scatterChart axis label existence validation", () => {

        it('scatter chart axis labels existence dom validation with viewport height greater than axisLabelVisibleMinHeight non-interactive', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleGreaterThanMinHeightString, axisLabelVisibleGreaterThanMinHeightString, false, false);
         
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height greater than axisLabelVisibleMinHeight interactive', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleGreaterThanMinHeightString, axisLabelVisibleGreaterThanMinHeightString, true, false);
            
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height smaller than axisLabelVisibleMinHeight non-interactive', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleSmallerThanMinHeightString, axisLabelVisibleSmallerThanMinHeightString, false, false);
        
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height smaller than axisLabelVisibleMinHeight interactive', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleSmallerThanMinHeightString, axisLabelVisibleSmallerThanMinHeightString, true, false);
          
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height smaller than axisLabelVisibleMinHeight non-interactive mobile', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleSmallerThanMinHeightString, axisLabelVisibleSmallerThanMinHeightString, false, true);

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(0);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height greater than axisLabelVisibleMinHeight non-interactive mobile', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleGreaterThanMinHeightString, axisLabelVisibleGreaterThanMinHeightString, false, true);
         
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height smaller than axisLabelVisibleMinHeight interactive mobile', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleSmallerThanMinHeightString, axisLabelVisibleSmallerThanMinHeightString, true, true);

            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart axis labels existence dom validation with viewport height greater than axisLabelVisibleMinHeight interactive mobile', (done) => {
            testAxisAndLegendExistence(axisLabelVisibleGreaterThanMinHeightString, axisLabelVisibleGreaterThanMinHeightString, true, true);
        
            setTimeout(() => {
                expect($('.scatterChart .axisGraphicsContext .xAxisLabel').length).toBe(1);
                expect($('.scatterChart .axisGraphicsContext .yAxisLabel').length).toBe(1);
                done();
            }, DefaultWaitForRender);
        });
    });

    describe("scatterChart legends existence validation", () => {

        it('scatter chart legends existence dom validation with viewport height greater than legendVisibleMinHeight non-interactive', (done) => {
            testAxisAndLegendExistence(legendVisibleGreaterThanMinHeightString, "500", false, false);
           
            setTimeout(() => {
                expect($('.legendText').length).toBe(3);
                expect($('.legendItem').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart legends existence dom validation with viewport height smaller than legendVisibleMinHeight non-interactive', (done) => {
            testAxisAndLegendExistence(legendVisibleSmallerThanMinHeightString, "500", false, false);

            setTimeout(() => {
                expect($('.legendText').length).toBe(3);
                expect($('.legendItem').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart legends existence dom validation with viewport height smaller than legendVisibleMinHeight non-interactive mobile', (done) => {
            testAxisAndLegendExistence(legendVisibleSmallerThanMinHeightString, legendVisibleSmallerThanMinHeightString, false, true);
           
            setTimeout(() => {
                expect($('.legend .label').length).toBe(0);
                expect($('.legend .item').length).toBe(0);
                done();
            }, DefaultWaitForRender);
        });

        it('scatter chart legends existence dom validation with viewport height greater than legendVisibleMinHeight non-interactive mobile', (done) => {
            testAxisAndLegendExistence(legendVisibleGreaterThanMinHeightString,"500", false, true);

            setTimeout(() => {
                expect($('.legendText').length).toBe(3);
                expect($('.legendItem').length).toBe(3);
                done();
            }, DefaultWaitForRender);
        });
    });

    describe("Enumerate Objects", () => {
        var v: powerbi.IVisual, element: JQuery;
        var dataViewMetadataFourColumn: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'col1', roles: { "Category": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'col2', isMeasure: true, roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col3', isMeasure: true, roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'col4', isMeasure: true, roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) }
            ]
        };
        
        beforeEach(() => {
            element = powerbitests.helpers.testDom('500', '500');
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
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
            var categoryValues = ['a', 'b', 'c', 'd', 'e'];
            var categoryIdentities = categoryValues.map(v => mocks.dataViewScopeIdentity(v));
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: categoryValues,
                            identity: categoryIdentities,
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [100, 200, 300, 400, 500]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            };

            v.onDataChanged(dataChangedOptions);

            setTimeout(() => {
                var points = v.enumerateObjectInstances({ objectName: 'dataPoint' });
                expect(points.length).toBe(7);
                expect(points[0].properties['defaultColor']).toBeDefined();
                expect(points[1].properties['showAllDataPoints']).toBeDefined();
                for (var i = 2; i < points.length; i++) {
                    expect(_.contains(categoryValues, points[i].displayName)).toBeTruthy();
                    expect(points[i].properties['fill']).toBeDefined();
                }
                done();
            }, DefaultWaitForRender);
        });

        it('enumerateObjectInstances: Verify x-axis property card for scatter chart',() => {
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: ['a', 'b', 'c', 'd', 'e'],
                        }],
                        values: DataViewTransform.createValueColumns([
                            {
                                source: dataViewMetadataFourColumn.columns[1],
                                values: [1, 2, 3, 4, 5]
                            }, {
                                source: dataViewMetadataFourColumn.columns[2],
                                values: [200, 400, 600, 800, 1000]
                            }, {
                                source: dataViewMetadataFourColumn.columns[3],
                                values: [1, 2, 3, 4, 5]
                            }])
                    }
                }]
            };

            v.onDataChanged(dataChangedOptions);

                var points = v.enumerateObjectInstances({ objectName: 'categoryAxis' });                

                expect('start' in points[0].properties).toBeTruthy();//better to check if the index key is found
                expect('end' in points[0].properties).toBeTruthy();
                expect('axisType' in points[0].properties).toBeFalsy();
                expect('show' in points[0].properties).toBeTruthy();
                expect('showAxisTitle' in points[0].properties).toBeTruthy();
                expect('axisStyle' in points[1].properties).toBeTruthy();
        });

        it('X-axis customization: Test forced domain (start and end)',() => {
            dataViewMetadataFourColumn.objects = {
                categoryAxis: {
                    show: true,
                    start: 0,
                    end: 25,
                    axisType: AxisType.scalar,
                    showAxisTitle: true,
                    axisStyle: true
                }
            };
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: [1, 2, 3, 4, 5],
                        }]
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            var labels = $('.x.axis').children('.tick');

            expect(labels[0].textContent).toBe('0');
            expect(labels[labels.length -1].textContent).toBe('25');

        });

        it('Y-axis customization: Test forced domain (start and end)',() => {
            dataViewMetadataFourColumn.objects = {
                valueAxis: {
                    show: true,
                    position: 'Right',
                    start: 0,
                    end: 500,                    
                    showAxisTitle: true,
                    axisStyle: true
                }
            };
            var dataChangedOptions = {
                dataViews: [{
                    metadata: dataViewMetadataFourColumn,
                    categorical: {
                        categories: [{
                            source: dataViewMetadataFourColumn.columns[0],
                            values: [1, 2, 3, 4, 5],
                        }]
                    }
                }]
            };
            v.onDataChanged(dataChangedOptions);

            var labels = $('.y.axis').children('.tick');

            expect(labels[0].textContent).toBe('0');
            expect(labels[labels.length - 1].textContent).toBe('500');

        });
    });

    function testAxisAndLegendExistence(domSizeHeightString: string, domSizeWidthString: string, isInteractive: boolean, isMobile: boolean): void {
        var element = powerbitests.helpers.testDom(domSizeHeightString, domSizeWidthString);
        var v;
        if (isMobile) {
            v = powerbi.visuals.visualPluginFactory.createMobile().getPlugin('scatterChart').create();
        } else {
            v = powerbi.visuals.visualPluginFactory.create().getPlugin('scatterChart').create();
        }
        v.init({
            element: element,
            host: powerbitests.mocks.createVisualHostServices(),
            style: powerbi.visuals.visualStyles.create(),
            viewport: {
                height: element.height(),
                width: element.width()
            },
            animation: { transitionImmediate: true },
            interactivity: { isInteractiveLegend: isInteractive },
        });

        // Category and series are the same field
        var metadata: powerbi.DataViewMetadata = {
            columns: [
                { displayName: 'series', isMeasure: false, queryName: 'series', roles: { "Category": true, "Series": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Text) },
                { displayName: 'value1', groupName: 'a', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value2', groupName: 'a', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value3', groupName: 'a', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value1', groupName: 'b', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value2', groupName: 'b', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value3', groupName: 'b', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value1', groupName: 'c', isMeasure: true, queryName: "x", roles: { "X": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value2', groupName: 'c', isMeasure: true, queryName: "size", roles: { "Size": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
                { displayName: 'value3', groupName: 'c', isMeasure: true, queryName: "y", roles: { "Y": true }, type: ValueType.fromPrimitiveTypeAndCategory(PrimitiveType.Double) },
            ],
            objects: { categoryLabels: { show: true } },
        };
        var seriesValues = ['a', 'b', 'c'];
        var seriesIdentities = seriesValues.map(v => mocks.dataViewScopeIdentity(v));
        var seriesIdentityField = powerbi.data.SQExprBuilder.fieldDef({ schema: 's', entity: 'e', column: 'series' });

        var valueColumns = DataViewTransform.createValueColumns([
            {
                source: metadata.columns[1],
                values: [0, null, null],
                identity: seriesIdentities[0],
            }, {
                source: metadata.columns[2],
                values: [1, null, null],
                identity: seriesIdentities[0],
            }, {
                source: metadata.columns[3],
                values: [10, null, null],
                identity: seriesIdentities[0],
            }, {
                source: metadata.columns[4],
                values: [null, 100, null],
                identity: seriesIdentities[1],
            }, {
                source: metadata.columns[5],
                values: [null, 2, null],
                identity: seriesIdentities[1],
            }, {
                source: metadata.columns[6],
                values: [null, 20, null],
                identity: seriesIdentities[1],
            }, {
                source: metadata.columns[7],
                values: [null, null, 200],
                identity: seriesIdentities[2],
            }, {
                source: metadata.columns[8],
                values: [null, null, 3],
                identity: seriesIdentities[2],
            }, {
                source: metadata.columns[9],
                values: [null, null, 30],
                identity: seriesIdentities[2],
            }],
            [seriesIdentityField]);
        valueColumns.source = metadata.columns[0];

        v.onDataChanged({
            dataViews: [{
                metadata: metadata,
                categorical: {
                    categories: [{
                        source: metadata.columns[0],
                        values: seriesValues,
                        identity: seriesIdentities,
                        identityFields: [seriesIdentityField],
                    }],
                    values: valueColumns
                }
            }]
        });
    }
}
