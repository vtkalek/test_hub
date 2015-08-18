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

module powerbi.visuals {
    export interface AnimatedTextConfigurationSettings {
        align?: string;
        maxFontSize?: number;
    }

    /** Base class for values that are animated when resized */
    export class AnimatedText {
        // Public for testability
        public static formatStringProp: DataViewObjectPropertyIdentifier = {
            objectName: 'general',
            propertyName: 'formatString',
        };

        protected animator: IAnimator;

        private name: string;

        // Public for testability
        public svg: D3.Selection;
        public currentViewport: IViewport;
        public value: any;
        public hostServices: IVisualHostServices;
        public style: IVisualStyle;
        public visualConfiguration: AnimatedTextConfigurationSettings;
        public metaDataColumn: DataViewMetadataColumn;

        private mainText: ClassAndSelector = {
            class: 'mainText',
            selector: '.mainText'
        };

        public constructor(name: string) {
            this.name = name;
            this.visualConfiguration = { maxFontSize: 60 };
        }

        public getMetaDataColumn(dataView: DataView) {
            if (dataView && dataView.metadata && dataView.metadata.columns) {
                for (var i = 0, ilen = dataView.metadata.columns.length; i < ilen; i++) {
                    var column = dataView.metadata.columns[i];
                    if (column.isMeasure) {
                        this.metaDataColumn = column;
                        break;
                    }
                }
            }
        }

        public getAdjustedFontHeight(
            availableWidth: number,
            textToMeasure: string,
            seedFontHeight: number): number {

            // set up the node so we don't keep appending/removing it during the computation
            var nodeSelection = this.svg.append('text').text(textToMeasure);

            var fontHeight = this.getAdjustedFontHeightCore(
                nodeSelection,
                availableWidth,
                seedFontHeight,
                0);

            nodeSelection.remove();

            return fontHeight;
        }

        private getAdjustedFontHeightCore(
            nodeToMeasure: D3.Selection,
            availableWidth: number,
            seedFontHeight: number,
            iteration: number): number {

            // Too many attempts - just return what we have so we don't sacrifice perf
            if (iteration > 10)
                return seedFontHeight;

            nodeToMeasure.attr('font-size', seedFontHeight);
            var candidateLength = TextMeasurementService.measureSvgTextElementWidth(nodeToMeasure[0][0]);
            if (candidateLength < availableWidth)
                return seedFontHeight;

            return this.getAdjustedFontHeightCore(nodeToMeasure, availableWidth, seedFontHeight * 0.9, iteration + 1);
        }

        public clear() {
            this.svg.select(this.mainText.selector).text('');
        }

        public doValueTransition(
            startValue: any,
            endValue: any,
            displayUnitSystemType: DisplayUnitSystemType,
            animationOptions: AnimationOptions,
            duration: number,
            forceUpdate: boolean): void {
            if (!forceUpdate && startValue === endValue && endValue != null)
                return;

            if (!startValue)
                startValue = 0;

            var svg = this.svg,
                viewport = this.currentViewport,
                height = viewport.height,
                width = viewport.width,
                endValueArr = [endValue],
                seedFontHeight = this.getSeedFontHeight(width, height),
                translateX = this.getTranslateX(width),
                translateY = this.getTranslateY(seedFontHeight),
                metaDataColumn = this.metaDataColumn,
                formatter = valueFormatter.create({
                    format: this.getFormatString(metaDataColumn),
                    value: endValue,
                    displayUnitSystemType: displayUnitSystemType,
                    formatSingleValues: true,
                    allowFormatBeautification: true,
                    columnType: metaDataColumn ? metaDataColumn.type : undefined
                }),
                startText = formatter.format(startValue),
                endText = formatter.format(endValue);

            svg.attr('class', this.name);

            var textElement = svg
                .selectAll('text')
                .data(endValueArr);

            textElement
                .enter()
                .append('text')
                .attr('class', this.mainText.class);

            var fontHeight = this.getAdjustedFontHeight(width, endText, seedFontHeight);
            translateY = this.getTranslateY(fontHeight + (height - fontHeight) / 2);  

            var textElementUpdate = textElement
                .text(startText)
                .attr({
                    'text-anchor': this.getTextAnchor(),
                    'font-size': fontHeight,
                    'transform': SVGUtil.translate(translateX, translateY)
                });

            if (endValue == null) {
                textElementUpdate.text(endText);
            }
            else if (metaDataColumn && AxisHelper.isDateTime(metaDataColumn.type)) {
                textElementUpdate.text(endText);
            }            
            else {
                var interpolatedValue = startValue;
                textElementUpdate
                    .transition()
                    .duration(duration)
                    .tween('text', function (d) {
                        var i = d3.interpolate(interpolatedValue, d);
                        return function (t) {
                            var num = i(t);
                            this.textContent = formatter.format(num);
                        };
                    });
            }

            SVGUtil.flushAllD3TransitionsIfNeeded(animationOptions);
        }

        public getSeedFontHeight(boundingWidth: number, boundingHeight: number) {
            // Simply an estimate - it should eventually be modified based on the actual text length
            var estimatedSize = Math.floor(Math.min(boundingWidth, boundingHeight) * 0.75);
            var maxFontSize = this.visualConfiguration.maxFontSize;

            if (maxFontSize)
                return Math.min(maxFontSize, estimatedSize);

            return estimatedSize;
        }

        public getTranslateX(width: number): number {
            if (this.visualConfiguration) {
                switch (this.visualConfiguration.align) {
                    case 'left':
                        return 0;
                    case 'right':
                        return width;
                }
            }
            return width / 2;
        }

        public getTranslateY(height: number): number {
            return height;
        }

        public getTextAnchor(): string {
            if (this.visualConfiguration) {
                switch (this.visualConfiguration.align) {
                    case 'left':
                        return 'start';
                    case 'right':
                        return 'end';
                }
            }
            return 'middle';
        }

        protected getFormatString(column: DataViewMetadataColumn): string {
            debug.assertAnyValue(column, 'column');

            return valueFormatter.getFormatString(column, AnimatedText.formatStringProp);
        }
    }
}