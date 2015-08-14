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
    import Card = powerbi.visuals.Card;
    import DataViewTransform = powerbi.data.DataViewTransform;
    import ValueType = powerbi.ValueType;
    import SVGUtil = powerbi.visuals.SVGUtil;
   
    describe("Card", () => {
        it('Card_registered_capabilities', () => {
            expect(powerbi.visuals.visualPluginFactory.create().getPlugin('card').capabilities).toBe(Card.capabilities);
        });

        it('Capabilities should include dataViewMappings', () => {
            expect(Card.capabilities.dataViewMappings).toBeDefined();
            expect(Card.capabilities.dataViewMappings.length).toBe(1);
        });

        it('Capabilities should have condition',() => {
            expect(Card.capabilities.dataViewMappings[0].conditions[0][Card.capabilities.dataRoles[0].name].max).toBe(1);
        });

        it('Capabilities should include dataRoles', () => {
            expect(Card.capabilities.dataRoles).toBeDefined();
            expect(Card.capabilities.dataRoles.length).toBe(1);
        });

        it('Capabilities should suppressDefaultTitle',() => {
            expect(Card.capabilities.suppressDefaultTitle).toBe(true);
        });

        it('FormatString property should match calculated',() => {
            expect(powerbi.data.DataViewObjectDescriptors.findFormatString(Card.capabilities.objects)).toEqual(Card.formatStringProp);
        });

        it('cardChart preferred capabilities requires at most 1 row', () => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'col1' },
                    { displayName: 'col2', isMeasure: true }]
            };

            var dataViewWithTwoRows: powerbi.DataView = {
                metadata: dataViewMetadata,
                categorical: {
                    categories: [{
                        source: dataViewMetadata.columns[0],
                        values: ['John Domo', 'Delta Force'],
                        identity: [mocks.dataViewScopeIdentity('a'), mocks.dataViewScopeIdentity('b')]
                    }],
                    values: DataViewTransform.createValueColumns([{
                        source: dataViewMetadata.columns[1],
                        values: [100, 200],
                        subtotal: 300
                    }])
                }
            };

            var plugin = powerbi.visuals.visualPluginFactory.create().getPlugin('card');
            expect(powerbi.DataViewAnalysis.supports(dataViewWithTwoRows, plugin.capabilities.dataViewMappings[0], true)).toBe(false);
        });

        it('cardChart preferred capabilities requires 1 row', () => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'numeric', type: ValueType.fromDescriptor({ numeric: true }) }
                ],
            };

            var data: powerbi.DataView = {
                metadata: dataViewMetadata,
                single: { value: 123.456 }
            };

            var plugin = powerbi.visuals.visualPluginFactory.create().getPlugin('card');
            expect(powerbi.DataViewAnalysis.supports(data, plugin.capabilities.dataViewMappings[0], true)).toBe(true);
        });
    });

    describe("Card DOM tests", () => {
        var v: Card, element: JQuery;
        var dataViewMetadata: powerbi.DataViewMetadata = {
            columns: [{ displayName: 'col1', isMeasure: true, objects: { 'general': { formatString: '#0' } } }],
            groups: [],
            measures: [0],
        };
        var cardStyles = Card.DefaultStyle.card;

        beforeEach(() => {
            createCard();
        });

        function createCard(displayUnitSystemType?: powerbi.DisplayUnitSystemType): void {
            element = powerbitests.helpers.testDom('200', '300');
            v = <Card> new Card({ displayUnitSystemType: displayUnitSystemType});

            v.init({
                element: element,
                host: mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
            });
        }

        it('Card_getAdjustedFontHeight with seed font size fitting in available width but equal/larger than MaxFontSize', () => {
            v.currentViewport = {
                height: 500,
                width: 500
            };
            expect(v.getAdjustedFontHeight(v.currentViewport.width, "t", cardStyles.maxFontSize)).toBe(cardStyles.maxFontSize);
            expect(v.getAdjustedFontHeight(v.currentViewport.width, "t", cardStyles.maxFontSize + 5)).toBe(cardStyles.maxFontSize);
        });

        it('Card_getAdjustedFontHeight with seed font size not fitting in available width and smaller than MaxFontSize', () => {
            v.currentViewport = {
                height: 30,
                width: 30
            };
            expect(v.getAdjustedFontHeight(v.currentViewport.width, "t", cardStyles.maxFontSize)).toBeLessThan(cardStyles.maxFontSize);
        });

        it('Card_onDataChanged (single value)', () => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: '7191394482447.7'
                    }
                }]
            });

            v.onResizing({
                height: element.height(),
                width: element.width()
            });

            expect($('.card')).toBeInDOM();
            expect($('.mainText')).toBeInDOM();
            var titleText = $('.card').find('title').text();
            expect(titleText).toBe('7191394482447.7');
        });

        it('Card_onDataChanged (0)', () => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 0
                    }
                }]
            });

            expect($('.card')).toBeInDOM();
            expect($('.mainText')).toBeInDOM();
            var titleText = $('.card').find('title').text();
            expect(titleText).toBe('0');
        });

        it('Card with null dataview', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 0
                    }
                }]
            });

            setTimeout(() => {
                expect($('.mainText').first().text()).toBe('0');
                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadata,
                        single: {
                            value: null
                        }
                    }]
                });
                setTimeout(() => {
                    expect($('.mainText').first().text()).toBe('(Blank)');
                    done();
                }, DefaultWaitForRender);

            }, DefaultWaitForRender);
        });

        it('Card updated with undefined dataview', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 0
                    }
                }]
            });

            setTimeout(() => {
                expect($('.mainText').first().text()).toBe('0');
                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadata,
                        single: {
                            value: undefined
                        }
                    }]
                });
                setTimeout(() => {
                    expect($('.mainText').first().text()).toBe('');
                    done();
                }, DefaultWaitForRender);

            }, DefaultWaitForRender);
        });

        it('Card_onDataChanged formats number < 10000', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 85.23498239847123
                    }
                }]
            });

            expect($('.card')).toBeInDOM();
            expect($('.mainText')).toBeInDOM();
            SVGUtil.flushAllD3Transitions();
            setTimeout(() => {
                expect($('.mainText').text()).toEqual('85');
                done();
            }, DefaultWaitForRender);
        });

        it('Card_onDataChanged verbose display units (explore mode)', (done) => {
            createCard(powerbi.DisplayUnitSystemType.Verbose);

            var spy = spyOn(powerbi.visuals.valueFormatter, 'create');
            spy.and.callThrough();

            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 900000
                    }
                }]
            });

            expect($('.card')).toBeInDOM();
            expect($('.mainText')).toBeInDOM();
            setTimeout(() => {
                expect(spy.calls.count()).toBe(1);

                var args = spy.calls.argsFor(0);
                expect(args).toBeDefined();

                expect(args[0].displayUnitSystemType).toBe(powerbi.DisplayUnitSystemType.Verbose);
                done();
            }, DefaultWaitForRender);
        });

        it('Card_onDataChanged whole display units (dashboard tile mode, default)', (done) => {
            var spy = spyOn(powerbi.visuals.valueFormatter, 'create');
            spy.and.callThrough();

            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 900000
                    }
                }]
            });

            expect($('.card')).toBeInDOM();
            expect($('.mainText')).toBeInDOM();
            setTimeout(() => {
                expect(spy.calls.count()).toBe(1);

                var args = spy.calls.argsFor(0);
                expect(args).toBeDefined();

                expect(args[0].displayUnitSystemType).toBe(powerbi.DisplayUnitSystemType.WholeUnits);
                done();
            }, DefaultWaitForRender);
        });

        it('Card with DateTime value on dashboard',(done) => {
            var dateValue = new Date(2015, 5, 20);
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'date', type: powerbi.ValueType.fromDescriptor({ dateTime: true }), isMeasure: true }
                ],
            };
            v.init({
                element: element,
                host: mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
            });
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: dateValue
                    }
                }]
            });

            setTimeout(() => {
                expect($('.mainText').first().text()).toBe('6/20/2015');
                done();
            }, DefaultWaitForRender);
        });

        it('Card text alignment',(done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 900000
                    }
                }]
            });

            var smallTileViewport = {
                height: 170,
                width: 250
            };

            v.onResizing(smallTileViewport);

            setTimeout(() => {
                var transform = SVGUtil.parseTranslateTransform($('.mainText').first().attr('transform'));
                expect(transform.x).toBe('125');
                expect($('.mainText').first().attr('text-anchor')).toBe('middle');
                done();
            }, DefaultWaitForRender);
        });
    });

    describe("Card tests on Minerva",() => {
        var v: Card, element: JQuery;
        var dataViewMetadata: powerbi.DataViewMetadata = {
            columns: [{ displayName: 'col1', isMeasure: true, format: '#0' }],
            groups: [],
            measures: [0],
        };

        var labelStyles = Card.DefaultStyle.label;
        var valueStyles = Card.DefaultStyle.value;

        beforeEach(() => {
            createCardOnMinerva();
        });

        function createCardOnMinerva(displayUnitSystemType?: powerbi.DisplayUnitSystemType): void {
            element = powerbitests.helpers.testDom('200', '300');
            v = <Card> powerbi.visuals.visualPluginFactory.createMinerva({}).getPlugin('card').create();

            var settings;

            if (displayUnitSystemType) {
                settings = {
                    DisplayUnitSystemType: displayUnitSystemType
                };
            }

            v.init({
                element: element,
                host: mocks.createVisualHostServices(),
                style: powerbi.visuals.visualStyles.create(),
                viewport: {
                    height: element.height(),
                    width: element.width()
                },
                settings: settings,
            });
        }

        it('Card on Canvas DOM validation',(done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 90
                    }
                }]
            });

            setTimeout(() => {
                expect($('.card')).toBeInDOM();
                expect($('.label')).toBeInDOM();
                expect($('.value')).toBeInDOM();
                expect($('.label').length).toBe(1);
                expect($('.value').length).toBe(1);
                expect($('.label').first().text()).toBe('col1');
                expect($('.value').first().text()).toBe('90');
                done();
            }, DefaultWaitForRender);
        });

        it('Card on Canvas Style validation',(done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 900000
                    }
                }]
            });

            setTimeout(() => {
                expect($('.label')).toBeInDOM();
                expect($('.value')).toBeInDOM();
                expect(parseInt($('.label')[0].style.fontSize, 10)).toBe(labelStyles.fontSize);
                expect(parseInt($('.value')[0].style.fontSize, 10)).toBe(valueStyles.fontSize);
                expect($('.label')[0].style.fill).toBe(labelStyles.color);
                expect($('.value')[0].style.fill).toBe(valueStyles.color);
                expect($('.value')[0].style.fontFamily).toBe(valueStyles.fontFamily);
                done();
            }, DefaultWaitForRender);
        });

        it('Card with DateTime value on canvas',(done) => {
            var dateValue = new Date(2015, 5, 20);
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'date', type: powerbi.ValueType.fromDescriptor({ dateTime: true }), isMeasure: true }
                ],
            };
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: dateValue
                    }
                }]
            });

            setTimeout(() => {
                expect($('.label').first().text()).toBe('date');
                expect($('.value').first().text()).toBe('6/20/2015');
                done();
            }, DefaultWaitForRender);
        });

        it('Card with zero currency value',(done) => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [
                    { displayName: 'price', type: powerbi.ValueType.fromDescriptor({ numeric: true }), isMeasure: true, objects: { 'general': { formatString: '$0' } } }
                ],
            };
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 0
                    }
                }]
            });

            setTimeout(() => {
                expect($('.label').first().text()).toBe('price');
                expect($('.value').first().text()).toBe('$0');
                done();
            }, DefaultWaitForRender);
        });

        it('Card with null dataview',(done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 900
                    }
                }]
            });

            setTimeout(() => {
                expect($('.value').first().text()).toBe('900');
                expect($('.label').first().text()).toBe('col1');
                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadata,
                        single: {
                            value: null
                        }
                    }]
                });
                setTimeout(() => {
                    expect($('.value').first().text()).toBe('(Blank)');
                    expect($('.label').first().text()).toBe('col1');
                    done();
                }, DefaultWaitForRender);

            }, DefaultWaitForRender);
        });

        it('Card updated with undefined dataview', (done) => {
            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: 0
                    }
                }]
            });

            setTimeout(() => {
                expect($('.value').first().text()).toBe('0');
                expect($('.label').first().text()).toBe('col1');
                v.onDataChanged({
                    dataViews: [{
                        metadata: dataViewMetadata,
                        single: {
                            value: undefined
                        }
                    }]
                });
                setTimeout(() => {
                    expect($('.value').first().text()).toBe('');
                    expect($('.label').first().text()).toBe('');
                    done();
                }, DefaultWaitForRender);

            }, DefaultWaitForRender);
        });

        it('card with longer label and value', (done) => {
            var dataViewMetadata: powerbi.DataViewMetadata = {
                columns: [{ displayName: 'this is the value that never ends, it just goes on and on my friends. Some axis started rendering it not knowing what it was, and now it keeps on rendering forever just because this the label that never ends', isMeasure: true, format: '#0' }],
                groups: [],
                measures: [0],
            };

            v.onDataChanged({
                dataViews: [{
                    metadata: dataViewMetadata,
                    single: {
                        value: '99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999'
                    }
                }]
            });

            setTimeout(() => {
                // Note: the exact text will be different depending on the environment in which the test is run, so we can't do an exact match.
                // Just check that the text is truncated with ellipses.
                var labelText = $('.label').first().text();
                var valueText = $('.value').first().text();
                expect(labelText.length).toBeLessThan(60);
                expect(valueText.length).toBeLessThan(30);
                expect(valueText.substr(valueText.length - 3)).toBe('...');
                expect(labelText.substr(labelText.length - 3)).toBe('...');

                done();
            }, DefaultWaitForRender);
        });

    });
}