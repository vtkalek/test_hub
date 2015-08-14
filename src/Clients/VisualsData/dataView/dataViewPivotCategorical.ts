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

module powerbi.data {
    import inherit = Prototype.inherit;
    import ArrayExtensions = jsCommon.ArrayExtensions;

    export module DataViewPivotCategorical {
        /**
         * Pivots categories in a categorical DataView into valueGroupings.
         * This is akin to a mathematical matrix transpose.
         */
        export function apply(dataView: DataView): DataView {
            debug.assertValue(dataView, 'dataView');

            var categorical = dataView.categorical;
            if (!categorical)
                return null;

            var categories = categorical.categories;
            if (!categories || categories.length !== 1)
                return null;

            var values = categorical.values;
            if (ArrayExtensions.isUndefinedOrEmpty(values) || values.source)
                return null;

            var category = categories[0],
                categoryIdentities = category.identity,
                categoryValues = category.values,
                pivotedColumns: DataViewMetadataColumn[] = [],
                pivotedValues: DataViewValueColumn[] = [];
            for (var rowIdx = 0, rowCount = categoryValues.length; rowIdx < rowCount; rowIdx++) {
                var categoryValue = categoryValues[rowIdx],
                    categoryIdentity = categoryIdentities[rowIdx];
                for (var colIdx = 0, colCount = values.length; colIdx < colCount; colIdx++) {
                    var value = values[colIdx],
                        pivotedColumn = inherit(value.source);

                    // A value has a series group, which is not implemented for pivoting -- just give up.
                    if (value.identity)
                        return null;

                    pivotedColumn.groupName = categoryValue;
                    var pivotedValue: DataViewValueColumn = {
                        source: pivotedColumn,
                        values: [value.values[rowIdx]],
                        identity: categoryIdentity,
                        min: value.min,
                        max: value.max,
                        subtotal: value.subtotal
                    };

                    var highlights = value.highlights;
                    if (highlights) {
                        pivotedValue.highlights = [highlights[rowIdx]];
                    }

                    pivotedColumns.push(pivotedColumn);
                    pivotedValues.push(pivotedValue);
                }
            }

            var pivotedMetadata = inherit(dataView.metadata);
            pivotedMetadata.columns = pivotedColumns;

            var values = DataViewTransform.createValueColumns(pivotedValues, category.identityFields, category.source);
            return {
                metadata: pivotedMetadata,
                categorical: {
                    values: values,
                },
                matrix: dataView.matrix
            };
        }
    }
} 