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
    import SQExprShortSerializer = data.SQExprShortSerializer;

    export class ColorHelper {
        private fillProp: DataViewObjectPropertyIdentifier;
        private defaultDataPointColor: string;
        private colors: IDataColorPalette;
        private defaultColorScale: IColorScale;

        constructor(colors: IDataColorPalette, fillProp: DataViewObjectPropertyIdentifier, defaultDataPointColor?: string) {
            this.colors = colors;
            this.fillProp = fillProp;
            this.defaultDataPointColor = defaultDataPointColor;
            this.defaultColorScale = colors.getNewColorScale();
        }

        /**
         * Gets the color for the given series value. If no explicit color or default color has been set then the color is
         * allocated from the color scale for this series.
         */
        public getColorForSeriesValue(objects: DataViewObjects, fieldIds: powerbi.data.SQExpr[], value: string): string {
            return (this.fillProp && DataViewObjects.getFillColor(objects, this.fillProp))
                || this.defaultDataPointColor
                || this.colors.getColorScaleByKey(SQExprShortSerializer.serializeArray(fieldIds || [])).getColor(value).value;
        }

        /** Gets the color for the given measure. */
        public getColorForMeasure(objects: DataViewObjects, measureKey: any): string {
            // Note, this allocates the color from the scale regardless of if we use it or not which helps keep colors stable.
            var scaleColor = this.defaultColorScale.getColor(measureKey).value;

            return (this.fillProp && DataViewObjects.getFillColor(objects, this.fillProp))
                || this.defaultDataPointColor
                || scaleColor;
        }

        public static normalizeSelector(selector: data.Selector, isSingleSeries?: boolean): data.Selector {
            debug.assertAnyValue(selector, 'selector');

            // For dynamic series charts, colors are set per category.  So, exclude any measure (metadata repetition) from the selector.
            if (selector && (isSingleSeries || selector.data))
                return { data: selector.data };

            return selector;
        }
    }
}